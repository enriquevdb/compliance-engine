/**
 * Compliance Engine
 * Main orchestrator that processes transactions through gates and calculates fees
 * Returns response matching Appendix A exactly
 */

import { GateOrchestrator } from './gates/GateOrchestrator';
import { FeeCalculator } from './calculation/FeeCalculator';
import {
  TransactionInput,
  ComplianceResponse,
  GateEntry,
  GateResult,
  ExemptionData,
  TransactionStatus,
} from './types';

export class ComplianceEngine {
  private gateOrchestrator: GateOrchestrator;
  private feeCalculator: FeeCalculator;

  constructor() {
    this.gateOrchestrator = new GateOrchestrator();
    this.feeCalculator = new FeeCalculator();
  }

  /**
   * Process a transaction through the compliance engine
   */
  async process(transaction: TransactionInput, context?: Record<string, unknown>): Promise<ComplianceResponse> {
    // Execute gates
    const gateExecution = await this.gateOrchestrator.execute(transaction, context);

    // If any gate failed, return failure response
    if (!gateExecution.passed) {
      return this.buildFailureResponse(transaction, gateExecution.results, gateExecution.auditTrail);
    }

    // Extract exemption data from ExemptionGate result
    const exemptionGateResult = gateExecution.results.find((r) => r.gateName === 'ExemptionCheck');
    const exemptionData = this.extractExemptionData(exemptionGateResult);

    // Calculate fees
    const calculationResult = this.feeCalculator.calculateFees(transaction, exemptionData);

    // Build success response matching Appendix A
    return this.buildSuccessResponse(transaction, gateExecution.results, calculationResult, [
      ...gateExecution.auditTrail,
      ...calculationResult.auditTrail,
    ]);
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
}

