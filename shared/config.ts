// Shared canonical business configuration, public defaults, and dietary taxonomy.
// Never store secrets or unverified private credentials in this module.

export const CANONICAL_SITE_URL = 'https://ayala-catering-app.vercel.app/';

export const DEFAULT_CONTACT_CONFIG = {
  phoneDisplay: '054-747-4764',
  phoneTel: '0547474764',
  phoneE164: '+972547474764',
  whatsappDigits: '972547474764',
  pickupAreaHe: 'קדומים',
  pickupAreaEn: 'Kedumim',
  pickupPublicNoteHe:
    'איסוף עצמי באזור קדומים — כתובת מדויקת והוראות הגעה יימסרו באופן אישי לאחר קבלת הבקשה ותיאום מועד.',
  pickupPublicNoteEn:
    'Self-pickup in the Kedumim area — the exact street address and directions are shared privately once your quote is confirmed.',
  serviceAreaHe: 'אזור השומרון, השרון והמרכז (בתיאום מראש לפי זמינות ומפרט משלוח)',
  serviceAreaEn: 'Samaria, Sharon and Central Israel (coordinated in advance subject to availability)',
} as const;

export const ALLOWED_MENU_CATEGORIES = [
  'Cold Platters',
  'Salads',
  'Dips',
  'Pastries',
  'Sandwiches',
  'Main Courses',
  'Desserts',
  'Picnic Baskets',
  'Extras',
] as const;

export const DIETARY_TAG_OPTIONS = [
  { id: 'vegetarian', labelHe: 'צמחוני', labelEn: 'Vegetarian' },
  { id: 'vegan', labelHe: 'טבעוני', labelEn: 'Vegan' },
  { id: 'gluten_free_option', labelHe: 'ניתן להכנה ללא גלוטן (בתיאום)', labelEn: 'Gluten-free option (with confirmation)' },
  { id: 'dairy_free_option', labelHe: 'ניתן להכנה ללא חלב (בתיאום)', labelEn: 'Dairy-free option (with confirmation)' },
  { id: 'contains_dairy', labelHe: 'מכיל חלב', labelEn: 'Contains dairy' },
  { id: 'contains_gluten', labelHe: 'מכיל גלוטן', labelEn: 'Contains gluten' },
  { id: 'contains_nuts', labelHe: 'מכיל אגוזים', labelEn: 'Contains nuts' },
  { id: 'contains_sesame', labelHe: 'מכיל שומשום', labelEn: 'Contains sesame' },
  { id: 'contains_eggs', labelHe: 'מכיל ביצים', labelEn: 'Contains eggs' },
  { id: 'contains_fish', labelHe: 'מכיל דגים', labelEn: 'Contains fish' },
] as const;

export type DietaryTagId = (typeof DIETARY_TAG_OPTIONS)[number]['id'];

export const DIETARY_DISCLAIMER = {
  he: 'המטבח הינו חלבי וכשר ואינו סביבה סטרילית מאלרגנים (קיימת נוכחות של חלב, גלוטן, שומשום, ביצים, אגוזים ודגים). סימון התאמות או רגישויות מותנה באישור אישי ומפורש מול איילה.',
  en: 'This is a kosher dairy kitchen and is not allergen-free (dairy, gluten, sesame, eggs, nuts, and fish are present). Any dietary or allergy accommodations require explicit personal confirmation with Ayala.',
} as const;

export const QUOTE_MODE_JOURNEY = {
  stepsHe: [
    { step: 1, title: 'בחירת מנות וכמויות משוערות', desc: 'בוחרים מגשים, סלטים או חבילה מומלצת ומתאימים הערות.' },
    { step: 2, title: 'שליחת בקשה להצעת מחיר', desc: 'משאירים פרטים, מועד ואופן אספקה ומקבלים מספר פנייה.' },
    { step: 3, title: 'קבלת הצעה ותיאום זמינות מאיילה', desc: 'איילה חוזרת לאישור זמינות, תמחור סופי ופרטי איסוף/משלוח.' },
  ],
  stepsEn: [
    { step: 1, title: 'Select dishes & estimated quantities', desc: 'Choose platters, salads, or an editable package and add notes.' },
    { step: 2, title: 'Submit quote request', desc: 'Provide event date, fulfillment method, and notes to get a reference ID.' },
    { step: 3, title: 'Personal quote & availability confirmation', desc: 'Ayala reviews availability, confirms final pricing, and shares exact logistics.' },
  ],
  disclaimerHe: 'שליחת הבקשה אינה מהווה הזמנה מאושרת או חיוב כספי, ואינה משריינת תאריך עד לאישור ישיר מאיילה.',
  disclaimerEn: 'Submitting this form is a quote request only—it is not a confirmed booking, payment, or date reservation until confirmed directly by Ayala.',
} as const;

export const ALLOWED_TELEMETRY_EVENTS = [
  'calculator_used',
  'menu_search_or_filter',
  'package_template_applied',
  'cart_opened',
  'quote_validation_failed',
  'quote_submitted',
  'whatsapp_handoff_clicked',
  'ai_planner_requested',
  'gallery_item_opened',
  'language_toggled',
] as const;

export type TelemetryEventName = (typeof ALLOWED_TELEMETRY_EVENTS)[number];
