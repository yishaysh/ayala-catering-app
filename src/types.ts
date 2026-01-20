export type UnitType = 'tray' | 'unit' | 'liter' | 'weight';
export type Category = 
  | 'Salads' 
  | 'Cold Platters' 
  | 'Sandwiches'
  | 'Dips' 
  | 'Main Courses' 
  | 'Pastries' 
  | 'Desserts';

export type EventType = 'brunch' | 'dinner' | 'snack' | 'party';
export type HungerLevel = 'light' | 'medium' | 'heavy';

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

export interface CalculationSettings {
  sandwichesPerPerson: number; // Default 1.5
  pastriesPerPerson: number;   // Default 1.0
  averageTrayCapacity: number; // Default 10 (Used for general estimation)
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