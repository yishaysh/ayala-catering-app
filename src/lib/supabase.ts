// Neon.tech Serverless SQL Adapter
import { neon } from '@neondatabase/serverless';

const databaseUrl =
  (import.meta as any).env?.VITE_NEON_DATABASE_URL ||
  (import.meta as any).env?.DATABASE_URL ||
  'postgresql://neondb_owner:npg_iOwVnz8UfH3B@ep-damp-block-b2ooonn8-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(databaseUrl);

async function runSql(queryText: string, params: any[] = []): Promise<any[]> {
  try {
    // In @neondatabase/serverless, sql.query executes parameterized dynamic SQL strings
    if (typeof (sql as any).query === 'function') {
      const res = await (sql as any).query(queryText, params);
      return Array.isArray(res) ? res : res.rows || [];
    }
    // Fallback: direct HTTP execute against Neon endpoint
    const urlObj = new URL(databaseUrl.replace('postgresql://', 'https://').replace('postgres://', 'https://'));
    const auth = btoa(`${decodeURIComponent(urlObj.username)}:${decodeURIComponent(urlObj.password)}`);
    const endpoint = `https://${urlObj.host}/sql`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: queryText, params })
    });
    const json = await resp.json();
    return json.rows || [];
  } catch (err) {
    console.error('Neon SQL Execution Error:', err);
    return [];
  }
}

class NeonQueryBuilder implements PromiseLike<any> {
  private tableName: string;
  private action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT' = 'SELECT';
  private selectedFields: string = '*';
  private whereClauses: { col: string; val: any }[] = [];
  private orderClause: { col: string; asc: boolean } | null = null;
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private payload: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = '*') {
    this.selectedFields = fields;
    return this;
  }

  eq(col: string, val: any) {
    this.whereClauses.push({ col, val });
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.orderClause = { col, asc: options?.ascending !== false };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(items: any[]) {
    this.action = 'INSERT';
    this.payload = items;
    return this;
  }

  update(payload: Record<string, any>) {
    this.action = 'UPDATE';
    this.payload = payload;
    return this;
  }

  upsert(payload: any) {
    this.action = 'UPSERT';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'DELETE';
    return this;
  }

  async execute(): Promise<{ data: any; error: any }> {
    try {
      if (this.action === 'SELECT') {
        let query = `SELECT ${this.selectedFields} FROM "${this.tableName}"`;
        const params: any[] = [];

        if (this.whereClauses.length > 0) {
          const conditions = this.whereClauses.map((w, idx) => {
            params.push(w.val);
            return `"${w.col}" = $${idx + 1}`;
          });
          query += ` WHERE ${conditions.join(' AND ')}`;
        }

        if (this.orderClause) {
          query += ` ORDER BY "${this.orderClause.col}" ${this.orderClause.asc ? 'ASC' : 'DESC'}`;
        }

        if (this.limitCount) {
          query += ` LIMIT ${this.limitCount}`;
        }

        const rows = await runSql(query, params);
        if (this.isSingle) {
          return { data: rows && rows.length > 0 ? rows[0] : null, error: null };
        }
        return { data: rows || [], error: null };
      }

      if (this.action === 'INSERT') {
        if (!this.payload || this.payload.length === 0) return { data: [], error: null };
        const item = this.payload[0];
        const keys = Object.keys(item);
        const cols = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = keys.map((k) => (typeof item[k] === 'object' && item[k] !== null ? JSON.stringify(item[k]) : item[k]));

        const query = `INSERT INTO "${this.tableName}" (${cols}) VALUES (${placeholders}) RETURNING *`;
        const rows = await runSql(query, values);
        return { data: rows || [], error: null };
      }

      if (this.action === 'UPDATE') {
        const keys = Object.keys(this.payload);
        const params: any[] = [];
        const sets = keys.map((k) => {
          const val = this.payload[k];
          params.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
          return `"${k}" = $${params.length}`;
        });

        let query = `UPDATE "${this.tableName}" SET ${sets.join(', ')}`;

        if (this.whereClauses.length > 0) {
          const conditions = this.whereClauses.map((w) => {
            params.push(w.val);
            return `"${w.col}" = $${params.length}`;
          });
          query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` RETURNING *`;
        const rows = await runSql(query, params);
        return { data: rows || [], error: null };
      }

      if (this.action === 'UPSERT') {
        const item = Array.isArray(this.payload) ? this.payload[0] : this.payload;
        const valStr = typeof item.value === 'object' ? JSON.stringify(item.value) : item.value;
        const query = `
          INSERT INTO "${this.tableName}" ("key", "value")
          VALUES ($1, $2::jsonb)
          ON CONFLICT ("key") 
          DO UPDATE SET "value" = EXCLUDED.value
          RETURNING *;
        `;
        const rows = await runSql(query, [item.key, valStr]);
        return { data: rows || [], error: null };
      }

      if (this.action === 'DELETE') {
        let query = `DELETE FROM "${this.tableName}"`;
        const params: any[] = [];

        if (this.whereClauses.length > 0) {
          const conditions = this.whereClauses.map((w, idx) => {
            params.push(w.val);
            return `"${w.col}" = $${idx + 1}`;
          });
          query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` RETURNING *`;
        const rows = await runSql(query, params);
        return { data: rows || [], error: null };
      }

      return { data: null, error: null };
    } catch (error) {
      console.error(`Neon database error on ${this.tableName}:`, error);
      return { data: null, error };
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Drop-in Supabase object that forwards everything to Neon SQL
export const supabase = {
  from: (tableName: string) => new NeonQueryBuilder(tableName),
  rpc: async (fnName: string, params: Record<string, any>) => {
    try {
      if (fnName === 'increment_coupon_usage' && params.coupon_code) {
        await runSql('UPDATE coupons SET used_count = COALESCE(used_count, 0) + 1 WHERE code = $1', [params.coupon_code]);
      }
      return { data: true, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  channel: (_name: string) => ({
    on: (_type: any, _config?: any, _callback?: any) => ({
      subscribe: () => ({ unsubscribe: () => {} })
    })
  }),
  removeChannel: (_channel: any) => {},
  storage: {
    from: (_bucket: string) => ({
      upload: async (_path: string, _file: any, _options?: any) => ({ error: null, data: { path: _path } }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: path } })
    })
  }
};
