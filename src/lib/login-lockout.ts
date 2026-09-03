import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { loginAttempts } from '@/db/schema';
import { AuthError } from '@/lib/auth';

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCK_MS = 5 * 60 * 1000;

function normalizeAccount(account: string) {
  return String(account || '').trim();
}

function lockMessage(lockedUntil: Date): string {
  const sec = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
  if (sec >= 60) {
    const min = Math.ceil(sec / 60);
    return `登录失败次数过多，请 ${min} 分钟后再试`;
  }
  return `登录失败次数过多，请 ${sec} 秒后再试`;
}

/** 登录前检查是否处于锁定窗口 */
export async function assertLoginAllowed(account: string): Promise<void> {
  const key = normalizeAccount(account);
  if (!key) return;

  const [row] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.account, key))
    .limit(1);

  if (!row?.lockedUntil) return;

  const now = new Date();
  if (row.lockedUntil > now) {
    throw new AuthError(lockMessage(row.lockedUntil), 429);
  }

  await db
    .update(loginAttempts)
    .set({ failCount: 0, lockedUntil: null, updatedAt: now })
    .where(eq(loginAttempts.account, key));
}

/** 记录一次失败；达到上限则锁定 5 分钟 */
export async function recordLoginFailure(account: string): Promise<never> {
  const key = normalizeAccount(account);
  const now = new Date();

  const [row] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.account, key))
    .limit(1);

  let failCount = row?.failCount ?? 0;
  if (row?.lockedUntil && row.lockedUntil <= now) {
    failCount = 0;
  }
  failCount += 1;

  if (failCount >= LOGIN_MAX_FAILURES) {
    const lockedUntil = new Date(now.getTime() + LOGIN_LOCK_MS);
    if (row) {
      await db
        .update(loginAttempts)
        .set({ failCount, lockedUntil, updatedAt: now })
        .where(eq(loginAttempts.account, key));
    } else {
      await db.insert(loginAttempts).values({ account: key, failCount, lockedUntil });
    }
    throw new AuthError(lockMessage(lockedUntil), 429);
  }

  if (row) {
    await db
      .update(loginAttempts)
      .set({ failCount, lockedUntil: null, updatedAt: now })
      .where(eq(loginAttempts.account, key));
  } else {
    await db.insert(loginAttempts).values({ account: key, failCount });
  }

  const remaining = LOGIN_MAX_FAILURES - failCount;
  throw new AuthError(
    remaining > 0 ? `账号或密码错误，还可尝试 ${remaining} 次` : '账号或密码错误',
    401
  );
}

/** 登录成功后清除失败记录 */
export async function clearLoginAttempts(account: string): Promise<void> {
  const key = normalizeAccount(account);
  if (!key) return;
  await db.delete(loginAttempts).where(eq(loginAttempts.account, key));
}
