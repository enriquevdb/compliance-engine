/**
 * Tests for ExemptionGate
 */

import { ExemptionGate } from '../../gates/ExemptionGate';
import {
  validTransactionCA,
  transactionWithExemptCustomer,
  transactionWithExemptItem,
} from '../fixtures/transactions';

describe('ExemptionGate', () => {
  let gate: ExemptionGate;

  beforeEach(() => {
    gate = new ExemptionGate();
  });

  it('should pass with no exemptions', async () => {
    const result = await gate.execute(validTransactionCA);
    expect(result.passed).toBe(true);
    expect(result.message).toContain('No exemptions');
    expect(result.metadata?.appliedExemptions).toEqual([]);
  });

  it('should detect WHOLESALE customer exemption', async () => {
    const result = await gate.execute(transactionWithExemptCustomer, {
      customerType: 'WHOLESALE',
    });
    expect(result.passed).toBe(true);
    expect(result.metadata?.appliedExemptions).toContain('WHOLESALE');
    expect(result.metadata?.exemptionData).toBeDefined();
  });

  it('should detect FOOD category exemption in CA', async () => {
    const result = await gate.execute(transactionWithExemptItem);
    expect(result.passed).toBe(true);
    const appliedExemptions = result.metadata?.appliedExemptions as string[];
    expect(appliedExemptions.length).toBeGreaterThan(0);
    expect(appliedExemptions.some((e) => e.includes('FOOD'))).toBe(true);
  });

  it('should not exempt FOOD in NY', async () => {
    const result = await gate.execute({
      ...transactionWithExemptItem,
      destination: {
        country: 'US',
        state: 'NY',
        city: 'New York City',
      },
    });
    expect(result.passed).toBe(true);
    const appliedExemptions = result.metadata?.appliedExemptions as string[];
    // FOOD is not exempt in NY
    expect(appliedExemptions.filter((e) => e.includes('FOOD')).length).toBe(0);
  });

  it('should return exemption data structure', async () => {
    const result = await gate.execute(transactionWithExemptItem);
    expect(result.metadata?.exemptionData).toBeDefined();
    const exemptionData = result.metadata?.exemptionData as any;
    expect(exemptionData.customerExemptions).toBeDefined();
    expect(exemptionData.itemExemptions).toBeDefined();
  });
});


