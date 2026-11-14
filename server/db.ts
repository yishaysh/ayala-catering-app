// Server-only PostgreSQL / Neon query executor.
// Never bundle or import into client code. Never log connection strings or query secrets.

import { neon } from '@neondatabase/serverless';

export type SqlQueryFn = <T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
) => Promise<T[]>;

const IDEMPOTENT_SCHEMA_STATEMENTS: readonly string[] = [
  `ALTER TABLE orders
     ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 2,
     ADD COLUMN IF NOT EXISTS reference_code VARCHAR(32),
     ADD COLUMN IF NOT EXISTS event_time VARCHAR(16),
     ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) NOT NULL DEFAULT 'pickup',
     ADD COLUMN IF NOT EXISTS delivery_address TEXT,
     ADD COLUMN IF NOT EXISTS resolved_location TEXT,
     ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8, 2),
     ADD COLUMN IF NOT EXISTS adult_count INTEGER,
     ADD COLUMN IF NOT EXISTS child_count INTEGER,
     ADD COLUMN IF NOT EXISTS allergy_notes TEXT,
     ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0,
     ADD COLUMN IF NOT EXISTS notes TEXT,
     ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
     ADD COLUMN IF NOT EXISTS quote_token_hash VARCHAR(128),
     ADD COLUMN IF NOT EXISTS quote_token_expires_at TIMESTAMPTZ,
     ADD COLUMN IF NOT EXISTS notification_status VARCHAR(32) NOT NULL DEFAULT 'pending',
     ADD COLUMN IF NOT EXISTS notification_error TEXT,
     ADD COLUMN IF NOT EXISTS handoff_status VARCHAR(32) NOT NULL DEFAULT 'not_opened',
     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
     ON orders (idempotency_key)
     WHERE idempotency_key IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_orders_quote_token_hash
     ON orders (quote_token_hash)
     WHERE quote_token_hash IS NOT NULL`,
  `ALTER TABLE menu_items
     ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT '{}',
     ADD COLUMN IF NOT EXISTS allergen_info JSONB`,
  `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20)`,
  `UPDATE reviews SET status = 'approved' WHERE status IS NULL`,
  `ALTER TABLE reviews ALTER COLUMN status SET DEFAULT 'pending'`,
  `CREATE TABLE IF NOT EXISTS app_telemetry_events (
     id BIGSERIAL PRIMARY KEY,
     event_name VARCHAR(64) NOT NULL,
     meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS app_rate_limits (
     bucket_key VARCHAR(160) PRIMARY KEY,
     hit_count INTEGER NOT NULL DEFAULT 1,
     window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
];

/**
 * Ensures required schema extensions exist once per cold-started client without failing
 * if the database role lacks DDL permissions (least-privilege runtime roles).
 */
async function runIdempotentSchemaEnsure(
  executeRaw: (sql: string) => Promise<unknown>
): Promise<void> {
  for (const statement of IDEMPOTENT_SCHEMA_STATEMENTS) {
    try {
      await executeRaw(statement);
    } catch {
      // Ignore DDL permission or pre-bootstrap errors so read-only/least-privilege roles still run.
    }
  }
}

export function createNeonQueryFn(databaseUrl: string): SqlQueryFn {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL_MISSING');
  }
  const client = neon(databaseUrl);
  let schemaEnsured = false;
  let schemaEnsurePromise: Promise<void> | null = null;

  const ensureSchemaOnce = async (): Promise<void> => {
    if (schemaEnsured) return;
    if (!schemaEnsurePromise) {
      schemaEnsurePromise = runIdempotentSchemaEnsure((sql) => client.query(sql, [])).finally(() => {
        schemaEnsured = true;
      });
    }
    await schemaEnsurePromise;
  };

  return async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> => {
    await ensureSchemaOnce();
    const result = await client.query(sql, params);
    return (Array.isArray(result) ? result : []) as T[];
  };
}

export function sanitizeDbError(err: unknown): { code: string; message: string } {
  if (err && typeof err === 'object') {
    const rec = err as { code?: unknown; message?: unknown };
    const code = typeof rec.code === 'string' ? rec.code : 'DB_ERROR';
    const rawMsg = typeof rec.message === 'string' ? rec.message : 'Database operation failed';
    if (code === '42703' || code === '42P01') {
      return {
        code: 'DB_SCHEMA_MIGRATION_REQUIRED',
        message: 'Required database columns or tables are missing. Please run migration 001.',
      };
    }
    if (code === '23505') {
      return { code: 'DUPLICATE_RECORD', message: 'Record already exists.' };
    }
    if (code === 'DATABASE_URL_MISSING' || rawMsg.includes('DATABASE_URL_MISSING')) {
      return { code: 'SERVER_CONFIG_ERROR', message: 'Database connection is not configured.' };
    }
    return { code, message: 'Database request failed.' };
  }
  return { code: 'DB_ERROR', message: 'Database request failed.' };
}
