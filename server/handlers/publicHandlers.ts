// Public API handlers: bootstrap catalog/settings, coupon check, quote creation & scoped viewing, reviews, AI menu planner, telemetry.

import { ALLOWED_TELEMETRY_EVENTS } from '../../shared/config.js';
import { calculateServerQuoteTotals } from '../../shared/pricing.js';
import type {
  CartItem,
  Coupon,
  CustomerSafeQuoteView,
  MenuItem,
  Order,
  Review,
} from '../../shared/types.js';
import {
  serializeNormalizedQuoteForIdempotency,
  validateQuoteRequest,
  validateReviewInput,
  type QuoteRequestInput,
} from '../../shared/validation.js';
import { generateOpaqueToken, generateReferenceCode, sha256Hex } from '../crypto.js';
import { sanitizeDbError, type SqlQueryFn } from '../db.js';
import type { ServerEnv } from '../env.js';
import {
  authenticateAdminRequest,
  getClientIp,
  getQueryParams,
  readJsonBody,
  requireMethod,
  sendJson,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../http.js';
import { dispatchQuoteNotification } from '../notify.js';
import { checkRateLimit } from '../rateLimit.js';
import { loadHydratedSettings } from './settingsHelpers.js';

export interface HandlerDeps {
  queryFn: SqlQueryFn;
  env: ServerEnv;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export function mapMenuRow(row: Record<string, unknown>, hidePrices: boolean = false): MenuItem {
  return {
    id: String(row.id),
    category: row.category as MenuItem['category'],
    name: String(row.name || ''),
    name_en: typeof row.name_en === 'string' ? row.name_en : undefined,
    description: typeof row.description === 'string' ? row.description : '',
    description_en: typeof row.description_en === 'string' ? row.description_en : undefined,
    price: hidePrices ? 0 : Number(row.price || 0),
    unit_type: (row.unit_type || 'tray') as MenuItem['unit_type'],
    serves_min: Number(row.serves_min ?? 1),
    serves_max: Number(row.serves_max ?? 1),
    is_premium: Boolean(row.is_premium),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    dietary_tags: Array.isArray(row.dietary_tags) ? (row.dietary_tags as string[]) : undefined,
    allergen_info:
      row.allergen_info && typeof row.allergen_info === 'object'
        ? (row.allergen_info as MenuItem['allergen_info'])
        : undefined,
    availability_status: row.availability_status !== false,
    image_url: typeof row.image_url === 'string' ? row.image_url : '',
    allowed_modifications: Array.isArray(row.allowed_modifications)
      ? (row.allowed_modifications as string[])
      : [],
    allowed_modifications_en: Array.isArray(row.allowed_modifications_en)
      ? (row.allowed_modifications_en as string[])
      : [],
    is_tray: Boolean(row.is_tray),
    units_per_tray: row.units_per_tray != null ? Number(row.units_per_tray) : undefined,
  };
}

export async function handlePublicBootstrap(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  if (!requireMethod(req, res, ['GET'])) return;
  try {
    const settings = await loadHydratedSettings(deps.queryFn, deps.env);
    const isAdminSession = Boolean(authenticateAdminRequest(req, deps.env));
    const hidePrices = !settings.config.ecommerce_mode && !isAdminSession;

    const menuRows = await deps.queryFn<Record<string, unknown>>(
      'SELECT * FROM menu_items ORDER BY category ASC, name ASC'
    );
    const menuItems = menuRows.map((r) => mapMenuRow(r, hidePrices));

    let reviewRows: Review[] = [];
    try {
      reviewRows = await deps.queryFn<Review>(
        `SELECT id, customer_name, rating, comment, status, created_at
         FROM reviews
         WHERE COALESCE(status, 'approved') = 'approved'
         ORDER BY created_at DESC
         LIMIT 50`
      );
    } catch {
      reviewRows = await deps.queryFn<Review>(
        `SELECT id, customer_name, rating, comment, created_at
         FROM reviews
         ORDER BY created_at DESC
         LIMIT 50`
      );
    }

    sendJson(res, 200, {
      menuItems,
      reviews: reviewRows,
      settings: {
        config: settings.config,
        theme: settings.theme,
        features: settings.features,
        about: settings.about,
        calculation_settings: settings.calculation_settings,
        advanced_settings: settings.advanced_settings,
        kosher: settings.kosher,
        kosherEvaluation: settings.kosherEvaluation,
        gallery: settings.gallery,
        public_contact: settings.public_contact,
        packages: settings.packages.filter((p) => p.is_active !== false),
        blockedDates: settings.practical_info.blockedDates || [],
        maxDeliveryDistanceKm: settings.practical_info.maxDeliveryDistanceKm ?? null,
      },
    });
  } catch (err) {
    const safe = sanitizeDbError(err);
    sendJson(res, 500, { error: safe.message, code: safe.code });
  }
}

export async function handleCouponCheck(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  if (!requireMethod(req, res, ['POST'])) return;
  const ip = getClientIp(req);
  const rl = await checkRateLimit({
    key: `coupon:${ip}`,
    limit: 20,
    windowSeconds: 600,
    queryFn: deps.queryFn,
  });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSeconds));
    return sendJson(res, 429, { error: 'Too many coupon attempts', code: 'RATE_LIMITED' });
  }

  try {
    const body = await readJsonBody<{ code?: string }>(req, 16 * 1024);
    const code = (body.code || '').trim().toUpperCase();
    if (!code || code.length > 40) {
      return sendJson(res, 400, { valid: false, code: 'INVALID_COUPON' });
    }
    const rows = await deps.queryFn<Coupon>(
      `SELECT code, discount_type, discount_value, is_active, usage_count, usage_limit
       FROM coupons WHERE UPPER(code) = $1 LIMIT 1`,
      [code]
    );
    const coupon = rows[0];
    if (!coupon || !coupon.is_active) {
      return sendJson(res, 404, { valid: false, code: 'COUPON_NOT_FOUND' });
    }
    if (
      coupon.usage_limit != null &&
      Number(coupon.usage_count || 0) >= Number(coupon.usage_limit)
    ) {
      return sendJson(res, 400, { valid: false, code: 'COUPON_EXHAUSTED' });
    }
    sendJson(res, 200, {
      valid: true,
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
      },
    });
  } catch (err) {
    const safe = sanitizeDbError(err);
    sendJson(res, 500, { valid: false, error: safe.message, code: safe.code });
  }
}

export async function handlePublicQuoteEndpoint(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  const method = requireMethod(req, res, ['GET', 'POST']);
  if (!method) return;

  if (method === 'GET') {
    return handleGetScopedQuote(req, res, deps);
  }
  return handleCreateQuote(req, res, deps);
}

async function handleGetScopedQuote(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  const ip = getClientIp(req);
  const rl = await checkRateLimit({
    key: `quote_read:${ip}`,
    limit: 30,
    windowSeconds: 300,
    queryFn: deps.queryFn,
  });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSeconds));
    return sendJson(res, 429, { error: 'Too many requests', code: 'RATE_LIMITED' });
  }

  const params = getQueryParams(req);
  const token = (params.get('token') || '').trim();
  const legacyId = (params.get('quote') || '').trim();

  if (legacyId && !token) {
    return sendJson(res, 401, {
      code: 'LEGACY_QUOTE_LINK_DISABLED',
      errorHe: 'קישור ישן לפי מזהה פנימי אינו זמין יותר מטעמי פרטיות. בקשו מאיילה קישור הצעה מאובטח חדש.',
      errorEn: 'Legacy direct-ID quote links are disabled for privacy. Please ask Ayala for a secure quote link.',
    });
  }

  if (!token || token.length < 16 || token.length > 160) {
    return sendJson(res, 400, {
      code: 'INVALID_QUOTE_TOKEN',
      errorHe: 'קישור ההצעה אינו תקין.',
      errorEn: 'Quote token is missing or invalid.',
    });
  }

  try {
    const tokenHash = sha256Hex(token);
    const settings = await loadHydratedSettings(deps.queryFn, deps.env);
    const rows = await deps.queryFn<Record<string, unknown>>(
      `SELECT reference_code, customer_name, event_date, event_time, event_type,
              delivery_method, delivery_address, resolved_location, distance_km,
              adult_count, child_count, wants_setup, allergy_notes, notes, status,
              items, subtotal, discount_amount, delivery_fee, total_price,
              created_at, quote_token_expires_at
       FROM orders
       WHERE quote_token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    const row = rows[0];
    if (!row) {
      return sendJson(res, 404, {
        code: 'QUOTE_NOT_FOUND',
        errorHe: 'הצעה זו לא נמצאה או שהקישור הוחלף.',
        errorEn: 'Quote not found or link superseded.',
      });
    }

    const expiresAt = row.quote_token_expires_at ? new Date(String(row.quote_token_expires_at)) : null;
    const now = (deps.now ?? (() => new Date()))();
    if (!expiresAt || expiresAt.getTime() <= now.getTime()) {
      return sendJson(res, 410, {
        code: 'QUOTE_TOKEN_EXPIRED',
        errorHe: 'תוקף קישור הצעת המחיר פג. צרו קשר עם איילה לקבלת קישור מעודכן.',
        errorEn: 'This quote link has expired. Contact Ayala for a fresh link.',
      });
    }

    const ecommerceMode = Boolean(settings.config.ecommerce_mode);
    const rawItems = Array.isArray(row.items) ? (row.items as unknown[]) : [];
    const safeItems: CartItem[] = rawItems.map((raw) => {
      const obj = raw as Record<string, unknown>;
      const nested = obj.menuItem as Record<string, unknown> | undefined;
      const base = (nested && typeof nested === 'object' ? nested : obj) as unknown as MenuItem;
      const mods = Array.isArray(obj.selected_modifications)
        ? (obj.selected_modifications as string[])
        : Array.isArray(obj.selectedModifications)
        ? (obj.selectedModifications as string[])
        : [];
      return {
        ...base,
        price: ecommerceMode ? Number(base.price || 0) : 0,
        quantity: Number(obj.quantity || 1),
        selected_modifications: mods,
        notes: typeof obj.notes === 'string' ? obj.notes : undefined,
      };
    });

    const payload: CustomerSafeQuoteView = {
      reference_code: String(row.reference_code || ''),
      customer_name: String(row.customer_name || ''),
      event_date: String(row.event_date || '').slice(0, 10),
      event_time: typeof row.event_time === 'string' && row.event_time ? row.event_time : undefined,
      event_type: String(row.event_type || ''),
      delivery_method: row.delivery_method === 'delivery' ? 'delivery' : 'pickup',
      delivery_address:
        row.delivery_method === 'delivery' && typeof row.delivery_address === 'string'
          ? row.delivery_address
          : undefined,
      resolved_location:
        typeof row.resolved_location === 'string' && row.resolved_location
          ? row.resolved_location
          : undefined,
      distance_km: row.distance_km != null ? Number(row.distance_km) : null,
      adult_count: row.adult_count != null ? Number(row.adult_count) : null,
      child_count: row.child_count != null ? Number(row.child_count) : null,
      wants_setup: Boolean(row.wants_setup),
      allergy_notes: typeof row.allergy_notes === 'string' && row.allergy_notes ? row.allergy_notes : undefined,
      notes: typeof row.notes === 'string' && row.notes ? row.notes : undefined,
      status: (row.status || 'Pending') as Order['status'],
      items: safeItems,
      ecommerce_mode: ecommerceMode,
      ...(ecommerceMode
        ? {
            subtotal: Number(row.subtotal || 0),
            discount_amount: Number(row.discount_amount || 0),
            delivery_fee: Number(row.delivery_fee || 0),
            total_price: Number(row.total_price || 0),
          }
        : {}),
      created_at: String(row.created_at || ''),
      expires_at: expiresAt.toISOString(),
      contact: settings.public_contact,
      pickup_guidance_he: settings.practical_info.pickupPublicNoteHe,
      pickup_guidance_en: settings.practical_info.pickupPublicNoteEn,
    };

    sendJson(res, 200, { ok: true, quote: payload });
  } catch (err) {
    const safe = sanitizeDbError(err);
    sendJson(res, 500, { error: safe.message, code: safe.code });
  }
}

async function handleCreateQuote(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  const ip = getClientIp(req);
  const rl = await checkRateLimit({
    key: `quote_create:${ip}`,
    limit: 10,
    windowSeconds: 600,
    queryFn: deps.queryFn,
  });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSeconds));
    return sendJson(res, 429, {
      code: 'RATE_LIMITED',
      errorHe: 'נשלחו יותר מדי בקשות בזמן קצר. נסו שוב בעוד מספר דקות.',
      errorEn: 'Too many requests. Please wait a few minutes and try again.',
    });
  }

  let body: QuoteRequestInput;
  try {
    body = await readJsonBody<QuoteRequestInput>(req, 256 * 1024);
  } catch {
    return sendJson(res, 400, { code: 'INVALID_JSON', error: 'Malformed JSON body' });
  }

  const now = (deps.now ?? (() => new Date()))();

  try {
    const settings = await loadHydratedSettings(deps.queryFn, deps.env);
    if (!settings.config.is_shop_open) {
      return sendJson(res, 403, {
        code: 'SHOP_CLOSED',
        errorHe: 'המטבח סגור זמנית לקבלת בקשות חדשות.',
        errorEn: 'Ordering is temporarily paused.',
      });
    }

    const validation = validateQuoteRequest(body, {
      leadTimeHours: settings.config.lead_time_hours,
      blockedDates: settings.practical_info.blockedDates,
      maxDeliveryDistanceKm: settings.practical_info.maxDeliveryDistanceKm,
      now,
    });

    if (!validation.valid || !validation.normalized) {
      return sendJson(res, 400, {
        code: 'VALIDATION_ERROR',
        fieldErrors: validation.fieldErrors,
        errors: validation.errors,
      });
    }

    const normalized = validation.normalized;
    const itemIds = [...new Set(normalized.items.map((i) => i.menuItemId))];
    const menuRows = await deps.queryFn<Record<string, unknown>>(
      'SELECT * FROM menu_items WHERE id::text = ANY($1::text[])',
      [itemIds]
    );
    const menuById = new Map<string, MenuItem>();
    for (const r of menuRows) {
      const m = mapMenuRow(r, false);
      if (m.availability_status) {
        menuById.set(m.id, m);
      }
    }

    for (const line of normalized.items) {
      if (!menuById.has(line.menuItemId)) {
        return sendJson(res, 400, {
          code: 'ITEM_UNAVAILABLE',
          fieldErrors: {
            items: {
              he: 'אחת המנות בעגלה אינה זמינה עוד בתפריט.',
              en: 'One of the selected menu items is unavailable.',
            },
          },
        });
      }
    }

    // Lookup coupon server-side when provided
    let coupon: Coupon | null = null;
    if (normalized.couponCode) {
      const cRows = await deps.queryFn<Coupon>(
        'SELECT * FROM coupons WHERE UPPER(code) = $1 LIMIT 1',
        [normalized.couponCode]
      );
      coupon = cRows[0] || null;
    }

    const totals = calculateServerQuoteTotals({
      items: normalized.items,
      menuById,
      deliveryMethod: normalized.deliveryMethod,
      distanceKm: normalized.distanceKm,
      wantsSetup: normalized.wantsSetup,
      coupon,
      appConfig: settings.config,
      calculationSettings: settings.calculation_settings,
    });

    if (
      settings.config.ecommerce_mode &&
      settings.config.min_order_price > 0 &&
      totals.subtotal < settings.config.min_order_price
    ) {
      return sendJson(res, 400, {
        code: 'MIN_ORDER_NOT_MET',
        fieldErrors: {
          items: {
            he: `סכום המינימום להזמנה הוא ₪${settings.config.min_order_price}.`,
            en: `Minimum order amount is ₪${settings.config.min_order_price}.`,
          },
        },
      });
    }

    const idempotencyKey = sha256Hex(serializeNormalizedQuoteForIdempotency(normalized, now));

    // Check existing record with identical normalized request first
    const existingRows = await deps.queryFn<Record<string, unknown>>(
      'SELECT id, reference_code, notification_status, created_at FROM orders WHERE idempotency_key = $1 LIMIT 1',
      [idempotencyKey]
    );
    if (existingRows[0]) {
      const freshToken = generateOpaqueToken(24);
      const expiresAt = new Date(now.getTime() + 30 * 86_400_000);
      await deps.queryFn(
        `UPDATE orders
         SET quote_token_hash = $1, quote_token_expires_at = $2, updated_at = NOW()
         WHERE id = $3`,
        [sha256Hex(freshToken), expiresAt.toISOString(), existingRows[0].id]
      );
      return sendJson(res, 200, {
        ok: true,
        deduplicated: true,
        reference_code: String(existingRows[0].reference_code || ''),
        quote_token: freshToken,
        quote_url: `${deps.env.siteUrl}?token=${encodeURIComponent(freshToken)}`,
        notification_status: String(existingRows[0].notification_status || 'pending'),
        contact: settings.public_contact,
      });
    }

    const referenceCode = generateReferenceCode(now);
    const quoteToken = generateOpaqueToken(24);
    const quoteTokenHash = sha256Hex(quoteToken);
    const tokenExpiresAt = new Date(now.getTime() + 30 * 86_400_000).toISOString();

    const storedCartItems: CartItem[] = normalized.items.map((line) => {
      const dbItem = menuById.get(line.menuItemId)!;
      return {
        ...dbItem,
        quantity: line.quantity,
        selected_modifications: line.selectedModifications,
        notes: line.notes || undefined,
      };
    });

    const inserted = await deps.queryFn<Record<string, unknown>>(
      `INSERT INTO orders (
        schema_version, reference_code, customer_name, customer_phone,
        event_date, event_time, total_price, subtotal, discount_amount,
        coupon_code, items, status, event_type, wants_setup,
        delivery_method, delivery_address, resolved_location, distance_km,
        adult_count, child_count, allergy_notes, delivery_fee, notes,
        idempotency_key, quote_token_hash, quote_token_expires_at,
        notification_status, handoff_status
      ) VALUES (
        2, $1, $2, $3,
        $4, $5, $6, $7, $8,
        $9, $10::jsonb, 'pending', $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23, $24,
        'pending', 'not_opened'
      )
      RETURNING *`,
      [
        referenceCode,
        normalized.customerName,
        normalized.customerPhoneNormalized,
        normalized.eventDate,
        normalized.eventTime || null,
        totals.totalPrice,
        totals.subtotal,
        totals.discountAmount,
        totals.appliedCouponCode,
        JSON.stringify(storedCartItems),
        normalized.eventType,
        normalized.wantsSetup,
        normalized.deliveryMethod,
        normalized.deliveryMethod === 'delivery' ? normalized.deliveryAddress : null,
        normalized.resolvedLocation || null,
        normalized.distanceKm,
        normalized.adultCount,
        normalized.childCount,
        normalized.allergyNotes || null,
        totals.deliveryFee,
        normalized.notes || null,
        idempotencyKey,
        quoteTokenHash,
        tokenExpiresAt,
      ]
    );

    const savedOrder = inserted[0] as unknown as Order;
    savedOrder.items = storedCartItems;

    if (totals.appliedCouponCode) {
      await deps.queryFn('SELECT increment_coupon_usage($1)', [totals.appliedCouponCode]);
    }

    const notifyRes = await dispatchQuoteNotification({
      order: savedOrder,
      env: deps.env,
      practicalInfo: settings.practical_info,
      fetchImpl: deps.fetchImpl,
    });

    await deps.queryFn(
      `UPDATE orders
       SET notification_status = $1, notification_error = $2, updated_at = NOW()
       WHERE id = $3`,
      [notifyRes.status, notifyRes.error || null, savedOrder.id]
    );

    sendJson(res, 201, {
      ok: true,
      deduplicated: false,
      reference_code: referenceCode,
      quote_token: quoteToken,
      quote_url: `${deps.env.siteUrl}?token=${encodeURIComponent(quoteToken)}`,
      notification_status: notifyRes.status,
      delivery_method: normalized.deliveryMethod,
      contact: settings.public_contact,
      ...(settings.config.ecommerce_mode ? { totals } : {}),
    });
  } catch (err) {
    const safe = sanitizeDbError(err);
    sendJson(res, 500, { ok: false, code: safe.code, error: safe.message });
  }
}

export async function handlePublicReviewsEndpoint(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  if (!requireMethod(req, res, ['POST'])) return;

  const ip = getClientIp(req);
  const rl = await checkRateLimit({
    key: `review_create:${ip}`,
    limit: 5,
    windowSeconds: 1800,
    queryFn: deps.queryFn,
  });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSeconds));
    return sendJson(res, 429, {
      code: 'RATE_LIMITED',
      errorHe: 'נשלחו יותר מדי חוות דעת בזמן קצר. נסו שוב מאוחר יותר.',
      errorEn: 'Too many review submissions. Please try again later.',
    });
  }

  try {
    const body = await readJsonBody<{ customer_name?: unknown; rating?: unknown; comment?: unknown }>(
      req,
      32 * 1024
    );
    const val = validateReviewInput(body);
    if (!val.valid || !val.normalized) {
      return sendJson(res, 400, { code: 'VALIDATION_ERROR', fieldErrors: val.fieldErrors });
    }

    const reviewId = `rev_${Date.now()}_${generateOpaqueToken(6)}`;
    try {
      await deps.queryFn(
        `INSERT INTO reviews (id, customer_name, rating, comment, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [reviewId, val.normalized.customer_name, val.normalized.rating, val.normalized.comment]
      );
    } catch {
      return sendJson(res, 500, {
        code: 'DB_SCHEMA_MIGRATION_REQUIRED',
        error: 'Reviews moderation column status requires migration 001.',
      });
    }

    sendJson(res, 201, {
      ok: true,
      id: reviewId,
      status: 'pending',
      messageHe: 'תודה! חוות הדעת התקבלה ותפורסם לאחר אישור איילה.',
      messageEn: 'Thank you! Your review has been received and awaits moderation approval.',
    });
  } catch (err) {
    const safe = sanitizeDbError(err);
    sendJson(res, 500, { code: safe.code, error: safe.message });
  }
}

export async function handlePublicAiMenu(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  if (!requireMethod(req, res, ['POST'])) return;

  const ip = getClientIp(req);
  const rl = await checkRateLimit({
    key: `ai_menu:${ip}`,
    limit: 12,
    windowSeconds: 600,
    queryFn: deps.queryFn,
  });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSeconds));
    return sendJson(res, 429, {
      code: 'RATE_LIMITED',
      fallbackToManual: true,
      errorHe: 'השף הדיגיטלי עמוס כרגע. באפשרותך להרכיב תפריט באמצעות מחשבון האירועים או התפריט הידני.',
      errorEn: 'The AI planner is busy right now. Please use the event calculator or manual menu.',
    });
  }

  let body: { prompt?: string; adults?: number; children?: number; eventType?: string; language?: string };
  try {
    body = await readJsonBody(req, 32 * 1024);
  } catch {
    return sendJson(res, 400, { code: 'INVALID_JSON', error: 'Invalid JSON request body' });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 800) : '';
  if (prompt.length < 3) {
    return sendJson(res, 400, {
      code: 'VALIDATION_ERROR',
      errorHe: 'נא לתאר בקצרה את אופי האירוע, כמות האורחים או העדפות.',
      errorEn: 'Please describe your event, guest count, or preferences.',
    });
  }

  if (!deps.env.geminiApiKey || !deps.env.geminiModel) {
    return sendJson(res, 503, {
      code: 'AI_UNAVAILABLE',
      fallbackToManual: true,
      errorHe:
        'השף הדיגיטלי אינו זמין כרגע עקב הגדרת שירות חסרה בשרת. ניתן להמשיך ולהרכיב בקשה באמצעות מחשבון הכמויות והתפריט המלא.',
      errorEn:
        'The AI menu planner is currently unavailable. Please use the event calculator or manual menu to build your quote.',
    });
  }

  const fetchFn = deps.fetchImpl ?? fetch;
  const dietaryRegex = /(גלוטן|טבעונ|אלרג|צליאק|חלב|לקטוז|אגוז|שומשום|בוטנים|gluten|vegan|allerg|celiac|dairy|lactose|nut|peanut)/i;
  const requiresDietaryConfirmation = dietaryRegex.test(prompt);

  try {
    const settings = await loadHydratedSettings(deps.queryFn, deps.env);
    if (!settings.features.showAI) {
      return sendJson(res, 403, { code: 'AI_DISABLED', fallbackToManual: true });
    }

    const menuRows = await deps.queryFn<Record<string, unknown>>(
      'SELECT * FROM menu_items WHERE availability_status = TRUE ORDER BY category ASC'
    );
    const availableItems = menuRows.map((r) => mapMenuRow(r, true));
    const itemById = new Map(availableItems.map((m) => [m.id, m]));

    const catalogSummary = availableItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      unit_type: item.unit_type,
      serves_min: item.serves_min,
      serves_max: item.serves_max,
      dietary_tags: item.dietary_tags || item.tags,
    }));

    const adults = Math.max(0, Math.min(2000, Number.isInteger(body.adults) ? Number(body.adults) : 20));
    const children = Math.max(0, Math.min(2000, Number.isInteger(body.children) ? Number(body.children) : 0));

    const systemPrompt = [
      'You are the digital catering menu assistant for Ayala - Simply Delicious (kosher dairy boutique catering).',
      'Recommend dishes ONLY using exact "id" values from the provided catalog JSON.',
      'NEVER invent dish IDs, prices, allergen safety guarantees, or kashrut claims.',
      'Output valid JSON ONLY matching: {"items":[{"id":"<uuid>","quantity":<int 1..50>,"note":"<short reason>"}],"explanation":"<friendly Hebrew/English explanation matching user language>"}',
      settings.calculation_settings.aiCustomInstructions
        ? `Owner instructions: ${settings.calculation_settings.aiCustomInstructions}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const userMessage = JSON.stringify({
      prompt,
      adults,
      children,
      eventType: body.eventType || 'not specified',
      preferredLanguage: body.language === 'en' ? 'en' : 'he',
      catalog: catalogSummary,
    });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      deps.env.geminiModel
    )}:generateContent`;

    const callModelOnce = async (): Promise<{ status: number; json?: unknown; text?: string }> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const resp = await fetchFn(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': deps.env.geminiApiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.4,
            },
          }),
          signal: controller.signal,
        });
        if (!resp.ok) {
          return { status: resp.status, text: (await resp.text()).slice(0, 300) };
        }
        return { status: 200, json: await resp.json() };
      } finally {
        clearTimeout(timer);
      }
    };

    const isRetryableStatus = (s: number) => s === 429 || s === 500 || s === 503;

    let result: { status: number; json?: unknown; text?: string };
    try {
      result = await callModelOnce();
      if (isRetryableStatus(result.status)) {
        await new Promise((r) => setTimeout(r, 800));
        result = await callModelOnce();
      }
    } catch {
      // One bounded retry on transient network/abort timeout
      await new Promise((r) => setTimeout(r, 800));
      result = await callModelOnce().catch(() => ({ status: 504, text: 'AI request timed out' }));
    }

    if (result.status !== 200 || !result.json) {
      // Permanent 400/401/403/404 are NEVER retried and are mapped honestly
      const isConfigErr = [400, 401, 403, 404].includes(result.status);
      return sendJson(res, isConfigErr ? 503 : 502, {
        code: isConfigErr ? 'AI_MODEL_MISCONFIGURED' : 'AI_UPSTREAM_ERROR',
        upstreamStatus: result.status,
        fallbackToManual: true,
        errorHe: isConfigErr
          ? 'שירות השף הדיגיטלי אינו מוגדר כראוי כרגע. ניתן לבחור מנות או חבילות מוכנות ישירות מהתפריט.'
          : 'לא הצלחנו לקבל הצעה כרגע מהשף הדיגיטלי. ניתן להרכיב בקשה דרך התפריט או המחשבון.',
        errorEn: isConfigErr
          ? 'AI planner service is temporarily unavailable due to server model configuration. Please browse the menu or packages directly.'
          : 'Unable to reach AI planner right now. You can select dishes manually from the menu.',
      });
    }

    const candidates = (result.json as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates;
    const rawText = candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(rawText) as {
      items?: Array<{ id?: unknown; quantity?: unknown; note?: unknown }>;
      explanation?: unknown;
    };

    const validatedItems: Array<{ menuItem: MenuItem; quantity: number; note?: string }> = [];
    const seenIds = new Set<string>();
    for (const row of Array.isArray(parsed.items) ? parsed.items : []) {
      const id = typeof row?.id === 'string' ? row.id.trim() : '';
      if (!id || seenIds.has(id)) continue;
      const realItem = itemById.get(id);
      if (!realItem) continue;
      const qtyRaw = Number(row.quantity);
      const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.min(50, Math.round(qtyRaw))) : 1;
      seenIds.add(id);
      validatedItems.push({
        menuItem: realItem,
        quantity: qty,
        note: typeof row.note === 'string' ? row.note.trim().slice(0, 150) : undefined,
      });
    }

    if (validatedItems.length === 0) {
      return sendJson(res, 502, {
        code: 'AI_EMPTY_OR_INVALID_SUGGESTION',
        fallbackToManual: true,
        errorHe: 'השף הדיגיטלי לא החזיר פריטים תקינים מהתפריט. ניתן להשתמש במחשבון או להוסיף מנות ידנית.',
        errorEn: 'No valid available menu items were returned. Please build your quote from the menu.',
      });
    }

    sendJson(res, 200, {
      ok: true,
      proposal: {
        items: validatedItems,
        explanation: typeof parsed.explanation === 'string' ? parsed.explanation.trim().slice(0, 1200) : '',
        requiresDietaryConfirmation,
      },
    });
  } catch (err) {
    const safe = sanitizeDbError(err);
    sendJson(res, 500, { code: safe.code, error: safe.message, fallbackToManual: true });
  }
}

export async function handlePublicTelemetry(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  if (!requireMethod(req, res, ['POST'])) return;

  const ip = getClientIp(req);
  const rl = await checkRateLimit({
    key: `telemetry:${ip}`,
    limit: 60,
    windowSeconds: 300,
    queryFn: deps.queryFn,
  });
  if (!rl.allowed) {
    return sendJson(res, 204, {});
  }

  try {
    const body = await readJsonBody<{ event_name?: unknown; meta?: Record<string, unknown> }>(
      req,
      8 * 1024
    );
    const eventName = typeof body.event_name === 'string' ? body.event_name.trim() : '';
    if (!(ALLOWED_TELEMETRY_EVENTS as readonly string[]).includes(eventName)) {
      return sendJson(res, 400, { code: 'INVALID_EVENT' });
    }

    // Strictly whitelist safe aggregate non-PII metadata keys only
    const safeMeta: Record<string, string | number | boolean> = {};
    if (body.meta && typeof body.meta === 'object') {
      const allowedKeys = ['language', 'category', 'step', 'delivery_method', 'source'];
      for (const key of allowedKeys) {
        const val = body.meta[key];
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          safeMeta[key] = typeof val === 'string' ? val.slice(0, 60) : val;
        }
      }
    }

    try {
      await deps.queryFn(
        'INSERT INTO app_telemetry_events (event_name, meta_json) VALUES ($1, $2::jsonb)',
        [eventName, JSON.stringify(safeMeta)]
      );
    } catch {
      // Telemetry is best-effort and never breaks UX
    }
    sendJson(res, 202, { ok: true });
  } catch {
    sendJson(res, 400, { ok: false });
  }
}
