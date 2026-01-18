/**
 * Tests for FeeCalculator
 */

import { FeeCalculator } from '../../calculation/FeeCalculator';
import { RateTable } from '../../calculation/RateTable';
import { TransactionInput, ExemptionData } from '../../types';
import { validTransactionCA, transactionWithExemptItem } from '../fixtures/transactions';

describe('FeeCalculator', () => {
  let calculator: FeeCalculator;

  beforeEach(() => {
    calculator = new FeeCalculator();
  });

  it('should calculate fees for CA SOFTWARE item correctly', async () => {
    const transaction = validTransactionCA;
    const exemptionData: ExemptionData = {
      customerExemptions: [],
      itemExemptions: new Map(),
    };

    const result = calculator.calculateFees(transaction, exemptionData);

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.itemId).toBe('item_1');
    expect(item.amount).toBe(100.0);
    expect(item.category).toBe('SOFTWARE');

    // State rate: 6% of $100 = $6.00
    expect(item.fees.stateRate.amount).toBeCloseTo(6.0, 2);
    expect(item.fees.stateRate.rate).toBe(0.06);

    // County rate: 0.25% of $100 = $0.25
    expect(item.fees.countyRate?.amount).toBeCloseTo(0.25, 2);
    expect(item.fees.countyRate?.rate).toBe(0.0025);

    // City rate: 2.25% of $100 = $2.25
    expect(item.fees.cityRate?.amount).toBeCloseTo(2.25, 2);
    expect(item.fees.cityRate?.rate).toBe(0.0225);

    // Category modifier: 1% of $100 = $1.00
    expect(item.fees.categoryModifier.amount).toBeCloseTo(1.0, 2);
    expect(item.fees.categoryModifier.rate).toBe(0.01);

    // Total: $6.00 + $0.25 + $2.25 + $1.00 = $9.50
    expect(item.totalFee).toBeCloseTo(9.5, 2);

    // Total fees
    expect(result.totalFees).toBeCloseTo(9.5, 2);

    // Effective rate: $9.50 / $100.00 = 0.095 (9.5%)
    expect(result.effectiveRate).toBeCloseTo(0.095, 4);
  });

  it('should apply exemptions correctly', () => {
    const transaction = transactionWithExemptItem;
    const exemptionData: ExemptionData = {
      customerExemptions: [],
      itemExemptions: new Map([['item_1', ['FOOD exempt in CA']]]),
    };

    const result = calculator.calculateFees(transaction, exemptionData);

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.totalFee).toBe(0); // Exempt item has no fees
    expect(result.totalFees).toBe(0);
  });

  it('should apply customer-level exemptions', () => {
    const transaction = validTransactionCA;
    const exemptionData: ExemptionData = {
      customerExemptions: ['WHOLESALE'],
      itemExemptions: new Map(),
    };

    const result = calculator.calculateFees(transaction, exemptionData);

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.totalFee).toBe(0); // Customer exempt, so item exempt
    expect(result.totalFees).toBe(0);
  });

  it('should handle multiple items correctly', () => {
    const transaction: TransactionInput = {
      transactionId: 'txn_multi',
      merchantId: 'merchant_456',
      customerId: 'customer_789',
      destination: {
        country: 'US',
        state: 'CA',
        city: 'Los Angeles',
      },
      items: [
        { id: 'item_1', category: 'SOFTWARE', amount: 100.0 },
        { id: 'item_2', category: 'PHYSICAL_GOODS', amount: 50.0 },
      ],
      totalAmount: 150.0,
      currency: 'USD',
    };

    const exemptionData: ExemptionData = {
      customerExemptions: [],
      itemExemptions: new Map(),
    };

    const result = calculator.calculateFees(transaction, exemptionData);

    expect(result.items).toHaveLength(2);

    // Item 1: $100 SOFTWARE
    const item1 = result.items[0];
    expect(item1.totalFee).toBeCloseTo(9.5, 2); // Same as previous test

    // Item 2: $50 PHYSICAL_GOODS (no category modifier)
    const item2 = result.items[1];
    // State: 6% of $50 = $3.00
    // County: 0.25% of $50 = $0.125
    // City: 2.25% of $50 = $1.125
    // Category: 0% of $50 = $0.00
    // Total: ~$4.25
    expect(item2.totalFee).toBeGreaterThan(0);

    // Total should be sum of item fees
    const itemFeesSum = result.items.reduce((sum, item) => sum + item.totalFee, 0);
    expect(Math.abs(itemFeesSum - result.totalFees)).toBeLessThan(0.02); // Allow 2 cent tolerance
  });

  it('should handle 47 items with precision (sum of item fees = total)', () => {
    const items = Array.from({ length: 47 }, (_, i) => ({
      id: `item_${i + 1}`,
      category: 'SOFTWARE',
      amount: 10.0 + i * 0.01, // Varying amounts to test precision
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    const transaction: TransactionInput = {
      transactionId: 'txn_47',
      merchantId: 'merchant_456',
      customerId: 'customer_789',
      destination: {
        country: 'US',
        state: 'CA',
        city: 'Los Angeles',
      },
      items,
      totalAmount,
      currency: 'USD',
    };

    const exemptionData: ExemptionData = {
      customerExemptions: [],
      itemExemptions: new Map(),
    };

    const result = calculator.calculateFees(transaction, exemptionData);

    expect(result.items).toHaveLength(47);

    // Critical: Sum of item fees must equal total fees (within tolerance)
    const itemFeesSum = result.items.reduce((sum, item) => sum + item.totalFee, 0);
    const difference = Math.abs(itemFeesSum - result.totalFees);
    expect(difference).toBeLessThan(0.01); // Must be within 1 cent

    // Effective rate should be calculated correctly
    const calculatedEffectiveRate = result.totalFees / totalAmount;
    expect(result.effectiveRate).toBeCloseTo(calculatedEffectiveRate, 4);
  });

  it('should generate audit trail', () => {
    const transaction = validTransactionCA;
    const exemptionData: ExemptionData = {
      customerExemptions: [],
      itemExemptions: new Map(),
    };

    const result = calculator.calculateFees(transaction, exemptionData);

    expect(result.auditTrail.length).toBeGreaterThan(0);
    expect(result.auditTrail.some((msg) => msg.includes('state rate'))).toBe(true);
    expect(result.auditTrail.some((msg) => msg.includes('category modifier'))).toBe(true);
  });
});


