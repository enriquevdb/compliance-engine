/**
 * Address Validation Gate
 * Validates destination against supported jurisdictions using database queries
 * Treats database as external service with proper error handling and fallback
 */

import { BaseGate } from './IGate';
import { GateResult } from './types';
import { TransactionInput } from '../types';
import { isStateSupported, isCitySupported } from '../database/queries/configQueries';

interface AddressValidationCache {
  [key: string]: boolean; // "state:city" -> isValid
}

// Simple in-memory cache
const addressCache: AddressValidationCache = {};

// Configuration for database service
const DATABASE_SERVICE_TIMEOUT_MS = 5000; // 5 second timeout

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

    // Try database validation with timeout and error handling
    try {
      const isValid = await this.validateWithDatabaseService(country, state, city);
      
      // Cache result
      addressCache[cacheKey] = isValid;

      if (isValid) {
        return this.createPassResult('Valid US address', { source: 'database' });
      } else {
        return this.createFailResult(
          `Unsupported destination: ${city}, ${state}`,
          'VALIDATION',
          { country, state, city }
        );
      }
    } catch (error) {
      // Database service failure - use fallback strategy
      return await this.handleDatabaseFailure(country, state, city, cacheKey, error);
    }
  }

  /**
   * Validate address using database service with timeout
   */
  private async validateWithDatabaseService(
    country: string,
    state: string,
    city: string
  ): Promise<boolean> {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Database service timeout'));
      }, DATABASE_SERVICE_TIMEOUT_MS);
    });

    // Race between database query and timeout
    const validationPromise = this.performDatabaseValidation(country, state, city);

    try {
      const result = await Promise.race([validationPromise, timeoutPromise]);
      return result;
    } catch (error) {
      // Log database service failure for monitoring
      console.error('Database service error during address validation:', {
        error: error instanceof Error ? error.message : String(error),
        country,
        state,
        city,
      });
      throw error; // Re-throw to trigger fallback
    }
  }

  /**
   * Perform database validation queries
   */
  private async performDatabaseValidation(
    country: string,
    state: string,
    city: string
  ): Promise<boolean> {
    // Validate country (no database call needed)
    if (country !== 'US') {
      return false;
    }

    // Validate state (database query)
    if (!(await isStateSupported(state))) {
      return false;
    }

    // Validate city (database query)
    if (!(await isCitySupported(state, city))) {
      return false;
    }

    return true;
  }

  /**
   * Handle database service failure with fallback strategy
   */
  private async handleDatabaseFailure(
    country: string,
    state: string,
    city: string,
    cacheKey: string,
    error: unknown
  ): Promise<GateResult> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Fallback strategy: Reject transaction with DEPENDENCY error
    // This indicates the system cannot validate the address due to service unavailability
    
    return this.createFailResult(
      `Address validation service unavailable: ${errorMessage}. Cannot validate destination: ${city}, ${state}`,
      'DEPENDENCY',
      {
        country,
        state,
        city,
        fallback: true,
        error: errorMessage,
        source: 'database_failure',
      }
    );
  }
}


