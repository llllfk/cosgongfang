import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { analyzeRecords, users } from '@/db/schema';
import { getCurrentUserRow, requireUser } from '@/lib/auth';
import { analyzeCostumeWithArk } from '@/lib/ark';
import { jsonError, jsonOk } from '@/lib/api-response';
import { persistImage, cosStoragePath } from '@/lib/coze-storage';
import { resolveStoredImageUrl, serializeAnalyzeImageForStorage } from '@/lib/usage-media';
import type { AnalyzeRecordRow } from '@/db/schema';

/** 识图可能较慢 */
export const maxDuration = 180;

async function mapAnalyze(row: AnalyzeRecordRow) {
  return {
    id: row.id,
    imageUrl: (await resolveStoredImageUrl(row.imageUrl)) || row.imageUrl,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    costumeStructure: row.costumeStructure,
    fabricGuess: row.fabricGuess,
    colorScheme: row.colorScheme,
    accessories: row.accessories,
    materials: row.materials,
    craftDifficulties: row.craftDifficulties,
    patternTips: row.patternTips,
  };
}

export async function GET() {
  try {
    const user = requireUser(await getCurrentUserRow());
    const rows = await db
      .select()
      .from(analyzeRecords)
      .where(eq(analyzeRecords.userId, user.id))
      .orderBy(desc(analyzeRecords.createdAt))
      .limit(50);
    return jsonOk({ items: await Promise.all(rows.map(mapAnalyze)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireUser(await getCurrentUserRow());
    const body = await req.json();
    const imageBase64 = String(body.imageBase64 || '');
    const storeImageBase64 = String(body.storeImageBase64 || '').trim();
    if (!imageBase64) {
      return jsonError(new Error('请上传角色图片'));
    }
    if (user.analyzeCount <= 0) {
      return jsonError(new Error('魔力不足：鉴定次数已用完，请联系管理员补充'));
    }

    // 先落库上传图（Coze S3 或 data URL），再调识图
    const storagePath = cosStoragePath('analyze', user.id);
    const imageForStore = storeImageBase64 || imageBase64;
    const imageStored = await persistImage(imageForStore, {
      s3FileName: `${storagePath}/input.jpg`,
      fallback: serializeAnalyzeImageForStorage,
    });
    if (!imageStored) {
      return jsonError(new Error('上传图保存失败，请重试'));
    }

    const payload = await analyzeCostumeWithArk(imageBase64);

    const [updated] = await db
      .update(users)
      .set({ analyzeCount: user.analyzeCount - 1 })
      .where(eq(users.id, user.id))
      .returning();

    try {
      const [row] = await db
        .insert(analyzeRecords)
        .values({
          userId: user.id,
          imageUrl: imageStored,
          ...payload,
        })
        .returning();

      return jsonOk({
        result: await mapAnalyze(row),
        quota: {
          analyzeCount: updated.analyzeCount,
          drawCount: updated.drawCount,
        },
      });
    } catch (err) {
      await db
        .update(users)
        .set({ analyzeCount: user.analyzeCount })
        .where(eq(users.id, user.id));
      throw err;
    }
  } catch (error) {
    return jsonError(error, '鉴定失败');
  }
}
