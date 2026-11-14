// Shared schema & business validation module used identically on client and server.
// Keeps UI button disabled state, field inline errors, and backend enforcement 100% consistent.

import type { DeliveryMethod, KosherCertMetadata } from './types.js';
import { getJerusalemParts, isValidIsoCalendarDate, validateEventDateLeadTime } from './time.js';

export interface LocalizedError {
  he: string;
  en: string;
}

export interface QuoteItemInput {
  menuItemId: string;
  quantity: number;
  selectedModifications?: string[];
  notes?: string;
}

export interface QuoteRequestInput {
  customerName: string;
  customerPhone: string;
  eventDate: string;
  eventTime?: string | null;
  eventType: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string | null;
  resolvedLocation?: string | null;
  distanceKm?: number | string | null;
  adultCount?: number | string | null;
  childCount?: number | string | null;
  wantsSetup: boolean;
  allergyNotes?: string | null;
  notes?: string | null;
  couponCode?: string | null;
  items: QuoteItemInput[];
}

export interface NormalizedQuoteRequest {
  customerName: string;
  customerPhone: string;
  customerPhoneNormalized: string;
  eventDate: string;
  eventTime: string;
  eventType: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  resolvedLocation: string;
  distanceKm: number | null;
  adultCount: number | null;
  childCount: number | null;
  wantsSetup: boolean;
  allergyNotes: string;
  notes: string;
  couponCode: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    selectedModifications: string[];
    notes: string;
  }>;
}

export interface QuoteValidationOptions {
  leadTimeHours: number;
  blockedDates?: string[];
  maxDeliveryDistanceKm?: number | null;
  now?: Date;
}

export interface QuoteValidationResult {
  valid: boolean;
  fieldErrors: Record<string, LocalizedError>;
  errors: LocalizedError[];
  normalized?: NormalizedQuoteRequest;
  leadTimeInfo: ReturnType<typeof validateEventDateLeadTime>;
}

const collapseSpaces = (value: string): string => value.trim().replace(/\s+/g, ' ');

export function validatePhoneInput(raw: unknown): {
  valid: boolean;
  normalized: string;
  display: string;
  error?: LocalizedError;
} {
  if (typeof raw !== 'string') {
    return {
      valid: false,
      normalized: '',
      display: '',
      error: { he: 'נא להזין מספר טלפון.', en: 'Please enter a phone number.' },
    };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalized: '',
      display: '',
      error: { he: 'נא להזין מספר טלפון ליצירת קשר.', en: 'Please enter a contact phone number.' },
    };
  }
  // Allow only digits, spaces, hyphens, parentheses, and a single optional leading '+'
  if (/[^\d\s\-()+]/.test(trimmed)) {
    return {
      valid: false,
      normalized: '',
      display: trimmed,
      error: {
        he: 'מספר טלפון יכול להכיל ספרות בלבד (ומקף/קידומת בינלאומית).',
        en: 'Phone number must contain digits only (plus optional leading + or dashes).',
      },
    };
  }

  let compact = trimmed.replace(/[\s\-()]/g, '');
  if (compact.includes('+') && !compact.startsWith('+')) {
    return {
      valid: false,
      normalized: '',
      display: trimmed,
      error: { he: 'תו + מותר רק בתחילת מספר טלפון בינלאומי.', en: '+ is only allowed at the start.' },
    };
  }

  if (compact.startsWith('00')) {
    compact = `+${compact.slice(2)}`;
  }

  // Israeli local numbers: mobile 05X-XXXXXXX (10), landline 0[23489]-XXXXXXX (9), VoIP 07X-XXXXXXX (10)
  if (!compact.startsWith('+')) {
    const isIlMobile = /^05\d{8}$/.test(compact);
    const isIlLandline = /^0[23489]\d{7}$/.test(compact);
    const isIlVoip = /^07\d{8}$/.test(compact);
    if (!isIlMobile && !isIlLandline && !isIlVoip) {
      return {
        valid: false,
        normalized: '',
        display: trimmed,
        error: {
          he: 'נא להזין מספר טלפון ישראלי תקין (לדוגמה 054-747-4764) או מספר בינלאומי עם +.',
          en: 'Enter a valid Israeli number (e.g. 054-747-4764) or international +E.164 format.',
        },
      };
    }
    return {
      valid: true,
      normalized: `+972${compact.slice(1)}`,
      display: trimmed,
    };
  }

  // International E.164 format
  if (compact.startsWith('+972')) {
    let national = compact.slice(4);
    if (national.startsWith('0')) national = national.slice(1);
    const ilValid = /^(5\d{8}|[23489]\d{7}|7\d{8})$/.test(national);
    if (!ilValid) {
      return {
        valid: false,
        normalized: '',
        display: trimmed,
        error: {
          he: 'מספר הטלפון עם קידומת +972 אינו תקין.',
          en: 'The +972 phone number format is invalid.',
        },
      };
    }
    return { valid: true, normalized: `+972${national}`, display: trimmed };
  }

  if (!/^\+[1-9]\d{7,14}$/.test(compact)) {
    return {
      valid: false,
      normalized: '',
      display: trimmed,
      error: {
        he: 'מספר הטלפון הבינלאומי אינו תקין (נדרשות 8–15 ספרות אחרי +).',
        en: 'Invalid international phone number (8–15 digits required after +).',
      },
    };
  }

  return { valid: true, normalized: compact, display: trimmed };
}

export function validateStrictNonNegativeInt(
  raw: unknown,
  options: { required?: boolean; max?: number; labelHe: string; labelEn: string }
): { valid: boolean; value: number | null; error?: LocalizedError } {
  const max = options.max ?? 5000;
  if (raw === undefined || raw === null || raw === '') {
    if (options.required) {
      return {
        valid: false,
        value: null,
        error: { he: `נא להזין ${options.labelHe}.`, en: `Please enter ${options.labelEn}.` },
      };
    }
    return { valid: true, value: null };
  }

  const num = typeof raw === 'string' ? Number(raw.trim()) : typeof raw === 'number' ? raw : NaN;
  if (!Number.isFinite(num)) {
    return {
      valid: false,
      value: null,
      error: { he: `${options.labelHe} חייב להיות מספר תקין.`, en: `${options.labelEn} must be a valid number.` },
    };
  }
  if (!Number.isInteger(num)) {
    return {
      valid: false,
      value: null,
      error: { he: `${options.labelHe} חייב להיות מספר שלם (ללא שברים).`, en: `${options.labelEn} must be a whole integer.` },
    };
  }
  if (num < 0 || num > max) {
    return {
      valid: false,
      value: null,
      error: {
        he: `${options.labelHe} חייב להיות בין 0 ל-${max}.`,
        en: `${options.labelEn} must be between 0 and ${max}.`,
      },
    };
  }
  return { valid: true, value: num };
}

export function validateQuoteRequest(
  input: QuoteRequestInput,
  options: QuoteValidationOptions
): QuoteValidationResult {
  const fieldErrors: Record<string, LocalizedError> = {};
  const addFieldError = (field: string, err: LocalizedError) => {
    if (!fieldErrors[field]) fieldErrors[field] = err;
  };

  // 1. Customer Name
  const name = collapseSpaces(typeof input.customerName === 'string' ? input.customerName : '');
  if (name.length < 2 || name.length > 80 || !/[A-Za-z\u0590-\u05FF\u0600-\u06FF]/.test(name)) {
    addFieldError('customerName', {
      he: 'נא להזין שם מלא תקין (2 עד 80 תווים עם אותיות).',
      en: 'Please enter a valid full name (2 to 80 characters).',
    });
  }

  // 2. Customer Phone
  const phoneRes = validatePhoneInput(input.customerPhone);
  if (!phoneRes.valid && phoneRes.error) {
    addFieldError('customerPhone', phoneRes.error);
  }

  // 3. Lead time & date/time in Asia/Jerusalem
  const leadTimeInfo = validateEventDateLeadTime({
    eventDate: typeof input.eventDate === 'string' ? input.eventDate : '',
    eventTime: typeof input.eventTime === 'string' ? input.eventTime : '',
    leadTimeHours: options.leadTimeHours,
    blockedDates: options.blockedDates,
    now: options.now,
  });
  if (!leadTimeInfo.valid && leadTimeInfo.errorHe && leadTimeInfo.errorEn) {
    const field = leadTimeInfo.reason === 'insufficient_lead_time' && input.eventTime === undefined
      ? 'eventDate'
      : 'eventDate';
    addFieldError(field, { he: leadTimeInfo.errorHe, en: leadTimeInfo.errorEn });
  }

  // 4. Event Type
  const eventType = collapseSpaces(typeof input.eventType === 'string' ? input.eventType : '');
  if (!eventType || eventType.length > 60) {
    addFieldError('eventType', {
      he: 'נא לבחור סוג אירוע.',
      en: 'Please select an event type.',
    });
  }

  // 5. Fulfillment: pickup vs delivery + non-negative finite distance
  const deliveryMethod: DeliveryMethod = input.deliveryMethod === 'delivery' ? 'delivery' : 'pickup';
  let deliveryAddress = '';
  let resolvedLocation = '';
  let distanceKm: number | null = null;

  if (deliveryMethod === 'delivery') {
    deliveryAddress = collapseSpaces(typeof input.deliveryAddress === 'string' ? input.deliveryAddress : '');
    resolvedLocation = collapseSpaces(typeof input.resolvedLocation === 'string' ? input.resolvedLocation : '');
    if (deliveryAddress.length < 4 || deliveryAddress.length > 200) {
      addFieldError('deliveryAddress', {
        he: 'במשלוח נדרשת כתובת או יישוב למשלוח (4 עד 200 תווים).',
        en: 'Delivery address or city is required (4 to 200 characters).',
      });
    }
    const rawDist = input.distanceKm;
    if (rawDist === undefined || rawDist === null || rawDist === '') {
      addFieldError('distanceKm', {
        he: 'נא להזין או לחשב מרחק משלוח מקדומים (0 ק"מ ומעלה).',
        en: 'Please enter or calculate delivery distance in km (0 or greater).',
      });
    } else {
      const distNum = typeof rawDist === 'string' ? Number(rawDist.trim()) : Number(rawDist);
      if (!Number.isFinite(distNum) || distNum < 0 || distNum > 500) {
        addFieldError('distanceKm', {
          he: 'מרחק המשלוח חייב להיות מספר תקין ולא שלילי (0 עד 500 ק"מ).',
          en: 'Delivery distance must be a valid non-negative number (0 to 500 km).',
        });
      } else if (
        typeof options.maxDeliveryDistanceKm === 'number' &&
        options.maxDeliveryDistanceKm > 0 &&
        distNum > options.maxDeliveryDistanceKm
      ) {
        addFieldError('distanceKm', {
          he: `המרחק חורג מטווח המשלוח המוגדר (${options.maxDeliveryDistanceKm} ק"מ). ניתן לתאם מול איילה או לבחור באיסוף עצמי.`,
          en: `Distance exceeds configured delivery range (${options.maxDeliveryDistanceKm} km). Choose pickup or contact Ayala.`,
        });
      } else {
        distanceKm = Math.round(distNum * 10) / 10;
      }
    }
  }

  // 6. Guest counts (optional unless provided; strictly integer >= 0)
  const adultsRes = validateStrictNonNegativeInt(input.adultCount, {
    required: false,
    max: 5000,
    labelHe: 'מספר מבוגרים',
    labelEn: 'Adult count',
  });
  if (!adultsRes.valid && adultsRes.error) addFieldError('adultCount', adultsRes.error);

  const childrenRes = validateStrictNonNegativeInt(input.childCount, {
    required: false,
    max: 5000,
    labelHe: 'מספר ילדים',
    labelEn: 'Child count',
  });
  if (!childrenRes.valid && childrenRes.error) addFieldError('childCount', childrenRes.error);

  if (
    adultsRes.valid &&
    childrenRes.valid &&
    adultsRes.value !== null &&
    childrenRes.value !== null &&
    adultsRes.value + childrenRes.value === 0
  ) {
    addFieldError('adultCount', {
      he: 'מספר הסועדים הכולל חייב להיות לפחות 1.',
      en: 'Total guest count must be at least 1.',
    });
  }

  // 7. Items array (non-empty, integer quantity 1..500)
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const normalizedItems: NormalizedQuoteRequest['items'] = [];
  if (rawItems.length === 0 || rawItems.length > 100) {
    addFieldError('items', {
      he: rawItems.length === 0 ? 'העגלה ריקה — יש לבחור לפחות מנה אחת.' : 'ניתן לצרף עד 100 שורות לבקשה אחת.',
      en: rawItems.length === 0 ? 'Your cart is empty — please select at least one item.' : 'Maximum 100 line items per request.',
    });
  } else {
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const menuItemId = typeof item?.menuItemId === 'string' ? item.menuItemId.trim() : '';
      const qty = Number(item?.quantity);
      if (!menuItemId || !Number.isInteger(qty) || qty < 1 || qty > 500) {
        addFieldError('items', {
          he: 'כל מנה חייבת לכלול כמות שלמה תקינה (1 עד 500).',
          en: 'Every item must have a valid whole quantity (1 to 500).',
        });
        break;
      }
      const mods = Array.isArray(item.selectedModifications)
        ? item.selectedModifications
            .filter((m): m is string => typeof m === 'string')
            .map((m) => collapseSpaces(m).slice(0, 80))
            .filter(Boolean)
            .slice(0, 20)
            .sort()
        : [];
      const itemNotes = collapseSpaces(typeof item.notes === 'string' ? item.notes : '').slice(0, 300);
      normalizedItems.push({ menuItemId, quantity: qty, selectedModifications: mods, notes: itemNotes });
    }
  }

  // 8. Notes & allergy notes bounds
  const allergyNotes = collapseSpaces(typeof input.allergyNotes === 'string' ? input.allergyNotes : '').slice(0, 500);
  const notes = collapseSpaces(typeof input.notes === 'string' ? input.notes : '').slice(0, 1000);
  const couponCode = collapseSpaces(typeof input.couponCode === 'string' ? input.couponCode : '')
    .toUpperCase()
    .slice(0, 40);

  const errors = Object.values(fieldErrors);
  if (errors.length > 0) {
    return { valid: false, fieldErrors, errors, leadTimeInfo };
  }

  return {
    valid: true,
    fieldErrors: {},
    errors: [],
    leadTimeInfo,
    normalized: {
      customerName: name,
      customerPhone: phoneRes.display,
      customerPhoneNormalized: phoneRes.normalized,
      eventDate: input.eventDate.trim(),
      eventTime: (input.eventTime || '').trim(),
      eventType,
      deliveryMethod,
      deliveryAddress,
      resolvedLocation,
      distanceKm,
      adultCount: adultsRes.value,
      childCount: childrenRes.value,
      wantsSetup: Boolean(input.wantsSetup),
      allergyNotes,
      notes,
      couponCode,
      items: normalizedItems,
    },
  };
}

/**
 * Produces a canonical string representation of the full normalized quote request
 * (scoped to Jerusalem date so identical double-clicks/retries collapse to one record
 * while any change to delivery address, distance, event type, guests, notes, or items creates a new key).
 */
export function serializeNormalizedQuoteForIdempotency(
  normalized: NormalizedQuoteRequest,
  now: Date = new Date()
): string {
  const sortedItems = [...normalized.items].sort((a, b) => {
    const keyA = `${a.menuItemId}|${a.selectedModifications.join(',')}|${a.notes}`;
    const keyB = `${b.menuItemId}|${b.selectedModifications.join(',')}|${b.notes}`;
    return keyA.localeCompare(keyB);
  });
  const canonicalPayload = {
    v: 2,
    bucketDate: getJerusalemParts(now).dateStr,
    customerName: normalized.customerName.toLowerCase(),
    customerPhone: normalized.customerPhoneNormalized,
    eventDate: normalized.eventDate,
    eventTime: normalized.eventTime,
    eventType: normalized.eventType,
    deliveryMethod: normalized.deliveryMethod,
    deliveryAddress: normalized.deliveryAddress.toLowerCase(),
    resolvedLocation: normalized.resolvedLocation.toLowerCase(),
    distanceKm: normalized.distanceKm,
    adultCount: normalized.adultCount,
    childCount: normalized.childCount,
    wantsSetup: normalized.wantsSetup,
    allergyNotes: normalized.allergyNotes,
    notes: normalized.notes,
    couponCode: normalized.couponCode,
    items: sortedItems,
  };
  return JSON.stringify(canonicalPayload);
}

export function validateReviewInput(input: {
  customer_name?: unknown;
  rating?: unknown;
  comment?: unknown;
}): {
  valid: boolean;
  fieldErrors: Record<string, LocalizedError>;
  normalized?: { customer_name: string; rating: number; comment: string };
} {
  const fieldErrors: Record<string, LocalizedError> = {};
  const name = collapseSpaces(typeof input.customer_name === 'string' ? input.customer_name : '');
  if (name.length < 2 || name.length > 60) {
    fieldErrors.customer_name = {
      he: 'נא להזין שם תקין (2 עד 60 תווים).',
      en: 'Please enter a valid name (2 to 60 characters).',
    };
  }
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    fieldErrors.rating = {
      he: 'נא לבחור דירוג שלם מ-1 עד 5 כוכבים.',
      en: 'Please choose a whole star rating from 1 to 5.',
    };
  }
  const comment = collapseSpaces(typeof input.comment === 'string' ? input.comment : '');
  if (comment.length < 3 || comment.length > 1000) {
    fieldErrors.comment = {
      he: 'נא להזין חוות דעת קצרה (3 עד 1000 תווים).',
      en: 'Please write a short review (3 to 1000 characters).',
    };
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }
  return {
    valid: true,
    fieldErrors: {},
    normalized: { customer_name: name, rating, comment },
  };
}

export function validateKosherMetadataInput(input: Partial<KosherCertMetadata>): {
  valid: boolean;
  errors: LocalizedError[];
  normalized?: KosherCertMetadata;
} {
  const errors: LocalizedError[] = [];
  const documentUrl = (input.documentUrl || '').trim();
  const issuer = collapseSpaces(input.issuer || '').slice(0, 120);
  const validUntil = (input.validUntil || '').trim() || null;

  if (!documentUrl || (!/^https?:\/\//i.test(documentUrl) && !documentUrl.startsWith('/'))) {
    errors.push({ he: 'נא לספק קישור או תמונה תקינים לתעודת הכשרות.', en: 'Valid certificate URL required.' });
  }
  if (!issuer || issuer.length < 2) {
    errors.push({ he: 'נא להזין את שם הגוף הנותן את הכשרות.', en: 'Certifying authority / issuer is required.' });
  }
  if (!validUntil || !isValidIsoCalendarDate(validUntil)) {
    errors.push({ he: 'נא להזין תאריך תוקף תקין (YYYY-MM-DD).', en: 'Valid expiry date (YYYY-MM-DD) required.' });
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return {
    valid: true,
    errors: [],
    normalized: {
      documentUrl,
      issuer,
      validUntil,
      verifiedAt: new Date().toISOString(),
      notesHe: collapseSpaces(input.notesHe || '').slice(0, 400) || undefined,
      notesEn: collapseSpaces(input.notesEn || '').slice(0, 400) || undefined,
    },
  };
}
