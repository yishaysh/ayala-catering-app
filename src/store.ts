
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, MenuItem, CalculationSettings, EventType, HungerLevel, AdvancedCalculationSettings } from './types';
import { supabase } from './lib/supabase';

// INITIAL MENU FALLBACK
const INITIAL_MENU: MenuItem[] = [
    { 
        id: 's1', category: 'Salads', 
        name: 'סלט הבית', name_en: 'House Salad',
        description: 'חסה, מלפפונים, עגבניות, בטטה מקורמלת, פטריות חיות, בצל סגול, נבטי חמניה + ויניגרט', description_en: 'Lettuce, cucumbers, tomatoes, caramelized sweet potato, fresh mushrooms, purple onion, sunflower sprouts + Vinaigrette',
        price: 145, unit_type: 'tray', serves_min: 8, serves_max: 10, is_premium: false, tags: [], availability_status: true, 
        allowed_modifications: ['בלי בצל', 'רוטב בצד', 'בלי פטריות'],
        allowed_modifications_en: ['No Onion', 'Sauce on side', 'No Mushrooms'],
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80'
    }
];

type Language = 'he' | 'en';

interface AppState {
  cart: CartItem[];
  menuItems: MenuItem[];
  guestCount: number;
  language: Language;
  isLoading: boolean;
  logoUrl: string;
  
  // Calculator State
  eventType: EventType;
  hungerLevel: HungerLevel;
  calculationSettings: CalculationSettings;
  advancedSettings: AdvancedCalculationSettings;

  // Actions
  fetchMenuItems: () => Promise<void>;
  setGuestCount: (count: number) => void;
  setEventType: (type: EventType) => void;
  setHungerLevel: (level: HungerLevel) => void;
  setLanguage: (lang: Language) => void;
  setLogoUrl: (url: string) => void;
  addToCart: (item: MenuItem, quantity?: number, notes?: string, modifications?: string[]) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  updateCalculationSettings: (settings: Partial<CalculationSettings>) => void;
  updateAdvancedSettings: (settings: Partial<AdvancedCalculationSettings>) => void;
  clearCart: () => void;
  
  cartTotal: () => number;
}

export const translations = {
  he: {
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
    
    planEvent: "בואו נתכנן את האירוע המושלם",
    eventType: "סוג האירוע",
    hungerLevel: "רמת רעב",
    calcResults: "המלצות להרכב האירוע",
    
    'brunch': "בראנץ'",
    'dinner': "ארוחת ערב",
    'snack': "אירוח קליל",
    'party': "מסיבה",
    
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
        coverage: "כיסוי",
        imageUrl: "כתובת תמונה (URL)",
        imageUrlPlaceholder: "הדבק כאן קישור לתמונה מ-Supabase",
        logoUrl: "קישור ללוגו האתר",
        logoPlaceholder: "הדבק כאן את הקישור ללוגו (PNG/JPG)",
        
        tableEventType: "סוג אירוע",
        tableSandwiches: "כריכים",
        tablePastries: "מאפים",
        tableSalads: "סלטים",
        tableMains: "עיקריות",
        tablePlatters: "מגשים",
        tableDesserts: "קינוחים"
    }
  },
  en: {
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
    
    planEvent: "Let's plan the perfect event",
    eventType: "Event Type",
    hungerLevel: "Hunger Level",
    calcResults: "Recommended Menu Composition",

    categories: {
      'Salads': 'Fresh Salads',
      'Cold Platters': 'Cold Platters',
      'Sandwiches': 'Sandwiches',
      'Dips': 'Dips & Spreads',
      'Main Courses': 'Main Courses',
      'Pastries': 'Pastries',
      'Desserts': 'Desserts'
    },
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
        coverage: "Coverage",
        imageUrl: "Image URL",
        imageUrlPlaceholder: "Paste direct image link here",
        logoUrl: "Site Logo URL",
        logoPlaceholder: "Paste logo URL here",

        tableEventType: "Event Type",
        tableSandwiches: "Sandwiches",
        tablePastries: "Pastries",
        tableSalads: "Salads",
        tableMains: "Mains",
        tablePlatters: "Platters",
        tableDesserts: "Desserts"
    }
  }
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      cart: [],
      menuItems: INITIAL_MENU,
      guestCount: 0,
      language: 'he',
      isLoading: false,
      logoUrl: "https://placehold.co/200x80/1c1917/d4af37?text=AYALA&font=playfair-display",
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
      setLogoUrl: (url) => set({ logoUrl: url }),
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

          const { error } = await supabase
            .from('menu_items')
            .update(updates)
            .eq('id', id);

          if (error) console.error("Failed to update item in DB", error);
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
      name: 'ayala-catering-storage-v2',
      partialize: (state) => ({ 
          cart: state.cart, 
          guestCount: state.guestCount, 
          language: state.language,
          logoUrl: state.logoUrl,
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
    if (item.category === 'Sandwiches' && item.unit_type === 'unit') return Math.ceil(guestCount * settings.sandwichesPerPerson);
    if (item.category === 'Pastries' && item.unit_type === 'unit') return Math.ceil(guestCount * settings.pastriesPerPerson);
    if (item.unit_type === 'tray' || item.unit_type === 'liter') {
        const capacity = item.serves_max || settings.averageTrayCapacity;
        return Math.ceil(guestCount / capacity);
    }
    return 1;
};

export const getLocalizedItem = (item: MenuItem, lang: Language) => {
    return {
        name: lang === 'he' ? item.name : (item.name_en || item.name),
        description: lang === 'he' ? item.description : (item.description_en || item.description),
        modifications: lang === 'he' ? (item.allowed_modifications || []) : (item.allowed_modifications_en || item.allowed_modifications || [])
    };
};
