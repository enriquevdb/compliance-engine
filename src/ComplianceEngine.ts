/**
 * Compliance Engine
 * Main orchestrator that processes transactions through gates and calculates fees
 * Returns response matching Appendix A exactly
 */

import { GateOrchestrator } from './gates/GateOrchestrator';
import { FeeCalculator } from './calculation/FeeCalculator';
import { RateTable } from './calculation/RateTable';
import {
  TransactionInput,
  ComplianceResponse,
  GateEntry,
  GateResult,
  ExemptionData,
  TransactionStatus,
} from './types';
import { db } from './database/client';
import { TransactionRepository } from './database/repositories/TransactionRepository';
import { AuditRepository } from './database/repositories/AuditRepository';

export class ComplianceEngine {
  private gateOrchestrator: GateOrchestrator;
  private feeCalculator: FeeCalculator | null = null;
  private transactionRepository: TransactionRepository | null = null;
  private auditRepository: AuditRepository | null = null;
  private dbInitialized: Promise<void> | null = null;

  constructor(enableDatabase: boolean = true) {
    this.gateOrchestrator = new GateOrchestrator();
    
    // Initialize database and RateTable if enabled, then create FeeCalculator
    if (enableDatabase) {
      this.dbInitialized = this.initializeDatabase();
    } else {
      // Fallback: Initialize RateTable from hardcoded config (would need to keep rules.ts fallback)
      // For now, we'll require database for RateTable initialization
      // This ensures consistency - if database is disabled, RateTable won't work
    }
  }

  /**
   * Initialize database connection and repositories
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await db.connect();
      
      // Initialize RateTable from database before creating FeeCalculator
      await RateTable.initialize();
      
      // Create FeeCalculator with initialized RateTable
      this.feeCalculator = new FeeCalculator(RateTable.getInstance());
      
      this.transactionRepository = new TransactionRepository();
      this.auditRepository = new AuditRepository();
    } catch (error) {
      console.warn('Database not available, falling back to in-memory configuration:', error);
      // If database fails, RateTable won't be initialized and FeeCalculator will fail
      // This is intentional - we require database for rate loading
      this.transactionRepository = null;
      this.auditRepository = null;
      this.feeCalculator = null;
    }
  }

  /**
   * Check if database is available
   */
  private isDatabaseEnabled(): boolean {
    return this.transactionRepository !== null && this.auditRepository !== null;
  }

  /**
   * Process a transaction through the compliance engine
   */
  async process(transaction: TransactionInput, context?: Record<string, unknown>): Promise<ComplianceResponse> {
    // Ensure database initialization completes (including RateTable)
    if (this.dbInitialized) {
      await this.dbInitialized;
    }
    
    // Ensure FeeCalculator is available
    if (!this.feeCalculator) {
      throw new Error('FeeCalculator not initialized. Database connection required.');
    }

    // Execute gates
    const gateExecution = await this.gateOrchestrator.execute(transaction, context);

    // If any gate failed, return failure response
    let response: ComplianceResponse;
    if (!gateExecution.passed) {
      response = this.buildFailureResponse(transaction, gateExecution.results, gateExecution.auditTrail);
    } else {
      // Extract exemption data from ExemptionGate result
      const exemptionGateResult = gateExecution.results.find((r) => r.gateName === 'ExemptionCheck');
      const exemptionData = this.extractExemptionData(exemptionGateResult);

      // Calculate fees
      const calculationResult = this.feeCalculator!.calculateFees(transaction, exemptionData);

      // Build success response matching Appendix A
      response = this.buildSuccessResponse(transaction, gateExecution.results, calculationResult, [
        ...gateExecution.auditTrail,
        ...calculationResult.auditTrail,
      ]);
    }

    // Persist to database if enabled (await initialization if still in progress)
    if (this.dbInitialized) {
      await this.dbInitialized; // Ensure initialization completes
    }

    if (this.isDatabaseEnabled()) {
      try {
        await this.transactionRepository!.saveTransaction(transaction, response);
        await this.auditRepository!.saveAuditTrail(transaction.transactionId, response.auditTrail);
      } catch (error) {
        console.error('Failed to persist transaction to database:', error);
        // Don't fail the request if persistence fails
      }
    }

    return response;
  }

  /**
   * Build failure response
   */
  private buildFailureResponse(
    transaction: TransactionInput,
    gateResults: GateResult[],
    auditTrail: string[]
  ): ComplianceResponse {
    const gates: GateEntry[] = this.transformGateResults(gateResults);

    return {
      transactionId: transaction.transactionId,
      status: 'REJECTED',
      gates,
      auditTrail,
    };
  }

  /**
   * Build success response matching Appendix A exactly
   */
  private buildSuccessResponse(
    transaction: TransactionInput,
    gateResults: GateResult[],
    calculationResult: {
      items: Array<{
        itemId: string;
        amount: number;
        category: string;
        fees: any;
        totalFee: number;
      }>;
      totalFees: number;
      effectiveRate: number;
      auditTrail: string[];
    },
    auditTrail: string[]
  ): ComplianceResponse {
    const gates: GateEntry[] = this.transformGateResults(gateResults);

    return {
      transactionId: transaction.transactionId,
      status: 'CALCULATED',
      gates,
      calculation: {
        items: calculationResult.items,
        totalFees: calculationResult.totalFees,
        effectiveRate: calculationResult.effectiveRate,
      },
      auditTrail,
    };
  }

  /**
   * Transform internal GateResult to API GateEntry format (matching Appendix A)
   * Note: INPUT_VALIDATION gate is internal only and not included in response
   */
  private transformGateResults(gateResults: GateResult[]): GateEntry[] {
    const gateNameMapping: Record<string, string> = {
      AddressValidation: 'ADDRESS_VALIDATION',
      Applicability: 'APPLICABILITY',
      ExemptionCheck: 'EXEMPTION_CHECK',
    };

    // Filter out InputValidation gate (internal only, not in Appendix A response)
    const publicGateResults = gateResults.filter((r) => r.gateName !== 'InputValidation');

    return publicGateResults.map((result) => {
      const gateEntry: GateEntry = {
        name: gateNameMapping[result.gateName] || result.gateName.toUpperCase(),
        passed: result.passed,
        message: result.message,
      };

      // Add appliedExemptions for EXEMPTION_CHECK gate
      if (result.gateName === 'ExemptionCheck' && result.metadata?.appliedExemptions) {
        gateEntry.appliedExemptions = result.metadata.appliedExemptions as string[];
      } else if (result.gateName === 'ExemptionCheck') {
        // Always include appliedExemptions array for EXEMPTION_CHECK (empty if none)
        gateEntry.appliedExemptions = [];
      }

      return gateEntry;
    });
  }

  /**
   * Extract exemption data from ExemptionGate result
   */
  private extractExemptionData(exemptionGateResult?: GateResult): ExemptionData {
    if (!exemptionGateResult || !exemptionGateResult.metadata?.exemptionData) {
      return {
        customerExemptions: [],
        itemExemptions: new Map(),
      };
    }

    return exemptionGateResult.metadata.exemptionData as ExemptionData;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.dbInitialized) {
      await this.dbInitialized; // Ensure initialization completes
    }
    if (this.isDatabaseEnabled() || db.isConnected()) {
      await db.close();
    }
  }
}

