import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { globalConfig } from '@/db/schema';
import { getCurrentUserRow, requireAdmin } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';

async function ensureConfig() {
  const rows = await db.select().from(globalConfig).where(eq(globalConfig.id, 1)).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await db
    .insert(globalConfig)
    .values({ id: 1, defaultAnalyzeCount: 2, defaultDrawCount: 2 })
    .returning();
  return row;
}

export async function GET() {
  try {
    requireAdmin(await getCurrentUserRow());
    const row = await ensureConfig();
    return jsonOk({
      defaultAnalyzeCount: row.defaultAnalyzeCount,
      defaultDrawCount: row.defaultDrawCount,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(req: Request) {
  try {
    requireAdmin(await getCurrentUserRow());
    const body = await req.json();
    await ensureConfig();
    const [row] = await db
      .update(globalConfig)
      .set({
        defaultAnalyzeCount: Math.max(0, Number(body.defaultAnalyzeCount ?? 2)),
        defaultDrawCount: Math.max(0, Number(body.defaultDrawCount ?? 2)),
        updatedAt: new Date(),
      })
      .where(eq(globalConfig.id, 1))
      .returning();

    return jsonOk({
      defaultAnalyzeCount: row.defaultAnalyzeCount,
      defaultDrawCount: row.defaultDrawCount,
    });
  } catch (error) {
    return jsonError(error, '保存配置失败');
  }
}
