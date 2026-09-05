import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { globalConfig, users } from '@/db/schema';
import {
  AuthError,
  createSession,
  hashPassword,
  publicUser,
  setSessionCookie,
} from '@/lib/auth';
import { validateAccount } from '@/lib/account';
import { validatePassword } from '@/lib/password';
import { jsonError, jsonOk } from '@/lib/api-response';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const account = validateAccount(String(body.account || ''));
    const nickname = String(body.nickname || '').trim();
    const password = validatePassword(String(body.password || ''));
    const passwordConfirm = String(body.passwordConfirm ?? body.confirmPassword ?? '');

    if (!nickname) {
      throw new AuthError('请填写昵称', 400);
    }
    if (nickname.length > 32) {
      throw new AuthError('昵称过长', 400);
    }
    if (password !== passwordConfirm) {
      throw new AuthError('两次输入的密码不一致', 400);
    }

    const existing = await db.select().from(users).where(eq(users.account, account)).limit(1);
    if (existing.length) {
      throw new AuthError('账号已存在', 400);
    }

    const cfgRows = await db.select().from(globalConfig).where(eq(globalConfig.id, 1)).limit(1);
    const defaults = cfgRows[0] ?? { defaultAnalyzeCount: 2, defaultDrawCount: 2 };

    const [row] = await db
      .insert(users)
      .values({
        account,
        nickname,
        passwordHash: hashPassword(password),
        analyzeCount: Math.max(0, defaults.defaultAnalyzeCount),
        drawCount: Math.max(0, defaults.defaultDrawCount),
        isAdmin: false,
        status: 'active',
      })
      .returning();

    const token = await createSession(row.id);
    await setSessionCookie(token);
    return jsonOk({ user: publicUser(row) });
  } catch (error) {
    return jsonError(error, '注册失败');
  }
}
