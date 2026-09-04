import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';
import { sanitizeDatabaseUrl } from './src/db/url';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: sanitizeDatabaseUrl(process.env.DATABASE_URL || ''),
    ssl: { rejectUnauthorized: false },
  },
});
