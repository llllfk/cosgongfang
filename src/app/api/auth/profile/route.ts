import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import {
  getCurrentUserRow,
  hashPassword,
  publicUser,
  requireUser,
  verifyPassword,
} from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';

export async function PATCH(req: Request) {
  try {
    const current = requireUser(await getCurrentUserRow());
    const body = await req.json();

    const patch: Partial<typeof users.$inferInsert> = {};

    if (typeof body.nickname === 'string') {
      const nickname = body.nickname.trim();
      if (!nickname) throw new Error('昵称不能为空');
      if (nickname.length > 32) throw new Error('昵称过长');
      patch.nickname = nickname;
    }

    if (typeof body.newPassword === 'string' && body.newPassword) {
      if (body.newPassword.length < 6) throw new Error('新密码至少 6 位');
      const oldPassword = String(body.oldPassword || '');
      if (!oldPassword) throw new Error('修改密码需填写当前密码');
      if (!verifyPassword(oldPassword, current.passwordHash)) {
        throw new Error('当前密码不正确');
      }
      patch.passwordHash = hashPassword(body.newPassword);
    }

    if (!Object.keys(patch).length) {
      throw new Error('没有可更新的内容');
    }

    const [row] = await db.update(users).set(patch).where(eq(users.id, current.id)).returning();
    return jsonOk({ user: publicUser(row) });
  } catch (error) {
    return jsonError(error, '保存失败');
  }
}
