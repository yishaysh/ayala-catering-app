// Database & Storage Client Adapter (Neon PostgreSQL + Cloudinary)
import { neon } from '@neondatabase/serverless';

const databaseUrl =
  (import.meta as any).env?.VITE_NEON_DATABASE_URL ||
  (import.meta as any).env?.DATABASE_URL ||
  '';

const sql = databaseUrl ? neon(databaseUrl) : null;

async function runSql(queryText: string, params: any[] = []): Promise<any[]> {
  if (!databaseUrl || !sql) {
    console.warn('Database URL is not configured.');
    throw new Error('Database URL is not configured.');
  }
  try {
    if (typeof (sql as any).query === 'function') {
      const res = await (sql as any).query(queryText, params);
      return Array.isArray(res) ? res : res.rows || [];
    }
    const res = await (sql as any)(queryText, params);
    return Array.isArray(res) ? res : res.rows || [];
  } catch (err) {
    console.error('Database SQL Execution Error:', err);
    throw err;
  }
}

class QueryBuilder implements PromiseLike<any> {
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
      console.error(`Database error on ${this.tableName}:`, error);
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

// Generic database & storage client
export const db = {
  from: (tableName: string) => new QueryBuilder(tableName),
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
    from: (bucket: string) => {
      let lastUploadedUrl = '';
      return {
        upload: async (fileName: string, file: any, options?: any) => {
          try {
            const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || 'md6mhfhd';
            const apiKey = (import.meta as any).env?.VITE_CLOUDINARY_API_KEY || '896717328968567';
            const apiSecret = (import.meta as any).env?.VITE_CLOUDINARY_API_SECRET || 'feYh79XfGm6QZHbF1UFDLdw_0Jg';

            const timestamp = Math.floor(Date.now() / 1000);
            const folder = `ayala_catering/${bucket || 'menu'}`;
            const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;

            // SHA-1 signature calculation in Web Crypto API
            const enc = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest('SHA-1', enc.encode(toSign));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const formData = new FormData();
            let blob: Blob;
            if (file instanceof Blob || file instanceof File) {
              blob = file;
            } else if (file instanceof Uint8Array || file instanceof ArrayBuffer) {
              blob = new Blob([file as any], { type: options?.contentType || 'image/jpeg' });
            } else {
              blob = new Blob([file as any]);
            }

            formData.append('file', blob, fileName);
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp.toString());
            formData.append('folder', folder);
            formData.append('signature', signature);

            const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
              method: 'POST',
              body: formData
            });

            const json = await resp.json();
            if (json.secure_url) {
              lastUploadedUrl = json.secure_url;
              return { data: { path: json.secure_url }, error: null };
            }
            return { data: null, error: new Error(json.error?.message || 'Upload to Cloudinary failed') };
          } catch (err: any) {
            console.error('Cloudinary upload error:', err);
            return { data: null, error: err };
          }
        },
        getPublicUrl: (path: string) => {
          if (lastUploadedUrl) {
            return { data: { publicUrl: lastUploadedUrl } };
          }
          if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
            return { data: { publicUrl: path } };
          }
          return { data: { publicUrl: path } };
        }
      };
    }
  }
};

// Storage export
export const storage = db.storage;

