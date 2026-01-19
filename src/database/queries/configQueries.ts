/**
 * Configuration queries
 * Load rates, exemptions, and merchant data from database
 */

import { db } from '../client';

export interface JurisdictionRate {
  state: string;
  county?: string;
  city?: string;
  rateType: 'state' | 'county' | 'city';
  rate: number;
}

export interface CategoryModifier {
  category: string;
  modifierRate: number;
}

export interface MerchantThreshold {
  merchantId: string;
  state: string;
  thresholdAmount: number;
  currentVolume: number;
}

/**
 * Get all jurisdiction rates
 */
export async function getJurisdictionRates(): Promise<JurisdictionRate[]> {
  const result = await db.query<{
    state: string;
    county: string | null;
    city: string | null;
    rate_type: string;
    rate: string;
  }>(`
    SELECT state, county, city, rate_type, rate
    FROM jurisdiction_rates
    ORDER BY state, rate_type
  `);

  return result.rows.map((row) => ({
    state: row.state,
    county: row.county || undefined,
    city: row.city || undefined,
    rateType: row.rate_type as 'state' | 'county' | 'city',
    rate: parseFloat(row.rate),
  }));
}

/**
 * Get state rate
 */
export async function getStateRate(state: string): Promise<number | null> {
  const result = await db.query<{ rate: string }>(
    `SELECT rate FROM jurisdiction_rates WHERE state = $1 AND rate_type = 'state' LIMIT 1`,
    [state]
  );

  return result.rows.length > 0 ? parseFloat(result.rows[0].rate) : null;
}

/**
 * Get county rate for a state/county
 */
export async function getCountyRate(state: string, county?: string): Promise<number | null> {
  if (!county) {
    // Get general county rate (county IS NULL)
    const result = await db.query<{ rate: string }>(
      `SELECT rate FROM jurisdiction_rates WHERE state = $1 AND rate_type = 'county' AND county IS NULL LIMIT 1`,
      [state]
    );
    return result.rows.length > 0 ? parseFloat(result.rows[0].rate) : null;
  }

  const result = await db.query<{ rate: string }>(
    `SELECT rate FROM jurisdiction_rates WHERE state = $1 AND rate_type = 'county' AND county = $2 LIMIT 1`,
    [state, county]
  );

  return result.rows.length > 0 ? parseFloat(result.rows[0].rate) : null;
}

/**
 * Get city rate
 */
export async function getCityRate(state: string, city: string): Promise<number | null> {
  const result = await db.query<{ rate: string }>(
    `SELECT rate FROM jurisdiction_rates WHERE state = $1 AND rate_type = 'city' AND city = $2 LIMIT 1`,
    [state, city]
  );

  return result.rows.length > 0 ? parseFloat(result.rows[0].rate) : null;
}

/**
 * Get all category modifiers
 */
export async function getCategoryModifiers(): Promise<Map<string, number>> {
  const result = await db.query<{ category: string; modifier_rate: string }>(
    `SELECT category, modifier_rate FROM category_modifiers`
  );

  const modifiers = new Map<string, number>();
  for (const row of result.rows) {
    modifiers.set(row.category, parseFloat(row.modifier_rate));
  }

  return modifiers;
}

/**
 * Get merchant thresholds and volumes
 */
export async function getMerchantThresholds(): Promise<Map<string, Map<string, number>>> {
  const result = await db.query<{ merchant_id: string; state: string; current_volume: string }>(
    `SELECT merchant_id, state, current_volume FROM merchant_thresholds`
  );

  const merchantVolumes = new Map<string, Map<string, number>>();
  for (const row of result.rows) {
    if (!merchantVolumes.has(row.merchant_id)) {
      merchantVolumes.set(row.merchant_id, new Map());
    }
    merchantVolumes.get(row.merchant_id)!.set(row.state, parseFloat(row.current_volume));
  }

  return merchantVolumes;
}

/**
 * Get merchant volume for a specific merchant and state
 */
export async function getMerchantVolume(merchantId: string, state: string): Promise<number> {
  const result = await db.query<{ current_volume: string }>(
    `SELECT current_volume FROM merchant_thresholds WHERE merchant_id = $1 AND state = $2`,
    [merchantId, state]
  );

  return result.rows.length > 0 ? parseFloat(result.rows[0].current_volume) : 0;
}

/**
 * Get merchant threshold amount (default is 100000)
 */
export async function getMerchantThreshold(merchantId: string, state: string): Promise<number> {
  const result = await db.query<{ threshold_amount: string }>(
    `SELECT threshold_amount FROM merchant_thresholds WHERE merchant_id = $1 AND state = $2`,
    [merchantId, state]
  );

  return result.rows.length > 0 ? parseFloat(result.rows[0].threshold_amount) : 100000;
}

/**
 * Check if customer type is exempt
 */
export async function isCustomerTypeExempt(customerType: string): Promise<boolean> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM customer_exemptions WHERE customer_type = $1`,
    [customerType]
  );

  return parseInt(result.rows[0].count, 10) > 0;
}

/**
 * Get all customer exemption types
 */
export async function getCustomerExemptionTypes(): Promise<string[]> {
  const result = await db.query<{ customer_type: string }>(
    `SELECT customer_type FROM customer_exemptions`
  );

  return result.rows.map((row) => row.customer_type);
}

/**
 * Check if item category is exempt in a state
 */
export async function isItemCategoryExempt(category: string, state: string): Promise<boolean> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM item_exemption_rules WHERE category = $1 AND state = $2`,
    [category, state]
  );

  return parseInt(result.rows[0].count, 10) > 0;
}

/**
 * Get all item exemption rules
 */
export async function getItemExemptionRules(): Promise<Map<string, string[]>> {
  const result = await db.query<{ category: string; state: string }>(
    `SELECT category, state FROM item_exemption_rules`
  );

  const rules = new Map<string, string[]>();
  for (const row of result.rows) {
    if (!rules.has(row.category)) {
      rules.set(row.category, []);
    }
    rules.get(row.category)!.push(row.state);
  }

  return rules;
}

/**
 * Get supported states
 */
export async function getSupportedStates(): Promise<string[]> {
  const result = await db.query<{ state: string }>(
    `SELECT DISTINCT state FROM jurisdictions WHERE is_supported = true ORDER BY state`
  );

  return result.rows.map((row) => row.state);
}

/**
 * Get supported cities for a state
 */
export async function getSupportedCities(state: string): Promise<string[]> {
  const result = await db.query<{ city: string }>(
    `SELECT city FROM jurisdictions WHERE state = $1 AND is_supported = true AND city IS NOT NULL ORDER BY city`,
    [state]
  );

  return result.rows.map((row) => row.city);
}

/**
 * Check if state is supported
 */
export async function isStateSupported(state: string): Promise<boolean> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM jurisdictions WHERE state = $1 AND is_supported = true`,
    [state]
  );

  return parseInt(result.rows[0].count, 10) > 0;
}

/**
 * Check if city is supported for a state
 */
export async function isCitySupported(state: string, city: string): Promise<boolean> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM jurisdictions WHERE state = $1 AND city = $2 AND is_supported = true`,
    [state, city]
  );

  return parseInt(result.rows[0].count, 10) > 0;
}

