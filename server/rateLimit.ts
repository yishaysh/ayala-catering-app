// Sliding-window rate limiter supporting injectable in-memory storage and Postgres persistence.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiterStore {
  hit(bucketKey: string, windowMs: number): Promise<{ count: number; resetAtMs: number }>;
}

export class MemoryRateLimiterStore implements RateLimiterStore {
  private buckets = new Map<string, { count: number; windowStartMs: number }>();

  async hit(bucketKey: string, windowMs: number): Promise<{ count: number; resetAtMs: number }> {
    const now = Date.now();
    const existing = this.buckets.get(bucketKey);
    if (!existing || now - existing.windowStartMs >= windowMs) {
      this.buckets.set(bucketKey, { count: 1, windowStartMs: now });
      return { count: 1, resetAtMs: now + windowMs };
    }
    existing.count += 1;
    return { count: existing.count, resetAtMs: existing.windowStartMs + windowMs };
  }
}

export const defaultMemoryRateLimiterStore = new MemoryRateLimiterStore();

export async function checkRateLimit(options: {
  key: string;
  limit: number;
  windowSeconds: number;
  queryFn?: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
  fallbackStore?: RateLimiterStore;
}): Promise<RateLimitResult> {
  const windowMs = options.windowSeconds * 1000;
  const fallback = options.fallbackStore ?? defaultMemoryRateLimiterStore;

  if (options.queryFn) {
    try {
      const rows = await options.queryFn<{ hit_count: number; window_start: string }>(
        `INSERT INTO app_rate_limits (bucket_key, hit_count, window_start)
         VALUES ($1, 1, NOW())
         ON CONFLICT (bucket_key) DO UPDATE
         SET
           hit_count = CASE
             WHEN EXTRACT(EPOCH FROM (NOW() - app_rate_limits.window_start)) * 1000 >= $2
             THEN 1
             ELSE app_rate_limits.hit_count + 1
           END,
           window_start = CASE
             WHEN EXTRACT(EPOCH FROM (NOW() - app_rate_limits.window_start)) * 1000 >= $2
             THEN NOW()
             ELSE app_rate_limits.window_start
           END
         RETURNING hit_count, window_start`,
        [options.key, windowMs]
      );
      if (rows[0]) {
        const count = Number(rows[0].hit_count);
        const startMs = Date.parse(rows[0].window_start);
        const retryAfterSeconds = Math.max(1, Math.ceil((startMs + windowMs - Date.now()) / 1000));
        return {
          allowed: count <= options.limit,
          remaining: Math.max(0, options.limit - count),
          retryAfterSeconds,
        };
      }
    } catch {
      // Fallback safely to process-memory limiter if migration 001 has not created app_rate_limits yet.
    }
  }

  const { count, resetAtMs } = await fallback.hit(options.key, windowMs);
  return {
    allowed: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000)),
  };
}
