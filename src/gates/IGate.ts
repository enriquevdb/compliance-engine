/**
 * Base gate interface
 */

import { IGate, GateResult } from './types';
import { TransactionInput } from '../types';

export abstract class BaseGate implements IGate {
  abstract execute(transaction: TransactionInput, context?: Record<string, unknown>): Promise<GateResult>;

  protected createPassResult(message: string, metadata?: Record<string, unknown>): GateResult {
    return {
      gateName: this.getGateName(),
      passed: true,
      message,
      metadata,
    };
  }

  protected createFailResult(message: string, errorType: 'VALIDATION' | 'DEPENDENCY' | 'SYSTEM', metadata?: Record<string, unknown>): GateResult {
    return {
      gateName: this.getGateName(),
      passed: false,
      message,
      errorType,
      metadata,
    };
  }

  protected abstract getGateName(): string;
}


