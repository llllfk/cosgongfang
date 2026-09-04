import 'dotenv/config';
import { pool } from '../src/db';

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      account varchar(64) PRIMARY KEY,
      fail_count integer NOT NULL DEFAULT 0,
      locked_until timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  const r = await pool.query(
    `select tablename from pg_tables where schemaname='public' order by tablename`
  );
  console.log(
    'tables:',
    r.rows.map((x: { tablename: string }) => x.tablename).join(', ')
  );
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
