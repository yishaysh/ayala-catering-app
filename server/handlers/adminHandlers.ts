// Protected Admin API handlers: session authentication + independent session enforcement on all privileged routes.

import { sha1Hex, generateOpaqueToken, sha256Hex, signSessionToken, verifyAdminCredential } from '../crypto.js';
import { sanitizeDbError } from '../db.js';
import {
  authenticateAdminRequest,
  clearAdminSessionCookie,
  getClientIp,
  getQueryParams,
  readJsonBody,
  requireMethod,
  sendJson,
  setAdminSessionCookie,
  verifyMutationOrigin,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../http.js';
import { dispatchQuoteNotification } from '../notify.js';
import { checkRateLimit } from '../rateLimit.js';
import { validateKosherMetadataInput } from '../../shared/validation.js';
import type { Order } from '../../shared/types.js';
import { mapMenuRow, type HandlerDeps } from './publicHandlers.js';
import { loadHydratedSettings } from './settingsHelpers.js';

function requireAdminOrReject(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): boolean {
  if (!verifyMutationOrigin(req)) {
    sendJson(res, 403, { code: 'FORBIDDEN_ORIGIN', error: 'Invalid request origin' });
    return false;
  }
  const session = authenticateAdminRequest(req, deps.env);
  if (!session) {
    sendJson(res, 401, {
      code: 'UNAUTHORIZED',
      errorHe: 'נדרשת התחברות מנהל תקינה.',
      errorEn: 'Admin authentication required.',
    });
    return false;
  }
  return true;
}

export async function handleAdminAuth(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  const method = requireMethod(req, res, ['GET', 'POST', 'DELETE']);
  if (!method) return;

  if (method === 'GET') {
    const session = authenticateAdminRequest(req, deps.env);
    return sendJson(res, 200, {
      authenticated: Boolean(session),
      expiresAt: session ? new Date(session.exp * 1000).toISOString() : null,
    });
  }

  if (method === 'DELETE') {
    clearAdminSessionCookie(req, res, deps.env);
    return sendJson(res, 200, { ok: true, authenticated: false });
  }

  // POST: verify admin password and issue HttpOnly signed cookie
  if (!verifyMutationOrigin(req)) {
    return sendJson(res, 403, { code: 'FORBIDDEN_ORIGIN', error: 'Origin mismatch' });
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit({
    key: `admin_login:${ip}`,
    limit: 6,
    windowSeconds: 900,
    queryFn: deps.queryFn,
  });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSeconds));
    return sendJson(res, 429, {
      code: 'RATE_LIMITED',
      errorHe: 'יותר מדי ניסיונות התחברות שגויים. נסי שוב בעוד 15 דקות.',
      errorEn: 'Too many failed login attempts. Try again in 15 minutes.',
    });
  }

  if (!deps.env.sessionSecret || deps.env.sessionSecret.length < 16) {
    return sendJson(res, 503, {
      code: 'AUTH_NOT_CONFIGURED',
      errorHe: 'מפתח אבטחת סשן אינו מוגדר בשרת.',
      errorEn: 'Server session secret is not configured.',
    });
  }

  let body: { password?: string; pin?: string };
  try {
    body = await readJsonBody<{ password?: string; pin?: string }>(req, 8 * 1024);
  } catch {
    return sendJson(res, 400, { code: 'INVALID_JSON', error: 'Invalid JSON' });
  }

  const candidate = typeof body.password === 'string' ? body.password : typeof body.pin === 'string' ? body.pin : '';
  const check = verifyAdminCredential(candidate, deps.env);
  if (!check.configured) {
    return sendJson(res, 503, {
      code: 'AUTH_NOT_CONFIGURED',
      errorHe: 'סיסמת מנהל אינה מוגדרת במשתני השרת.',
      errorEn: 'Admin password is not configured in server environment.',
    });
  }
  if (!check.valid) {
    return sendJson(res, 401, {
      code: 'INVALID_CREDENTIALS',
      errorHe: 'סיסמת הניהול שגויה.',
      errorEn: 'Incorrect admin password.',
    });
  }

  const token = signSessionToken(deps.env.sessionSecret, 8 * 3600);
  setAdminSessionCookie(req, res, token, deps.env, 8 * 3600);
  sendJson(res, 200, { ok: true, authenticated: true });
}

export async function handleAdminOrders(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  if (!requireAdminOrReject(req, res, deps)) return;
  const method = requireMethod(req, res, ['GET', 'PATCH', 'POST', 'DELETE']);
  if (!method) return;

  try {
    if (method === 'GET') {
      const rows = await deps.queryFn<Record<string, unknown>>(
        'SELECT * FROM orders ORDER BY created_at DESC LIMIT 300'
      );
      let telemetrySummary: Array<{ event_name: string; count: number }> = [];
      try {
        telemetrySummary = await deps.queryFn<{ event_name: string; count: number }>(
          `SELECT event_name, count(*)::int AS count
           FROM app_telemetry_events
           WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY event_name
           ORDER BY count DESC`
        );
      } catch {
        telemetrySummary = [];
      }
      return sendJson(res, 200, { orders: rows, telemetrySummary });
    }

    const body = await readJsonBody<Record<string, unknown>>(req, 64 * 1024);
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return sendJson(res, 400, { code: 'MISSING_ID', error: 'Order id is required' });
    }

    if (method === 'DELETE') {
      await deps.queryFn('DELETE FROM orders WHERE id = $1', [id]);
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'PATCH') {
      const updates: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (typeof body.status === 'string') {
        const normalizedStatus = body.status.toLowerCase();
        const allowed = ['pending', 'approved', 'completed', 'cancelled'];
        if (!allowed.includes(normalizedStatus)) {
          return sendJson(res, 400, { code: 'INVALID_STATUS' });
        }
        updates.push(`status = $${idx++}`);
        params.push(normalizedStatus);
      }
      if (typeof body.total_price === 'number' && Number.isFinite(body.total_price) && body.total_price >= 0) {
        updates.push(`total_price = $${idx++}`);
        params.push(body.total_price);
      }
      if (typeof body.subtotal === 'number' && Number.isFinite(body.subtotal) && body.subtotal >= 0) {
        updates.push(`subtotal = $${idx++}`);
        params.push(body.subtotal);
      }
      if (typeof body.discount_amount === 'number' && Number.isFinite(body.discount_amount) && body.discount_amount >= 0) {
        updates.push(`discount_amount = $${idx++}`);
        params.push(body.discount_amount);
      }
      if (typeof body.delivery_fee === 'number' && Number.isFinite(body.delivery_fee) && body.delivery_fee >= 0) {
        updates.push(`delivery_fee = $${idx++}`);
        params.push(body.delivery_fee);
      }
      if (typeof body.notes === 'string') {
        updates.push(`notes = $${idx++}`);
        params.push(body.notes.slice(0, 1500));
      }
      if (typeof body.wants_setup === 'boolean') {
        updates.push(`wants_setup = $${idx++}`);
        params.push(body.wants_setup);
      }
      if (Array.isArray(body.items) && body.items.length > 0 && body.items.length <= 200) {
        const sanitizedItems = body.items.map((rawItem) => {
          const item = (typeof rawItem === 'object' && rawItem !== null ? rawItem : {}) as Record<string, unknown>;
          return {
            id: String(item.id || '').slice(0, 80),
            name: String(item.name || '').trim().slice(0, 180),
            name_en: item.name_en ? String(item.name_en).trim().slice(0, 180) : undefined,
            price: Number.isFinite(Number(item.price)) && Number(item.price) >= 0 ? Number(item.price) : 0,
            quantity: Number.isInteger(Number(item.quantity)) && Number(item.quantity) >= 1 && Number(item.quantity) <= 500
              ? Number(item.quantity)
              : 1,
            unit_type: String(item.unit_type || 'tray').slice(0, 32),
            is_tray: Boolean(item.is_tray),
            units_per_tray: item.units_per_tray != null ? Number(item.units_per_tray) : null,
            selected_modifications: Array.isArray(item.selected_modifications)
              ? item.selected_modifications.map((m) => String(m).slice(0, 120)).slice(0, 20)
              : [],
            notes: item.notes ? String(item.notes).slice(0, 300) : '',
          };
        });
        updates.push(`items = $${idx++}::jsonb`);
        params.push(JSON.stringify(sanitizedItems));
      }
      if (typeof body.handoff_status === 'string') {
        const allowedHandoff = ['not_opened', 'whatsapp_opened', 'confirmed_by_owner'];
        if (!allowedHandoff.includes(body.handoff_status)) {
          return sendJson(res, 400, { code: 'INVALID_HANDOFF_STATUS' });
        }
        updates.push(`handoff_status = $${idx++}`);
        params.push(body.handoff_status);
      }

      let mintedQuoteUrl: string | undefined;
      if (body.mint_share_token === true) {
        const token = generateOpaqueToken(24);
        const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
        updates.push(`quote_token_hash = $${idx++}`);
        params.push(sha256Hex(token));
        updates.push(`quote_token_expires_at = $${idx++}`);
        params.push(expiresAt);
        mintedQuoteUrl = `${deps.env.siteUrl}?token=${encodeURIComponent(token)}`;
      }

      if (updates.length === 0) {
        return sendJson(res, 400, { code: 'NO_UPDATES' });
      }
      updates.push('updated_at = NOW()');
      params.push(id);

      const updated = await deps.queryFn<Record<string, unknown>>(
        `UPDATE orders SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      if (!updated[0]) {
        return sendJson(res, 404, { code: 'NOT_FOUND' });
      }
      return sendJson(res, 200, { ok: true, order: updated[0], quote_url: mintedQuoteUrl });
    }

    // POST: resend email alert for an order
    if (body.action === 'resend_notification') {
      const rows = await deps.queryFn<Record<string, unknown>>(
        'SELECT * FROM orders WHERE id = $1 LIMIT 1',
        [id]
      );
      const row = rows[0] as unknown as Order | undefined;
      if (!row) return sendJson(res, 404, { code: 'NOT_FOUND' });
      const settings = await loadHydratedSettings(deps.queryFn, deps.env);
      const notifyRes = await dispatchQuoteNotification({
        order: row,
        env: deps.env,
        practicalInfo: settings.practical_info,
        fetchImpl: deps.fetchImpl,
      });
      await deps.queryFn(
        `UPDATE orders SET notification_status = $1, notification_error = $2, updated_at = NOW() WHERE id = $3`,
        [notifyRes.status, notifyRes.error || null, id]
      );
      return sendJson(res, 200, { ok: notifyRes.status === 'sent', notification: notifyRes });
    }

    sendJson(res, 400, { code: 'UNKNOWN_ACTION' });
  } catch (err) {
    const safe = sanitizeDbError(err);
    sendJson(res, 500, { code: safe.code, error: safe.message });
  }
}

export async function handleAdminCatalog(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  if (!requireAdminOrReject(req, res, deps)) return;
  const method = requireMethod(req, res, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  if (!method) return;

  const params = getQueryParams(req);
  const resource = params.get('resource') || 'menu';

  try {
    if (resource === 'coupons') {
      if (method === 'GET') {
        const coupons = await deps.queryFn('SELECT * FROM coupons ORDER BY created_at DESC');
        return sendJson(res, 200, { coupons });
      }
      const body = await readJsonBody<Record<string, unknown>>(req, 32 * 1024);
      if (method === 'POST') {
        const code = String(body.code || '').trim().toUpperCase();
        if (!code) return sendJson(res, 400, { code: 'INVALID_CODE' });
        const rows = await deps.queryFn(
          `INSERT INTO coupons (code, discount_type, discount_value, is_active, usage_count, usage_limit)
           VALUES ($1, $2, $3, $4, 0, $5)
           ON CONFLICT (code) DO UPDATE SET
             discount_type = EXCLUDED.discount_type,
             discount_value = EXCLUDED.discount_value,
             is_active = EXCLUDED.is_active,
             usage_limit = EXCLUDED.usage_limit
           RETURNING *`,
          [
            code,
            body.discount_type === 'fixed' ? 'fixed' : 'percentage',
            Number(body.discount_value || 0),
            body.is_active !== false,
            body.usage_limit != null && body.usage_limit !== '' ? Number(body.usage_limit) : null,
          ]
        );
        return sendJson(res, 200, { ok: true, coupon: rows[0] });
      }
      if (method === 'PATCH') {
        const code = String(body.code || '').trim().toUpperCase();
        await deps.queryFn('UPDATE coupons SET is_active = $1 WHERE UPPER(code) = $2', [
          Boolean(body.is_active),
          code,
        ]);
        return sendJson(res, 200, { ok: true });
      }
      if (method === 'DELETE') {
        const code = String(body.code || params.get('code') || '').trim().toUpperCase();
        await deps.queryFn('DELETE FROM coupons WHERE UPPER(code) = $1', [code]);
        return sendJson(res, 200, { ok: true });
      }
    }

    if (resource === 'reviews') {
      if (method === 'GET') {
        const reviews = await deps.queryFn('SELECT * FROM reviews ORDER BY created_at DESC');
        return sendJson(res, 200, { reviews });
      }
      const body = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
      const id = String(body.id || params.get('id') || '').trim();
      if (!id) return sendJson(res, 400, { code: 'MISSING_ID' });
      if (method === 'PATCH') {
        const status = body.status === 'approved' || body.status === 'rejected' ? body.status : 'pending';
        await deps.queryFn('UPDATE reviews SET status = $1 WHERE id = $2', [status, id]);
        return sendJson(res, 200, { ok: true });
      }
      if (method === 'DELETE') {
        await deps.queryFn('DELETE FROM reviews WHERE id = $1', [id]);
        return sendJson(res, 200, { ok: true });
      }
    }

    // Default resource: 'menu'
    if (method === 'GET') {
      const rows = await deps.queryFn<Record<string, unknown>>(
        'SELECT * FROM menu_items ORDER BY category ASC, name ASC'
      );
      return sendJson(res, 200, {
        menuItems: rows.map((row) => mapMenuRow(row, false)),
      });
    }

    const body = await readJsonBody<Record<string, unknown>>(req, 128 * 1024);
    if (method === 'DELETE') {
      const id = String(body.id || params.get('id') || '').trim();
      if (!id) return sendJson(res, 400, { code: 'MISSING_ID' });
      await deps.queryFn('DELETE FROM menu_items WHERE id = $1', [id]);
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'POST') {
      const name = String(body.name || '').trim();
      const category = String(body.category || '').trim();
      if (!name || !category) {
        return sendJson(res, 400, { code: 'VALIDATION_ERROR', error: 'Name and category are required' });
      }
      const rows = await deps.queryFn(
        `INSERT INTO menu_items (
          name, name_en, category, description, description_en, price, unit_type,
          serves_min, serves_max, is_premium, tags, dietary_tags, allergen_info,
          availability_status, image_url, allowed_modifications, allowed_modifications_en,
          is_tray, units_per_tray
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13::jsonb,
          $14, $15, $16, $17, $18, $19
        ) RETURNING *`,
        [
          name,
          body.name_en || null,
          category,
          body.description || '',
          body.description_en || null,
          Number(body.price || 0),
          body.unit_type || 'tray',
          Number(body.serves_min ?? 1),
          Number(body.serves_max ?? 1),
          Boolean(body.is_premium),
          Array.isArray(body.tags) ? body.tags : [],
          Array.isArray(body.dietary_tags) ? body.dietary_tags : [],
          body.allergen_info ? JSON.stringify(body.allergen_info) : null,
          body.availability_status !== false,
          body.image_url || '',
          Array.isArray(body.allowed_modifications) ? body.allowed_modifications : [],
          Array.isArray(body.allowed_modifications_en) ? body.allowed_modifications_en : [],
          Boolean(body.is_tray),
          body.units_per_tray != null && body.units_per_tray !== '' ? Number(body.units_per_tray) : null,
        ]
      );
      return sendJson(res, 201, {
        ok: true,
        item: rows[0] ? mapMenuRow(rows[0] as Record<string, unknown>, false) : null,
      });
    }

    if (method === 'PUT' || method === 'PATCH') {
      const id = String(body.id || '').trim();
      if (!id) return sendJson(res, 400, { code: 'MISSING_ID' });

      const columnMap: Array<[string, (v: unknown) => unknown, string?]> = [
        ['name', (v) => String(v || '').trim()],
        ['name_en', (v) => (v ? String(v).trim() : null)],
        ['category', (v) => String(v || '').trim()],
        ['description', (v) => String(v || '')],
        ['description_en', (v) => (v ? String(v) : null)],
        ['price', (v) => Number(v || 0)],
        ['unit_type', (v) => String(v || 'tray')],
        ['serves_min', (v) => Number(v ?? 1)],
        ['serves_max', (v) => Number(v ?? 1)],
        ['is_premium', (v) => Boolean(v)],
        ['tags', (v) => (Array.isArray(v) ? v : [])],
        ['dietary_tags', (v) => (Array.isArray(v) ? v : [])],
        ['allergen_info', (v) => (v ? JSON.stringify(v) : null), '::jsonb'],
        ['availability_status', (v) => Boolean(v)],
        ['image_url', (v) => String(v || '')],
        ['allowed_modifications', (v) => (Array.isArray(v) ? v : [])],
        ['allowed_modifications_en', (v) => (Array.isArray(v) ? v : [])],
        ['is_tray', (v) => Boolean(v)],
        ['units_per_tray', (v) => (v != null && v !== '' ? Number(v) : null)],
      ];

      const sets: string[] = [];
      const vals: unknown[] = [];
      let i = 1;
      for (const [col, cast, suffix] of columnMap) {
        if (col in body) {
          sets.push(`${col} = $${i++}${suffix || ''}`);
          vals.push(cast(body[col]));
        }
      }
      if (sets.length === 0) return sendJson(res, 400, { code: 'NO_UPDATES' });
      vals.push(id);
      const updated = await deps.queryFn(
        `UPDATE menu_items SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        vals
      );
      return sendJson(res, 200, {
        ok: true,
        item: updated[0] ? mapMenuRow(updated[0] as Record<string, unknown>, false) : null,
      });
    }
  } catch (err) {
    const safe = sanitizeDbError(err);
    sendJson(res, 500, { code: safe.code, error: safe.message });
  }
}

export async function handleAdminSettings(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  if (!requireAdminOrReject(req, res, deps)) return;
  const method = requireMethod(req, res, ['GET', 'PUT']);
  if (!method) return;

  try {
    if (method === 'GET') {
      const hydrated = await loadHydratedSettings(deps.queryFn, deps.env);
      return sendJson(res, 200, { settings: hydrated });
    }

    const body = await readJsonBody<{ key?: string; value?: unknown }>(req, 256 * 1024);
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    const allowedKeys = new Set([
      'config',
      'theme',
      'features',
      'about',
      'calculation_settings',
      'advanced_settings',
      'kosher',
      'gallery',
      'practical_info',
      'packages',
    ]);
    if (!allowedKeys.has(key)) {
      return sendJson(res, 400, { code: 'INVALID_SETTING_KEY' });
    }

    let valueToStore = body.value;
    if (key === 'kosher') {
      const check = validateKosherMetadataInput(
        (typeof body.value === 'object' && body.value !== null ? body.value : {}) as Record<string, unknown>
      );
      if (!check.valid || !check.normalized) {
        return sendJson(res, 400, { code: 'INVALID_KOSHER_METADATA', errors: check.errors });
      }
      valueToStore = check.normalized;
    }

    await deps.queryFn(
      `INSERT INTO app_settings (key, value)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(valueToStore)]
    );

    const updated = await loadHydratedSettings(deps.queryFn, deps.env);
    sendJson(res, 200, { ok: true, settings: updated });
  } catch (err) {
    const safe = sanitizeDbError(err);
    sendJson(res, 500, { code: safe.code, error: safe.message });
  }
}

export async function handleAdminUploadSignature(
  req: ApiRequestLike,
  res: ApiResponseLike,
  deps: HandlerDeps
): Promise<void> {
  if (!requireAdminOrReject(req, res, deps)) return;
  if (!requireMethod(req, res, ['POST'])) return;

  if (
    !deps.env.cloudinaryCloudName ||
    !deps.env.cloudinaryApiKey ||
    !deps.env.cloudinaryApiSecret
  ) {
    return sendJson(res, 503, {
      code: 'CLOUDINARY_NOT_CONFIGURED',
      errorHe: 'הגדרות העלאת מדיה חסרות בשרת (Cloudinary env).',
      errorEn: 'Cloudinary upload credentials are not configured on the server.',
    });
  }

  let body: { folder?: string; publicId?: string; resourceType?: string };
  try {
    body = await readJsonBody(req, 16 * 1024);
  } catch {
    return sendJson(res, 400, { code: 'INVALID_JSON' });
  }

  const folder = 'ayala_catering/menu-images';
  const timestamp = Math.floor(Date.now() / 1000);
  const rawPublicId = typeof body.publicId === 'string'
    ? body.publicId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
    : '';
  const publicId = rawPublicId || `upload_${Date.now()}_${generateOpaqueToken(4).replace(/[^a-zA-Z0-9]/g, '')}`;
  const resourceType = body.resourceType === 'video' ? 'video' : body.resourceType === 'raw' ? 'raw' : 'image';

  // Cloudinary signature: alphabetical sorted params + apiSecret
  const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${deps.env.cloudinaryApiSecret}`;
  const signature = sha1Hex(paramsToSign);

  sendJson(res, 200, {
    cloudName: deps.env.cloudinaryCloudName,
    apiKey: deps.env.cloudinaryApiKey,
    timestamp,
    folder,
    publicId,
    resourceType,
    signature,
  });
}
