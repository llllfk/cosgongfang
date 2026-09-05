import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { globalConfig } from '@/db/schema';
import { getCurrentUserRow, requireAdmin } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { cosStoragePath, persistImage } from '@/lib/coze-storage';
import { resolveStoredImageUrl } from '@/lib/usage-media';

async function ensureConfig() {
  const rows = await db.select().from(globalConfig).where(eq(globalConfig.id, 1)).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await db
    .insert(globalConfig)
    .values({ id: 1, defaultAnalyzeCount: 2, defaultDrawCount: 2 })
    .returning();
  return row;
}

function normalizeWatermarkText(raw: unknown) {
  return String(raw ?? '')
    .trim()
    .slice(0, 64);
}

async function publicConfig(row: typeof globalConfig.$inferSelect) {
  return {
    defaultAnalyzeCount: row.defaultAnalyzeCount,
    defaultDrawCount: row.defaultDrawCount,
    wechatQrUrl: (await resolveStoredImageUrl(row.wechatQrUrl)) || null,
    hasWechatQr: !!row.wechatQrUrl,
    watermarkText: String(row.watermarkText || ''),
  };
}

export async function GET() {
  try {
    requireAdmin(await getCurrentUserRow());
    const row = await ensureConfig();
    return jsonOk(await publicConfig(row));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const admin = requireAdmin(await getCurrentUserRow());
    const body = await req.json();
    await ensureConfig();

    const patch: {
      defaultAnalyzeCount: number;
      defaultDrawCount: number;
      watermarkText: string;
      wechatQrUrl?: string | null;
      updatedAt: Date;
    } = {
      defaultAnalyzeCount: Math.max(0, Number(body.defaultAnalyzeCount ?? 2)),
      defaultDrawCount: Math.max(0, Number(body.defaultDrawCount ?? 2)),
      watermarkText: normalizeWatermarkText(body.watermarkText),
      updatedAt: new Date(),
    };

    if (body.clearWechatQr === true) {
      patch.wechatQrUrl = null;
    } else if (typeof body.wechatQrImageBase64 === 'string' && body.wechatQrImageBase64.trim()) {
      const src = body.wechatQrImageBase64.trim();
      if (!src.startsWith('data:image/')) {
        throw new Error('请上传图片格式的微信二维码');
      }
      patch.wechatQrUrl = await persistImage(src, {
        s3FileName: cosStoragePath('config/wechat-qr', admin.id),
        fallback: (s) => s,
      });
    }

    const [row] = await db
      .update(globalConfig)
      .set(patch)
      .where(eq(globalConfig.id, 1))
      .returning();

    return jsonOk(await publicConfig(row));
  } catch (error) {
    return jsonError(error, '保存配置失败');
  }
}
