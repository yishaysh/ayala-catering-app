
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

export interface CalculationSettings {
  sandwichesPerPerson: number;
  pastriesPerPerson: number;
  averageTrayCapacity: number;
  serviceRadiusKm: number; // Feature 4: Delivery Radius
  minOrderFreeDelivery: number; // Feature 4: Threshold
}

export interface EventRatioConfig {
    sandwiches: number;       // Units per person
    pastries: number;         // Units per person
    saladsCoverage: number;   // 0.0 - 2.0 (1.0 = 100% guests covered)
    mainsCoverage: number;    // 0.0 - 2.0
    plattersCoverage: number; // 0.0 - 2.0
    dessertsCoverage: number; // 0.0 - 2.0
}

export interface AdvancedCalculationSettings {
    eventRatios: Record<EventType, EventRatioConfig>;
}

export interface AppSettings {
  min_order_price: number;
  lead_time_hours: number;
  delivery_fee: number;
  is_shop_open: boolean;
}

export interface GuestCalculationResult {
  [itemId: string]: number;
}
