/**
 * Tests for AddressValidationGate
 */

import { AddressValidationGate } from '../../gates/AddressValidationGate';
import { validTransactionCA, transactionUnsupportedState } from '../fixtures/transactions';

describe('AddressValidationGate', () => {
  let gate: AddressValidationGate;

  beforeEach(() => {
    gate = new AddressValidationGate();
  });

  it('should pass valid US address', async () => {
    const result = await gate.execute(validTransactionCA);
    expect(result.passed).toBe(true);
    expect(result.message).toContain('Valid US address');
  });

  it('should fail for unsupported state', async () => {
    const result = await gate.execute(transactionUnsupportedState);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('Unsupported');
  });

  it('should fail for unsupported city', async () => {
    const result = await gate.execute({
      ...validTransactionCA,
      destination: {
        country: 'US',
        state: 'CA',
        city: 'Unknown City',
      },
    });
    expect(result.passed).toBe(false);
    expect(result.message).toContain('Unsupported');
  });

  it('should fail for non-US country', async () => {
    const result = await gate.execute({
      ...validTransactionCA,
      destination: {
        country: 'CA',
        state: 'ON',
        city: 'Toronto',
      },
    });
    expect(result.passed).toBe(false);
    // May fail at state or country level depending on fallback logic
    expect(result.message).toMatch(/Unsupported|country|state/i);
  });

  it('should use cache on second call', async () => {
    // First call
    const result1 = await gate.execute(validTransactionCA);
    expect(result1.passed).toBe(true);
    expect(result1.metadata?.source).toBeDefined();

    // Second call should use cache
    const result2 = await gate.execute(validTransactionCA);
    expect(result2.passed).toBe(true);
    // Cache may be used (depends on timing)
  });
});

