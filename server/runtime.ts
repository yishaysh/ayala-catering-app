// Runtime adapter connecting Vercel serverless handlers and Vite dev server middleware to server/handlers.

import { createNeonQueryFn, sanitizeDbError, type SqlQueryFn } from './db.js';
import { getServerEnv, type ServerEnv } from './env.js';
import type { HandlerDeps } from './handlers/publicHandlers.js';
import { sendJson, type ApiRequestLike, type ApiResponseLike } from './http.js';

let cachedUrl = '';
let cachedQueryFn: SqlQueryFn | null = null;

const missingDbQueryFn: SqlQueryFn = async () => {
  throw new Error('DATABASE_URL_MISSING');
};

export function getRuntimeDeps(overrideEnv?: Record<string, string | undefined>): HandlerDeps {
  const env: ServerEnv = getServerEnv(overrideEnv);
  if (!env.databaseUrl) {
    return { queryFn: missingDbQueryFn, env };
  }
  if (!cachedQueryFn || cachedUrl !== env.databaseUrl) {
    cachedQueryFn = createNeonQueryFn(env.databaseUrl);
    cachedUrl = env.databaseUrl;
  }
  return { queryFn: cachedQueryFn, env };
}

export function withRuntimeHandler(
  fn: (req: ApiRequestLike, res: ApiResponseLike, deps: HandlerDeps) => Promise<void>
) {
  return async (req: ApiRequestLike, res: ApiResponseLike): Promise<void> => {
    try {
      const deps = getRuntimeDeps();
      await fn(req, res, deps);
    } catch (err) {
      const safe = sanitizeDbError(err);
      sendJson(res, 500, { ok: false, code: safe.code, error: safe.message });
    }
  };
}
