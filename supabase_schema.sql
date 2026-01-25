
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Tables

CREATE TABLE IF NOT EXISTS menu_items (
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

CREATE TABLE IF NOT EXISTS orders (
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

CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB
);

CREATE TABLE IF NOT EXISTS coupons (
    code VARCHAR(50) PRIMARY KEY,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INT DEFAULT 0,
    usage_limit INT DEFAULT NULL, -- NULL means unlimited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Security Fixes (RLS)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- 3. Define Policies

-- Policies for menu_items
DROP POLICY IF EXISTS "Enable read access for all users" ON menu_items;
DROP POLICY IF EXISTS "Enable write access for all users" ON menu_items;
CREATE POLICY "Enable read access for all users" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON menu_items FOR ALL USING (true) WITH CHECK (true);

-- Policies for app_settings
DROP POLICY IF EXISTS "Enable read access for all users" ON app_settings;
DROP POLICY IF EXISTS "Enable write access for all users" ON app_settings;
CREATE POLICY "Enable read access for all users" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Policies for orders
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
DROP POLICY IF EXISTS "Enable insert access for all users" ON orders;
CREATE POLICY "Enable read access for all users" ON orders FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON orders FOR INSERT WITH CHECK (true);

-- Policies for coupons
DROP POLICY IF EXISTS "Enable read access for all users" ON coupons;
DROP POLICY IF EXISTS "Enable write access for all users" ON coupons;
CREATE POLICY "Enable read access for all users" ON coupons FOR SELECT USING (true); 
CREATE POLICY "Enable write access for all users" ON coupons FOR ALL USING (true) WITH CHECK (true);

-- 4. Initial Settings
INSERT INTO app_settings (key, value)
VALUES ('config', '{"min_order_price": 500, "lead_time_hours": 48, "delivery_fee": 50, "is_shop_open": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. RPC Function to safely increment coupon usage
-- This prevents race conditions and ensures logic runs on the server
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons
  SET usage_count = usage_count + 1
  WHERE code = coupon_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
