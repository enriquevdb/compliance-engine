/**
 * Tests for InputValidationGate
 */

import { InputValidationGate } from '../../gates/InputValidationGate';
import {
  validTransactionCA,
  invalidTransactionMissingFields,
  invalidTransactionWrongCurrency,
  invalidTransactionAmountMismatch,
} from '../fixtures/transactions';

describe('InputValidationGate', () => {
  let gate: InputValidationGate;

  beforeEach(() => {
    gate = new InputValidationGate();
  });

  it('should pass valid transaction', async () => {
    const result = await gate.execute(validTransactionCA);
    expect(result.passed).toBe(true);
    expect(result.message).toBe('Input validation passed');
  });

  it('should fail when transaction is missing', async () => {
    const result = await gate.execute(null as any);
    expect(result.passed).toBe(false);
    expect(result.errorType).toBe('VALIDATION');
    expect(result.message).toContain('Transaction is required');
  });

  it('should fail when transactionId is missing', async () => {
    const result = await gate.execute({} as any);
    expect(result.passed).toBe(false);
    expect(result.errorType).toBe('VALIDATION');
    expect(result.message).toContain('transactionId is required');
  });

  it('should fail when merchantId is missing', async () => {
    const result = await gate.execute({ transactionId: 'txn_1' } as any);
    expect(result.passed).toBe(false);
    expect(result.errorType).toBe('VALIDATION');
    expect(result.message).toContain('merchantId is required');
  });

  it('should fail when destination is missing', async () => {
    const result = await gate.execute({
      transactionId: 'txn_1',
      merchantId: 'merchant_1',
      customerId: 'customer_1',
    } as any);
    expect(result.passed).toBe(false);
    expect(result.errorType).toBe('VALIDATION');
    expect(result.message).toContain('destination is required');
  });

  it('should fail when items array is empty', async () => {
    const result = await gate.execute({
      transactionId: 'txn_1',
      merchantId: 'merchant_1',
      customerId: 'customer_1',
      destination: { country: 'US', state: 'CA', city: 'LA' },
      items: [],
      totalAmount: 100,
      currency: 'USD',
    } as any);
    expect(result.passed).toBe(false);
    expect(result.errorType).toBe('VALIDATION');
    expect(result.message).toContain('non-empty array');
  });

  it('should fail when item amount is negative', async () => {
    const result = await gate.execute({
      transactionId: 'txn_1',
      merchantId: 'merchant_1',
      customerId: 'customer_1',
      destination: { country: 'US', state: 'CA', city: 'LA' },
      items: [{ id: 'item_1', category: 'SOFTWARE', amount: -10 }],
      totalAmount: 100,
      currency: 'USD',
    } as any);
    expect(result.passed).toBe(false);
    expect(result.errorType).toBe('VALIDATION');
    expect(result.message).toContain('non-negative amount');
  });

  it('should fail when currency is not USD', async () => {
    const result = await gate.execute(invalidTransactionWrongCurrency);
    expect(result.passed).toBe(false);
    expect(result.errorType).toBe('VALIDATION');
    expect(result.message).toContain('Unsupported currency');
  });

  it('should fail when items sum does not match totalAmount', async () => {
    const result = await gate.execute(invalidTransactionAmountMismatch);
    expect(result.passed).toBe(false);
    expect(result.errorType).toBe('VALIDATION');
    expect(result.message).toContain('does not match totalAmount');
  });

  it('should allow small floating point differences (tolerance)', async () => {
    const result = await gate.execute({
      transactionId: 'txn_1',
      merchantId: 'merchant_1',
      customerId: 'customer_1',
      destination: { country: 'US', state: 'CA', city: 'LA' },
      items: [{ id: 'item_1', category: 'SOFTWARE', amount: 100.0 }],
      totalAmount: 100.005, // Within tolerance
      currency: 'USD',
    } as any);
    expect(result.passed).toBe(true);
  });
});


