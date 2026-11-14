// Shared TypeScript contracts used identically by frontend components, shared validators, and serverless API endpoints.

export type UnitType = 'tray' | 'unit' | 'liter' | 'weight';

export type Category =
  | 'Salads'
  | 'Cold Platters'
  | 'Sandwiches'
  | 'Dips'
  | 'Main Courses'
  | 'Pastries'
  | 'Desserts'
  | 'Picnic Baskets'
  | 'Extras';

export type Language = 'he' | 'en';
export type EventType = 'basic' | 'plus' | 'premium';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id?: string;
  customer_name: string;
  rating: number;
  comment: string;
  status?: ReviewStatus;
  created_at?: string;
}

export interface ThemeConfig {
  bg_color: string;
  text_color: string;
  primary_color: string;
  secondary_color: string;
  header_bg_color: string;
  header_text_color: string;
  hero_bg_color: string;
  card_bg_color: string;
  card_text_color: string;
}

export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  caption_en?: string;
  width?: number;
  height?: number;
}

export interface FeatureFlags {
  showCalculator: boolean;
  showAI: boolean;
}

export interface AllergenInfo {
  contains: string[];
  can_prepare_without: string[];
  requires_confirmation: boolean;
  notes_he?: string;
  notes_en?: string;
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
  dietary_tags?: string[];
  allergen_info?: AllergenInfo;
  availability_status: boolean;
  image_url?: string;
  allowed_modifications?: string[];
  allowed_modifications_en?: string[];
  is_tray?: boolean;
  units_per_tray?: number | null;
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
  selected_modifications?: string[];
}

export type DeliveryMethod = 'pickup' | 'delivery';

export interface CustomerDetails {
  name: string;
  phone: string;
  location: string;
  distanceKm: number;
  eventDate?: string;
  eventTime?: string;
  deliveryMethod?: DeliveryMethod;
  resolvedLocation?: string;
  allergyNotes?: string;
  notes?: string;
}

export interface Coupon {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
  usage_count?: number;
  usage_limit?: number | null;
  created_at?: string;
}

export type OrderStatus = 'pending' | 'approved' | 'completed' | 'cancelled';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'unconfigured';
export type HandoffStatus = 'not_opened' | 'whatsapp_opened' | 'confirmed_by_owner';

export interface Order {
  id?: string;
  schema_version?: number;
  reference_code?: string;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  event_time?: string;
  subtotal: number;
  total_price: number;
  discount_amount: number;
  delivery_fee?: number;
  coupon_code?: string;
  items: CartItem[];
  status: OrderStatus;
  created_at?: string;
  updated_at?: string;
  event_type?: string;
  wants_setup?: boolean;
  delivery_method?: DeliveryMethod;
  delivery_address?: string;
  resolved_location?: string;
  distance_km?: number | null;
  adult_count?: number | null;
  child_count?: number | null;
  allergy_notes?: string;
  notes?: string;
  admin_notes?: string;
  idempotency_key?: string;
  notification_status?: NotificationStatus;
  notification_error?: string;
  handoff_status?: HandoffStatus;
  quote_token_expires_at?: string;
}

export interface CustomerSafeQuoteView {
  reference_code: string;
  customer_name: string;
  event_date: string;
  event_time?: string;
  event_type: string;
  delivery_method: DeliveryMethod;
  delivery_address?: string;
  resolved_location?: string;
  distance_km?: number | null;
  adult_count?: number | null;
  child_count?: number | null;
  wants_setup: boolean;
  allergy_notes?: string;
  notes?: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal?: number;
  discount_amount?: number;
  delivery_fee?: number;
  total_price?: number;
  ecommerce_mode: boolean;
  created_at: string;
  expires_at: string;
  contact: PublicContactSummary;
  pickup_guidance_he: string;
  pickup_guidance_en: string;
}

export interface CalculationSettings {
  sandwichesPerPerson: number;
  pastriesPerPerson: number;
  averageTrayCapacity: number;
  serviceRadiusKm: number;
  minOrderFreeDelivery: number;
  aiCustomInstructions: string;
  setupServiceDetailsHe?: string;
  setupServiceDetailsEn?: string;
}

export interface EventRatioConfig {
  sandwiches: number;
  pastries: number;
  saladsCoverage: number;
  mainsCoverage: number;
  plattersCoverage: number;
  dessertsCoverage: number;
  dipsCoverage: number;
}

export interface AdvancedCalculationSettings {
  eventRatios: Record<EventType, EventRatioConfig>;
}

export interface KosherCertMetadata {
  documentUrl: string;
  issuer: string;
  validUntil: string | null;
  verifiedAt: string | null;
  notesHe?: string;
  notesEn?: string;
}

export interface PracticalInfoConfig {
  phoneDisplay: string;
  whatsappDigits: string;
  contactEmail?: string;
  notificationEmail?: string;
  canonicalUrl?: string;
  pickupAreaHe: string;
  pickupAreaEn: string;
  pickupPublicNoteHe: string;
  pickupPublicNoteEn: string;
  pickupPrivateAddress?: string;
  pickupInstructionsHe?: string;
  pickupInstructionsEn?: string;
  serviceAreaHe: string;
  serviceAreaEn: string;
  businessHoursHe?: string;
  businessHoursEn?: string;
  eventSizeGuidanceHe?: string;
  eventSizeGuidanceEn?: string;
  cancellationTermsHe?: string;
  cancellationTermsEn?: string;
  blockedDates?: string[];
  maxDeliveryDistanceKm?: number | null;
}

export interface PublicContactSummary {
  phoneDisplay: string;
  phoneTel: string;
  whatsappDigits: string;
  contactEmail?: string;
  canonicalUrl: string;
  pickupAreaHe: string;
  pickupAreaEn: string;
  pickupPublicNoteHe: string;
  pickupPublicNoteEn: string;
  serviceAreaHe: string;
  serviceAreaEn: string;
  businessHoursHe?: string;
  businessHoursEn?: string;
  eventSizeGuidanceHe?: string;
  eventSizeGuidanceEn?: string;
  cancellationTermsHe?: string;
  cancellationTermsEn?: string;
}

export interface EventPackageItem {
  menu_item_id: string;
  quantity: number;
  note?: string;
}

export interface EventPackage {
  id: string;
  name_he: string;
  name_en: string;
  description_he: string;
  description_en: string;
  recommended_guests_min: number;
  recommended_guests_max: number;
  event_type: string;
  items: EventPackageItem[];
  is_active: boolean;
}

export interface AppSettings {
  min_order_price: number;
  lead_time_hours: number;
  delivery_fee: number;
  is_shop_open: boolean;
  delivery_base_fee: number;
  delivery_price_per_km: number;
  delivery_min_radius_included: number;
  ecommerce_mode?: boolean;
}

export interface GuestCalculationResult {
  [itemId: string]: number;
}

export interface AboutUsConfig {
  story_he: string;
  story_en: string;
}

export interface CatalogHealthIssue {
  itemId: string;
  itemName: string;
  category: Category;
  code:
    | 'missing_or_placeholder_image'
    | 'missing_en_translation'
    | 'serves_min_gt_max'
    | 'unit_tray_mismatch'
    | 'tray_missing_units_per_tray'
    | 'nonfood_has_serving_count'
    | 'missing_description';
  severity: 'error' | 'warning';
  messageHe: string;
  messageEn: string;
}
