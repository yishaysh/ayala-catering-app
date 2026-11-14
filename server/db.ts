// Server-only PostgreSQL / Neon query executor.
// Never bundle or import into client code. Never log connection strings or query secrets.

import { neon } from '@neondatabase/serverless';

export type SqlQueryFn = <T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
) => Promise<T[]>;

export function createNeonQueryFn(databaseUrl: string): SqlQueryFn {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL_MISSING');
  }
  const client = neon(databaseUrl);
  return async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> => {
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
