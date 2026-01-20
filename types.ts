
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

export interface CalculationSettings {
  sandwichesPerPerson: number;
  pastriesPerPerson: number;
  averageTrayCapacity: number;
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
    hungerMultipliers: Record<HungerLevel, number>;
    eventRatios: Record<EventType, EventRatioConfig>;
}

export interface AppSettings {
  min_order_price: number;
  lead_time_hours: number;
  delivery_fee: number;
  is_shop_open: boolean;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Fixed: Removed readonly modifier to avoid conflicting with existing Window definitions during interface merging.
    aistudio: AIStudio;
  }
}

export {};
