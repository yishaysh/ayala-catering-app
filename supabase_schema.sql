
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Tables (Safe: IF NOT EXISTS)
-- This ensures we don't error out if tables already exist.

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
    items JSONB,
    status VARCHAR(20) DEFAULT 'pending', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB
);

-- 2. Security Fixes (RLS) - This fixes your warnings
-- We enable RLS on all tables.
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 3. Define Policies (Safe Update)
-- We drop existing policies first to prevent "policy already exists" errors when re-running.

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


-- 4. Initial Settings (Safe Insert)
-- Only inserts if the config key doesn't exist
INSERT INTO app_settings (key, value)
VALUES ('config', '{"min_order_price": 500, "lead_time_hours": 48, "delivery_fee": 50, "is_shop_open": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ==========================================
-- SEED DATA (COMMENTED OUT TO PREVENT DUPLICATES)
-- Only uncomment and run these lines if your menu_items table is EMPTY.
-- ==========================================

/*
INSERT INTO menu_items (category, name, description, price, unit_type, serves_min, serves_max) VALUES
('Salads', 'סלט הבית', 'חסה, מלפפונים, עגבניות, בטטה מקורמלת, פטריות חיות, בצל סגול, נבטי חמניה + ויניגרט', 145, 'tray', 8, 10),
('Salads', 'סלט כפרי', 'חסה, עלי בייבי, מלפפונים, עגבניות, בטטה מקורמלת, סלק טרי, חמוציות', 145, 'tray', 8, 10),
('Salads', 'סלט שורשים', 'סלק, גזר, קולורבי, שומר, עלי בייבי, פקאן סיני', 175, 'tray', 8, 10),
('Salads', 'סלט סביח', 'חסה, מלפפונים, עגבניות, חציל מטוגן, ביצה קשה, תפו"א, טחינה', 185, 'tray', 8, 10),
('Salads', 'סלט כרוב', 'כרוב, בצל ירוק, שקדים, שומשום, רוטב סיני', 150, 'tray', 8, 10),
('Salads', 'סלט יווני', 'חסה, ירקות, זיתי קלמטה, בולגרית, זעתר', 175, 'tray', 8, 10),
('Salads', 'סלט עדשים שחורים', 'עדשים, בטטה, בולגרית, בצל סגול, רוקט', 175, 'tray', 8, 10),
('Salads', 'סלט קינואה', 'קינואה, בטטה, בצל סגול, רוקט, סלק', 175, 'tray', 8, 10);

INSERT INTO menu_items (category, name, description, price, unit_type, serves_min, serves_max) VALUES
('Cold Platters', 'מגש אנטיפסטי עשיר', 'מגוון ירקות קלויים', 230, 'tray', 15, 15),
('Cold Platters', 'מגש ירקות עשיר (בינוני)', 'ירקות טריים חתוכים', 160, 'tray', 10, 10),
('Cold Platters', 'מגש ירקות עשיר (גדול)', 'ירקות טריים חתוכים', 200, 'tray', 15, 15),
('Cold Platters', 'מגש טורטיות ממולאות', 'סביח / חציל ובולגרית / טונה (48 יחידות)', 290, 'tray', 15, 15),
('Cold Platters', 'מגש ברוסקטות', 'מגוון טעמים: סלמון, פסטו, חציל, ריבת בצל (24 יחידות)', 228, 'tray', 10, 12),
('Cold Platters', 'מגש גבינות עשיר', 'מבחר גבינות קשות ורכות', 260, 'tray', 12, 12),
('Cold Platters', 'מגש דגים מעושנים', 'כולל תוספת סלמון מעושן', 250, 'tray', 12, 12),
('Cold Platters', 'מגש קרפצ׳יו סלק', 'עם פטה, סילאן ואגוזים', 150, 'tray', 10, 10),
('Cold Platters', 'גלילות חצילים', 'ממולאות בגבינת שמנת (30 יחידות)', 250, 'tray', 10, 15);

INSERT INTO menu_items (category, name, description, price, unit_type, serves_min, serves_max, is_premium) VALUES
('Sandwiches', 'סנדוויץ׳ בייסיק', 'טונה / חביתה / פסטו ובולגרית / סביח / צהובה', 14, 'unit', 1, 1, FALSE),
('Sandwiches', 'סנדוויץ׳ פרימיום', 'סלק ועיזים / קמומבר / טוניסאי / סלמון ושמנת', 16, 'unit', 1, 1, TRUE),
('Sandwiches', 'מיני פיתה סביח', 'ביס פיתה במילוי סביח', 14, 'unit', 1, 1, FALSE),
('Sandwiches', 'מיני קרואסון מלוח', 'מילוי סלמון / עיזים / קמומבר (12 יחידות)', 180, 'tray', 6, 8, TRUE);

INSERT INTO menu_items (category, name, price, unit_type, serves_min, serves_max) VALUES
('Dips', 'סלט טונה', 120, 'liter', 10, 15),
('Dips', 'סלט אבוקדו (בעונה)', 120, 'liter', 10, 15),
('Dips', 'טחינה ירוקה', 110, 'liter', 10, 15),
('Dips', 'סלט חצילים פיקנטי', 120, 'liter', 10, 15);

INSERT INTO menu_items (category, name, description, price, unit_type, serves_min, serves_max) VALUES
('Main Courses', 'קיש משפחתי', 'פטריות / בטטה / בצל / תרד (קוטר 28)', 151, 'unit', 12, 12),
('Main Courses', 'מיני קיש', 'אישי (קוטר 9)', 13, 'unit', 1, 1),
('Main Courses', 'מחבת שקשוקה', 'עם 10 ביצים', 230, 'tray', 10, 10),
('Main Courses', 'סירות תפו"א', 'בעשבי תיבול', 195, 'tray', 10, 10),
('Main Courses', 'תפו"א מוקרם', 'שמנת וגבינות', 330, 'tray', 15, 18),
('Main Courses', 'פסטה רוזה / שמנת פטריות', 'פסטה איכותית ברטבים', 310, 'tray', 15, 18),
('Main Courses', 'דג סלמון אפוי', 'בעשבי תיבול ושקדים', 450, 'tray', 10, 10),
('Main Courses', 'מרק', 'כתום / בצל / ירקות (5 ליטר)', 320, 'liter', 30, 35);

INSERT INTO menu_items (category, name, price, unit_type, serves_min, serves_max) VALUES
('Pastries', 'לחמניות כוסמין', 5, 'unit', 1, 1),
('Pastries', 'לחם מחמצת', 30, 'unit', 4, 6),
('Pastries', 'פוקצ׳ה אישית', 18, 'unit', 1, 1);

INSERT INTO menu_items (category, name, price, unit_type, serves_min, serves_max) VALUES
('Desserts', 'עוגת גבינה אפויה', 195, 'unit', 12, 12),
('Desserts', 'פאי אגוזים / שוקולד', 195, 'unit', 12, 12),
('Desserts', 'מגש קינוחים אישיים', 219, 'tray', 10, 10);
*/
