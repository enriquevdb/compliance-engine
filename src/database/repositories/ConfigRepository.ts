/**
 * Configuration Repository
 * Loads configuration data from database (rates, exemptions, thresholds)
 * All configurations are loaded from the database
 */

import * as configQueries from '../queries/configQueries';
import { JurisdictionRates } from '../../types';

export class ConfigRepository {
  private jurisdictionRatesCache: Map<string, JurisdictionRates> | null = null;
  private categoryModifiersCache: Map<string, number> | null = null;
  private merchantVolumesCache: Map<string, Map<string, number>> | null = null;
  private customerExemptionTypesCache: string[] | null = null;
  private itemExemptionRulesCache: Map<string, string[]> | null = null;
  private supportedStatesCache: string[] | null = null;
  private supportedCitiesCache: Map<string, string[]> | null = null;

  /**
   * Load all configuration from database (cache in memory)
   * Similar to loading rules.ts once at startup
   */
  async loadConfiguration(): Promise<void> {
    // Load jurisdiction rates and build rate structure
    const rates = await configQueries.getJurisdictionRates();
    const ratesMap = new Map<string, JurisdictionRates>();

    for (const rate of rates) {
      if (!ratesMap.has(rate.state)) {
        ratesMap.set(rate.state, {
          stateRate: 0,
          countyRate: undefined,
          cityRate: undefined,
        });
      }

      const stateRates = ratesMap.get(rate.state)!;
      if (rate.rateType === 'state') {
        stateRates.stateRate = rate.rate;
      } else if (rate.rateType === 'county') {
        stateRates.countyRate = rate.rate;
      } else if (rate.rateType === 'city') {
        stateRates.cityRate = rate.rate;
      }
    }

    this.jurisdictionRatesCache = ratesMap;

    // Load category modifiers
    this.categoryModifiersCache = await configQueries.getCategoryModifiers();

    // Load merchant volumes
    this.merchantVolumesCache = await configQueries.getMerchantThresholds();

    // Load customer exemption types
    this.customerExemptionTypesCache = await configQueries.getCustomerExemptionTypes();

    // Load item exemption rules
    this.itemExemptionRulesCache = await configQueries.getItemExemptionRules();

    // Load supported states
    this.supportedStatesCache = await configQueries.getSupportedStates();

    // Load supported cities by state
    this.supportedCitiesCache = new Map();
    for (const state of this.supportedStatesCache) {
      const cities = await configQueries.getSupportedCities(state);
      this.supportedCitiesCache.set(state, cities);
    }
  }

  /**
   * Get jurisdiction rates (state, county, city)
   */
  getJurisdictionRates(): Map<string, JurisdictionRates> {
    if (!this.jurisdictionRatesCache) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }
    return this.jurisdictionRatesCache;
  }

  /**
   * Get state rate
   */
  getStateRate(state: string): number {
    const rates = this.getJurisdictionRates();
    return rates.get(state)?.stateRate || 0;
  }

  /**
   * Get county rate
   */
  getCountyRate(state: string): number | undefined {
    const rates = this.getJurisdictionRates();
    return rates.get(state)?.countyRate;
  }

  /**
   * Get city rate
   */
  getCityRate(state: string): number | undefined {
    const rates = this.getJurisdictionRates();
    return rates.get(state)?.cityRate;
  }

  /**
   * Get category modifiers
   */
  getCategoryModifiers(): Map<string, number> {
    if (!this.categoryModifiersCache) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }
    return this.categoryModifiersCache;
  }

  /**
   * Get merchant volumes by state
   */
  getMerchantVolumes(): Map<string, Map<string, number>> {
    if (!this.merchantVolumesCache) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }
    return this.merchantVolumesCache;
  }

  /**
   * Get merchant volume for a specific merchant and state
   */
  getMerchantVolume(merchantId: string, state: string): number {
    const volumes = this.getMerchantVolumes();
    const merchantVolume = volumes.get(merchantId);
    return merchantVolume ? merchantVolume.get(state) || 0 : 0;
  }

  /**
   * Check if merchant meets threshold (default 100K)
   */
  merchantMeetsThreshold(merchantId: string, state: string): Promise<boolean> {
    // For now, use cached data if available, otherwise query DB
    if (this.merchantVolumesCache) {
      const volume = this.getMerchantVolume(merchantId, state);
      return Promise.resolve(volume >= 100000); // Default threshold
    }
    return configQueries
      .getMerchantVolume(merchantId, state)
      .then((volume) => volume >= 100000);
  }

  /**
   * Get customer exemption types
   */
  getCustomerExemptionTypes(): string[] {
    if (!this.customerExemptionTypesCache) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }
    return this.customerExemptionTypesCache;
  }

  /**
   * Check if customer type is exempt
   */
  isCustomerExempt(customerType: string): boolean {
    const exemptions = this.getCustomerExemptionTypes();
    return exemptions.includes(customerType);
  }

  /**
   * Check if item category is exempt in a state
   */
  isItemExempt(category: string, state: string): Promise<boolean> {
    return configQueries.isItemCategoryExempt(category, state);
  }

  /**
   * Get supported states
   */
  getSupportedStates(): string[] {
    if (!this.supportedStatesCache) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }
    return this.supportedStatesCache;
  }

  /**
   * Get supported cities for a state
   */
  getSupportedCities(state: string): string[] {
    if (!this.supportedCitiesCache) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }
    return this.supportedCitiesCache.get(state) || [];
  }

  /**
   * Check if state is supported
   */
  isStateSupported(state: string): boolean {
    const states = this.getSupportedStates();
    return states.includes(state);
  }

  /**
   * Check if city is supported for a state
   */
  isCitySupported(state: string, city: string): boolean {
    const cities = this.getSupportedCities(state);
    return cities.includes(city);
  }

  /**
   * Clear configuration cache (force reload on next access)
   */
  clearCache(): void {
    this.jurisdictionRatesCache = null;
    this.categoryModifiersCache = null;
    this.merchantVolumesCache = null;
    this.customerExemptionTypesCache = null;
    this.itemExemptionRulesCache = null;
    this.supportedStatesCache = null;
    this.supportedCitiesCache = null;
  }
}

