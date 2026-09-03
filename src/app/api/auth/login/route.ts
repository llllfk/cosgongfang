import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import {
  AuthError,
  createSession,
  publicUser,
  setSessionCookie,
  verifyPassword,
} from '@/lib/auth';
import {
  assertLoginAllowed,
  clearLoginAttempts,
  recordLoginFailure,
} from '@/lib/login-lockout';
import { jsonError, jsonOk } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const account = String(body.account || '').trim();
    const password = String(body.password || '');
    if (!account || !password) {
      throw new AuthError('请输入账号和密码', 400);
    }

    await assertLoginAllowed(account);

    const [user] = await db.select().from(users).where(eq(users.account, account)).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      await recordLoginFailure(account);
    }
    if (user.status === 'frozen') {
      throw new AuthError('账号已冻结，请联系管理员', 403);
    }

    await clearLoginAttempts(account);
    const token = await createSession(user.id);
    await setSessionCookie(token);
    return jsonOk({ user: publicUser(user) });
  } catch (error) {
    return jsonError(error, '登录失败');
  }
}
