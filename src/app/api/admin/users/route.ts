import { count, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import { globalConfig, users } from '@/db/schema';
import { getCurrentUserRow, hashPassword, publicUser, requireAdmin } from '@/lib/auth';
import { validateAccount } from '@/lib/account';
import { jsonError, jsonOk } from '@/lib/api-response';

/** 去掉 LIKE 通配符，避免用户输入扩大匹配范围 */
function sanitizeSearch(raw: string) {
  return raw.replace(/[%_\\]/g, '').trim();
}

export async function GET(req: Request) {
  try {
    requireAdmin(await getCurrentUserRow());
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 12) || 12));
    const q = sanitizeSearch(String(searchParams.get('q') || ''));

    const where = q
      ? or(ilike(users.nickname, `%${q}%`), ilike(users.account, `%${q}%`))
      : undefined;

    const countQuery = db.select({ value: count() }).from(users);
    const [{ value: total }] = where ? await countQuery.where(where) : await countQuery;

    const listQuery = db.select().from(users);
    const rows = await (where ? listQuery.where(where) : listQuery)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return jsonOk({
      items: rows.map(publicUser),
      total,
      page,
      pageSize,
    });
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
