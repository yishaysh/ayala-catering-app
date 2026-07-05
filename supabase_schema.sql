
-- =============================================
-- MASTER RESET SCRIPT FOR AYALA CATERING
-- =============================================
-- WARNING: This script drops all existing tables and data.
-- Run this only when you want a fresh start.
-- =============================================

-- 1. Clean Up (No destructive drops, safe to re-run)

-- 2. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Create Tables

-- A. Menu Items
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
    is_tray BOOLEAN DEFAULT FALSE,
    units_per_tray INT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B. Orders
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
    event_type VARCHAR(50),
    wants_setup BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- C. Coupons
CREATE TABLE IF NOT EXISTS coupons (
    code VARCHAR(50) PRIMARY KEY,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INT DEFAULT 0,
    usage_limit INT DEFAULT NULL, -- NULL means unlimited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- D. App Settings (Key-Value Store)
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB
);

-- E. Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 5. Define Policies (Open Access for MVP)
-- Note: In a stricter production environment, 'write' access would be restricted to authenticated admin users.
-- Since this app uses a client-side PIN logic, we allow public writes but rely on the app logic.

-- Menu Items
DROP POLICY IF EXISTS "Enable read access for all users" ON menu_items;
CREATE POLICY "Enable read access for all users" ON menu_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable write access for all users" ON menu_items;
CREATE POLICY "Enable write access for all users" ON menu_items FOR ALL USING (true) WITH CHECK (true);

-- Orders
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
CREATE POLICY "Enable read access for all users" ON orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON orders;
CREATE POLICY "Enable insert access for all users" ON orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON orders;
CREATE POLICY "Enable update access for all users" ON orders FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON orders;
CREATE POLICY "Enable delete access for all users" ON orders FOR DELETE USING (true);

-- Coupons
DROP POLICY IF EXISTS "Enable read access for all users" ON coupons;
CREATE POLICY "Enable read access for all users" ON coupons FOR SELECT USING (true); 
DROP POLICY IF EXISTS "Enable write access for all users" ON coupons;
CREATE POLICY "Enable write access for all users" ON coupons FOR ALL USING (true) WITH CHECK (true);

-- App Settings
DROP POLICY IF EXISTS "Enable read access for all users" ON app_settings;
CREATE POLICY "Enable read access for all users" ON app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable write access for all users" ON app_settings;
CREATE POLICY "Enable write access for all users" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Reviews
DROP POLICY IF EXISTS "Enable read access for all users" ON reviews;
CREATE POLICY "Enable read access for all users" ON reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON reviews;
CREATE POLICY "Enable insert access for all users" ON reviews FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON reviews;
CREATE POLICY "Enable delete access for all users" ON reviews FOR DELETE USING (true);

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
  ('features', '{"showCalculator": true, "showAI": false}'::jsonb),
  ('calculation_settings', '{"sandwichesPerPerson": 1.5, "pastriesPerPerson": 1.0, "averageTrayCapacity": 10, "serviceRadiusKm": 50, "minOrderFreeDelivery": 2000, "aiCustomInstructions": "", "setupServiceDetailsHe": "✨ שירות עריכה ופינוי מקצועי לאירוע ללא דאגות ✨\\n\\nהשירות כולל:\\n• 👩‍🍳 שעה של איילה בתחילת האירוע לארגון וסידור הבופה והסלטים בצורה מרהיבה.\\n• 👥 שתי עובדות מקצועיות שילוו את האירוע שלכם (5 שעות עבודה לכל אחת).\\n• 🍽️ עריכת השולחנות והבופה, הגשה ונוכחות מלאה במהלך האירוע.\\n• 🧹 פינוי וניקיון מלא בסיום האירוע.\\n\\n💵 עלות השירות: תוספת של ₪1,000 למחיר הכולל.\\n*(בתיאום מראש בלבד)*", "setupServiceDetailsEn": "✨ Professional Setup & Cleanup Service ✨\\n\\nThe service includes:\\n• 👩‍🍳 1 hour of Ayala\'s personal setup at the beginning to arrange the buffet and salads beautifully.\\n• 👥 Two professional staff members hosting your event (5 hours of work each).\\n• 🍽️ Setting tables and buffet, serving, and full presence during the event.\\n• 🧹 Complete clearing and cleanup at the end.\\n\\n💵 Service Fee: An additional ₪1,000 to the total price.\\n*(Coordinated in advance)*"}'::jsonb),
  ('advanced_settings', '{"eventRatios": {"basic": {"sandwiches": 0.0, "pastries": 0.0, "saladsCoverage": 0.1, "mainsCoverage": 0.1, "plattersCoverage": 0.067, "dessertsCoverage": 0.0, "dipsCoverage": 0.0}, "plus": {"sandwiches": 1.0, "pastries": 0.8, "saladsCoverage": 0.12, "mainsCoverage": 0.12, "plattersCoverage": 0.083, "dessertsCoverage": 0.04, "dipsCoverage": 0.05}, "premium": {"sandwiches": 1.5, "pastries": 1.2, "saladsCoverage": 0.15, "mainsCoverage": 0.15, "plattersCoverage": 0.117, "dessertsCoverage": 0.067, "dipsCoverage": 0.1}}}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Optional: Sample Coupon
INSERT INTO coupons (code, discount_type, discount_value, usage_limit)
VALUES ('WELCOME10', 'percentage', 10, 100)
ON CONFLICT (code) DO NOTHING;

