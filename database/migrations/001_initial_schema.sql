-- Initial database schema for compliance engine
-- Supports configuration storage, transaction persistence, and audit trails

-- ============================================================================
-- CONFIGURATION TABLES
-- ============================================================================

-- Jurisdictions (states, cities)
CREATE TABLE IF NOT EXISTS jurisdictions (
    id SERIAL PRIMARY KEY,
    state VARCHAR(2) NOT NULL,
    city VARCHAR(100),
    county VARCHAR(100),
    is_supported BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(state, city)
);

CREATE INDEX idx_jurisdictions_state ON jurisdictions(state);
CREATE INDEX idx_jurisdictions_city ON jurisdictions(city) WHERE city IS NOT NULL;

-- Jurisdiction rates (state, county, city rates)
CREATE TABLE IF NOT EXISTS jurisdiction_rates (
    id SERIAL PRIMARY KEY,
    state VARCHAR(2) NOT NULL,
    county VARCHAR(100),
    city VARCHAR(100),
    rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('state', 'county', 'city')),
    rate DECIMAL(10, 6) NOT NULL CHECK (rate >= 0),
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(state, county, city, rate_type, effective_date)
);

CREATE INDEX idx_jurisdiction_rates_state ON jurisdiction_rates(state);
CREATE INDEX idx_jurisdiction_rates_state_city ON jurisdiction_rates(state, city) WHERE city IS NOT NULL;

-- Category modifiers (additional rates by category)
CREATE TABLE IF NOT EXISTS category_modifiers (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL UNIQUE,
    modifier_rate DECIMAL(10, 6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_category_modifiers_category ON category_modifiers(category);

-- Merchant thresholds and volumes
CREATE TABLE IF NOT EXISTS merchant_thresholds (
    id SERIAL PRIMARY KEY,
    merchant_id VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    threshold_amount DECIMAL(12, 2) NOT NULL DEFAULT 100000.00,
    current_volume DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merchant_id, state)
);

CREATE INDEX idx_merchant_thresholds_merchant ON merchant_thresholds(merchant_id);
CREATE INDEX idx_merchant_thresholds_state ON merchant_thresholds(state);

-- Customer exemption types
CREATE TABLE IF NOT EXISTS customer_exemptions (
    id SERIAL PRIMARY KEY,
    customer_type VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_exemptions_type ON customer_exemptions(customer_type);

-- Item exemption rules (category exemptions by state)
CREATE TABLE IF NOT EXISTS item_exemption_rules (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    state VARCHAR(2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, state)
);

CREATE INDEX idx_item_exemption_rules_category ON item_exemption_rules(category);
CREATE INDEX idx_item_exemption_rules_state ON item_exemption_rules(state);

-- ============================================================================
-- TRANSACTION TABLES
-- ============================================================================

-- Transactions (stores full transaction input and response)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    merchant_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    destination_country VARCHAR(2) NOT NULL,
    destination_state VARCHAR(2) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('CALCULATED', 'FAILED', 'REJECTED')),
    transaction_input JSONB NOT NULL,
    transaction_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_destination ON transactions(destination_state, destination_city);

-- Transaction items (normalized item data)
CREATE TABLE IF NOT EXISTS transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_item_id ON transaction_items(item_id);
CREATE INDEX idx_transaction_items_category ON transaction_items(category);

-- ============================================================================
-- AUDIT TRAIL TABLES
-- ============================================================================

-- Audit trails (stores audit trail entries for transactions)
CREATE TABLE IF NOT EXISTS audit_trails (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    audit_entries JSONB NOT NULL, -- Array of audit trail strings
    metadata JSONB, -- Additional metadata if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_trails_transaction_id ON audit_trails(transaction_id);
CREATE INDEX idx_audit_trails_created_at ON audit_trails(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_jurisdictions_updated_at BEFORE UPDATE ON jurisdictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jurisdiction_rates_updated_at BEFORE UPDATE ON jurisdiction_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_modifiers_updated_at BEFORE UPDATE ON category_modifiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchant_thresholds_updated_at BEFORE UPDATE ON merchant_thresholds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

