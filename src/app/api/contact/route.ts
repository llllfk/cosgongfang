import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { globalConfig } from '@/db/schema';
import { getCurrentUserRow, requireUser } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { resolveStoredImageUrl } from '@/lib/usage-media';

/** 登录旅者获取补充次数用的管理员微信二维码 */
export async function GET() {
  try {
    requireUser(await getCurrentUserRow());
    const rows = await db.select().from(globalConfig).where(eq(globalConfig.id, 1)).limit(1);
    const stored = rows[0]?.wechatQrUrl || null;
    const wechatQrUrl = (await resolveStoredImageUrl(stored)) || null;
    return jsonOk({ wechatQrUrl, hasWechatQr: !!stored });
  } catch (error) {
    return jsonError(error);
  }
}
