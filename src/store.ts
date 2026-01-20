import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, MenuItem, CalculationSettings, EventType, HungerLevel, AdvancedCalculationSettings } from './types';
import { supabase } from './lib/supabase';

// HARDCODED INITIAL MENU (Fallback)
const INITIAL_MENU: MenuItem[] = [
    // Salads
    { 
        id: 's1', category: 'Salads', 
        name: 'סלט הבית', name_en: 'House Salad',
        description: 'חסה, מלפפונים, עגבניות, בטטה מקורמלת, פטריות חיות, בצל סגול, נבטי חמניה + ויניגרט', description_en: 'Lettuce, cucumbers, tomatoes, caramelized sweet potato, fresh mushrooms, purple onion, sunflower sprouts + Vinaigrette',
        price: 145, unit_type: 'tray', serves_min: 8, serves_max: 10, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['בלי בצל', 'רוטב בצד', 'בלי פטריות'],
        allowed_modifications_en: ['No Onion', 'Sauce on side', 'No Mushrooms']
    },
    { 
        id: 's2', category: 'Salads', 
        name: 'סלט כפרי', name_en: 'Country Salad',
        description: 'חסה, עלי בייבי, מלפפונים, עגבניות, בטטה מקורמלת, סלק טרי, חמוציות', description_en: 'Lettuce, baby leaves, cucumbers, tomatoes, caramelized sweet potato, fresh beets, cranberries',
        price: 145, unit_type: 'tray', serves_min: 8, serves_max: 10, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['בלי סלק', 'רוטב בצד', 'בלי חמוציות'],
        allowed_modifications_en: ['No Beets', 'Sauce on side', 'No Cranberries']
    },
    { 
        id: 's3', category: 'Salads', 
        name: 'סלט שורשים', name_en: 'Root Vegetable Salad',
        description: 'סלק, גזר, קולורבי, שומר, עלי בייבי, פקאן סיני', description_en: 'Beets, carrots, kohlrabi, fennel, baby leaves, candied pecans',
        price: 175, unit_type: 'tray', serves_min: 8, serves_max: 10, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['בלי פקאן', 'רוטב בצד'],
        allowed_modifications_en: ['No Pecans', 'Sauce on side']
    },
    { 
        id: 's4', category: 'Salads', 
        name: 'סלט סביח', name_en: 'Sabich Salad',
        description: 'חסה, מלפפונים, עגבניות, חציל מטוגן, ביצה קשה, תפו"א, טחינה', description_en: 'Lettuce, cucumbers, tomatoes, fried eggplant, hard boiled egg, potato, tahini',
        price: 185, unit_type: 'tray', serves_min: 8, serves_max: 10, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['בלי חציל', 'בלי ביצה', 'טחינה בצד'],
        allowed_modifications_en: ['No Eggplant', 'No Egg', 'Tahini on side']
    },
    { 
        id: 's5', category: 'Salads', 
        name: 'סלט כרוב', name_en: 'Asian Cabbage Salad',
        description: 'כרוב, בצל ירוק, שקדים, שומשום, רוטב סיני', description_en: 'Cabbage, green onion, almonds, sesame, Asian dressing',
        price: 150, unit_type: 'tray', serves_min: 8, serves_max: 10, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['בלי שקדים', 'רוטב בצד'],
        allowed_modifications_en: ['No Almonds', 'Sauce on side']
    },
    { 
        id: 's6', category: 'Salads', 
        name: 'סלט יווני', name_en: 'Greek Salad',
        description: 'חסה, ירקות, זיתי קלמטה, בולגרית, זעתר', description_en: 'Lettuce, vegetables, kalamata olives, bulgarian cheese, zaatar',
        price: 175, unit_type: 'tray', serves_min: 8, serves_max: 10, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['בלי זיתים', 'בלי גבינה', 'רוטב בצד'],
        allowed_modifications_en: ['No Olives', 'No Cheese', 'Sauce on side']
    },
    { 
        id: 's7', category: 'Salads', 
        name: 'סלט עדשים שחורים', name_en: 'Black Lentil Salad',
        description: 'עדשים, בטטה, בולגרית, בצל סגול, רוקט', description_en: 'Black lentils, sweet potato, bulgarian cheese, purple onion, arugula',
        price: 175, unit_type: 'tray', serves_min: 8, serves_max: 10, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['בלי גבינה', 'בלי בצל'],
        allowed_modifications_en: ['No Cheese', 'No Onion']
    },
    { 
        id: 's8', category: 'Salads', 
        name: 'סלט קינואה', name_en: 'Quinoa Salad',
        description: 'קינואה, בטטה, בצל סגול, רוקט, סלק', description_en: 'Quinoa, sweet potato, purple onion, arugula, beets',
        price: 175, unit_type: 'tray', serves_min: 8, serves_max: 10, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['בלי בצל', 'בלי סלק'],
        allowed_modifications_en: ['No Onion', 'No Beets']
    },

    // Cold Platters
    { 
        id: 'cp1', category: 'Cold Platters', 
        name: 'מגש אנטיפסטי עשיר', name_en: 'Rich Antipasti Tray',
        description: 'מגוון ירקות קלויים בתנור', description_en: 'Assorted roasted vegetables',
        price: 230, unit_type: 'tray', serves_min: 15, serves_max: 15, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'cp2', category: 'Cold Platters', 
        name: 'מגש ירקות עשיר (בינוני)', name_en: 'Fresh Vegetable Tray (Medium)',
        description: 'ירקות טריים חתוכים', description_en: 'Freshly cut vegetables',
        price: 160, unit_type: 'tray', serves_min: 10, serves_max: 10, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'cp3', category: 'Cold Platters', 
        name: 'מגש ירקות עשיר (גדול)', name_en: 'Fresh Vegetable Tray (Large)',
        description: 'ירקות טריים חתוכים', description_en: 'Freshly cut vegetables',
        price: 200, unit_type: 'tray', serves_min: 15, serves_max: 15, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'cp4', category: 'Cold Platters', 
        name: 'מגש טורטיות ממולאות', name_en: 'Stuffed Tortillas Tray',
        description: 'סביח / חציל ובולגרית / טונה (48 יחידות)', description_en: 'Sabich / Eggplant & Cheese / Tuna (48 units)',
        price: 290, unit_type: 'tray', serves_min: 15, serves_max: 15, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['רק צמחוני', 'בלי טונה'],
        allowed_modifications_en: ['Vegetarian Only', 'No Tuna']
    },
    { 
        id: 'cp5', category: 'Cold Platters', 
        name: 'מגש ברוסקטות', name_en: 'Bruschetta Tray',
        description: 'מגוון טעמים: סלמון, פסטו, חציל, ריבת בצל (24 יחידות)', description_en: 'Assorted flavors: Salmon, Pesto, Eggplant, Onion Jam (24 units)',
        price: 228, unit_type: 'tray', serves_min: 10, serves_max: 12, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['בלי דגים', 'רק גבינות'],
        allowed_modifications_en: ['No Fish', 'Cheeses Only']
    },
    { 
        id: 'cp6', category: 'Cold Platters', 
        name: 'מגש גבינות עשיר', name_en: 'Rich Cheese Platter',
        description: 'מבחר גבינות קשות ורכות', description_en: 'Selection of hard and soft cheeses',
        price: 260, unit_type: 'tray', serves_min: 12, serves_max: 12, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'cp7', category: 'Cold Platters', 
        name: 'מגש דגים מעושנים', name_en: 'Smoked Fish Platter',
        description: 'כולל תוספת סלמון מעושן', description_en: 'Includes smoked salmon',
        price: 250, unit_type: 'tray', serves_min: 12, serves_max: 12, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'cp8', category: 'Cold Platters', 
        name: 'מגש קרפצ׳יו סלק', name_en: 'Beet Carpaccio',
        description: 'עם פטה, סילאן ואגוזים', description_en: 'With feta, date honey and walnuts',
        price: 150, unit_type: 'tray', serves_min: 10, serves_max: 10, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['בלי אגוזים', 'בלי גבינה'],
        allowed_modifications_en: ['No Nuts', 'No Cheese']
    },
    { 
        id: 'cp9', category: 'Cold Platters', 
        name: 'גלילות חצילים', name_en: 'Eggplant Rolls',
        description: 'ממולאות בגבינת שמנת (30 יחידות)', description_en: 'Stuffed with cream cheese (30 units)',
        price: 250, unit_type: 'tray', serves_min: 10, serves_max: 15, is_premium: false, tags: [], availability_status: true 
    },

    // Sandwiches
    { 
        id: 'sw1', category: 'Sandwiches', 
        name: 'סנדוויץ׳ בייסיק', name_en: 'Basic Sandwich',
        description: 'טונה / חביתה / פסטו ובולגרית / סביח / צהובה', description_en: 'Tuna / Omelet / Pesto & Cheese / Sabich / Gouda',
        price: 14, unit_type: 'unit', serves_min: 1, serves_max: 1, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['לחם מלא', 'לחם לבן'],
        allowed_modifications_en: ['Whole Wheat Bread', 'White Bread']
    },
    { 
        id: 'sw2', category: 'Sandwiches', 
        name: 'סנדוויץ׳ פרימיום', name_en: 'Premium Sandwich',
        description: 'סלק ועיזים / קמומבר / טוניסאי / סלמון ושמנת', description_en: 'Beet & Goat Cheese / Camembert / Tunisian / Salmon & Cream',
        price: 16, unit_type: 'unit', serves_min: 1, serves_max: 1, is_premium: true, tags: [], availability_status: true, 
        allowed_modifications: ['לחם מלא', 'לחם לבן'],
        allowed_modifications_en: ['Whole Wheat Bread', 'White Bread']
    },
    { 
        id: 'sw3', category: 'Sandwiches', 
        name: 'מיני פיתה סביח', name_en: 'Mini Sabich Pita',
        description: 'ביס פיתה במילוי סביח', description_en: 'Bite-sized pita with Sabich filling',
        price: 14, unit_type: 'unit', serves_min: 1, serves_max: 1, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'sw4', category: 'Sandwiches', 
        name: 'מיני קרואסון מלוח', name_en: 'Mini Savory Croissants',
        description: 'מילוי סלמון / עיזים / קמומבר (12 יחידות)', description_en: 'Salmon / Goat Cheese / Camembert filling (12 units)',
        price: 180, unit_type: 'tray', serves_min: 6, serves_max: 8, is_premium: true, tags: [], availability_status: true 
    },

    // Dips
    { 
        id: 'd1', category: 'Dips', 
        name: 'סלט טונה', name_en: 'Tuna Salad',
        description: 'ליטר', description_en: '1 Liter',
        price: 120, unit_type: 'liter', serves_min: 10, serves_max: 15, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'd2', category: 'Dips', 
        name: 'סלט אבוקדו (בעונה)', name_en: 'Avocado Salad (Seasonal)',
        description: 'ליטר', description_en: '1 Liter',
        price: 120, unit_type: 'liter', serves_min: 10, serves_max: 15, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'd3', category: 'Dips', 
        name: 'טחינה ירוקה', name_en: 'Green Tahini',
        description: 'ליטר', description_en: '1 Liter',
        price: 110, unit_type: 'liter', serves_min: 10, serves_max: 15, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'd4', category: 'Dips', 
        name: 'סלט חצילים פיקנטי', name_en: 'Spicy Eggplant Salad',
        description: 'ליטר', description_en: '1 Liter',
        price: 120, unit_type: 'liter', serves_min: 10, serves_max: 15, is_premium: false, tags: [], availability_status: true 
    },

    // Main Courses
    { 
        id: 'm1', category: 'Main Courses', 
        name: 'קיש משפחתי', name_en: 'Family Quiche',
        description: 'פטריות / בטטה / בצל / תרד (קוטר 28)', description_en: 'Mushroom / Sweet Potato / Onion / Spinach (28cm)',
        price: 151, unit_type: 'unit', serves_min: 12, serves_max: 12, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['פטריות', 'בטטה', 'בצל', 'תרד'],
        allowed_modifications_en: ['Mushrooms', 'Sweet Potato', 'Onion', 'Spinach']
    },
    { 
        id: 'm2', category: 'Main Courses', 
        name: 'מיני קיש', name_en: 'Mini Quiche',
        description: 'אישי (קוטר 9)', description_en: 'Personal (9cm)',
        price: 13, unit_type: 'unit', serves_min: 1, serves_max: 1, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'm3', category: 'Main Courses', 
        name: 'מחבת שקשוקה', name_en: 'Shakshuka Pan',
        description: 'עם 10 ביצים', description_en: 'With 10 eggs',
        price: 230, unit_type: 'tray', serves_min: 10, serves_max: 10, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['פיקנטי', 'לא חריף'],
        allowed_modifications_en: ['Spicy', 'Not Spicy']
    },
    { 
        id: 'm4', category: 'Main Courses', 
        name: 'סירות תפו"א', name_en: 'Potato Boats',
        description: 'בעשבי תיבול', description_en: 'In herbs',
        price: 195, unit_type: 'tray', serves_min: 10, serves_max: 10, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'm5', category: 'Main Courses', 
        name: 'תפו"א מוקרם', name_en: 'Creamed Potatoes',
        description: 'שמנת וגבינות', description_en: 'Cream and cheese',
        price: 330, unit_type: 'tray', serves_min: 15, serves_max: 18, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'm6', category: 'Main Courses', 
        name: 'פסטה רוזה / שמנת', name_en: 'Pasta Rosé / Cream',
        description: 'פסטה איכותית ברטבים לבחירה', description_en: 'Quality pasta with choice of sauce',
        price: 310, unit_type: 'tray', serves_min: 15, serves_max: 18, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['רוזה', 'שמנת פטריות'],
        allowed_modifications_en: ['Rosé Sauce', 'Cream & Mushrooms']
    },
    { 
        id: 'm7', category: 'Main Courses', 
        name: 'דג סלמון אפוי', name_en: 'Baked Salmon',
        description: 'בעשבי תיבול ושקדים', description_en: 'With herbs and almonds',
        price: 450, unit_type: 'tray', serves_min: 10, serves_max: 10, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'm8', category: 'Main Courses', 
        name: 'מרק', name_en: 'Soup',
        description: 'כתום / בצל / ירקות (5 ליטר)', description_en: 'Orange / Onion / Vegetable (5 Liters)',
        price: 320, unit_type: 'liter', serves_min: 30, serves_max: 35, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['כתום', 'בצל', 'ירקות'],
        allowed_modifications_en: ['Orange', 'Onion', 'Vegetable']
    },

    // Pastries
    { 
        id: 'p1', category: 'Pastries', 
        name: 'לחמניות כוסמין', name_en: 'Spelt Rolls',
        description: '', description_en: '',
        price: 5, unit_type: 'unit', serves_min: 1, serves_max: 1, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'p2', category: 'Pastries', 
        name: 'לחם מחמצת', name_en: 'Sourdough Bread',
        description: '', description_en: '',
        price: 30, unit_type: 'unit', serves_min: 4, serves_max: 6, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'p3', category: 'Pastries', 
        name: 'פוקצ׳ה אישית', name_en: 'Personal Focaccia',
        description: 'עם שמן זית ומלח גס', description_en: 'With olive oil and coarse salt',
        price: 18, unit_type: 'unit', serves_min: 1, serves_max: 1, is_premium: false, tags: [], availability_status: true 
    },

    // Desserts
    { 
        id: 'ds1', category: 'Desserts', 
        name: 'עוגת גבינה אפויה', name_en: 'Baked Cheesecake',
        description: 'עוגה עשירה ואיכותית', description_en: 'Rich and high quality cake',
        price: 195, unit_type: 'unit', serves_min: 12, serves_max: 12, is_premium: false, tags: [], availability_status: true 
    },
    { 
        id: 'ds2', category: 'Desserts', 
        name: 'פאי אגוזים / שוקולד', name_en: 'Pecan / Chocolate Pie',
        description: 'פריך ועשיר', description_en: 'Crispy and rich',
        price: 195, unit_type: 'unit', serves_min: 12, serves_max: 12, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['אגוזים', 'שוקולד'],
        allowed_modifications_en: ['Pecan', 'Chocolate']
    },
    { 
        id: 'ds3', category: 'Desserts', 
        name: 'מגש קינוחים אישיים', name_en: 'Personal Desserts Tray',
        description: '10 יחידות מגוונות', description_en: '10 assorted units',
        price: 219, unit_type: 'tray', serves_min: 10, serves_max: 10, is_premium: false, tags: [], availability_status: true 
    },
];

type Language = 'he' | 'en';

interface AppState {
  cart: CartItem[];
  menuItems: MenuItem[];
  guestCount: number;
  language: Language;
  isLoading: boolean;
  
  // Calculator State
  eventType: EventType;
  hungerLevel: HungerLevel;
  calculationSettings: CalculationSettings;
  // NEW: Advanced Settings
  advancedSettings: AdvancedCalculationSettings;

  // Actions
  fetchMenuItems: () => Promise<void>;
  setGuestCount: (count: number) => void;
  setEventType: (type: EventType) => void;
  setHungerLevel: (level: HungerLevel) => void;
  setLanguage: (lang: Language) => void;
  addToCart: (item: MenuItem, quantity?: number, notes?: string, modifications?: string[]) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  updateCalculationSettings: (settings: Partial<CalculationSettings>) => void;
  updateAdvancedSettings: (settings: Partial<AdvancedCalculationSettings>) => void; // New Action
  clearCart: () => void;
  
  // Logic
  cartTotal: () => number;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      cart: [],
      menuItems: INITIAL_MENU,
      guestCount: 0,
      language: 'he',
      isLoading: false,
      eventType: 'snack',
      hungerLevel: 'medium',
      calculationSettings: {
        sandwichesPerPerson: 1.5,
        pastriesPerPerson: 1.0,
        averageTrayCapacity: 10
      },
      advancedSettings: {
        hungerMultipliers: { light: 0.8, medium: 1.0, heavy: 1.3 },
        eventRatios: {
            brunch: { sandwiches: 1.0, pastries: 1.5, saladsCoverage: 0.8, mainsCoverage: 0.5, plattersCoverage: 0.6, dessertsCoverage: 0.4 },
            dinner: { sandwiches: 0.5, pastries: 0.5, saladsCoverage: 1.0, mainsCoverage: 1.0, plattersCoverage: 0.4, dessertsCoverage: 0.5 },
            snack: { sandwiches: 2.0, pastries: 0.5, saladsCoverage: 0.3, mainsCoverage: 0.0, plattersCoverage: 0.8, dessertsCoverage: 0.3 },
            party: { sandwiches: 2.5, pastries: 1.0, saladsCoverage: 0.2, mainsCoverage: 0.2, plattersCoverage: 0.5, dessertsCoverage: 0.5 },
        }
      },

      fetchMenuItems: async () => {
          set({ isLoading: true });
          const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('category', { ascending: true });
          
          if (error) {
              console.error('Error fetching menu (Using Fallback):', error);
          } else if (data && data.length > 0) {
              set({ menuItems: data as MenuItem[] });
          }
          set({ isLoading: false });
      },

      setLanguage: (lang) => set({ language: lang }),
      setGuestCount: (count) => set({ guestCount: count }),
      setEventType: (type) => set({ eventType: type }),
      setHungerLevel: (level) => set({ hungerLevel: level }),

      addToCart: (item, quantity = 1, notes = '', modifications = []) => {
        const currentCart = get().cart;
        const existingItemIndex = currentCart.findIndex((i) => 
            i.id === item.id && 
            i.notes === notes && 
            JSON.stringify(i.selected_modifications) === JSON.stringify(modifications)
        );

        if (existingItemIndex > -1) {
          const newCart = [...currentCart];
          newCart[existingItemIndex].quantity += quantity;
          set({ cart: newCart });
        } else {
          set({ 
              cart: [...currentCart, { 
                  ...item, 
                  quantity, 
                  notes, 
                  selected_modifications: modifications 
              }] 
          });
        }
      },

      removeFromCart: (itemId) => {
        set({ cart: get().cart.filter((i) => i.id !== itemId) });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(itemId);
          return;
        }
        set({
          cart: get().cart.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
        });
      },

      updateMenuItem: async (id, updates) => {
          set({
              menuItems: get().menuItems.map(item => 
                item.id === id ? { ...item, ...updates } : item
              )
          });

          // Attempt to update DB if connected
          const { error } = await supabase
            .from('menu_items')
            .update(updates)
            .eq('id', id);

          if (error) {
              console.error("Failed to update item in DB", error);
          }
      },

      addMenuItem: async (item) => {
          const { data, error } = await supabase
            .from('menu_items')
            .insert([item])
            .select();

          if (error) {
              console.error("Failed to add item to DB", error);
              const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) };
              set({ menuItems: [...get().menuItems, newItem as MenuItem] });
          } else if (data) {
              set({ menuItems: [...get().menuItems, data[0] as MenuItem] });
          }
      },

      updateCalculationSettings: (settings) => {
        set((state) => ({
            calculationSettings: { ...state.calculationSettings, ...settings }
        }));
      },

      updateAdvancedSettings: (settings) => {
          set((state) => ({
              advancedSettings: { ...state.advancedSettings, ...settings }
          }));
      },

      clearCart: () => set({ cart: [] }),

      cartTotal: () => {
        return get().cart.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'ayala-catering-storage',
      partialize: (state) => ({ 
          cart: state.cart, 
          guestCount: state.guestCount, 
          language: state.language,
          calculationSettings: state.calculationSettings,
          advancedSettings: state.advancedSettings,
          eventType: state.eventType,
          hungerLevel: state.hungerLevel
      }), 
    }
  )
);

export const getSuggestedQuantity = (item: MenuItem, guestCount: number, settings: CalculationSettings): number => {
    if (guestCount <= 0) return 1;
    
    if (item.category === 'Sandwiches' && item.unit_type === 'unit') {
        return Math.ceil(guestCount * settings.sandwichesPerPerson);
    }
    if (item.category === 'Pastries' && item.unit_type === 'unit') {
        return Math.ceil(guestCount * settings.pastriesPerPerson);
    }
    if (item.unit_type === 'tray' || item.unit_type === 'liter') {
        const capacity = item.serves_max || settings.averageTrayCapacity;
        return Math.ceil(guestCount / capacity);
    }
    return 1;
};

export const getLocalizedItem = (item: MenuItem, lang: Language) => {
    if (lang === 'he') {
        return {
            name: item.name,
            description: item.description,
            modifications: item.allowed_modifications || []
        };
    } else {
        return {
            name: item.name_en || item.name,
            description: item.description_en || item.description,
            modifications: item.allowed_modifications_en || item.allowed_modifications || []
        };
    }
};

export const translations = {
  he: {
    // ... existing ...
    title: "איילה פשוט טעים",
    subtitle: "קייטרינג חלבי פרימיום",
    guestsQuestion: "כמה אורחים מגיעים?",
    guestsSub: "תכנון אירוע מעולם לא היה פשוט יותר",
    autoRecommend: "התמהיל המומלץ עבורך:",
    sandwiches: "סנדוויצ'ים",
    trays: "מגשי אירוח",
    perCategory: "לכל קטגוריה",
    addToCart: "הוסף להזמנה",
    add: "הוסף",
    added: "נוסף",
    outOfStock: "אזל מהמלאי",
    premium: "מומלץ",
    serves: "מספיק ל-",
    people: "סועדים",
    myOrder: "ההזמנה שלי",
    emptyCart: "העגלה ריקה, זה הזמן להוסיף דברים טובים",
    total: "סה\"כ לתשלום",
    minOrder: "מינימום הזמנה",
    checkout: "סיום הזמנה ב-WhatsApp",
    checkoutSub: "ההזמנה תשלח לאישור סופי מול איילה",
    search: "חיפוש בתפריט...",
    customizeTitle: "התאמה אישית",
    notesPlaceholder: "הערות מיוחדות למנה...",
    modifications: "שינויים:",
    cancel: "ביטול",
    confirmAdd: "הוסף לעגלה",
    tray: 'מגש',
    liter: 'ליטר',
    unit: 'יחידה',
    
    // Host Helper / Smart Calc
    planEvent: "בואו נתכנן את האירוע המושלם",
    eventType: "סוג האירוע",
    hungerLevel: "רמת רעב",
    calcResults: "המלצות להרכב האירוע",
    
    // Event Types
    'brunch': "בראנץ'",
    'dinner': "ארוחת ערב",
    'snack': "אירוח קליל",
    'party': "מסיבה",
    
    // Hunger Levels
    'light': "נשנוש",
    'medium': "רגיל",
    'heavy': "רעבים מאוד",

    categories: {
      'Salads': 'סלטים טריים',
      'Cold Platters': 'מגשי אירוח',
      'Sandwiches': 'כריכים וביסים',
      'Dips': 'מטבלים',
      'Main Courses': 'עיקריות',
      'Pastries': 'מאפים',
      'Desserts': 'קינוחים'
    },
    // Admin translations
    admin: {
        title: "ניהול תפריט ומלאי",
        exit: "יציאה למערכת",
        minOrder: "מינימום הזמנה",
        prepTime: "זמן הכנה (שעות)",
        storeStatus: "סטטוס חנות",
        open: "פתוח להזמנות",
        closed: "סגור זמנית",
        searchPlaceholder: "חיפוש מוצר...",
        productName: "שם המוצר",
        category: "קטגוריה",
        price: "מחיר",
        status: "סטטוס",
        modifications: "שינויים אפשריים",
        edit: "עריכה",
        active: "פעיל",
        outOfStock: "חסר",
        editItemTitle: "עריכת מנה",
        inStock: "פעיל במלאי",
        outOfStockLabel: "חסר במלאי",
        modsHint: "אלו האפשרויות שיוצגו ללקוח לבחירה מהירה.",
        modsPlaceholder: "לדוגמה: בלי בצל, רוטב בצד",
        save: "שמור שינויים",
        cancelBtn: "ביטול",
        addItem: "הוסף מנה חדשה",
        createItemTitle: "יצירת מנה חדשה",
        description: "תיאור המנה",
        unitType: "סוג יחידה",
        create: "צור מנה",
        premium: "פרימיום",
        calcSettings: "הגדרות מחשבון כמויות",
        sandwichesPerPerson: "כריכים לאדם",
        pastriesPerPerson: "מאפים לאדם",
        trayCapacity: "קיבולת מגש ממוצעת",
        advCalc: "הגדרות מחשבון מתקדמות",
        hungerMult: "מכפילי רעב",
        eventLogic: "לוגיקה לפי סוג אירוע",
        unitsPerPerson: "יח' לאדם",
        coverage: "כיסוי"
    }
  },
  en: {
    // ... existing ...
    title: "Ayala Simply Delicious",
    subtitle: "Premium Dairy Catering",
    guestsQuestion: "How many guests?",
    guestsSub: "Planning your event made simple",
    autoRecommend: "Your recommended mix:",
    sandwiches: "Sandwiches",
    trays: "Trays",
    perCategory: "per category",
    addToCart: "Add to Order",
    add: "Add",
    added: "Added",
    outOfStock: "Out of Stock",
    premium: "Premium",
    serves: "Serves",
    people: "people",
    myOrder: "My Order",
    emptyCart: "Cart is empty, time to add some goodies",
    total: "Total",
    minOrder: "Minimum Order",
    checkout: "Checkout via WhatsApp",
    checkoutSub: "Order will be sent for final approval",
    search: "Search menu...",
    customizeTitle: "Customize Item",
    notesPlaceholder: "Special requests...",
    modifications: "Modifications:",
    cancel: "Cancel",
    confirmAdd: "Add to Cart",
    tray: 'Tray',
    liter: 'Liter',
    unit: 'Unit',
    
    // Host Helper
    planEvent: "Let's plan the perfect event",
    eventType: "Event Type",
    hungerLevel: "Hunger Level",
    calcResults: "Recommended Menu Composition",

    // Event Types
    'brunch': "Brunch",
    'dinner': "Dinner",
    'snack': "Light / Cocktail",
    'party': "Party",
    
    // Hunger Levels
    'light': "Light",
    'medium': "Regular",
    'heavy': "Starving",

    categories: {
      'Salads': 'Fresh Salads',
      'Cold Platters': 'Cold Platters',
      'Sandwiches': 'Sandwiches',
      'Dips': 'Dips & Spreads',
      'Main Courses': 'Main Courses',
      'Pastries': 'Pastries',
      'Desserts': 'Desserts'
    },
    // Admin translations
    admin: {
        title: "Menu & Inventory Management",
        exit: "Exit Admin",
        minOrder: "Minimum Order",
        prepTime: "Prep Time (Hours)",
        storeStatus: "Store Status",
        open: "Open for Orders",
        closed: "Temporarily Closed",
        searchPlaceholder: "Search item...",
        productName: "Product Name",
        category: "Category",
        price: "Price",
        status: "Status",
        modifications: "Allowed Modifications",
        edit: "Edit",
        active: "Active",
        outOfStock: "OOS",
        editItemTitle: "Edit Item",
        inStock: "In Stock",
        outOfStockLabel: "Out of Stock",
        modsHint: "Options displayed to customer for quick selection.",
        modsPlaceholder: "e.g.: No Onion, Sauce on side",
        save: "Save Changes",
        cancelBtn: "Cancel",
        addItem: "Add New Item",
        createItemTitle: "Create New Item",
        description: "Description",
        unitType: "Unit Type",
        create: "Create Item",
        premium: "Premium",
        calcSettings: "Smart Calculator Logic",
        sandwichesPerPerson: "Sandwiches Per Person",
        pastriesPerPerson: "Pastries Per Person",
        trayCapacity: "Avg. Tray Capacity",
        advCalc: "Advanced Calculator Config",
        hungerMult: "Hunger Multipliers",
        eventLogic: "Event Logic Matrix",
        unitsPerPerson: "Units/Prsn",
        coverage: "Coverage"
    }
  }
};