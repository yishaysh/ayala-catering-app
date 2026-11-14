import { describe, expect, it } from 'vitest';
import type { SqlQueryFn } from '../server/db.js';
import type { ServerEnv } from '../server/env.js';
import {
  handleAdminAuth,
  handleAdminCatalog,
  handleAdminOrders,
  handleAdminSettings,
  handleAdminUploadSignature,
} from '../server/handlers/adminHandlers.js';
import {
  handlePublicAiMenu,
  handlePublicBootstrap,
  handlePublicQuoteEndpoint,
  handlePublicReviewsEndpoint,
  type HandlerDeps,
} from '../server/handlers/publicHandlers.js';
import type { ApiRequestLike, ApiResponseLike } from '../server/http.js';

interface StoredOrderRow extends Record<string, unknown> {
  id: string;
  schema_version: number;
  reference_code: string;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  event_time: string | null;
  total_price: number;
  subtotal: number;
  discount_amount: number;
  coupon_code: string | null;
  items: unknown[];
  status: string;
  event_type: string;
  wants_setup: boolean;
  delivery_method: 'pickup' | 'delivery';
  delivery_address: string | null;
  resolved_location: string | null;
  distance_km: number | null;
  adult_count: number | null;
  child_count: number | null;
  allergy_notes: string | null;
  delivery_fee: number;
  notes: string | null;
  idempotency_key: string;
  quote_token_hash: string;
  quote_token_expires_at: string;
  notification_status: string;
  notification_error: string | null;
  handoff_status: string;
  created_at: string;
  updated_at: string;
}

function createTestEnv(overrides: Partial<ServerEnv> = {}): ServerEnv {
  return {
    databaseUrl: 'postgres://unused-in-mock-tests',
    adminPasswordHash: '',
    adminPassword: 'StrongTestPassword!123',
    sessionSecret: 'test-session-secret-with-at-least-32-chars',
    geminiApiKey: 'test-gemini-key',
    geminiModel: 'gemini-2.5-flash',
    cloudinaryCloudName: 'test-cloud',
    cloudinaryApiKey: 'test-cloud-key',
    cloudinaryApiSecret: 'test-cloud-secret',
    notificationEmail: '',
    contactEmail: '',
    resendApiKey: '',
    resendFromEmail: '',
    notificationWebhookUrl: '',
    notificationWebhookSecret: '',
    siteUrl: 'https://ayala-catering-app.vercel.app/',
    isProduction: false,
    ...overrides,
  };
}

function createMockDb() {
  const rateLimits = new Map<string, { count: number; startMs: number }>();
  const settings = new Map<string, unknown>([
    [
      'config',
      {
        min_order_price: 400,
        lead_time_hours: 48,
        delivery_fee: 50,
        is_shop_open: true,
        delivery_base_fee: 125,
        delivery_price_per_km: 4.5,
        delivery_min_radius_included: 50,
        ecommerce_mode: false,
      },
    ],
  ]);

  const menuItems: Array<Record<string, unknown>> = [
    {
      id: 'dish-1',
      category: 'Salads',
      name: 'סלט חגיגי',
      name_en: 'Festive Salad',
      description: 'עלים טריים ורוטב הדרים',
      description_en: 'Fresh greens with citrus vinaigrette',
      price: 120,
      unit_type: 'tray',
      serves_min: 10,
      serves_max: 10,
      is_premium: false,
      tags: ['חלבי'],
      dietary_tags: ['vegetarian', 'dairy'],
      availability_status: true,
      image_url: 'https://res.cloudinary.com/demo/image/upload/v1/salad.jpg',
      allowed_modifications: ['רוטב בצד'],
      allowed_modifications_en: ['Dressing on side'],
      is_tray: true,
      units_per_tray: 1,
    },
    {
      id: 'dish-unavailable',
      category: 'Desserts',
      name: 'פאי עונתי לא זמין',
      name_en: 'Seasonal Tart',
      description: 'לא במלאי כרגע',
      description_en: 'Currently unavailable',
      price: 180,
      unit_type: 'tray',
      serves_min: 12,
      serves_max: 12,
      is_premium: true,
      tags: [],
      dietary_tags: ['dairy'],
      availability_status: false,
      image_url: 'https://res.cloudinary.com/demo/image/upload/v1/tart.jpg',
      allowed_modifications: [],
      allowed_modifications_en: [],
      is_tray: true,
      units_per_tray: 12,
    },
  ];

  const orders: StoredOrderRow[] = [];
  const reviews: Array<Record<string, unknown>> = [];
  let seq = 1;

  const queryFn: SqlQueryFn = async <T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> => {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    if (normalized.startsWith('INSERT INTO app_rate_limits')) {
      const bucketKey = String(params[0]);
      const windowMs = Number(params[1]);
      const nowMs = Date.now();
      const prev = rateLimits.get(bucketKey);
      if (!prev || nowMs - prev.startMs >= windowMs) {
        rateLimits.set(bucketKey, { count: 1, startMs: nowMs });
        return [{ hit_count: 1, window_start: new Date(nowMs).toISOString() }] as unknown as T[];
      }
      prev.count += 1;
      return [{ hit_count: prev.count, window_start: new Date(prev.startMs).toISOString() }] as unknown as T[];
    }

    if (normalized === 'SELECT key, value FROM app_settings') {
      return Array.from(settings.entries()).map(([key, value]) => ({ key, value })) as unknown as T[];
    }

    if (normalized.startsWith('INSERT INTO app_settings')) {
      settings.set(String(params[0]), JSON.parse(String(params[1])));
      return [] as T[];
    }

    if (normalized.startsWith('SELECT * FROM menu_items WHERE availability_status = TRUE')) {
      return menuItems.filter((m) => m.availability_status !== false) as unknown as T[];
    }

    if (normalized.startsWith('SELECT * FROM menu_items WHERE id::text = ANY')) {
      const ids = Array.isArray(params[0]) ? (params[0] as string[]) : [];
      return menuItems.filter((m) => ids.includes(String(m.id))) as unknown as T[];
    }

    if (normalized.startsWith('SELECT * FROM menu_items ORDER BY')) {
      return [...menuItems] as unknown as T[];
    }

    if (normalized.startsWith('SELECT id, reference_code, notification_status, created_at FROM orders WHERE idempotency_key =')) {
      const key = String(params[0]);
      const match = orders.find((o) => o.idempotency_key === key);
      return (match ? [match] : []) as unknown as T[];
    }

    if (normalized.startsWith('UPDATE orders SET quote_token_hash = $1, quote_token_expires_at = $2')) {
      const target = orders.find((o) => o.id === String(params[2]));
      if (target) {
        target.quote_token_hash = String(params[0]);
        target.quote_token_expires_at = String(params[1]);
      }
      return [] as T[];
    }

    if (normalized.startsWith('INSERT INTO orders (')) {
      const row: StoredOrderRow = {
        id: `ord_${seq++}`,
        schema_version: normalized.includes('VALUES ( 2,') ? 2 : 1,
        reference_code: String(params[0]),
        customer_name: String(params[1]),
        customer_phone: String(params[2]),
        event_date: String(params[3]),
        event_time: params[4] ? String(params[4]) : null,
        total_price: Number(params[5]),
        subtotal: Number(params[6]),
        discount_amount: Number(params[7]),
        coupon_code: params[8] ? String(params[8]) : null,
        items: JSON.parse(String(params[9])),
        status: 'pending',
        event_type: String(params[10]),
        wants_setup: Boolean(params[11]),
        delivery_method: params[12] === 'delivery' ? 'delivery' : 'pickup',
        delivery_address: params[13] ? String(params[13]) : null,
        resolved_location: params[14] ? String(params[14]) : null,
        distance_km: params[15] != null ? Number(params[15]) : null,
        adult_count: params[16] != null ? Number(params[16]) : null,
        child_count: params[17] != null ? Number(params[17]) : null,
        allergy_notes: params[18] ? String(params[18]) : null,
        delivery_fee: Number(params[19] || 0),
        notes: params[20] ? String(params[20]) : null,
        idempotency_key: String(params[21]),
        quote_token_hash: String(params[22]),
        quote_token_expires_at: String(params[23]),
        notification_status: 'pending',
        notification_error: null,
        handoff_status: 'not_opened',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      orders.unshift(row);
      return [row] as unknown as T[];
    }

    if (normalized.startsWith('UPDATE orders SET notification_status = $1, notification_error = $2')) {
      const target = orders.find((o) => o.id === String(params[2]));
      if (target) {
        target.notification_status = String(params[0]);
        target.notification_error = params[1] ? String(params[1]) : null;
      }
      return [] as T[];
    }

    if (normalized.includes('FROM orders WHERE quote_token_hash = $1')) {
      const hash = String(params[0]);
      const match = orders.find((o) => o.quote_token_hash === hash);
      return (match ? [match] : []) as unknown as T[];
    }

    if (normalized.startsWith('SELECT * FROM orders ORDER BY')) {
      return [...orders] as unknown as T[];
    }

    if (normalized.startsWith('SELECT event_name, count(*)::int AS count FROM app_telemetry_events')) {
      return [] as T[];
    }

    if (normalized.startsWith('INSERT INTO reviews (')) {
      reviews.push({
        id: String(params[0]),
        customer_name: String(params[1]),
        rating: Number(params[2]),
        comment: String(params[3]),
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      return [] as T[];
    }

    if (normalized.includes("FROM reviews WHERE COALESCE(status, 'approved') = 'approved'")) {
      return reviews.filter((r) => (r.status || 'approved') === 'approved') as unknown as T[];
    }

    if (normalized.startsWith('SELECT * FROM reviews ORDER BY')) {
      return [...reviews] as unknown as T[];
    }

    if (normalized.startsWith('UPDATE reviews SET status = $1 WHERE id = $2')) {
      const target = reviews.find((r) => r.id === String(params[1]));
      if (target) target.status = String(params[0]);
      return [] as T[];
    }

    return [] as T[];
  };

  return { queryFn, orders, reviews, menuItems, settings };
}

function createMockReq(options: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  ip?: string;
}): ApiRequestLike {
  return {
    method: options.method || 'GET',
    url: options.url || '/',
    body: options.body,
    headers: {
      host: 'ayala-catering-app.vercel.app',
      origin: 'https://ayala-catering-app.vercel.app',
      ...(options.headers || {}),
    },
    socket: { remoteAddress: options.ip || '203.0.113.10' },
  };
}

function createMockRes() {
  const headers = new Map<string, string | string[]>();
  let rawBody = '';

  const res: ApiResponseLike = {
    statusCode: 200,
    setHeader(name: string, value: string | string[]) {
      headers.set(name.toLowerCase(), value);
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
    end(chunk?: string) {
      if (chunk) rawBody += chunk;
    },
  };

  return {
    res,
    headers,
    getJson: <T = Record<string, unknown>>(): T => JSON.parse(rawBody || '{}') as T,
    getCookiesToSend: (): string => {
      const setCookie = headers.get('set-cookie');
      const arr = Array.isArray(setCookie) ? setCookie : setCookie ? [String(setCookie)] : [];
      return arr.map((line) => line.split(';')[0]).join('; ');
    },
  };
}

describe('P0 Admin authentication and endpoint authorization', () => {
  it('rejects unauthenticated requests to all admin handlers and blocks wrong origin', async () => {
    const db = createMockDb();
    const deps: HandlerDeps = { queryFn: db.queryFn, env: createTestEnv() };

    for (const handler of [handleAdminOrders, handleAdminCatalog, handleAdminSettings]) {
      const { res, getJson } = createMockRes();
      await handler(createMockReq({ method: 'GET' }), res, deps);
      expect(res.statusCode).toBe(401);
      expect(getJson().code).toBe('UNAUTHORIZED');
    }

    const uploadRes = createMockRes();
    await handleAdminUploadSignature(createMockReq({ method: 'POST', body: {} }), uploadRes.res, deps);
    expect(uploadRes.res.statusCode).toBe(401);

    // Cross-origin POST is rejected with 403
    const csrfRes = createMockRes();
    await handleAdminAuth(
      createMockReq({
        method: 'POST',
        body: { password: 'StrongTestPassword!123' },
        headers: { origin: 'https://evil.example', host: 'ayala-catering-app.vercel.app' },
      }),
      csrfRes.res,
      deps
    );
    expect(csrfRes.res.statusCode).toBe(403);
  });

  it('issues HttpOnly SameSite cookie on valid login and enforces login rate limits', async () => {
    const db = createMockDb();
    const deps: HandlerDeps = { queryFn: db.queryFn, env: createTestEnv() };

    for (let attempt = 1; attempt <= 6; attempt++) {
      const bad = createMockRes();
      await handleAdminAuth(
        createMockReq({ method: 'POST', body: { password: 'wrong' }, ip: '198.51.100.1' }),
        bad.res,
        deps
      );
      expect(bad.res.statusCode).toBe(401);
    }

    // 7th attempt triggers 429 rate limiting
    const throttled = createMockRes();
    await handleAdminAuth(
      createMockReq({ method: 'POST', body: { password: 'StrongTestPassword!123' }, ip: '198.51.100.1' }),
      throttled.res,
      deps
    );
    expect(throttled.res.statusCode).toBe(429);

    // Clean IP logs in cleanly and receives HttpOnly cookie
    const login = createMockRes();
    await handleAdminAuth(
      createMockReq({ method: 'POST', body: { password: 'StrongTestPassword!123' }, ip: '198.51.100.2' }),
      login.res,
      deps
    );
    expect(login.res.statusCode).toBe(200);
    const cookieHeader = String(login.headers.get('set-cookie'));
    expect(cookieHeader).toContain('ayala_admin_session=');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('SameSite=Lax');

    const ordersRes = createMockRes();
    await handleAdminOrders(
      createMockReq({ method: 'GET', headers: { cookie: login.getCookiesToSend() } }),
      ordersRes.res,
      deps
    );
    expect(ordersRes.res.statusCode).toBe(200);

    // Forged non-session cookie grants no access
    const forged = createMockRes();
    await handleAdminOrders(
      createMockReq({ method: 'GET', headers: { cookie: 'ayala_admin_session=forged.token' } }),
      forged.res,
      deps
    );
    expect(forged.res.statusCode).toBe(401);
  });
});

describe('P1 Quote validation, persistence, idempotency, and scoped viewer', () => {
  const fixedNow = new Date('2026-11-13T10:00:00.000Z');

  it('rejects invalid phone/date/distance inputs before database write', async () => {
    const db = createMockDb();
    const deps: HandlerDeps = { queryFn: db.queryFn, env: createTestEnv(), now: () => fixedNow };

    const bad = createMockRes();
    await handlePublicQuoteEndpoint(
      createMockReq({
        method: 'POST',
        body: {
          customerName: 'איילה לקוח',
          customerPhone: 'abc',
          eventDate: '2026-11-01',
          eventType: 'plus',
          deliveryMethod: 'delivery',
          deliveryAddress: 'ק',
          distanceKm: -10,
          adultCount: -5,
          wantsSetup: false,
          items: [{ menuItemId: 'dish-1', quantity: 2 }],
        },
      }),
      bad.res,
      deps
    );

    expect(bad.res.statusCode).toBe(400);
    const json = bad.getJson<{ code: string; fieldErrors: Record<string, unknown> }>();
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.fieldErrors.customerPhone).toBeDefined();
    expect(json.fieldErrors.eventDate).toBeDefined();
    expect(json.fieldErrors.distanceKm).toBeDefined();
    expect(json.fieldErrors.adultCount).toBeDefined();
    expect(db.orders.length).toBe(0);
  });

  it('persists full v2 delivery context, deduplicates retries, splits changed addresses, and serves scoped viewer', async () => {
    const db = createMockDb();
    const deps: HandlerDeps = { queryFn: db.queryFn, env: createTestEnv(), now: () => fixedNow };

    const payload = {
      customerName: 'שרה כהן',
      customerPhone: '054-747-4764',
      eventDate: '2026-11-20',
      eventTime: '18:30',
      eventType: 'premium',
      deliveryMethod: 'delivery',
      deliveryAddress: 'קדומים, רחוב הזית 5',
      resolvedLocation: 'קדומים',
      distanceKm: 12,
      adultCount: 25,
      childCount: 0,
      wantsSetup: true,
      allergyNotes: 'רגישות לאגוזים',
      notes: 'קומה 1',
      items: [{ menuItemId: 'dish-1', quantity: 2, selectedModifications: ['רוטב בצד'] }],
    };

    const first = createMockRes();
    await handlePublicQuoteEndpoint(createMockReq({ method: 'POST', body: payload, ip: '192.0.2.1' }), first.res, deps);
    expect(first.res.statusCode).toBe(201);
    const firstJson = first.getJson<{
      ok: boolean;
      deduplicated: boolean;
      quote_token: string;
      notification_status: string;
    }>();
    expect(firstJson.ok).toBe(true);
    expect(firstJson.deduplicated).toBe(false);
    expect(firstJson.notification_status).toBe('unconfigured');
    expect(db.orders.length).toBe(1);
    expect(db.orders[0]).toMatchObject({
      schema_version: 2,
      delivery_method: 'delivery',
      delivery_address: 'קדומים, רחוב הזית 5',
      distance_km: 12,
      adult_count: 25,
      child_count: 0,
      wants_setup: true,
      allergy_notes: 'רגישות לאגוזים',
    });

    // Identical double-submit deduplicates to the exact same record
    const retry = createMockRes();
    await handlePublicQuoteEndpoint(createMockReq({ method: 'POST', body: payload, ip: '192.0.2.1' }), retry.res, deps);
    expect(retry.res.statusCode).toBe(200);
    expect(retry.getJson().deduplicated).toBe(true);
    expect(db.orders.length).toBe(1);

    // Changing address produces a distinct second quote record
    const edited = createMockRes();
    await handlePublicQuoteEndpoint(
      createMockReq({
        method: 'POST',
        body: { ...payload, deliveryAddress: 'פתח תקווה, רוטשילד 20' },
        ip: '192.0.2.1',
      }),
      edited.res,
      deps
    );
    expect(edited.res.statusCode).toBe(201);
    expect(edited.getJson().deduplicated).toBe(false);
    expect(db.orders.length).toBe(2);

    // Legacy ?quote=id enumeration is blocked
    const legacy = createMockRes();
    await handlePublicQuoteEndpoint(
      createMockReq({ method: 'GET', url: `/api/public/quote?quote=${db.orders[0].id}` }),
      legacy.res,
      deps
    );
    expect(legacy.res.statusCode).toBe(401);

    // Valid rotated token from retry reads sanitized quote view without internal hashes or hidden prices
    const retryToken = String(retry.getJson().quote_token);
    const viewer = createMockRes();
    await handlePublicQuoteEndpoint(
      createMockReq({ method: 'GET', url: `/api/public/quote?token=${encodeURIComponent(retryToken)}` }),
      viewer.res,
      deps
    );
    expect(viewer.res.statusCode).toBe(200);
    const quote = viewer.getJson<{ quote: Record<string, unknown> }>().quote;
    expect(quote.delivery_address).toBe('קדומים, רחוב הזית 5');
    expect(quote.ecommerce_mode).toBe(false);
    expect(quote.total_price).toBeUndefined();
    expect(quote.idempotency_key).toBeUndefined();

    // Unknown token returns 404
    const unknown = createMockRes();
    await handlePublicQuoteEndpoint(
      createMockReq({ method: 'GET', url: '/api/public/quote?token=missingtokenmissingtoken1234' }),
      unknown.res,
      deps
    );
    expect(unknown.res.statusCode).toBe(404);

    // Expired token returns 410 QUOTE_TOKEN_EXPIRED
    const expiredViewer = createMockRes();
    const pastWindowNow = new Date(fixedNow.getTime() + 31 * 86_400_000);
    await handlePublicQuoteEndpoint(
      createMockReq({ method: 'GET', url: `/api/public/quote?token=${encodeURIComponent(retryToken)}` }),
      expiredViewer.res,
      { ...deps, now: () => pastWindowNow }
    );
    expect(expiredViewer.res.statusCode).toBe(410);
    expect(expiredViewer.getJson().code).toBe('QUOTE_TOKEN_EXPIRED');
  });
});

describe('P1 AI menu fail-fast & P3 Review moderation flow', () => {
  it('does not retry 404 model configuration errors 6 times and filters unknown/unavailable AI dish IDs', async () => {
    const db = createMockDb();
    let callCount = 0;

    const brokenFetch: typeof fetch = async () => {
      callCount += 1;
      return new Response('model not found', { status: 404 });
    };

    const failFastRes = createMockRes();
    await handlePublicAiMenu(
      createMockReq({ method: 'POST', body: { prompt: 'אירוע חלבי ל-20 אורחים', adults: 20 } }),
      failFastRes.res,
      { queryFn: db.queryFn, env: createTestEnv(), fetchImpl: brokenFetch }
    );
    expect(callCount).toBe(1);
    expect(failFastRes.res.statusCode).toBe(503);
    expect(failFastRes.getJson()).toMatchObject({
      code: 'AI_MODEL_MISCONFIGURED',
      fallbackToManual: true,
    });

    const validFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      items: [
                        { id: 'dish-1', quantity: 2, note: 'מומלץ לפתיחה' },
                        { id: 'dish-unavailable', quantity: 1 },
                        { id: 'invented-id', quantity: 3 },
                      ],
                      explanation: 'הצעה לתפריט חלבי.',
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const okRes = createMockRes();
    await handlePublicAiMenu(
      createMockReq({ method: 'POST', body: { prompt: 'אירוע ל-20 אורחים עם רגישות לגלוטן', adults: 20 } }),
      okRes.res,
      { queryFn: db.queryFn, env: createTestEnv(), fetchImpl: validFetch }
    );
    expect(okRes.res.statusCode).toBe(200);
    const proposal = okRes.getJson<{
      proposal: { items: Array<{ menuItem: { id: string } }>; requiresDietaryConfirmation: boolean };
    }>().proposal;
    expect(proposal.items.map((i) => i.menuItem.id)).toEqual(['dish-1']);
    expect(proposal.requiresDietaryConfirmation).toBe(true);
  });

  it('stores public reviews as pending until approved by authenticated admin', async () => {
    const db = createMockDb();
    const deps: HandlerDeps = { queryFn: db.queryFn, env: createTestEnv() };

    const submit = createMockRes();
    await handlePublicReviewsEndpoint(
      createMockReq({
        method: 'POST',
        body: { customer_name: 'יעל', rating: 5, comment: 'אוכל נהדר ושירות מקסים' },
      }),
      submit.res,
      deps
    );
    expect(submit.res.statusCode).toBe(201);
    expect(submit.getJson().status).toBe('pending');

    // Public bootstrap does not leak unapproved pending reviews
    const boot1 = createMockRes();
    await handlePublicBootstrap(createMockReq({ method: 'GET' }), boot1.res, deps);
    expect(boot1.getJson<{ reviews: unknown[] }>().reviews).toHaveLength(0);

    // Admin logs in and approves review
    const login = createMockRes();
    await handleAdminAuth(
      createMockReq({ method: 'POST', body: { password: 'StrongTestPassword!123' } }),
      login.res,
      deps
    );
    const reviewId = String(submit.getJson().id);

    const approve = createMockRes();
    await handleAdminCatalog(
      createMockReq({
        method: 'PATCH',
        url: '/api/admin/catalog?resource=reviews',
        body: { id: reviewId, status: 'approved' },
        headers: { cookie: login.getCookiesToSend() },
      }),
      approve.res,
      deps
    );
    expect(approve.res.statusCode).toBe(200);

    const boot2 = createMockRes();
    await handlePublicBootstrap(createMockReq({ method: 'GET' }), boot2.res, deps);
    expect(boot2.getJson<{ reviews: Array<{ id: string }> }>().reviews.map((r) => r.id)).toEqual([reviewId]);
  });
});
