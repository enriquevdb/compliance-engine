/**
 * Integration tests for end-to-end scenarios
 */

import { ComplianceEngine } from '../../ComplianceEngine';
import {
  validTransactionCA,
  transactionWithMultipleItems,
  transactionWithExemptItem,
  transactionWithExemptCustomer,
} from '../fixtures/transactions';

describe('ComplianceEngine Integration Tests', () => {
  let engine: ComplianceEngine;

  beforeEach(() => {
    engine = new ComplianceEngine();
  });

  it('should process complete transaction with multiple items', async () => {
    const response = await engine.process(transactionWithMultipleItems);

    expect(response.status).toBe('CALCULATED');
    expect(response.calculation).toBeDefined();
    expect(response.calculation?.items).toHaveLength(2);

    // Verify total fees are sum of item fees
    const itemFeesSum = response.calculation!.items.reduce((sum, item) => sum + item.totalFee, 0);
    expect(Math.abs(itemFeesSum - response.calculation!.totalFees)).toBeLessThan(0.02);
  });

  it('should handle transaction with exempt item', async () => {
    const response = await engine.process(transactionWithExemptItem);

    expect(response.status).toBe('CALCULATED');
    expect(response.calculation).toBeDefined();

    // Exempt item should have $0 fees
    const exemptItem = response.calculation!.items.find((item) => item.category === 'FOOD');
    expect(exemptItem?.totalFee).toBe(0);
    expect(response.calculation!.totalFees).toBe(0);
  });

  it('should handle transaction with exempt customer', async () => {
    const response = await engine.process(transactionWithExemptCustomer, {
      customerType: 'WHOLESALE',
    });

    expect(response.status).toBe('CALCULATED');
    expect(response.calculation).toBeDefined();
    expect(response.calculation!.totalFees).toBe(0);

    // Verify exemption gate shows applied exemptions
    const exemptionGate = response.gates.find((g) => g.name === 'EXEMPTION_CHECK');
    expect(exemptionGate?.appliedExemptions).toContain('WHOLESALE');
  });

  it('should generate complete audit trail', async () => {
    const response = await engine.process(validTransactionCA);

    expect(response.auditTrail.length).toBeGreaterThan(0);

    // Should include gate results
    expect(response.auditTrail.some((msg) => msg.toLowerCase().includes('address'))).toBe(true);
    expect(response.auditTrail.some((msg) => msg.toLowerCase().includes('merchant'))).toBe(true);

    // Should include calculation details
    if (response.calculation) {
      expect(response.auditTrail.some((msg) => msg.toLowerCase().includes('rate'))).toBe(true);
    }
  });

  it('should handle edge case: zero amount items', async () => {
    const transaction = {
      ...validTransactionCA,
      items: [
        { id: 'item_1', category: 'SOFTWARE', amount: 0 },
      ],
      totalAmount: 0,
    };

    const response = await engine.process(transaction);

    expect(response.status).toBe('CALCULATED');
    if (response.calculation) {
      expect(response.calculation.totalFees).toBe(0);
      expect(response.calculation.effectiveRate).toBe(0);
    }
  });
});


