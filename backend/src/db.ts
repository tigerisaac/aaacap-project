import { Pool, type PoolClient } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import type { Config } from './config.js';
import { migration } from './schema.js';

export type Row = Record<string, any>;
export interface Queryable {
  query<T extends Row = Row>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
}
export interface Database extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export async function openDatabase(config: Pick<Config, 'DATABASE_URL' | 'EMBEDDED_DB_PATH' | 'SHIELD_MODE'>): Promise<Database> {
  if (config.DATABASE_URL) {
    const pool = new Pool({ connectionString: config.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000,
      statement_timeout: 8000, application_name: 'shield', options: '-c timezone=UTC' });
    const db: Database = {
      async query<T extends Row>(sql: string, values?: unknown[]) { return pool.query<T>(sql, values); },
      async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
        const client: PoolClient = await pool.connect();
        try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
        catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      },
      async close() { await pool.end(); }
    };
    try {
      await db.transaction(async tx => {
        await tx.query('SELECT pg_advisory_xact_lock(731945281)');
        await tx.query(migration);
      });
    } catch (error) { await db.close(); throw error; }
    return db;
  }
  if (config.SHIELD_MODE !== 'demo') throw new Error('Embedded PostgreSQL is demo-only.');
  const pg = new PGlite(config.EMBEDDED_DB_PATH === ':memory:' ? undefined : config.EMBEDDED_DB_PATH);
  await pg.exec(migration);
  return {
    async query<T extends Row>(sql: string, values?: unknown[]) { return pg.query<T>(sql, values); },
    async transaction<T>(fn: (tx: Queryable) => Promise<T>) {
      return pg.transaction(async tx => fn({ query: (sql, values) => tx.query(sql, values) }));
    },
    async close() { await pg.close(); }
  };
}
