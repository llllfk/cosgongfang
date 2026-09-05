import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { drawRecords, users, type DrawRecordRow } from '@/db/schema';
import { getCurrentUserRow, requireUser } from '@/lib/auth';
import { generateWithArk } from '@/lib/ark';
import { jsonError, jsonOk } from '@/lib/api-response';
import { persistImage, persistRefImages, cosStoragePath } from '@/lib/coze-storage';
import { resolveStoredImageUrl, serializeRefImagesForStorage } from '@/lib/usage-media';
import { displayDrawPrompt } from '@/lib/design-prompt-display';

/** Seedream Pro 可能要 1~2 分钟 */
export const maxDuration = 300;

async function mapDraw(row: DrawRecordRow) {
  return {
    id: row.id,
    imageUrl: (await resolveStoredImageUrl(row.imageUrl)) || row.imageUrl,
    prompt: displayDrawPrompt(row.prompt, row.style),
    style: row.style,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    mode: row.mode as 'text2img' | 'img2img',
  };
}

async function createDraw(params: {
  mode: 'text2img' | 'img2img';
  prompt: string;
  style: string;
  size?: string;
  refImages?: string[];
  /** 使用记录展示用（已缩小），优先落库 */
  refStoreImages?: string[];
}) {
  const user = requireUser(await getCurrentUserRow());
  if (!params.prompt.trim()) {
    throw new Error('请输入提示词');
  }
  const refs = (params.refImages || []).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10);
  const storeRefs = (params.refStoreImages || [])
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .slice(0, 10);
  if (params.mode === 'img2img' && refs.length === 0) {
    throw new Error('请上传参考图');
  }
  if (user.drawCount <= 0) {
    throw new Error('次数不足：绘梦次数已用完，请联系管理员补充');
  }

  // 先调火山再扣次：避免模型失败仍扣次数；成功后再扣并落库
  let arkImageUrl: string;
  try {
    console.info('[draw] start', {
      mode: params.mode,
      style: params.style,
      size: params.size,
      prompt: params.prompt.slice(0, 120),
      refCount: refs.length,
      storeRefCount: storeRefs.length,
    });
    const ark = await generateWithArk({
      prompt: params.prompt,
      style: params.style,
      mode: params.mode,
      size: params.size,
      image: params.mode === 'img2img' ? refs : undefined,
    });
    arkImageUrl = ark.imageUrl;
    console.info('[draw] ark ok', {
      mode: params.mode,
      imageKind: arkImageUrl.startsWith('http')
        ? 'http'
        : arkImageUrl.startsWith('data:')
          ? 'data'
          : 'other',
    });
  } catch (err) {
    console.error('[draw] ark failed', err);
    throw err;
  }

  const [updated] = await db
    .update(users)
    .set({ drawCount: user.drawCount - 1 })
    .where(eq(users.id, user.id))
    .returning();

  try {
    const refsForDb = storeRefs.length > 0 ? storeRefs : refs;
    const drawPath = cosStoragePath('draw', user.id);
    const outputStored = await persistImage(arkImageUrl, {
      s3FileName: `${drawPath}/output.jpg`,
      fallback: (src) => src,
    });
    const refStored = await persistRefImages(
      refsForDb,
      drawPath,
      serializeRefImagesForStorage
    );

    const [row] = await db
      .insert(drawRecords)
      .values({
        userId: user.id,
        prompt: params.prompt.trim(),
        style: params.style?.trim() || '不限',
        mode: params.mode,
        imageUrl: outputStored,
        refImageUrl: refStored,
      })
      .returning();

    return {
      image: await mapDraw(row),
      quota: {
        analyzeCount: updated.analyzeCount,
        drawCount: updated.drawCount,
      },
    };
  } catch (err) {
    // 落库失败回滚额度（火山已出图无法撤销，仅回滚次数）
    await db.update(users).set({ drawCount: user.drawCount }).where(eq(users.id, user.id));
    throw err;
  }
}

export async function GET() {
  try {
    const user = requireUser(await getCurrentUserRow());
    const rows = await db
      .select()
      .from(drawRecords)
      .where(eq(drawRecords.userId, user.id))
      .orderBy(desc(drawRecords.createdAt))
      .limit(50);
    return jsonOk({ items: await Promise.all(rows.map(mapDraw)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = body.mode === 'img2img' ? 'img2img' : 'text2img';
    const fromArray = Array.isArray(body.imagesBase64)
      ? body.imagesBase64.map((x: unknown) => String(x || '')).filter(Boolean)
      : [];
    const fromSingle = body.imageBase64 ? [String(body.imageBase64)] : [];
    const storeArray = Array.isArray(body.refStoreImages)
      ? body.refStoreImages.map((x: unknown) => String(x || '')).filter(Boolean)
      : [];
    const result = await createDraw({
      mode,
      prompt: String(body.prompt || ''),
      style: String(body.style || '').trim(),
      size: String(body.size || '').trim() || undefined,
      refImages: fromArray.length > 0 ? fromArray : fromSingle,
      refStoreImages: storeArray,
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error, '生成失败');
  }
}
