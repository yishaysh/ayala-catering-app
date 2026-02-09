
export type UnitType = 'tray' | 'unit' | 'liter' | 'weight';
export type Category = 
  | 'Salads' 
  | 'Cold Platters' 
  | 'Sandwiches'
  | 'Dips' 
  | 'Main Courses' 
  | 'Pastries' 
  | 'Desserts';

export type EventType = 'brunch' | 'dinner' | 'snack';

export interface FeatureFlags {
  showCalculator: boolean;
  showAI: boolean;
}

export interface MenuItem {
  id: string;
  category: Category;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  price: number;
  unit_type: UnitType;
  serves_min: number;
  serves_max: number;
  is_premium: boolean;
  tags: string[];
  availability_status: boolean;
  image_url?: string;
  allowed_modifications?: string[];
  allowed_modifications_en?: string[];
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
  selected_modifications?: string[];
}

export interface CustomerDetails {
  name: string;
  phone: string;
  location: string;
  distanceKm: number;
}

export interface Coupon {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    is_active: boolean;
    usage_count?: number;
    usage_limit?: number | null; // Added usage limit
    created_at?: string;
}

export interface Order {
    id?: string;
    customer_name: string;
    customer_phone: string;
    event_date: string; // ISO string
    subtotal: number;
    total_price: number;
    discount_amount: number;
    coupon_code?: string;
    items: CartItem[]; // Stored as JSONB
    status: 'pending' | 'approved' | 'completed' | 'cancelled';
    created_at?: string;
}

export interface CalculationSettings {
  sandwichesPerPerson: number;
  pastriesPerPerson: number;
  averageTrayCapacity: number;
  serviceRadiusKm: number;
  minOrderFreeDelivery: number;
  aiCustomInstructions: string; 
}

export interface EventRatioConfig {
    sandwiches: number;       
    pastries: number;         
    saladsCoverage: number;   
    mainsCoverage: number;    
    plattersCoverage: number; 
    dessertsCoverage: number; 
}

export interface AdvancedCalculationSettings {
    eventRatios: Record<EventType, EventRatioConfig>;
}

export interface AppSettings {
  min_order_price: number;
  lead_time_hours: number;
  delivery_fee: number; // Deprecated, kept for backward compatibility logic
  is_shop_open: boolean;
  // New Delivery Logic
  delivery_base_fee: number; 
  delivery_price_per_km: number;
  delivery_min_radius_included: number;
}

export interface GuestCalculationResult {
  [itemId: string]: number;
}
