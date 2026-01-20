
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
    sandwiches: number;       // Units per person
    pastries: number;         // Units per person
    saladsCoverage: number;   // 0.0 - 2.0 (1.0 = 100% guests covered)
    mainsCoverage: number;    // 0.0 - 2.0
    plattersCoverage: number; // 0.0 - 2.0
    dessertsCoverage: number; // 0.0 - 2.0
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

/**
 * Global declaration to inform TypeScript about the pre-configured 
 * aistudio object available on the window during execution.
 */
declare global {
  // Define AIStudio interface to match the global type name expected by the compiler
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Declarations for existing properties on global interfaces must have identical modifiers (readonly) and types (AIStudio)
    readonly aistudio: AIStudio;
  }
}

export {};
