// Settings hydration and privacy sanitization helpers shared between public and admin handlers.

import { DEFAULT_CONTACT_CONFIG } from '../../shared/config.js';
import { evaluateKosherStatus, normalizeKosherSetting } from '../../shared/media.js';
import type {
  AboutUsConfig,
  AdvancedCalculationSettings,
  AppSettings,
  CalculationSettings,
  EventPackage,
  FeatureFlags,
  GalleryItem,
  KosherCertMetadata,
  PracticalInfoConfig,
  PublicContactSummary,
} from '../../shared/types.js';
import type { SqlQueryFn } from '../db.js';
import type { ServerEnv } from '../env.js';

export const DEFAULT_APP_CONFIG: AppSettings = {
  min_order_price: 400,
  lead_time_hours: 48,
  delivery_fee: 150,
  is_shop_open: true,
  delivery_base_fee: 150,
  delivery_price_per_km: 4.5,
  delivery_min_radius_included: 0,
  ecommerce_mode: false,
};

export const DEFAULT_CALCULATION_SETTINGS: CalculationSettings = {
  sandwichesPerPerson: 1.5,
  pastriesPerPerson: 1,
  averageTrayCapacity: 10,
  serviceRadiusKm: 50,
  aiCustomInstructions: '',
};

export const DEFAULT_ADVANCED_SETTINGS: AdvancedCalculationSettings = {
  eventRatios: {
    basic: {
      plattersCoverage: 0.067,
      saladsCoverage: 0.1,
      dipsCoverage: 0,
      mainsCoverage: 0.1,
      sandwiches: 0,
      pastries: 0,
      dessertsCoverage: 0,
    },
    plus: {
      plattersCoverage: 0.12,
      saladsCoverage: 0.1,
      dipsCoverage: 0.1,
      mainsCoverage: 0.1,
      sandwiches: 0,
      pastries: 0.1,
      dessertsCoverage: 0,
    },
    premium: {
      plattersCoverage: 0.15,
      saladsCoverage: 0.1,
      dipsCoverage: 0.1,
      mainsCoverage: 0.1,
      sandwiches: 1,
      pastries: 0.1,
      dessertsCoverage: 0.1,
    },
  },
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  showAI: true,
  showCalculator: true,
};

export const DEFAULT_PRACTICAL_INFO: PracticalInfoConfig = {
  phoneDisplay: DEFAULT_CONTACT_CONFIG.phoneDisplay,
  whatsappDigits: DEFAULT_CONTACT_CONFIG.whatsappDigits,
  contactEmail: '',
  notificationEmail: '',
  canonicalUrl: '',
  pickupAreaHe: DEFAULT_CONTACT_CONFIG.pickupAreaHe,
  pickupAreaEn: DEFAULT_CONTACT_CONFIG.pickupAreaEn,
  pickupPublicNoteHe: DEFAULT_CONTACT_CONFIG.pickupPublicNoteHe,
  pickupPublicNoteEn: DEFAULT_CONTACT_CONFIG.pickupPublicNoteEn,
  pickupPrivateAddress: '',
  pickupInstructionsHe: '',
  pickupInstructionsEn: '',
  serviceAreaHe: DEFAULT_CONTACT_CONFIG.serviceAreaHe,
  serviceAreaEn: DEFAULT_CONTACT_CONFIG.serviceAreaEn,
  businessHoursHe: '',
  businessHoursEn: '',
  eventSizeGuidanceHe: '',
  eventSizeGuidanceEn: '',
  cancellationTermsHe: '',
  cancellationTermsEn: '',
  blockedDates: [],
  maxDeliveryDistanceKm: null,
};

export interface HydratedSettings {
  config: AppSettings;
  theme: Record<string, string> | null;
  features: FeatureFlags;
  about: AboutUsConfig | null;
  calculation_settings: CalculationSettings;
  advanced_settings: AdvancedCalculationSettings;
  kosher: KosherCertMetadata;
  kosherEvaluation: ReturnType<typeof evaluateKosherStatus>;
  gallery: GalleryItem[];
  practical_info: PracticalInfoConfig;
  public_contact: PublicContactSummary;
  packages: EventPackage[];
}

function safeParseSetting(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function buildPublicContactSummary(
  practical: PracticalInfoConfig,
  env: Pick<ServerEnv, 'contactEmail' | 'siteUrl'>
): PublicContactSummary {
  const phoneDisplay = (practical.phoneDisplay || DEFAULT_CONTACT_CONFIG.phoneDisplay).trim();
  const phoneTel = phoneDisplay.replace(/\D/g, '') || DEFAULT_CONTACT_CONFIG.phoneTel;
  const whatsappDigits =
    (practical.whatsappDigits || DEFAULT_CONTACT_CONFIG.whatsappDigits).replace(/\D/g, '') ||
    DEFAULT_CONTACT_CONFIG.whatsappDigits;
  const contactEmail = (practical.contactEmail || env.contactEmail || '').trim() || undefined;
  const canonicalUrl = (practical.canonicalUrl || env.siteUrl).trim();

  return {
    phoneDisplay,
    phoneTel,
    whatsappDigits,
    contactEmail,
    canonicalUrl,
    pickupAreaHe: practical.pickupAreaHe || DEFAULT_CONTACT_CONFIG.pickupAreaHe,
    pickupAreaEn: practical.pickupAreaEn || DEFAULT_CONTACT_CONFIG.pickupAreaEn,
    pickupPublicNoteHe: practical.pickupPublicNoteHe || DEFAULT_CONTACT_CONFIG.pickupPublicNoteHe,
    pickupPublicNoteEn: practical.pickupPublicNoteEn || DEFAULT_CONTACT_CONFIG.pickupPublicNoteEn,
    serviceAreaHe: practical.serviceAreaHe || DEFAULT_CONTACT_CONFIG.serviceAreaHe,
    serviceAreaEn: practical.serviceAreaEn || DEFAULT_CONTACT_CONFIG.serviceAreaEn,
    businessHoursHe: practical.businessHoursHe || undefined,
    businessHoursEn: practical.businessHoursEn || undefined,
    eventSizeGuidanceHe: practical.eventSizeGuidanceHe || undefined,
    eventSizeGuidanceEn: practical.eventSizeGuidanceEn || undefined,
    cancellationTermsHe: practical.cancellationTermsHe || undefined,
    cancellationTermsEn: practical.cancellationTermsEn || undefined,
  };
}

export async function loadHydratedSettings(
  queryFn: SqlQueryFn,
  env: ServerEnv
): Promise<HydratedSettings> {
  const rows = await queryFn<{ key: string; value: unknown }>(
    'SELECT key, value FROM app_settings'
  );
  const byKey = new Map<string, unknown>();
  for (const row of rows) {
    byKey.set(row.key, safeParseSetting(row.value));
  }

  const configRaw = (byKey.get('config') as Partial<AppSettings>) || {};
  const config: AppSettings = { ...DEFAULT_APP_CONFIG, ...configRaw };

  const calcRaw = (byKey.get('calculation_settings') as Partial<CalculationSettings>) || {};
  const calculation_settings: CalculationSettings = { ...DEFAULT_CALCULATION_SETTINGS, ...calcRaw };

  const advRaw = (byKey.get('advanced_settings') as Partial<AdvancedCalculationSettings>) || {};
  const advanced_settings: AdvancedCalculationSettings = {
    eventRatios: {
      basic: { ...DEFAULT_ADVANCED_SETTINGS.eventRatios.basic, ...(advRaw.eventRatios?.basic || {}) },
      plus: { ...DEFAULT_ADVANCED_SETTINGS.eventRatios.plus, ...(advRaw.eventRatios?.plus || {}) },
      premium: { ...DEFAULT_ADVANCED_SETTINGS.eventRatios.premium, ...(advRaw.eventRatios?.premium || {}) },
    },
  };

  const featuresRaw = (byKey.get('features') as Partial<FeatureFlags>) || {};
  const features: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS, ...featuresRaw };

  const themeRaw = byKey.get('theme');
  const theme = themeRaw && typeof themeRaw === 'object' ? (themeRaw as Record<string, string>) : null;

  const aboutRaw = byKey.get('about');
  const about = aboutRaw && typeof aboutRaw === 'object' ? (aboutRaw as AboutUsConfig) : null;

  const kosher = normalizeKosherSetting(byKey.get('kosher'));
  const kosherEvaluation = evaluateKosherStatus(kosher);

  const galleryRaw = byKey.get('gallery');
  const gallery = Array.isArray(galleryRaw) ? (galleryRaw as GalleryItem[]) : [];

  const practicalRaw = (byKey.get('practical_info') as Partial<PracticalInfoConfig>) || {};
  const practical_info: PracticalInfoConfig = {
    ...DEFAULT_PRACTICAL_INFO,
    ...practicalRaw,
    blockedDates: Array.isArray(practicalRaw.blockedDates)
      ? practicalRaw.blockedDates.filter((d): d is string => typeof d === 'string')
      : [],
  };

  const packagesRaw = byKey.get('packages');
  const packages = Array.isArray(packagesRaw) ? (packagesRaw as EventPackage[]) : [];

  const public_contact = buildPublicContactSummary(practical_info, env);

  return {
    config,
    theme,
    features,
    about,
    calculation_settings,
    advanced_settings,
    kosher,
    kosherEvaluation,
    gallery,
    practical_info,
    public_contact,
    packages,
  };
}
