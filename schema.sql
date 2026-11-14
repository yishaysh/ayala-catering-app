-- Canonical Database Schema for Ayala Catering (aligned with Migration 001)
-- Public browser access to PostgreSQL is disabled; all operations run through server-side /api endpoints.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    description_en TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit_type VARCHAR(20) CHECK (unit_type IN ('tray', 'liter', 'unit')) DEFAULT 'tray',
    serves_min INTEGER DEFAULT 1,
    serves_max INTEGER DEFAULT 1,
    is_premium BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    dietary_tags TEXT[] DEFAULT '{}',
    allergen_info JSONB,
    availability_status BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    allowed_modifications TEXT[] DEFAULT '{}',
    allowed_modifications_en TEXT[] DEFAULT '{}',
    is_tray BOOLEAN DEFAULT TRUE,
    units_per_tray INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schema_version INTEGER NOT NULL DEFAULT 2,
    reference_code VARCHAR(32),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    event_date TIMESTAMP NOT NULL,
    event_time VARCHAR(16),
    total_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    coupon_code VARCHAR(50),
    items JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    event_type VARCHAR(50) DEFAULT 'general',
    wants_setup BOOLEAN DEFAULT FALSE,
    delivery_method VARCHAR(20) NOT NULL DEFAULT 'pickup',
    delivery_address TEXT,
    resolved_location TEXT,
    distance_km NUMERIC(8, 2),
    adult_count INTEGER,
    child_count INTEGER,
    allergy_notes TEXT,
    delivery_fee NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    idempotency_key VARCHAR(128),
    quote_token_hash VARCHAR(128),
    quote_token_expires_at TIMESTAMPTZ,
    notification_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    notification_error TEXT,
    handoff_status VARCHAR(32) NOT NULL DEFAULT 'not_opened',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
    ON orders (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_quote_token_hash
    ON orders (quote_token_hash)
    WHERE quote_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS coupons (
    code VARCHAR(50) PRIMARY KEY,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
    discount_value NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS app_telemetry_events (
    id BIGSERIAL PRIMARY KEY,
    event_name VARCHAR(64) NOT NULL,
    meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_rate_limits (
    bucket_key VARCHAR(160) PRIMARY KEY,
    hit_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE UPPER(code) = UPPER(coupon_code)
    AND is_active = TRUE
    AND (usage_limit IS NULL OR COALESCE(usage_count, 0) < usage_limit);
END;
$$ LANGUAGE plpgsql;

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_rate_limits ENABLE ROW LEVEL SECURITY;
