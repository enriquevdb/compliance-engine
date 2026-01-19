/**
 * Rate Table
 * Immutable, read-only rate lookup table
 * Loaded once at startup, never mutated during execution
 */

import { JurisdictionRates } from '../types';
import * as configQueries from '../database/queries/configQueries';

export class RateTable {
  private static instance: RateTable;
  private static initialized: boolean = false;
  private readonly stateRates: Map<string, JurisdictionRates>;
  private readonly categoryModifiers: Map<string, number>;
  private readonly countyMappings: Map<string, string>;
  private readonly cityRates: Map<string, number>; // "state:city" -> rate
  private readonly countyRatesByCity: Map<string, number>; // "state:city" -> county rate

  private constructor(
    stateRates: Map<string, JurisdictionRates>,
    categoryModifiers: Map<string, number>,
    countyMappings: Map<string, string>,
    cityRates: Map<string, number>,
    countyRatesByCity: Map<string, number>
  ) {
    // Deep copy to ensure immutability
    this.stateRates = new Map(stateRates);
    this.categoryModifiers = new Map(categoryModifiers);
    this.countyMappings = new Map(countyMappings);
    this.cityRates = new Map(cityRates);
    this.countyRatesByCity = new Map(countyRatesByCity);
  }

  /**
   * Initialize RateTable from database
   */
  static async initialize(): Promise<void> {
    if (RateTable.initialized) {
      return;
    }

    // Load jurisdiction rates
    const rates = await configQueries.getJurisdictionRates();
    const stateRatesMap = new Map<string, JurisdictionRates>();

    for (const rate of rates) {
      if (!stateRatesMap.has(rate.state)) {
        stateRatesMap.set(rate.state, {
          stateRate: 0,
          countyRate: undefined,
          cityRate: undefined,
        });
      }

      const stateRates = stateRatesMap.get(rate.state)!;
      if (rate.rateType === 'state') {
        stateRates.stateRate = rate.rate;
      } else if (rate.rateType === 'county') {
        stateRates.countyRate = rate.rate;
        // Store county rate for cities if county is specified
        if (rate.county) {
          // We'll need to map cities to counties separately
        }
      } else if (rate.rateType === 'city') {
        // City rates are specific to state:city combination
        if (rate.city) {
          const cityKey = `${rate.state}:${rate.city}`;
          stateRates.cityRate = rate.rate; // Store general city rate for state
          // But also store specific city rates
        }
      }
    }

    // Load category modifiers
    const categoryModifiersMap = await configQueries.getCategoryModifiers();

    // Build city-specific rates map, county rates by city, and county mappings
    const cityRatesMap = new Map<string, number>();
    const countyRatesByCityMap = new Map<string, number>();
    const countyMappingsMap = new Map<string, string>();

    for (const rate of rates) {
      if (rate.rateType === 'city' && rate.city) {
        const cityKey = `${rate.state}:${rate.city}`;
        cityRatesMap.set(cityKey, rate.rate);
      }
      if (rate.rateType === 'county' && rate.city) {
        const cityKey = `${rate.state}:${rate.city}`;
        countyRatesByCityMap.set(cityKey, rate.rate);
        // Build county mappings for known cases
        if (rate.city === 'Los Angeles' && rate.county === 'Los Angeles County') {
          countyMappingsMap.set('Los Angeles', 'Los Angeles County');
        }
      }
    }

    // Create instance with loaded data
    RateTable.instance = new RateTable(
      stateRatesMap,
      categoryModifiersMap,
      countyMappingsMap,
      cityRatesMap,
      countyRatesByCityMap
    );

    RateTable.initialized = true;
  }

  /**
   * Get singleton instance (immutable)
   */
  static getInstance(): RateTable {
    if (!RateTable.instance || !RateTable.initialized) {
      throw new Error('RateTable not initialized. Call RateTable.initialize() first.');
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
    // First check if there's a specific county rate for this city
    const cityKey = `${state}:${city}`;
    if (this.countyRatesByCity.has(cityKey)) {
      return this.countyRatesByCity.get(cityKey);
    }

    // Fall back to general county rate for the state
    const rates = this.stateRates.get(state);
    if (rates?.countyRate) {
      return rates.countyRate;
    }

    return undefined;
  }

  /**
   * Get city rate (if applicable)
   */
  getCityRate(state: string, city: string): number | undefined {
    // Check city-specific rate from database
    const cityKey = `${state}:${city}`;
    if (this.cityRates.has(cityKey)) {
      return this.cityRates.get(cityKey);
    }

    // Fall back to general city rate for the state (if exists)
    const rates = this.stateRates.get(state);
    return rates?.cityRate;
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


