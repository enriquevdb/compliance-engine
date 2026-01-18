/**
 * Immutable rule configuration matching test data assumptions
 * Loaded once at startup, never mutated during execution
 */

// Supported Jurisdictions
export const SUPPORTED_STATES = ['CA', 'NY', 'TX'] as const;
export const SUPPORTED_CITIES: Record<string, string[]> = {
  CA: ['Los Angeles', 'San Francisco', 'San Diego'],
  NY: ['New York City', 'Buffalo'],
  TX: [] // No specific cities defined in test data
};

// Merchant Thresholds (simplified)
export const MERCHANT_THRESHOLD = 100000; // $100K threshold
export const MERCHANT_VOLUMES: Map<string, Map<string, number>> = new Map([
  ['merchant_456', new Map([['CA', 2300000]])], // $2.3M in CA (above threshold)
  ['merchant_789', new Map([['NY', 50000]])], // $50K in NY (below threshold)
]);

// Exemption Rules
export const CUSTOMER_EXEMPTION_TYPES = ['WHOLESALE'] as const;
export const ITEM_EXEMPTION_RULES: Map<string, string[]> = new Map([
  ['FOOD', ['CA']], // FOOD category exempt in CA, not exempt in NY
]);

// Rate Structure
export interface JurisdictionRates {
  stateRate: number;
  countyRate?: number; // Optional, only for specific counties
  cityRate?: number; // Optional, only for specific cities
}

export const STATE_RATES: Map<string, JurisdictionRates> = new Map([
  [
    'CA',
    {
      stateRate: 0.06, // 6%
      countyRate: 0.0025, // 0.25% for LA County
      cityRate: 0.0225, // 2.25% for Los Angeles
    },
  ],
  [
    'NY',
    {
      stateRate: 0.04, // 4%
      countyRate: 0.005, // 0.5%
      cityRate: 0.01, // 1% for New York City
    },
  ],
  [
    'TX',
    {
      stateRate: 0.0, // Not specified in test data, default to 0
    },
  ],
]);

// Category Modifiers
export const CATEGORY_MODIFIERS: Map<string, number> = new Map([
  ['SOFTWARE', 0.01], // +1%
  ['PHYSICAL_GOODS', 0.0], // +0%
  ['FOOD', 0.0], // +0% (but may be exempt)
]);

// County mappings (for LA County specifically)
export const COUNTY_MAPPINGS: Map<string, string> = new Map([
  ['Los Angeles', 'Los Angeles County'],
]);

/**
 * Check if a state is supported
 */
export function isStateSupported(state: string): boolean {
  return SUPPORTED_STATES.includes(state as typeof SUPPORTED_STATES[number]);
}

/**
 * Check if a city is supported for a given state
 */
export function isCitySupported(state: string, city: string): boolean {
  const cities = SUPPORTED_CITIES[state];
  return cities ? cities.includes(city) : false;
}

/**
 * Get merchant volume for a state
 */
export function getMerchantVolume(merchantId: string, state: string): number {
  const volumes = MERCHANT_VOLUMES.get(merchantId);
  return volumes ? volumes.get(state) || 0 : 0;
}

/**
 * Check if merchant meets threshold
 */
export function merchantMeetsThreshold(merchantId: string, state: string): boolean {
  return getMerchantVolume(merchantId, state) >= MERCHANT_THRESHOLD;
}

/**
 * Check if customer type is exempt
 */
export function isCustomerExempt(customerType: string): boolean {
  return CUSTOMER_EXEMPTION_TYPES.includes(customerType as typeof CUSTOMER_EXEMPTION_TYPES[number]);
}

/**
 * Check if item category is exempt in a given state
 */
export function isItemExempt(category: string, state: string): boolean {
  const exemptStates = ITEM_EXEMPTION_RULES.get(category);
  return exemptStates ? exemptStates.includes(state) : false;
}


