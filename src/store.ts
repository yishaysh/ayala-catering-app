
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, MenuItem, CalculationSettings, EventType, AdvancedCalculationSettings, FeatureFlags, CustomerDetails, Coupon, AppSettings, ThemeConfig, GalleryItem, Review, AboutUsConfig } from './types';
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
  adults: string;
  children: string;
  myOrder: string;
  emptyCart: string;
  total: string;
  subtotal: string;
  discount: string;
  delivery: string;
  finalTotal: string;
  couponCode: string;
  applyCoupon: string;
  couponApplied: string;
  couponInvalid: string;
  removeCoupon: string;
  minOrder: string;
  checkout: string;
  shareDraft: string;
  freeDeliveryAt: string;
  vipDelivery: string;
  deliveryByDistance: string;
  justMore: string;
  forVip: string;
  checkoutSub: string;
  search: string;
  customizeTitle: string;
  description: string;
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
  calcResults: string;
  aiTitle: string;
  aiPlaceholder: string;
  aiGenerate: string;
  aiApplying: string;
  aiApply: string;
  aiExplanation: string;
  basicEvent: string;
  plusEvent: string;
  premiumEvent: string;
  requiredDishes: string;
  enrichDishes: string;
  customerName: string;
  customerPhone: string;
  eventLocation: string;
  eventDistance: string;
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
    image: string;
    upload: string;
    imageHint: string;
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
    serviceRadius: string;
    minFreeDelivery: string;
    aiInstructions: string;
    aiInstructionsPlaceholder: string;
    advCalc: string;
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
    tableDips: string;
    featureMgmt: string;
    showCalc: string;
    showAI: string;
    coupons: string;
    couponCode: string;
    discountType: string;
    discountValue: string;
    percentage: string;
    fixedAmount: string;
    createCoupon: string;
    activeCoupons: string;
    usageLimit: string;
    unlimited: string;
    usage: string;
    deliverySettings: string;
    baseDeliveryFee: string;
    pricePerKm: string;
    includedRadius: string;
    deleteItem: string;
    deleteItemConfirm: string;
    dishName: string;
    isTray: string;
    unitsPerTray: string;
    servesMin: string;
    servesMax: string;
    galleryTitle: string;
    addGalleryItem: string;
    deleteGalleryConfirm: string;
    caption: string;
    mediaType: string;
    videoUrl: string;
    themeSettings: string;
    kosherCert: string;
    uploadKosher: string;
  };
  accessibility: {
    menuTitle: string;
    description: string;
    increaseText: string;
    decreaseText: string;
    resetText: string;
    invertContrast: string;
    grayscale: string;
    readableFont: string;
    highlightLinks: string;
    largeCursor: string;
    stopAnimations: string;
    statementTitle: string;
    statementBtn: string;
    closeBtn: string;
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
    adults: "מבוגרים (12+)",
    children: "ילדים (4-11)",
    myOrder: "ההזמנה שלי",
    emptyCart: "העגלה ריקה, זה הזמן להוסיף דברים טובים",
    total: "סה\"כ לתשלום",
    subtotal: "סכום ביניים",
    discount: "הנחה",
    delivery: "משלוח",
    finalTotal: "סה\"כ סופי",
    couponCode: "קוד קופון",
    applyCoupon: "הפעל",
    couponApplied: "קופון הופעל!",
    couponInvalid: "קוד קופון שגוי או פג תוקף",
    removeCoupon: "הסר",
    minOrder: "מינימום הזמנה",
    checkout: "סיום הזמנה ב-WhatsApp",
    shareDraft: "שתף טיוטה לאישור",
    freeDeliveryAt: "משלוח חינם מעל",
    vipDelivery: "משלוח חינם עלינו!",
    deliveryByDistance: "עלות משלוח לפי מיקום",
    justMore: "רק עוד",
    forVip: "למשלוח חינם",
    checkoutSub: "ההזמנה תשלח לאישור סופי מול איילה",
    search: "חיפוש בתפריט...",
    customizeTitle: "התאמה אישית",
    description: "תיאור",
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
    calcResults: "המלצות להרכב האירוע",
    aiTitle: "השף הדיגיטלי (AI)",
    aiPlaceholder: "תארו לנו את האירוע... (לדוגמה: יום הולדת ל-20 איש בשישי בצהריים, אוהבים מתוקים)",
    aiGenerate: "בני לי תפריט",
    aiApplying: "מנתח...",
    aiApply: "החל המלצה על העגלה",
    aiExplanation: "למה בחרתי את זה?",
    basicEvent: "אירוע משפחתי בסיס",
    plusEvent: "אירוע עסקי",
    premiumEvent: "אירוע משפחתי פרימיום",
    requiredDishes: "מנות חובה לאירוע",
    enrichDishes: "להעשרת האירוע (אופציונלי)",
    customerName: "שם מלא",
    customerPhone: "טלפון ליצירת קשר",
    eventLocation: "מיקום האירוע (עיר/כתובת)",
    eventDistance: "מרחק מהמטבח (ק\"מ)",
    categories: {
      'Salads': 'סלטים טריים',
      'Cold Platters': 'מגשי אירוח',
      'Sandwiches': 'כריכים וביסים',
      'Dips': 'מטבלים',
      'Main Courses': 'עיקריות',
      'Pastries': 'מאפים',
      'Desserts': 'קינוחים',
      'Picnic Baskets': 'סלסלאות פיקניק',
      'Extras': 'נלווים וכלים'
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
        image: "תמונה",
        upload: "העלאת תמונה",
        imageHint: "מומלץ: קובץ JPG/PNG עד 5MB",
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
        serviceRadius: "רדיוס משלוח (ק\"מ)",
        minFreeDelivery: "מינימום למשלוח חינם",
        aiInstructions: "הנחיות שף ל-AI (Custom Prompt)",
        aiInstructionsPlaceholder: "לדוגמה: אל תמליץ על יותר מ-2 סוגי קיש, תמיד תציע סלט ירוק...",
        advCalc: "הגדרות מחשבון מתקדמות",
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
        tableDips: "מטבלים",
        featureMgmt: "ניהול פיצ'רים",
        showCalc: "הצג מחשבון אירוח",
        showAI: "הצג קונסיירז' AI",
        coupons: "ניהול קופונים",
        couponCode: "קוד קופון",
        discountType: "סוג הנחה",
        discountValue: "ערך ההנחה",
        percentage: "אחוזים (%)",
        fixedAmount: "סכום קבוע (₪)",
        createCoupon: "צור קופון",
        activeCoupons: "קופונים פעילים",
        usageLimit: "מגבלת שימושים",
        unlimited: "ללא הגבלה",
        usage: "נוצל",
        deliverySettings: "הגדרות משלוח",
        baseDeliveryFee: "עלות בסיס (עד רדיוס)",
        pricePerKm: "מחיר לק\"מ נוסף",
        includedRadius: "רדיוס כלול בבסיס (ק\"מ)",
        deleteItem: "מחק מנה",
        deleteItemConfirm: "האם למחק את המנה לצמיתות?",
        dishName: "שם המנה",
        isTray: "המנה היא מגש",
        unitsPerTray: "כמות יחידות במגש",
        servesMin: "מינימום סועדים",
        servesMax: "מקסימום סועדים",
        galleryTitle: "ניהול גלריית אירועים",
        addGalleryItem: "הוסף פריט לגלריה",
        deleteGalleryConfirm: "האם למחוק פריט זה מהגלריה?",
        caption: "תיאור קצר (כיתוב)",
        mediaType: "סוג מדיה",
        videoUrl: "קישור לסרטון (YouTube/Direct)",
        themeSettings: "עיצוב צבעי האתר",
        kosherCert: "תעודת כשרות",
        uploadKosher: "העלאת תעודת כשרות"
    },
    accessibility: {
      menuTitle: "תפריט נגישות",
      description: "התאמת האתר לצרכי הנגישות שלך",
      increaseText: "הגדל טקסט",
      decreaseText: "הקטן טקסט",
      resetText: "איפוס הגדרות",
      invertContrast: "ניגודיות הפוכה (כהה)",
      grayscale: "גווני אפור",
      readableFont: "גופן קריא",
      highlightLinks: "הדגשת קישורים",
      largeCursor: "סמן עכבר גדול",
      stopAnimations: "עצירת אנימציות",
      statementTitle: "הצהרת נגישות",
      statementBtn: "הצהרת נגישות",
      closeBtn: "סגור"
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
    adults: "Adults (12+)",
    children: "Children (4-11)",
    myOrder: "My Order",
    emptyCart: "Cart is empty, time to add some goodies",
    total: "Total",
    subtotal: "Subtotal",
    discount: "Discount",
    delivery: "Delivery",
    finalTotal: "Final Total",
    couponCode: "Coupon Code",
    applyCoupon: "Apply",
    couponApplied: "Coupon Applied!",
    couponInvalid: "Invalid or Expired Code",
    removeCoupon: "Remove",
    minOrder: "Minimum Order",
    checkout: "Checkout via WhatsApp",
    shareDraft: "Share Draft for Approval",
    freeDeliveryAt: "Free Delivery over",
    vipDelivery: "Free Delivery included!",
    deliveryByDistance: "Delivery fee based on location",
    justMore: "Just",
    forVip: "more for Free Delivery",
    checkoutSub: "Order will be sent for final approval",
    search: "Search menu...",
    customizeTitle: "Customize Item",
    description: "Description",
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
    calcResults: "Recommended Menu Composition",
    aiTitle: "AI Chef",
    aiPlaceholder: "Describe your event... (e.g. Birthday party for 20 people, we love sweets)",
    aiGenerate: "Plan for me",
    aiApplying: "Analyzing...",
    aiApply: "Apply Recommendation",
    aiExplanation: "Why this choice?",
    basicEvent: "Basic Family Event",
    plusEvent: "Business Event",
    premiumEvent: "Premium Family Event",
    requiredDishes: "Required Dishes",
    enrichDishes: "To Enrich (Optional)",
    customerName: "Full Name",
    customerPhone: "Contact Phone",
    eventLocation: "Event Location (City/Address)",
    eventDistance: "Distance from Kitchen (km)",
    categories: {
      'Salads': 'Fresh Salads',
      'Cold Platters': 'Cold Platters',
      'Sandwiches': 'Sandwiches',
      'Dips': 'Dips & Spreads',
      'Main Courses': 'Main Courses',
      'Pastries': 'Pastries',
      'Desserts': 'Desserts',
      'Picnic Baskets': 'Picnic Baskets',
      'Extras': 'Extras'
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
        image: "Image",
        upload: "Upload Image",
        imageHint: "Recommended: JPG/PNG up to 5MB",
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
        serviceRadius: "Service Radius (km)",
        minFreeDelivery: "Min Order Free Delivery",
        aiInstructions: "Chef's AI Instructions (Custom Prompt)",
        aiInstructionsPlaceholder: "e.g.: Don't suggest more than 2 quiches, always offer green salad...",
        advCalc: "Advanced Calculator Config",
        eventLogic: "Event Logic Matrix",
        eventLogicExpl: "* Values represent units per person (Sandwiches/Pastries) or coverage ratio (other categories). 1.0 = one unit per guest.",
        unitsPerPerson: "Units/Prsn",
        coverage: "Coverage",
        featureMgmt: "Feature Management",
        showCalc: "Show Event Calculator",
        showAI: "Show AI Concierge",
        coupons: "Coupon Management",
        couponCode: "Coupon Code",
        discountType: "Discount Type",
        discountValue: "Value",
        percentage: "Percentage (%)",
        fixedAmount: "Fixed Amount (NIS)",
        createCoupon: "Create Coupon",
        activeCoupons: "Active Coupons",
        tableEventType: "Event Type",
        tableSandwiches: "Sandwiches",
        tablePastries: "Pastries",
        tableSalads: "Salads",
        tableMains: "Mains",
        tablePlatters: "Platters",
        tableDesserts: "Desserts",
        tableDips: "Dips",
        usageLimit: "Usage Limit",
        unlimited: "Unlimited",
        usage: "Used",
        deliverySettings: "Delivery Pricing",
        baseDeliveryFee: "Base Fee (within radius)",
        pricePerKm: "Price Per Km (Extra)",
        includedRadius: "Radius Included (Km)",
        deleteItem: "Delete Item",
        deleteItemConfirm: "Delete this item permanently?",
        dishName: "Dish Name",
        isTray: "This item is a tray",
        unitsPerTray: "Units per tray",
        servesMin: "Min Serves",
        servesMax: "Max Serves",
        galleryTitle: "Gallery Management",
        addGalleryItem: "Add Item to Gallery",
        deleteGalleryConfirm: "Are you sure you want to delete this item?",
        caption: "Caption",
        mediaType: "Media Type",
        videoUrl: "Video Link (YouTube/Direct)",
        themeSettings: "Website Styling",
        kosherCert: "Kosher Certificate",
        uploadKosher: "Upload Kosher Certificate"
    },
    accessibility: {
      menuTitle: "Accessibility Menu",
      description: "Customize the site to fit your accessibility needs",
      increaseText: "Increase Text",
      decreaseText: "Decrease Text",
      resetText: "Reset Settings",
      invertContrast: "Invert Contrast (Dark)",
      grayscale: "Grayscale",
      readableFont: "Readable Font",
      highlightLinks: "Highlight Links",
      largeCursor: "Large Cursor",
      stopAnimations: "Stop Animations",
      statementTitle: "Accessibility Statement",
      statementBtn: "Accessibility Statement",
      closeBtn: "Close"
    }
  }
};

interface AppState {
  cart: CartItem[];
  menuItems: MenuItem[];
  adultCount: number;
  childCount: number;
  guestCount: number;
  customerDetails: CustomerDetails;
  language: Language;
  isLoading: boolean;
  featureFlags: FeatureFlags;
  eventType: EventType;
  calculationSettings: CalculationSettings;
  advancedSettings: AdvancedCalculationSettings;
  activeCoupon: Coupon | null;
  appConfig: AppSettings;
  theme: ThemeConfig;
  gallery: GalleryItem[];
  kosherCertUrl: string;
  reviews: Review[];
  aboutUs: AboutUsConfig;

  fetchMenuItems: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  setAdultCount: (count: number) => void;
  setChildCount: (count: number) => void;
  setCustomerDetails: (details: Partial<CustomerDetails>) => void;
  setEventType: (type: EventType) => void;
  setLanguage: (lang: Language) => void;
  addToCart: (item: MenuItem, quantity?: number, notes?: string, modifications?: string[]) => void;
  bulkAddToCart: (items: { item: MenuItem, quantity: number }[]) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  updateCalculationSettings: (settings: Partial<CalculationSettings>) => Promise<void>;
  updateAdvancedSettings: (settings: Partial<AdvancedCalculationSettings>) => Promise<void>;
  updateFeatureFlags: (flags: Partial<FeatureFlags>) => Promise<void>;
  updateAppConfig: (config: Partial<AppSettings>) => Promise<void>;
  updateTheme: (theme: Partial<ThemeConfig>) => Promise<void>;
  updateAboutUs: (aboutUs: Partial<AboutUsConfig>) => Promise<void>;
  updateGallery: (gallery: GalleryItem[]) => Promise<void>;
  updateKosherCertUrl: (url: string) => Promise<void>;
  clearCart: () => void;
  cartTotal: () => number;
  validateCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  createCoupon: (coupon: Coupon) => Promise<void>;
  deleteCoupon: (code: string) => Promise<void>;
  getCoupons: () => Promise<Coupon[]>;
  incrementCouponUsage: (code: string) => Promise<void>;
  getDeliveryFee: (distance: number, subtotal: number) => number;
  fetchReviews: () => Promise<void>;
  addReview: (review: Omit<Review, 'id' | 'created_at'>) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
}

const defaultTheme: ThemeConfig = {
  bg_color: '#fafaf9',
  text_color: '#1c1917',
  primary_color: '#d4af37',
  secondary_color: '#b4941f',
  header_bg_color: '#1c1917',
  header_text_color: '#ffffff',
  hero_bg_color: '#1c1917',
  card_bg_color: '#ffffff',
  card_text_color: '#1c1917'
};

const defaultAboutUs: AboutUsConfig = {
  story_he: 'ברוכים הבאים לקייטרינג הבוטיק החלבי שלי. אצלי תמצאו שילוב מושלם של חומרי גלם טריים ואיכותיים ביותר, תשומת לב קפדנית לפרטים הקטנים, והמון אהבה ותשוקה לאוכל ואירוח.\n\nאני מתמחה בבניית תפריטים עשירים ומגוונים לכל סוגי האירועים - החל ממפגשים משפחתיים קטנים, בראנצ׳ים מפנקים, הרמות כוסית, ועד לאירועים עסקיים יוקרתיים. כל מגש אירוח, סלט טרי, קיש או מאפה נעשה בעבודת יד מוקפדת עם דגש על אסתטיקה מרהיבה וטעם בלתי נשכח. הכשרות היא חלבי כשר למהדרין כדי שכולם יוכלו ליהנות בלב שקט.',
  story_en: 'Welcome to my dairy boutique catering service. Here you will find a perfect combination of the freshest, highest quality ingredients, meticulous attention to the smallest details, and a lot of love and passion for food and hosting.\n\nI specialize in creating rich, diverse menus for all types of events - from small family gatherings and luxurious brunches to toasts and prestigious corporate events. Each hosting tray, fresh salad, quiche, or pastry is handmade with an emphasis on spectacular aesthetics and unforgettable taste. The catering is Kosher Mehadrin Dairy so that everyone can enjoy with peace of mind.'
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      cart: [],
      menuItems: [],
      aiPrompt: '',
      adultCount: 0,
      childCount: 0,
      guestCount: 0,
      customerDetails: { name: '', phone: '', location: '', distanceKm: 0 },
      language: 'he',
      isLoading: false,
      eventType: 'basic',
      featureFlags: { showCalculator: true, showAI: false },
      aboutUs: defaultAboutUs,
      appConfig: {
        min_order_price: 500,
        lead_time_hours: 48,
        delivery_fee: 50,
        is_shop_open: true,
        delivery_base_fee: 60,
        delivery_price_per_km: 4,
        delivery_min_radius_included: 15,
        ecommerce_mode: false
      },
      calculationSettings: { 
        sandwichesPerPerson: 1.5, 
        pastriesPerPerson: 1.0, 
        averageTrayCapacity: 10,
        serviceRadiusKm: 50, 
        minOrderFreeDelivery: 2000,
        aiCustomInstructions: '',
        setupServiceDetailsHe: '✨ שירות עריכה ופינוי מקצועי לאירוע ללא דאגות ✨\n\nהשירות כולל:\n• 👩‍🍳 שעה של איילה בתחילת האירוע לארגון וסידור הבופה והסלטים בצורה מרהיבה.\n• 👥 שתי עובדות מקצועיות שילוו את האירוע שלכם (5 שעות עבודה לכל אחת).\n• 🍽️ עריכת השולחנות והבופה, הגשה ונוכחות מלאה במהלך האירוע.\n• 🧹 פינוי וניקיון מלא בסיום האירוע.\n\n💵 עלות השירות: תוספת של ₪1,000 למחיר הכולל.\n*(בתיאום מראש בלבד)*',
        setupServiceDetailsEn: '✨ Professional Setup & Cleanup Service ✨\n\nThe service includes:\n• 👩‍🍳 1 hour of Ayala\'s personal setup at the beginning to arrange the buffet and salads beautifully.\n• 👥 Two professional staff members hosting your event (5 hours of work each).\n• 🍽️ Setting tables and buffet, serving, and full presence during the event.\n• 🧹 Complete clearing and cleanup at the end.\n\n💵 Service Fee: An additional ₪1,000 to the total price.\n*(Coordinated in advance)*'
      },
      advancedSettings: {
        eventRatios: {
            basic: { sandwiches: 0.0, pastries: 0.0, saladsCoverage: 0.1, mainsCoverage: 0.1, plattersCoverage: 0.067, dessertsCoverage: 0.0, dipsCoverage: 0.0 },
            plus: { sandwiches: 1.0, pastries: 0.8, saladsCoverage: 0.12, mainsCoverage: 0.12, plattersCoverage: 0.083, dessertsCoverage: 0.04, dipsCoverage: 0.05 },
            premium: { sandwiches: 1.5, pastries: 1.2, saladsCoverage: 0.15, mainsCoverage: 0.15, plattersCoverage: 0.117, dessertsCoverage: 0.067, dipsCoverage: 0.1 },
        }
      },
      activeCoupon: null,
      theme: defaultTheme,
      gallery: [],
      kosherCertUrl: '',
      reviews: [],

      fetchMenuItems: async () => {
          set({ isLoading: true });
          const { data } = await supabase.from('menu_items').select('*').order('category', { ascending: true });
          if (data) set({ menuItems: data as MenuItem[] });
          set({ isLoading: false });
      },

      fetchSettings: async () => {
        // Fetch Features
        const { data: featuresData } = await supabase.from('app_settings').select('*').eq('key', 'features');
        if (featuresData && featuresData.length > 0 && featuresData[0].value) {
            set({ featureFlags: featuresData[0].value as FeatureFlags });
        }

        // Fetch Calculation Settings
        const { data: calcData } = await supabase.from('app_settings').select('*').eq('key', 'calculation_settings');
        if (calcData && calcData.length > 0 && calcData[0].value) {
            set({ calculationSettings: { ...get().calculationSettings, ...calcData[0].value } });
        }

        // Fetch Advanced Settings
        const { data: advData } = await supabase.from('app_settings').select('*').eq('key', 'advanced_settings');
        if (advData && advData.length > 0 && advData[0].value) {
            set({ advancedSettings: { ...get().advancedSettings, ...advData[0].value } });
        }

        // Fetch Config
        const { data: configData } = await supabase.from('app_settings').select('*').eq('key', 'config');
        if (configData && configData.length > 0 && configData[0].value) {
            // Merge with defaults to ensure new fields exist
            const defaults = {
                min_order_price: 500,
                lead_time_hours: 48,
                delivery_fee: 50,
                is_shop_open: true,
                delivery_base_fee: 60,
                delivery_price_per_km: 4,
                delivery_min_radius_included: 15,
                ecommerce_mode: false
            };
            set({ appConfig: { ...defaults, ...configData[0].value } });
        }

        // Fetch Theme
        const { data: themeData } = await supabase.from('app_settings').select('*').eq('key', 'theme');
        if (themeData && themeData.length > 0 && themeData[0].value) {
            set({ theme: { ...defaultTheme, ...themeData[0].value } });
        }

        // Fetch Gallery
        const { data: galleryData } = await supabase.from('app_settings').select('*').eq('key', 'gallery');
        if (galleryData && galleryData.length > 0 && galleryData[0].value) {
            set({ gallery: galleryData[0].value as GalleryItem[] });
        }

        // Fetch Kosher Cert
        const { data: kosherData } = await supabase.from('app_settings').select('*').eq('key', 'kosher');
        if (kosherData && kosherData.length > 0 && kosherData[0].value) {
            set({ kosherCertUrl: kosherData[0].value as string });
        }

        // Fetch About Us
        const { data: aboutData } = await supabase.from('app_settings').select('*').eq('key', 'about');
        if (aboutData && aboutData.length > 0 && aboutData[0].value) {
            set({ aboutUs: aboutData[0].value as AboutUsConfig });
        } else {
            set({ aboutUs: defaultAboutUs });
        }
      },

      setLanguage: (lang) => set({ language: lang }),
      
      setAdultCount: (count) => set((state) => ({ 
          adultCount: count, 
          guestCount: count + state.childCount 
      })),
      
      setChildCount: (count) => set((state) => ({ 
          childCount: count, 
          guestCount: state.adultCount + count 
      })),

      setCustomerDetails: (details) => set((state) => ({
          customerDetails: { ...state.customerDetails, ...details }
      })),

      setEventType: (type) => set({ eventType: type }),

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

      deleteMenuItem: async (id) => {
          set({ menuItems: get().menuItems.filter(item => item.id !== id) });
          await supabase.from('menu_items').delete().eq('id', id);
      },

      updateCalculationSettings: async (settings) => {
        const newSettings = { ...get().calculationSettings, ...settings };
        set({ calculationSettings: newSettings });
        await supabase.from('app_settings').upsert({ key: 'calculation_settings', value: newSettings });
      },
      updateAdvancedSettings: async (settings) => {
        const newSettings = { ...get().advancedSettings, ...settings };
        set({ advancedSettings: newSettings });
        await supabase.from('app_settings').upsert({ key: 'advanced_settings', value: newSettings });
      },
      updateFeatureFlags: async (flags) => {
        const newFlags = { ...get().featureFlags, ...flags };
        set({ featureFlags: newFlags });
        await supabase.from('app_settings').upsert({ key: 'features', value: newFlags });
      },
      updateAppConfig: async (config) => {
        const newConfig = { ...get().appConfig, ...config };
        set({ appConfig: newConfig });
        await supabase.from('app_settings').upsert({ key: 'config', value: newConfig });
      },
      clearCart: () => set({ cart: [], activeCoupon: null }),
      cartTotal: () => get().cart.reduce((total, item) => total + item.price * item.quantity, 0),

      validateCoupon: async (code) => {
          try {
              const { data, error } = await supabase
                  .from('coupons')
                  .select('*')
                  .eq('code', code)
                  .eq('is_active', true);

              if (error || !data || data.length === 0) {
                  return false;
              }

              // Check Usage Limit - FIXED TYPE CHECK
              const coupon = data[0] as Coupon;
              if (typeof coupon.usage_limit === 'number' && (coupon.usage_count || 0) >= coupon.usage_limit) {
                  return false;
              }

              set({ activeCoupon: coupon });
              return true;
          } catch (e) {
              return false;
          }
      },
      removeCoupon: () => set({ activeCoupon: null }),
      
      createCoupon: async (coupon) => {
          await supabase.from('coupons').insert([coupon]);
      },

      deleteCoupon: async (code) => {
          await supabase.from('coupons').delete().eq('code', code);
      },

      getCoupons: async () => {
          const { data } = await supabase.from('coupons').select('*');
          return (data as Coupon[]) || [];
      },

      incrementCouponUsage: async (code) => {
         await supabase.rpc('increment_coupon_usage', { coupon_code: code });
      },

      getDeliveryFee: (distance: number, subtotal: number) => {
          const { appConfig, calculationSettings } = get();
          
          // Check for Free Delivery Threshold
          if (subtotal >= calculationSettings.minOrderFreeDelivery) {
              return 0;
          }
          
          // No distance calculated
          if (distance <= 0) return 0;

          // Base calculation
          let fee = appConfig.delivery_base_fee;

          // If distance exceeds included radius, add per km charge
          if (distance > appConfig.delivery_min_radius_included) {
              const extraKm = distance - appConfig.delivery_min_radius_included;
              fee += extraKm * appConfig.delivery_price_per_km;
          }

          // Round to nearest 5
          return Math.ceil(fee / 5) * 5;
      },

      updateTheme: async (theme) => {
        const newTheme = { ...get().theme, ...theme };
        set({ theme: newTheme });
        await supabase.from('app_settings').upsert({ key: 'theme', value: newTheme });
      },

      updateAboutUs: async (aboutUsUpdates) => {
        const newAboutUs = { ...get().aboutUs, ...aboutUsUpdates };
        set({ aboutUs: newAboutUs });
        await supabase.from('app_settings').upsert({ key: 'about', value: newAboutUs });
      },

      updateGallery: async (gallery) => {
        set({ gallery });
        await supabase.from('app_settings').upsert({ key: 'gallery', value: gallery });
      },

      updateKosherCertUrl: async (url) => {
        set({ kosherCertUrl: url });
        await supabase.from('app_settings').upsert({ key: 'kosher', value: url });
      },

      fetchReviews: async () => {
          try {
              const { data, error } = await supabase
                  .from('reviews')
                  .select('*')
                  .order('created_at', { ascending: false });
              
              if (!error && data) {
                  set({ reviews: data as Review[] });
                  return;
              }
              
              const { data: settingData } = await supabase
                  .from('app_settings')
                  .select('*')
                  .eq('key', 'reviews');
                  
              if (settingData && settingData.length > 0 && settingData[0].value) {
                  set({ reviews: settingData[0].value as Review[] });
              } else {
                  set({ reviews: [] });
              }
          } catch (e) {
              console.error("Error fetching reviews:", e);
          }
      },

      addReview: async (review) => {
          const newReview: Review = {
              id: Math.random().toString(36).substring(2, 15) + '_' + Date.now(),
              customer_name: review.customer_name,
              rating: review.rating,
              comment: review.comment,
              created_at: new Date().toISOString()
          };
          
          try {
              const { error } = await supabase.from('reviews').insert([newReview]);
              if (!error) {
                  set((state) => ({ reviews: [newReview, ...state.reviews] }));
                  return;
              }
              
              const currentReviews = get().reviews;
              const updated = [newReview, ...currentReviews];
              set({ reviews: updated });
              await supabase.from('app_settings').upsert({ key: 'reviews', value: updated });
          } catch (e) {
              console.error("Error adding review:", e);
          }
      },

      deleteReview: async (id) => {
          try {
              const { error } = await supabase.from('reviews').delete().eq('id', id);
              if (!error) {
                  set((state) => ({ reviews: state.reviews.filter(r => r.id !== id) }));
                  return;
              }
              
              const currentReviews = get().reviews;
              const updated = currentReviews.filter(r => r.id !== id);
              set({ reviews: updated });
              await supabase.from('app_settings').upsert({ key: 'reviews', value: updated });
          } catch (e) {
              console.error("Error deleting review:", e);
          }
      },

      setAiPrompt: (prompt) => set({ aiPrompt: prompt })
    }),
    {
      name: 'ayala-catering-storage-v14', 
      partialize: (state) => ({ 
          cart: state.cart, 
          guestCount: state.guestCount,
          adultCount: state.adultCount,
          childCount: state.childCount,
          language: state.language,
          calculationSettings: state.calculationSettings,
          advancedSettings: state.advancedSettings,
          eventType: state.eventType,
          featureFlags: state.featureFlags,
          customerDetails: state.customerDetails,
          activeCoupon: state.activeCoupon,
          appConfig: state.appConfig,
          theme: state.theme,
          gallery: state.gallery,
          kosherCertUrl: state.kosherCertUrl,
          aboutUs: state.aboutUs,
          aiPrompt: state.aiPrompt
      }), 
    }
  )
);

export const getSuggestedQuantity = (item: MenuItem, adultCount: number, childCount: number, settings: CalculationSettings, currentCart: CartItem[] = []): number => {
    const totalGuests = adultCount + childCount;
    if (totalGuests <= 0) return 1;

    const weightedCount = adultCount + (childCount * 0.66);
    const uniqueCategories = new Set(currentCart.map(i => i.category));
    uniqueCategories.add(item.category);
    const categoryCount = uniqueCategories.size;
    
    const saturationDamping = categoryCount <= 1 ? 1.0 : (1 / (1 + (categoryCount - 1) * 0.25));

    let baseQty = 1;
    if (item.category === 'Sandwiches' && item.unit_type === 'unit') {
        baseQty = weightedCount * settings.sandwichesPerPerson;
    } else if (item.category === 'Pastries' && item.unit_type === 'unit') {
        baseQty = weightedCount * settings.pastriesPerPerson;
    } else if (item.unit_type === 'tray' || item.unit_type === 'liter') {
        const capacity = item.serves_max || settings.averageTrayCapacity;
        baseQty = weightedCount / capacity;
    }

    return Math.max(1, Math.ceil(baseQty * saturationDamping));
};

export const getLocalizedItem = (item: MenuItem, lang: Language) => {
    return {
        name: lang === 'he' ? item.name : (item.name_en || item.name),
        description: lang === 'he' ? item.description : (item.description_en || item.description),
        modifications: lang === 'he' ? (item.allowed_modifications || []) : (item.allowed_modifications_en || item.allowed_modifications || [])
    };
};
