// Cryptographic helpers for password verification, signed HttpOnly sessions, quote tokens, and idempotency digests.

import crypto from 'node:crypto';
import type { ServerEnv } from './env.js';

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export function sha1Hex(value: string): string {
  return crypto.createHash('sha1').update(value, 'utf8').digest('hex');
}

export function generateOpaqueToken(byteLength: number = 24): string {
  return crypto.randomBytes(byteLength).toString('base64url');
}

export function generateReferenceCode(now: Date = new Date()): string {
  const y = String(now.getUTCFullYear()).slice(-2);
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `AY-${y}${m}${d}-${rand}`;
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

/**
 * Verifies admin credential against server-configured scrypt hash (`scrypt$<saltHex>$<hashHex>`)
 * or plain env secret (`ADMIN_PASSWORD`). Never falls back to any hardcoded client or server PIN.
 */
export function verifyAdminCredential(
  candidate: string,
  env: Pick<ServerEnv, 'adminPasswordHash' | 'adminPassword'>
): { configured: boolean; valid: boolean } {
  const input = typeof candidate === 'string' ? candidate : '';
  if (env.adminPasswordHash) {
    const parts = env.adminPasswordHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt' || !parts[1] || !parts[2]) {
      return { configured: false, valid: false };
    }
    try {
      const salt = parts[1];
      const expected = Buffer.from(parts[2], 'hex');
      const derived = crypto.scryptSync(input, salt, expected.length);
      return {
        configured: true,
        valid: expected.length === derived.length && crypto.timingSafeEqual(expected, derived),
      };
    } catch {
      return { configured: false, valid: false };
    }
  }

  if (env.adminPassword) {
    return {
      configured: true,
      valid: Boolean(input) && timingSafeEqualStrings(input, env.adminPassword),
    };
  }

  return { configured: false, valid: false };
}

export interface SessionPayload {
  role: 'admin';
  iat: number;
  exp: number;
  jti: string;
}

export function signSessionToken(
  secret: string,
  ttlSeconds: number = 8 * 3600,
  nowMs: number = Date.now()
): string {
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET is missing or too short');
  }
  const nowSec = Math.floor(nowMs / 1000);
  const payload: SessionPayload = {
    role: 'admin',
    iat: nowSec,
    exp: nowSec + ttlSeconds,
    jti: crypto.randomBytes(12).toString('hex'),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload, 'utf8')
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  nowMs: number = Date.now()
): SessionPayload | null {
  if (!token || !secret || secret.length < 16) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload, 'utf8')
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    if (parsed.role !== 'admin' || typeof parsed.exp !== 'number') return null;
    const nowSec = Math.floor(nowMs / 1000);
    if (parsed.exp <= nowSec) return null;
    return parsed;
  } catch {
    return null;
  }
}
