import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
};

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 8,
  });
}

export const pool = globalForDb.pgPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgPool = pool;
}

export const db = drizzle(pool, { schema });
