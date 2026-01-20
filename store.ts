
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, MenuItem, CalculationSettings, EventType, HungerLevel, AdvancedCalculationSettings, FeatureFlags } from './types';
import { supabase } from './lib/supabase';

type Language = 'he' | 'en';

export interface Translations {
  title: string;
  subtitle: string;
  guestsQuestion: string;
  guestsSub: string;
  autoRecommend: string;
  sandwiches: string;
  trays: string;
  perCategory: string;
  addToCart: string;
  add: string;
  added: string;
  outOfStock: string;
  premium: string;
  serves: string;
  people: string;
  myOrder: string;
  emptyCart: string;
  total: string;
  minOrder: string;
  checkout: string;
  shareDraft: string;
  freeDeliveryAt: string;
  vipDelivery: string;
  justMore: string;
  forVip: string;
  checkoutSub: string;
  search: string;
  customizeTitle: string;
  notesPlaceholder: string;
  modifications: string;
  cancel: string;
  confirmAdd: string;
  tray: string;
  liter: string;
  unit: string;
  weight: string;
  clearCart: string;
  clearCartConfirm: string;
  planEvent: string;
  eventType: string;
  hungerLevel: string;
  calcResults: string;
  aiTitle: string;
  aiPlaceholder: string;
  aiGenerate: string;
  aiApplying: string;
  aiApply: string;
  aiExplanation: string;
  brunch: string;
  dinner: string;
  snack: string;
  party: string;
  light: string;
  medium: string;
  heavy: string;
  categories: Record<string, string>;
  admin: {
    title: string;
    exit: string;
    minOrder: string;
    prepTime: string;
    storeStatus: string;
    open: string;
    closed: string;
    searchPlaceholder: string;
    productName: string;
    category: string;
    price: string;
    status: string;
    modifications: string;
    edit: string;
    active: string;
    outOfStock: string;
    editItemTitle: string;
    inStock: string;
    outOfStockLabel: string;
    modsHint: string;
    modsPlaceholder: string;
    save: string;
    cancelBtn: string;
    addItem: string;
    createItemTitle: string;
    description: string;
    unitType: string;
    create: string;
    premium: string;
    calcSettings: string;
    sandwichesPerPerson: string;
    pastriesPerPerson: string;
    trayCapacity: string;
    advCalc: string;
    hungerMult: string;
    eventLogic: string;
    eventLogicExpl: string;
    unitsPerPerson: string;
    coverage: string;
    tableEventType: string;
    tableSandwiches: string;
    tablePastries: string;
    tableSalads: string;
    tableMains: string;
    tablePlatters: string;
    tableDesserts: string;
    featureMgmt: string;
    showCalc: string;
    showAI: string;
  };
}

export const translations: Record<Language, Translations> = {
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
    shareDraft: "שתף טיוטה לאישור",
    freeDeliveryAt: "משלוח חינם ב-1,500 ₪",
    vipDelivery: "הובלת VIP עלינו!",
    justMore: "רק עוד",
    forVip: "בשביל VIP",
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
    weight: 'משקל',
    clearCart: "רוקן עגלה",
    clearCartConfirm: "האם לרוקן את העגלה?",
    planEvent: "בואו נתכנן את האירוע המושלם",
    eventType: "סוג האירוע",
    hungerLevel: "רמת רעב",
    calcResults: "המלצות להרכב האירוע",
    aiTitle: "הקונסיירז' הדיגיטלי (AI)",
    aiPlaceholder: "תארו לנו את האירוע... (לדוגמה: יום הולדת ל-20 איש בשישי בצהריים, אוהבים מתוקים)",
    aiGenerate: "בני לי תפריט",
    aiApplying: "מנתח...",
    aiApply: "החל המלצה על העגלה",
    aiExplanation: "למה בחרתי את זה?",
    brunch: "בראנץ'",
    dinner: "ארוחת ערב",
    snack: "אירוח קליל",
    party: "מסיבה",
    light: "נשנוש",
    medium: "רגיל",
    heavy: "רעבים מאוד",
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
        eventLogicExpl: "* המספרים מייצגים יחידות לאדם (כריכים/מאפים) או אחוז כיסוי מהאורחים (שאר הקטגוריות). 1.0 = יחידה לכל אורח.",
        unitsPerPerson: "יח' לאדם",
        coverage: "כיסוי",
        tableEventType: "סוג אירוע",
        tableSandwiches: "כריכים",
        tablePastries: "מאפים",
        tableSalads: "סלטים",
        tableMains: "עיקריות",
        tablePlatters: "מגשים",
        tableDesserts: "קינוחים",
        featureMgmt: "ניהול פיצ'רים",
        showCalc: "הצג מחשבון אירוח",
        showAI: "הצג קונסיירז' AI"
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
    shareDraft: "Share Draft for Approval",
    freeDeliveryAt: "Free Delivery at 1,500 ₪",
    vipDelivery: "VIP Delivery included!",
    justMore: "Just",
    forVip: "more for VIP",
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
    weight: 'Weight',
    clearCart: "Clear Cart",
    clearCartConfirm: "Clear the cart?",
    planEvent: "Let's plan the perfect event",
    eventType: "Event Type",
    hungerLevel: "Hunger Level",
    calcResults: "Recommended Menu Composition",
    aiTitle: "AI Event Concierge",
    aiPlaceholder: "Describe your event... (e.g. Birthday party for 20 people, we love sweets)",
    aiGenerate: "Plan for me",
    aiApplying: "Analyzing...",
    aiApply: "Apply Recommendation",
    aiExplanation: "Why this choice?",
    brunch: "Brunch",
    dinner: "Dinner",
    snack: "Light / Cocktail",
    party: "Party",
    light: "Light",
    medium: "Regular",
    heavy: "Starving",
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
        eventLogicExpl: "* Values represent units per person (Sandwiches/Pastries) or coverage ratio (other categories). 1.0 = one unit per guest.",
        unitsPerPerson: "Units/Prsn",
        coverage: "Coverage",
        featureMgmt: "Feature Management",
        showCalc: "Show Event Calculator",
        showAI: "Show AI Concierge",
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

interface AppState {
  cart: CartItem[];
  menuItems: MenuItem[];
  guestCount: number;
  language: Language;
  isLoading: boolean;
  featureFlags: FeatureFlags;
  eventType: EventType;
  hungerLevel: HungerLevel;
  calculationSettings: CalculationSettings;
  advancedSettings: AdvancedCalculationSettings;

  fetchMenuItems: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  setGuestCount: (count: number) => void;
  setEventType: (type: EventType) => void;
  setHungerLevel: (level: HungerLevel) => void;
  setLanguage: (lang: Language) => void;
  addToCart: (item: MenuItem, quantity?: number, notes?: string, modifications?: string[]) => void;
  bulkAddToCart: (items: { item: MenuItem, quantity: number }[]) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  updateCalculationSettings: (settings: Partial<CalculationSettings>) => void;
  updateAdvancedSettings: (settings: Partial<AdvancedCalculationSettings>) => void;
  updateFeatureFlags: (flags: Partial<FeatureFlags>) => Promise<void>;
  clearCart: () => void;
  cartTotal: () => number;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      cart: [],
      menuItems: [],
      guestCount: 0,
      language: 'he',
      isLoading: false,
      eventType: 'snack',
      hungerLevel: 'medium',
      featureFlags: { showCalculator: true, showAI: false },
      calculationSettings: { sandwichesPerPerson: 1.5, pastriesPerPerson: 1.0, averageTrayCapacity: 10 },
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
          const { data } = await supabase.from('menu_items').select('*').order('category', { ascending: true });
          if (data) set({ menuItems: data as MenuItem[] });
          set({ isLoading: false });
      },

      fetchSettings: async () => {
        const { data } = await supabase.from('app_settings').select('*').eq('key', 'features').single();
        if (data && data.value) set({ featureFlags: data.value as FeatureFlags });
      },

      setLanguage: (lang) => set({ language: lang }),
      setGuestCount: (count) => set({ guestCount: count }),
      setEventType: (type) => set({ eventType: type }),
      setHungerLevel: (level) => set({ hungerLevel: level }),

      addToCart: (item, quantity = 1, notes = '', modifications = []) => {
        const currentCart = get().cart;
        const existingItemIndex = currentCart.findIndex((i) => 
            i.id === item.id && i.notes === notes && JSON.stringify(i.selected_modifications) === JSON.stringify(modifications)
        );

        if (existingItemIndex > -1) {
          const newCart = [...currentCart];
          newCart[existingItemIndex].quantity += quantity;
          set({ cart: newCart });
        } else {
          set({ cart: [...currentCart, { ...item, quantity, notes, selected_modifications: modifications }] });
        }
      },

      bulkAddToCart: (items) => {
          const newItems = items.map(({ item, quantity }) => ({
              ...item,
              quantity,
              notes: '',
              selected_modifications: []
          }));
          set({ cart: [...get().cart, ...newItems] });
      },

      removeFromCart: (itemId) => set({ cart: get().cart.filter((i) => i.id !== itemId) }),

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) { get().removeFromCart(itemId); return; }
        set({ cart: get().cart.map((i) => (i.id === itemId ? { ...i, quantity } : i)) });
      },

      updateMenuItem: async (id, updates) => {
          set({ menuItems: get().menuItems.map(item => item.id === id ? { ...item, ...updates } : item) });
          await supabase.from('menu_items').update(updates).eq('id', id);
      },

      addMenuItem: async (item) => {
          const { data } = await supabase.from('menu_items').insert([item]).select();
          if (data) set({ menuItems: [...get().menuItems, data[0] as MenuItem] });
      },

      updateCalculationSettings: (settings) => set((state) => ({ calculationSettings: { ...state.calculationSettings, ...settings } })),
      updateAdvancedSettings: (settings) => set((state) => ({ advancedSettings: { ...state.advancedSettings, ...settings } })),
      updateFeatureFlags: async (flags) => {
        const newFlags = { ...get().featureFlags, ...flags };
        set({ featureFlags: newFlags });
        await supabase.from('app_settings').upsert({ key: 'features', value: newFlags });
      },
      clearCart: () => set({ cart: [] }),
      cartTotal: () => get().cart.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'ayala-catering-storage-v5',
      partialize: (state) => ({ 
          cart: state.cart, 
          guestCount: state.guestCount, 
          language: state.language,
          calculationSettings: state.calculationSettings,
          advancedSettings: state.advancedSettings,
          eventType: state.eventType,
          hungerLevel: state.hungerLevel,
          featureFlags: state.featureFlags
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
