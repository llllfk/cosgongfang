import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { sanitizeDatabaseUrl } from './url';

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
  drizzleDb?: ReturnType<typeof createDb>;
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

function getPool(): Pool {
  if (!globalForDb.pgPool) {
    globalForDb.pgPool = createPool();
  }
  return globalForDb.pgPool;
}

function createDb() {
  return drizzle(getPool(), { schema });
}

function getDb() {
  if (!globalForDb.drizzleDb) {
    globalForDb.drizzleDb = createDb();
  }
  return globalForDb.drizzleDb;
}

/** 延迟初始化，避免 Next 构建收集 page data 时因缺少 DATABASE_URL 直接失败 */
function createLazyProxy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      const instance = resolve();
      const value = Reflect.get(instance as object, prop, receiver);
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(instance) : value;
    },
  });
}

export { sanitizeDatabaseUrl };
export const pool = createLazyProxy(getPool);
export const db = createLazyProxy(getDb);
