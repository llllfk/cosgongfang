import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getCurrentUserRow, publicUser, requireAdmin } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(await getCurrentUserRow());
    const { id } = await ctx.params;
    const body = await req.json();
    const type = body.type === 'draw' ? 'draw' : 'analyze';
    const delta = Number(body.delta ?? 0);
    if (!Number.isFinite(delta) || delta === 0) {
      throw new Error('请输入有效的增减数量');
    }

    const column = type === 'analyze' ? users.analyzeCount : users.drawCount;
    const [row] = await db
      .update(users)
      .set({
        [type === 'analyze' ? 'analyzeCount' : 'drawCount']: sql`GREATEST(0, ${column} + ${delta})`,
      })
      .where(eq(users.id, id))
      .returning();

    if (!row) throw new Error('用户不存在');
    return jsonOk({ user: publicUser(row) });
  } catch (error) {
    return jsonError(error, '调整额度失败');
  }
}
