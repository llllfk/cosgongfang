import { eq, and, ne } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import {
  getCurrentUserRow,
  hashPassword,
  publicUser,
  requireAdmin,
} from '@/lib/auth';
import { validateAccount } from '@/lib/account';
import { jsonError, jsonOk } from '@/lib/api-response';
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(await getCurrentUserRow());
    const { id } = await ctx.params;
    const body = await req.json();

    const patch: Partial<typeof users.$inferInsert> = {};
    if (typeof body.account === 'string') {
      const account = validateAccount(body.account);
      const [current] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!current) throw new Error('用户不存在');
      if (account !== current.account) {
        const [taken] = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.account, account), ne(users.id, id)))
          .limit(1);
        if (taken) throw new Error('该账号已被使用');
        patch.account = account;
      }
    }
    if (typeof body.nickname === 'string') {      const nickname = body.nickname.trim();
      if (!nickname) throw new Error('昵称不能为空');
      if (nickname.length > 32) throw new Error('昵称过长');
      patch.nickname = nickname;
    }
    if (typeof body.analyzeCount === 'number') patch.analyzeCount = Math.max(0, body.analyzeCount);
    if (typeof body.drawCount === 'number') patch.drawCount = Math.max(0, body.drawCount);
    if (body.status === 'active' || body.status === 'frozen') {
      if (body.status === 'frozen' && id === admin.id) {
        throw new Error('不能停用自己的账户');
      }
      patch.status = body.status;
    }
    if (typeof body.password === 'string' && body.password.trim()) {
      const password = body.password.trim();
      if (password.length < 6) throw new Error('新密码至少 6 位');
      patch.passwordHash = hashPassword(password);
    }

    if (!Object.keys(patch).length) {
      throw new Error('没有可更新的字段');
    }

    const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
    if (!row) throw new Error('用户不存在');
    return jsonOk({ user: publicUser(row) });
  } catch (error) {
    return jsonError(error, '更新失败');
  }
}
