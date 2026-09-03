import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { sessions, users, type UserRow } from '@/db/schema';

const SESSION_COOKIE = 'cos_session';
const SESSION_DAYS = 14;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, 'hex');
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

export function publicUser(row: UserRow) {
  return {
    id: row.id,
    nickname: row.nickname,
    account: row.account,
    avatar: row.avatar ?? undefined,
    joinDate: row.createdAt.toISOString().slice(0, 10),
    isAdmin: row.isAdmin,
    analyzeCount: row.analyzeCount,
    drawCount: row.drawCount,
    status: row.status as 'active' | 'frozen',
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, token, expiresAt });
  return token;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

export async function getCurrentUserRow(): Promise<UserRow | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.user.status === 'frozen') return null;
  return row.user;
}

export function requireUser(user: UserRow | null): UserRow {
  if (!user) {
    throw new AuthError('未登录或会话已失效');
  }
  return user;
}

export function requireAdmin(user: UserRow | null): UserRow {
  const u = requireUser(user);
  if (!u.isAdmin) {
    throw new AuthError('需要管理员权限', 403);
  }
  return u;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function fingerprintImage(dataUrl: string): string {
  return createHash('sha1').update(dataUrl.slice(0, 4096)).digest('hex').slice(0, 8);
}
