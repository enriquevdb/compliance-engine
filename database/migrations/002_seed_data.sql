-- Seed initial configuration data
-- Migrates data from src/config/rules.ts into database tables

-- ============================================================================
-- JURISDICTIONS
-- ============================================================================

INSERT INTO jurisdictions (state, city, is_supported) VALUES
    ('CA', 'Los Angeles', true),
    ('CA', 'San Francisco', true),
    ('CA', 'San Diego', true),
    ('NY', 'New York City', true),
    ('NY', 'Buffalo', true)
ON CONFLICT (state, city) DO NOTHING;

-- ============================================================================
-- JURISDICTION RATES
-- ============================================================================

-- CA Rates
INSERT INTO jurisdiction_rates (state, rate_type, rate) VALUES
    ('CA', 'state', 0.06) -- 6%
ON CONFLICT (state, county, city, rate_type, effective_date) DO NOTHING;

INSERT INTO jurisdiction_rates (state, county, rate_type, rate) VALUES
    ('CA', 'Los Angeles County', 'county', 0.0025) -- 0.25%
ON CONFLICT (state, county, city, rate_type, effective_date) DO NOTHING;

INSERT INTO jurisdiction_rates (state, city, rate_type, rate) VALUES
    ('CA', 'Los Angeles', 'city', 0.0225) -- 2.25%
ON CONFLICT (state, county, city, rate_type, effective_date) DO NOTHING;

-- NY Rates
INSERT INTO jurisdiction_rates (state, rate_type, rate) VALUES
    ('NY', 'state', 0.04) -- 4%
ON CONFLICT (state, county, city, rate_type, effective_date) DO NOTHING;

INSERT INTO jurisdiction_rates (state, county, rate_type, rate) VALUES
    ('NY', NULL, 'county', 0.005) -- 0.5% (general county rate)
ON CONFLICT (state, county, city, rate_type, effective_date) DO NOTHING;

INSERT INTO jurisdiction_rates (state, city, rate_type, rate) VALUES
    ('NY', 'New York City', 'city', 0.01) -- 1%
ON CONFLICT (state, county, city, rate_type, effective_date) DO NOTHING;

-- TX Rates (default to 0)
INSERT INTO jurisdiction_rates (state, rate_type, rate) VALUES
    ('TX', 'state', 0.0)
ON CONFLICT (state, county, city, rate_type, effective_date) DO NOTHING;

-- ============================================================================
-- CATEGORY MODIFIERS
-- ============================================================================

INSERT INTO category_modifiers (category, modifier_rate) VALUES
    ('SOFTWARE', 0.01), -- +1%
    ('PHYSICAL_GOODS', 0.0), -- +0%
    ('FOOD', 0.0) -- +0% (but may be exempt)
ON CONFLICT (category) DO UPDATE SET modifier_rate = EXCLUDED.modifier_rate;

-- ============================================================================
-- MERCHANT THRESHOLDS
-- ============================================================================

-- Merchant threshold configuration
-- Default threshold is 100000 ($100K) - stored in table default
INSERT INTO merchant_thresholds (merchant_id, state, threshold_amount, current_volume) VALUES
    ('merchant_456', 'CA', 100000.00, 2300000.00), -- $2.3M in CA (above threshold)
    ('merchant_789', 'NY', 100000.00, 50000.00) -- $50K in NY (below threshold)
ON CONFLICT (merchant_id, state) DO UPDATE SET current_volume = EXCLUDED.current_volume;

-- ============================================================================
-- CUSTOMER EXEMPTIONS
-- ============================================================================

INSERT INTO customer_exemptions (customer_type, description) VALUES
    ('WHOLESALE', 'Wholesale customers are fully exempt from compliance fees')
ON CONFLICT (customer_type) DO NOTHING;

-- ============================================================================
-- ITEM EXEMPTION RULES
-- ============================================================================

INSERT INTO item_exemption_rules (category, state) VALUES
    ('FOOD', 'CA') -- FOOD category exempt in CA, not exempt in NY
ON CONFLICT (category, state) DO NOTHING;

