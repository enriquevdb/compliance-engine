/**
 * Address Validation Gate
 * Validates destination against supported jurisdictions
 * Simulates external service with timeout + fallback pattern
 */

import { BaseGate } from './IGate';
import { GateResult } from './types';
import { TransactionInput } from '../types';
import { isStateSupported, isCitySupported } from '../database/queries/configQueries';

interface AddressValidationCache {
  [key: string]: boolean; // "state:city" -> isValid
}

// Simple in-memory cache for fallback
const addressCache: AddressValidationCache = {};

// Simulate external service failure
const EXTERNAL_SERVICE_TIMEOUT_MS = 100;
const EXTERNAL_SERVICE_FAILURE_RATE = 0.1; // 10% failure rate for testing

export class AddressValidationGate extends BaseGate {
  protected getGateName(): string {
    return 'AddressValidation';
  }

  async execute(transaction: TransactionInput, _context?: Record<string, unknown>): Promise<GateResult> {
    const { country, state, city } = transaction.destination;

    // Check cache first
    const cacheKey = `${state}:${city}`;
    if (cacheKey in addressCache) {
      const isValid = addressCache[cacheKey];
      if (isValid) {
        return this.createPassResult('Valid address (from cache)', { source: 'cache' });
      } else {
        return this.createFailResult(
          `Unsupported destination: ${city}, ${state}`,
          'VALIDATION',
          { country, state, city }
        );
      }
    }

    // Simulate external service call with timeout + failure
    try {
      const isValid = await this.validateWithExternalService(country, state, city);
      
      // Cache result
      addressCache[cacheKey] = isValid;

      if (isValid) {
        return this.createPassResult('Valid US address', { source: 'external_service' });
      } else {
        return this.createFailResult(
          `Unsupported destination: ${city}, ${state}`,
          'VALIDATION',
          { country, state, city }
        );
      }
    } catch (error) {
      // External service failure - fallback to local validation
      return await this.fallbackValidation(country, state, city, cacheKey);
    }
  }

  private async validateWithExternalService(country: string, state: string, city: string): Promise<boolean> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate timeout
    if (Math.random() < 0.05) {
      // 5% timeout rate
      await new Promise((resolve) => setTimeout(resolve, EXTERNAL_SERVICE_TIMEOUT_MS + 10));
      throw new Error('External service timeout');
    }

    // Simulate service failure
    if (Math.random() < EXTERNAL_SERVICE_FAILURE_RATE) {
      throw new Error('External service unavailable');
    }

    // Actual validation logic (what external service would return)
    if (country !== 'US') {
      return false;
    }

    if (!(await isStateSupported(state))) {
      return false;
    }

    if (!(await isCitySupported(state, city))) {
      return false;
    }

    return true;
  }

  private async fallbackValidation(country: string, state: string, city: string, cacheKey: string): Promise<GateResult> {
    // Fallback: Use local validation rules
    if (country !== 'US') {
      addressCache[cacheKey] = false;
      return this.createFailResult(
        `Unsupported country: ${country}. Only US is supported`,
        'DEPENDENCY',
        { country, state, city, fallback: true }
      );
    }

    if (!(await isStateSupported(state))) {
      addressCache[cacheKey] = false;
      return this.createFailResult(
        `Unsupported state: ${state}`,
        'DEPENDENCY',
        { country, state, city, fallback: true }
      );
    }

    if (!(await isCitySupported(state, city))) {
      addressCache[cacheKey] = false;
      return this.createFailResult(
        `Unsupported city: ${city} in state ${state}`,
        'DEPENDENCY',
        { country, state, city, fallback: true }
      );
    }

    // Valid address
    addressCache[cacheKey] = true;
    return this.createPassResult('Valid US address (fallback validation)', {
      source: 'fallback',
      country,
      state,
      city,
    });
  }
}


