import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { sanitizeDatabaseUrl } from './url';

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
};

function createPool() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL is not set');
  }
  const connectionString = sanitizeDatabaseUrl(raw);
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 8,
  });
}

export { sanitizeDatabaseUrl };
export const pool = globalForDb.pgPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgPool = pool;
}

export const db = drizzle(pool, { schema });
