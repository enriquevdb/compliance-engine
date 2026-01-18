/**
 * Gate Orchestrator
 * Executes gates sequentially with short-circuit on failure
 * Registry-based (not plugin system)
 */

import { IGate, GateResult } from './types';
import { TransactionInput } from '../types';
import { InputValidationGate } from './InputValidationGate';
import { AddressValidationGate } from './AddressValidationGate';
import { ApplicabilityGate } from './ApplicabilityGate';
import { ExemptionGate } from './ExemptionGate';

export class GateOrchestrator {
  private gates: IGate[];

  constructor() {
    // Registry of gates in execution order
    this.gates = [
      new InputValidationGate(),
      new AddressValidationGate(),
      new ApplicabilityGate(),
      new ExemptionGate(),
    ];
  }

  /**
   * Execute all gates sequentially, short-circuiting on first failure
   */
  async execute(transaction: TransactionInput, context?: Record<string, unknown>): Promise<{
    results: GateResult[];
    passed: boolean;
    auditTrail: string[];
  }> {
    const results: GateResult[] = [];
    const auditTrail: string[] = [];

    for (const gate of this.gates) {
      const result = await gate.execute(transaction, context);
      results.push(result);

      // Add to audit trail
      if (result.passed) {
        auditTrail.push(result.message || `${result.gateName} passed`);
      } else {
        auditTrail.push(`${result.gateName} failed: ${result.message}`);
      }

      // Short-circuit on failure
      if (!result.passed) {
        return {
          results,
          passed: false,
          auditTrail,
        };
      }
    }

    return {
      results,
      passed: true,
      auditTrail,
    };
  }

  /**
   * Get gate results (for testing/debugging)
   */
  getGateResults(): GateResult[] {
    return this.gates.map((gate) => ({
      gateName: gate.constructor.name,
      passed: false, // Placeholder
      message: 'Not executed',
    }));
  }
}


