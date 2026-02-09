
-- =============================================
-- MASTER RESET SCRIPT FOR AYALA CATERING
-- =============================================
-- WARNING: This script drops all existing tables and data.
-- Run this only when you want a fresh start.
-- =============================================

-- 1. Clean Up (Drop existing objects)
DROP FUNCTION IF EXISTS increment_coupon_usage;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

-- 2. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Create Tables

-- A. Menu Items
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    description_en TEXT,
    price DECIMAL(10, 2) NOT NULL,
    unit_type VARCHAR(20) CHECK (unit_type IN ('tray', 'unit', 'liter', 'weight')),
    serves_min INT DEFAULT 1,
    serves_max INT DEFAULT 1,
    is_premium BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    availability_status BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    allowed_modifications TEXT[],
    allowed_modifications_en TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B. Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    event_date TIMESTAMP NOT NULL,
    total_price DECIMAL(10, 2), 
    subtotal DECIMAL(10, 2),    
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    coupon_code VARCHAR(50),
    items JSONB,
    status VARCHAR(20) DEFAULT 'pending', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- C. Coupons
CREATE TABLE coupons (
    code VARCHAR(50) PRIMARY KEY,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INT DEFAULT 0,
    usage_limit INT DEFAULT NULL, -- NULL means unlimited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- D. App Settings (Key-Value Store)
CREATE TABLE app_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 5. Define Policies (Open Access for MVP)
-- Note: In a stricter production environment, 'write' access would be restricted to authenticated admin users.
-- Since this app uses a client-side PIN logic, we allow public writes but rely on the app logic.

-- Menu Items
CREATE POLICY "Enable read access for all users" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON menu_items FOR ALL USING (true) WITH CHECK (true);

-- Orders
CREATE POLICY "Enable read access for all users" ON orders FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON orders FOR INSERT WITH CHECK (true);

-- Coupons
CREATE POLICY "Enable read access for all users" ON coupons FOR SELECT USING (true); 
CREATE POLICY "Enable write access for all users" ON coupons FOR ALL USING (true) WITH CHECK (true);

-- App Settings
CREATE POLICY "Enable read access for all users" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- 6. Helper Functions (RPC)

-- Function to safely increment coupon usage atomically
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons
  SET usage_count = usage_count + 1
  WHERE code = coupon_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Seed Initial Data (Defaults)

-- Default Config
INSERT INTO app_settings (key, value)
VALUES 
  ('config', '{"min_order_price": 500, "lead_time_hours": 48, "delivery_fee": 50, "is_shop_open": true}'::jsonb),
  ('features', '{"showCalculator": true, "showAI": false}'::jsonb);

-- Optional: Sample Coupon
INSERT INTO coupons (code, discount_type, discount_value, usage_limit)
VALUES ('WELCOME10', 'percentage', 10, 100);

