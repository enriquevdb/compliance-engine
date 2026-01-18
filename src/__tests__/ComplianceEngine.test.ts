/**
 * Tests for ComplianceEngine
 */

import { ComplianceEngine } from '../ComplianceEngine';
import {
  validTransactionCA,
  transactionMerchantBelowThreshold,
  transactionUnsupportedState,
  invalidTransactionWrongCurrency,
  transactionWithExemptItem,
  transactionWithExemptCustomer,
} from './fixtures/transactions';

describe('ComplianceEngine', () => {
  let engine: ComplianceEngine;

  beforeEach(() => {
    engine = new ComplianceEngine();
  });

  it('should process valid transaction successfully', async () => {
    const response = await engine.process(validTransactionCA);

    expect(response.transactionId).toBe('txn_123');
    expect(response.status).toBe('CALCULATED');
    expect(response.gates).toHaveLength(3); // ADDRESS_VALIDATION, APPLICABILITY, EXEMPTION_CHECK (INPUT_VALIDATION filtered out)
    expect(response.calculation).toBeDefined();
    expect(response.auditTrail.length).toBeGreaterThan(0);

    // Verify gate names match Appendix A
    const gateNames = response.gates.map((g: { name: string }) => g.name);
    expect(gateNames).toContain('ADDRESS_VALIDATION');
    expect(gateNames).toContain('APPLICABILITY');
    expect(gateNames).toContain('EXEMPTION_CHECK');
    expect(gateNames).not.toContain('INPUT_VALIDATION'); // Internal only
  });

  it('should reject transaction with invalid input', async () => {
    const response = await engine.process(invalidTransactionWrongCurrency as any);

    expect(response.status).toBe('REJECTED');
    // InputValidationGate is internal-only, so gates array may be empty if it fails first
    // But auditTrail should contain the failure reason
    expect(response.auditTrail.length).toBeGreaterThan(0);
    expect(response.calculation).toBeUndefined();
  });

  it('should reject transaction with unsupported address', async () => {
    const response = await engine.process(transactionUnsupportedState);

    expect(response.status).toBe('REJECTED');
    expect(response.gates.some((g: { name: string; passed: boolean }) => g.name === 'ADDRESS_VALIDATION' && !g.passed)).toBe(true);
    expect(response.calculation).toBeUndefined();
  });

  it('should reject transaction when merchant is below threshold', async () => {
    const response = await engine.process(transactionMerchantBelowThreshold);

    expect(response.status).toBe('REJECTED');
    expect(response.gates.some((g: { name: string; passed: boolean }) => g.name === 'APPLICABILITY' && !g.passed)).toBe(true);
    expect(response.calculation).toBeUndefined();
  });

  it('should include appliedExemptions in EXEMPTION_CHECK gate', async () => {
    const response = await engine.process(transactionWithExemptItem);

    expect(response.status).toBe('CALCULATED');
    const exemptionGate = response.gates.find((g: { name: string }) => g.name === 'EXEMPTION_CHECK');
    expect(exemptionGate).toBeDefined();
    expect(exemptionGate?.appliedExemptions).toBeDefined();
    expect(Array.isArray(exemptionGate?.appliedExemptions)).toBe(true);
  });

  it('should include empty appliedExemptions array when no exemptions', async () => {
    const response = await engine.process(validTransactionCA);

    expect(response.status).toBe('CALCULATED');
    const exemptionGate = response.gates.find((g: { name: string }) => g.name === 'EXEMPTION_CHECK');
    expect(exemptionGate).toBeDefined();
    expect(exemptionGate?.appliedExemptions).toEqual([]);
  });

  it('should calculate fees correctly for exempt customer', async () => {
    const response = await engine.process(transactionWithExemptCustomer, {
      customerType: 'WHOLESALE',
    });

    expect(response.status).toBe('CALCULATED');
    expect(response.calculation).toBeDefined();
    expect(response.calculation?.totalFees).toBe(0); // Fully exempt
    expect(response.calculation?.items.every((item: { totalFee: number }) => item.totalFee === 0)).toBe(true);
  });

  it('should include effectiveRate in calculation', async () => {
    const response = await engine.process(validTransactionCA);

    expect(response.calculation?.effectiveRate).toBeDefined();
    expect(typeof response.calculation?.effectiveRate).toBe('number');
    expect(response.calculation?.effectiveRate).toBeGreaterThan(0);
  });

  it('should generate audit trail', async () => {
    const response = await engine.process(validTransactionCA);

    expect(response.auditTrail.length).toBeGreaterThan(0);
    expect(Array.isArray(response.auditTrail)).toBe(true);
    expect(response.auditTrail.every((msg: string) => typeof msg === 'string')).toBe(true);
  });
});

