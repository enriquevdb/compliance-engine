/**
 * Tests for ApplicabilityGate
 */

import { ApplicabilityGate } from '../../gates/ApplicabilityGate';
import { validTransactionCA, transactionMerchantBelowThreshold } from '../fixtures/transactions';

describe('ApplicabilityGate', () => {
  let gate: ApplicabilityGate;

  beforeEach(() => {
    gate = new ApplicabilityGate();
  });

  it('should pass when merchant meets threshold', async () => {
    const result = await gate.execute(validTransactionCA);
    expect(result.passed).toBe(true);
    expect(result.message).toContain('above');
    expect(result.metadata?.volume).toBeGreaterThan(100000);
  });

  it('should fail when merchant is below threshold', async () => {
    const result = await gate.execute(transactionMerchantBelowThreshold);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('below threshold');
    expect(result.metadata?.volume).toBeLessThan(100000);
  });

  it('should fail when merchant has no volume data', async () => {
    const result = await gate.execute({
      ...validTransactionCA,
      merchantId: 'merchant_unknown',
    });
    expect(result.passed).toBe(false);
    expect(result.message).toContain('below threshold');
  });
});


