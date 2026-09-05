import 'dotenv/config';
import pg from 'pg';
import { sanitizeDatabaseUrl } from '../src/db/url';

async function main() {
  const raw = process.env.DATABASE_URL || '';
  if (!raw) throw new Error('缺少 DATABASE_URL');
  const url = sanitizeDatabaseUrl(raw);
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(
      'ALTER TABLE analyze_records ADD COLUMN IF NOT EXISTS report jsonb'
    );
    const check = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'analyze_records' AND column_name = 'report'
    `);
    console.log('OK', check.rows);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
