// Shared HTTP request/response utilities for Vercel Node functions and Vite dev middleware.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { verifySessionToken, type SessionPayload } from './crypto.js';
import type { ServerEnv } from './env.js';

export const ADMIN_COOKIE_NAME = 'ayala_admin_session';

export interface ApiRequestLike {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

export interface ApiResponseLike {
  statusCode: number;
  setHeader(name: string, value: string | string[]): void;
  getHeader?(name: string): string | number | string[] | undefined;
  end(chunk?: string): void;
}

export function getHeader(req: ApiRequestLike, name: string): string {
  const val = req.headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0] || '';
  return val || '';
}

export function getClientIp(req: ApiRequestLike): string {
  const xff = getHeader(req, 'x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();
  }
  const realIp = getHeader(req, 'x-real-ip');
  if (realIp) return realIp.trim();
  return req.socket?.remoteAddress || '127.0.0.1';
}

export function parseCookies(req: ApiRequestLike): Record<string, string> {
  const raw = getHeader(req, 'cookie');
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

export function isHttpsRequest(req: ApiRequestLike, env: Pick<ServerEnv, 'isProduction'>): boolean {
  const proto = getHeader(req, 'x-forwarded-proto').toLowerCase();
  if (proto === 'https') return true;
  if (proto === 'http') return false;
  return env.isProduction;
}

export function appendSetCookie(res: ApiResponseLike, cookieHeader: string): void {
  const existing = res.getHeader?.('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookieHeader);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookieHeader]);
  } else {
    res.setHeader('Set-Cookie', [String(existing), cookieHeader]);
  }
}

export function setAdminSessionCookie(
  req: ApiRequestLike,
  res: ApiResponseLike,
  token: string,
  env: Pick<ServerEnv, 'isProduction'>,
  maxAgeSeconds: number = 8 * 3600
): void {
  const secureAttr = isHttpsRequest(req, env) ? '; Secure' : '';
  appendSetCookie(
    res,
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureAttr}`
  );
}

export function clearAdminSessionCookie(
  req: ApiRequestLike,
  res: ApiResponseLike,
  env: Pick<ServerEnv, 'isProduction'>
): void {
  const secureAttr = isHttpsRequest(req, env) ? '; Secure' : '';
  appendSetCookie(
    res,
    `${ADMIN_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureAttr}`
  );
}

export function authenticateAdminRequest(
  req: ApiRequestLike,
  env: Pick<ServerEnv, 'sessionSecret'>,
  nowMs?: number
): SessionPayload | null {
  const cookies = parseCookies(req);
  const token = cookies[ADMIN_COOKIE_NAME];
  return verifySessionToken(token, env.sessionSecret, nowMs);
}

/**
 * Defense-in-depth CSRF check for cookie-authenticated mutations:
 * verifies Origin matches Host if supplied, and rejects non-JSON cross-site form posts.
 */
export function verifyMutationOrigin(req: ApiRequestLike): boolean {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  const host = getHeader(req, 'x-forwarded-host') || getHeader(req, 'host');
  const origin = getHeader(req, 'origin');
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function getQueryParams(req: ApiRequestLike): URLSearchParams {
  const rawUrl = req.url || '/';
  const qIndex = rawUrl.indexOf('?');
  if (qIndex >= 0) {
    return new URLSearchParams(rawUrl.slice(qIndex + 1));
  }
  const params = new URLSearchParams();
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (Array.isArray(v) && v[0] !== undefined) params.set(k, v[0]);
      else if (typeof v === 'string') params.set(k, v);
    }
  }
  return params;
}

export async function readJsonBody<T = Record<string, unknown>>(
  req: ApiRequestLike,
  maxBytes: number = 1024 * 1024
): Promise<T> {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > maxBytes) {
        throw new Error('PAYLOAD_TOO_LARGE');
      }
      return (req.body.trim() ? JSON.parse(req.body) : {}) as T;
    }
    if (typeof req.body === 'object' && req.body !== null) {
      return req.body as T;
    }
  }

  const stream = req as unknown as IncomingMessage;
  if (typeof stream.on !== 'function') {
    return {} as T;
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      throw new Error('PAYLOAD_TOO_LARGE');
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return {} as T;
  const text = Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '').trim();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function sendJson(res: ApiResponseLike, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

export function requireMethod(
  req: ApiRequestLike,
  res: ApiResponseLike,
  allowed: string[]
): string | null {
  const method = (req.method || 'GET').toUpperCase();
  if (!allowed.includes(method)) {
    res.setHeader('Allow', allowed.join(', '));
    sendJson(res, 405, { error: 'Method Not Allowed', code: 'METHOD_NOT_ALLOWED' });
    return null;
  }
  return method;
}

export type ServerHttpResponse = ServerResponse;
