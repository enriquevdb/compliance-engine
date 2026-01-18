/**
 * Input Validation Gate
 * Validates transaction input structure and required fields
 */

import { BaseGate } from './IGate';
import { GateResult } from './types';
import { TransactionInput } from '../types';

export class InputValidationGate extends BaseGate {
  protected getGateName(): string {
    return 'InputValidation';
  }

  async execute(transaction: unknown, _context?: Record<string, unknown>): Promise<GateResult> {
    // Type check
    if (!transaction || typeof transaction !== 'object') {
      return this.createFailResult('Transaction is required', 'VALIDATION');
    }

    const tx = transaction as Partial<TransactionInput>;

    // Required fields
    if (!tx.transactionId || typeof tx.transactionId !== 'string') {
      return this.createFailResult('transactionId is required and must be a string', 'VALIDATION');
    }

    if (!tx.merchantId || typeof tx.merchantId !== 'string') {
      return this.createFailResult('merchantId is required and must be a string', 'VALIDATION');
    }

    if (!tx.customerId || typeof tx.customerId !== 'string') {
      return this.createFailResult('customerId is required and must be a string', 'VALIDATION');
    }

    if (!tx.destination || typeof tx.destination !== 'object') {
      return this.createFailResult('destination is required', 'VALIDATION');
    }

    if (!tx.destination.country || typeof tx.destination.country !== 'string') {
      return this.createFailResult('destination.country is required', 'VALIDATION');
    }

    if (!tx.destination.state || typeof tx.destination.state !== 'string') {
      return this.createFailResult('destination.state is required', 'VALIDATION');
    }

    if (!tx.destination.city || typeof tx.destination.city !== 'string') {
      return this.createFailResult('destination.city is required', 'VALIDATION');
    }

    if (!Array.isArray(tx.items) || tx.items.length === 0) {
      return this.createFailResult('items is required and must be a non-empty array', 'VALIDATION');
    }

    // Validate items structure
    for (const item of tx.items) {
      if (!item.id || typeof item.id !== 'string') {
        return this.createFailResult('Each item must have an id (string)', 'VALIDATION');
      }
      if (!item.category || typeof item.category !== 'string') {
        return this.createFailResult('Each item must have a category (string)', 'VALIDATION');
      }
      if (typeof item.amount !== 'number' || item.amount < 0) {
        return this.createFailResult('Each item must have a non-negative amount (number)', 'VALIDATION');
      }
    }

    if (typeof tx.totalAmount !== 'number' || tx.totalAmount < 0) {
      return this.createFailResult('totalAmount is required and must be a non-negative number', 'VALIDATION');
    }

    if (!tx.currency || typeof tx.currency !== 'string') {
      return this.createFailResult('currency is required and must be a string', 'VALIDATION');
    }

    // Validate currency (USD only)
    if (tx.currency !== 'USD') {
      return this.createFailResult(`Unsupported currency: ${tx.currency}. Only USD is supported`, 'VALIDATION');
    }

    // Validate amount consistency (with tolerance for floating point)
    const itemsSum = tx.items.reduce((sum, item) => sum + item.amount, 0);
    const tolerance = 0.01; // Allow 1 cent tolerance for floating point precision
    if (Math.abs(itemsSum - tx.totalAmount) > tolerance) {
      return this.createFailResult(
        `Items sum (${itemsSum}) does not match totalAmount (${tx.totalAmount})`,
        'VALIDATION'
      );
    }

    return this.createPassResult('Input validation passed');
  }
}


