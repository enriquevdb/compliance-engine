/**
 * Contract tests: Verify exact response structure matches Appendix A
 */

import { ComplianceEngine } from '../../ComplianceEngine';
import { ComplianceResponse } from '../../types';
import { validTransactionCA } from '../fixtures/transactions';

describe('Response Contract (Appendix A)', () => {
  let engine: ComplianceEngine;

  beforeEach(() => {
    engine = new ComplianceEngine();
  });

  it('should match Appendix A response structure exactly', async () => {
    const response = await engine.process(validTransactionCA);

    // Top-level structure
    expect(response).toHaveProperty('transactionId');
    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('gates');
    expect(response).toHaveProperty('calculation');
    expect(response).toHaveProperty('auditTrail');

    // Status must be one of the defined values
    expect(['CALCULATED', 'FAILED', 'REJECTED']).toContain(response.status);

    // Gates structure
    expect(Array.isArray(response.gates)).toBe(true);
    for (const gate of response.gates) {
      expect(gate).toHaveProperty('name');
      expect(gate).toHaveProperty('passed');
      expect(typeof gate.name).toBe('string');
      expect(typeof gate.passed).toBe('boolean');

      // Gate names must match Appendix A exactly
      expect(['ADDRESS_VALIDATION', 'APPLICABILITY', 'EXEMPTION_CHECK']).toContain(gate.name);

      // EXEMPTION_CHECK must have appliedExemptions array
      if (gate.name === 'EXEMPTION_CHECK') {
        expect(gate).toHaveProperty('appliedExemptions');
        expect(Array.isArray(gate.appliedExemptions)).toBe(true);
      }
    }

    // Calculation structure
    if (response.calculation) {
      expect(response.calculation).toHaveProperty('items');
      expect(response.calculation).toHaveProperty('totalFees');
      expect(response.calculation).toHaveProperty('effectiveRate');

      expect(Array.isArray(response.calculation.items)).toBe(true);
      expect(typeof response.calculation.totalFees).toBe('number');
      expect(typeof response.calculation.effectiveRate).toBe('number');

      // Item structure
      for (const item of response.calculation.items) {
        expect(item).toHaveProperty('itemId');
        expect(item).toHaveProperty('amount');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('fees');
        expect(item).toHaveProperty('totalFee');

        // Fees structure
        expect(item.fees).toHaveProperty('stateRate');
        expect(item.fees).toHaveProperty('categoryModifier');

        // State rate structure
        expect(item.fees.stateRate).toHaveProperty('jurisdiction');
        expect(item.fees.stateRate).toHaveProperty('rate');
        expect(item.fees.stateRate).toHaveProperty('amount');

        // Category modifier structure
        expect(item.fees.categoryModifier).toHaveProperty('category');
        expect(item.fees.categoryModifier).toHaveProperty('rate');
        expect(item.fees.categoryModifier).toHaveProperty('amount');

        // Optional county/city rates
        if (item.fees.countyRate) {
          expect(item.fees.countyRate).toHaveProperty('jurisdiction');
          expect(item.fees.countyRate).toHaveProperty('rate');
          expect(item.fees.countyRate).toHaveProperty('amount');
        }

        if (item.fees.cityRate) {
          expect(item.fees.cityRate).toHaveProperty('jurisdiction');
          expect(item.fees.cityRate).toHaveProperty('rate');
          expect(item.fees.cityRate).toHaveProperty('amount');
        }
      }
    }

    // Audit trail
    expect(Array.isArray(response.auditTrail)).toBe(true);
    expect(response.auditTrail.every((msg) => typeof msg === 'string')).toBe(true);
  });

  it('should match Appendix A example values for CA SOFTWARE transaction', async () => {
    const response = await engine.process(validTransactionCA);

    expect(response.status).toBe('CALCULATED');

    // Verify gate messages match pattern
    const addressGate = response.gates.find((g) => g.name === 'ADDRESS_VALIDATION');
    expect(addressGate?.passed).toBe(true);
    expect(addressGate?.message).toContain('Valid');

    const applicabilityGate = response.gates.find((g) => g.name === 'APPLICABILITY');
    expect(applicabilityGate?.passed).toBe(true);
    expect(applicabilityGate?.message).toContain('threshold');

    // Verify calculation matches expected values
    if (response.calculation) {
      const item = response.calculation.items[0];
      expect(item.amount).toBe(100.0);
      expect(item.category).toBe('SOFTWARE');

      // State rate: 6% = $6.00
      expect(item.fees.stateRate.jurisdiction).toBe('CA');
      expect(item.fees.stateRate.rate).toBe(0.06);
      expect(item.fees.stateRate.amount).toBeCloseTo(6.0, 2);

      // County rate: 0.25% = $0.25
      if (item.fees.countyRate) {
        expect(item.fees.countyRate.rate).toBe(0.0025);
        expect(item.fees.countyRate.amount).toBeCloseTo(0.25, 2);
      }

      // City rate: 2.25% = $2.25
      if (item.fees.cityRate) {
        expect(item.fees.cityRate.rate).toBe(0.0225);
        expect(item.fees.cityRate.amount).toBeCloseTo(2.25, 2);
      }

      // Category modifier: 1% = $1.00
      expect(item.fees.categoryModifier.category).toBe('SOFTWARE');
      expect(item.fees.categoryModifier.rate).toBe(0.01);
      expect(item.fees.categoryModifier.amount).toBeCloseTo(1.0, 2);

      // Total fee: $9.50
      expect(item.totalFee).toBeCloseTo(9.5, 2);
      expect(response.calculation.totalFees).toBeCloseTo(9.5, 2);

      // Effective rate: 9.5%
      expect(response.calculation.effectiveRate).toBeCloseTo(0.095, 4);
    }
  });

  it('should serialize to JSON matching Appendix A format', async () => {
    const response = await engine.process(validTransactionCA);
    const json = JSON.stringify(response, null, 2);

    // Parse back to verify structure
    const parsed = JSON.parse(json) as ComplianceResponse;

    expect(parsed.transactionId).toBe(response.transactionId);
    expect(parsed.status).toBe(response.status);
    expect(parsed.gates).toHaveLength(response.gates.length);
    expect(parsed.calculation).toBeDefined();
    expect(parsed.auditTrail).toHaveLength(response.auditTrail.length);
  });
});


