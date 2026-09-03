import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { globalConfig, users } from '@/db/schema';
import { getCurrentUserRow, hashPassword, publicUser, requireAdmin } from '@/lib/auth';
import { validateAccount } from '@/lib/account';
import { jsonError, jsonOk } from '@/lib/api-response';

export async function GET() {
  try {
    requireAdmin(await getCurrentUserRow());
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));
    return jsonOk({ items: rows.map(publicUser) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    requireAdmin(await getCurrentUserRow());
    const body = await req.json();
    const account = validateAccount(String(body.account || ''));
    const nickname = String(body.nickname || '').trim();
    const password = String(body.password || '123456');

    const cfgRows = await db.select().from(globalConfig).where(eq(globalConfig.id, 1)).limit(1);
    const defaults = cfgRows[0] ?? { defaultAnalyzeCount: 2, defaultDrawCount: 2 };
    const analyzeCount = Number(body.analyzeCount ?? defaults.defaultAnalyzeCount);
    const drawCount = Number(body.drawCount ?? defaults.defaultDrawCount);

    if (!nickname) {
      throw new Error('请填写昵称');
    }

    const existing = await db.select().from(users).where(eq(users.account, account)).limit(1);
    if (existing.length) {
      throw new Error('账号已存在');
    }

    const [row] = await db
      .insert(users)
      .values({
        account,
        nickname,
        passwordHash: hashPassword(password),
        analyzeCount: Math.max(0, analyzeCount),
        drawCount: Math.max(0, drawCount),
        isAdmin: false,
        status: 'active',
      })
      .returning();

    return jsonOk({ user: publicUser(row) });
  } catch (error) {
    return jsonError(error, '创建用户失败');
  }
}
