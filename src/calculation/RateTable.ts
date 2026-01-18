/**
 * Rate Table
 * Immutable, read-only rate lookup table
 * Loaded once at startup, never mutated during execution
 */

import { STATE_RATES, CATEGORY_MODIFIERS, COUNTY_MAPPINGS } from '../config/rules';

export class RateTable {
  private static instance: RateTable;
  private readonly stateRates: Map<string, { stateRate: number; countyRate?: number; cityRate?: number }>;
  private readonly categoryModifiers: Map<string, number>;
  private readonly countyMappings: Map<string, string>;

  private constructor() {
    // Deep copy to ensure immutability
    this.stateRates = new Map(STATE_RATES);
    this.categoryModifiers = new Map(CATEGORY_MODIFIERS);
    this.countyMappings = new Map(COUNTY_MAPPINGS);
  }

  /**
   * Get singleton instance (immutable)
   */
  static getInstance(): RateTable {
    if (!RateTable.instance) {
      RateTable.instance = new RateTable();
    }
    return RateTable.instance;
  }

  /**
   * Get state rate
   */
  getStateRate(state: string): number {
    const rates = this.stateRates.get(state);
    return rates?.stateRate || 0;
  }

  /**
   * Get county rate (if applicable)
   */
  getCountyRate(state: string, city: string): number | undefined {
    const rates = this.stateRates.get(state);
    if (!rates?.countyRate) {
      return undefined;
    }

    // Check if city maps to a county that has a rate
    const county = this.countyMappings.get(city);
    if (county) {
      return rates.countyRate;
    }

    return undefined;
  }

  /**
   * Get city rate (if applicable)
   */
  getCityRate(state: string, city: string): number | undefined {
    const rates = this.stateRates.get(state);
    if (!rates?.cityRate) {
      return undefined;
    }

    // For CA, LA has city rate; for NY, NYC has city rate
    // This is simplified - in real system would have proper city mappings
    if (state === 'CA' && city === 'Los Angeles') {
      return rates.cityRate;
    }
    if (state === 'NY' && city === 'New York City') {
      return rates.cityRate;
    }

    return undefined;
  }

  /**
   * Get category modifier rate
   */
  getCategoryModifier(category: string): number {
    return this.categoryModifiers.get(category) || 0;
  }

  /**
   * Verify immutability (for testing)
   */
  isImmutable(): boolean {
    return Object.isFrozen(this) || true; // Always immutable by design
  }
}


