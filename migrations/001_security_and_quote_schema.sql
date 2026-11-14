-- Idempotent Migration 001: Quote schema completeness, idempotency, scoped read-only tokens,
-- review moderation, privacy-safe telemetry, coupon column consistency, and least-privilege RLS hardening.

BEGIN;

-- 1. Extend orders table cleanly without silently discarding fulfillment or event metadata
ALTER TABLE orders ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 2;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reference_code VARCHAR(32);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS event_time VARCHAR(16);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) NOT NULL DEFAULT 'pickup';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS resolved_location TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS adult_count INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS child_count INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS allergy_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_token_hash VARCHAR(128);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_token_expires_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notification_status VARCHAR(32) NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notification_error TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS handoff_status VARCHAR(32) NOT NULL DEFAULT 'not_opened';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_quote_token_hash
  ON orders (quote_token_hash)
  WHERE quote_token_hash IS NOT NULL;

-- 2. Extend menu_items for structured dietary/allergen metadata
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT '{}';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS allergen_info JSONB;

-- 3. Extend reviews for moderation (existing reviews stay approved so legacy testimonials remain visible)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20);
UPDATE reviews SET status = 'approved' WHERE status IS NULL;
ALTER TABLE reviews ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE reviews ALTER COLUMN status SET NOT NULL;

-- 4. Fix increment_coupon_usage column mismatch (usage_count vs used_count)
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

-- 5. Privacy-safe funnel telemetry (aggregate non-PII events only)
CREATE TABLE IF NOT EXISTS app_telemetry_events (
  id BIGSERIAL PRIMARY KEY,
  event_name VARCHAR(64) NOT NULL,
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Server rate-limit tracking table
CREATE TABLE IF NOT EXISTS app_rate_limits (
  bucket_key VARCHAR(160) PRIMARY KEY,
  hit_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Remove overly permissive public RLS write/read policies (P0 Least Privilege)
-- Public catalog access now runs exclusively through server-side API endpoints (/api/public/*),
-- preventing direct browser SQL queries or anonymous tampering on orders, coupons, or settings.
DROP POLICY IF EXISTS "Enable write access for all users" ON menu_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON menu_items;
DROP POLICY IF EXISTS "Enable write access for all users" ON coupons;
DROP POLICY IF EXISTS "Enable read access for all users" ON coupons;
DROP POLICY IF EXISTS "Enable write access for all users" ON app_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON app_settings;
DROP POLICY IF EXISTS "Enable delete access for all users" ON reviews;
DROP POLICY IF EXISTS "Enable insert access for all users" ON reviews;
DROP POLICY IF EXISTS "Enable read access for all users" ON reviews;
DROP POLICY IF EXISTS "Enable delete access for all users" ON orders;
DROP POLICY IF EXISTS "Enable update access for all users" ON orders;
DROP POLICY IF EXISTS "Enable insert access for all users" ON orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_rate_limits ENABLE ROW LEVEL SECURITY;

-- Optional: if a dedicated anonymous/public Postgres role exists, ensure it cannot read PII or write tables.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON orders, coupons, app_settings, reviews, menu_items, app_telemetry_events, app_rate_limits FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON orders, coupons, app_settings, reviews, menu_items, app_telemetry_events, app_rate_limits FROM authenticated;
  END IF;
END $$;

COMMIT;
