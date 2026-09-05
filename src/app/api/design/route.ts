import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { drawRecords, users } from '@/db/schema';
import { getCurrentUserRow, requireUser } from '@/lib/auth';
import { generateWithArk } from '@/lib/ark';
import { jsonError, jsonOk } from '@/lib/api-response';
import { persistImage, persistRefImages, cosStoragePath } from '@/lib/coze-storage';
import { resolveStoredImageUrl, serializeRefImagesForStorage } from '@/lib/usage-media';
import { formatDesignRecordPrompt } from '@/lib/design-prompt-display';
import { applyConfiguredWatermark } from '@/lib/watermark';

/** 单张设计稿；Seedream 可能较慢 */
export const maxDuration = 300;

export type DesignView = 'three' | 'parts';

const VIEW_META: Record<
  DesignView,
  { label: string; prompt: string; defaultSize: string }
> = {
  three: {
    label: '三视图',
    defaultSize: '2304x1728',
    prompt:
      '根据参考图的服装设计，生成一张原创 COS【服装三视图合图】。同一画面内从左到右均匀并排展示同一套服装的【正面】【背面】【侧面】三个视角。重要：画面中只能出现服装本身，绝对不要出现人体、假人、头、脸、四肢、手脚、脖子、皮肤等任何身体部位；服装以空心穿戴形态或立体衣架/隐形支撑展示（像独立服装样片），保持三个视角比例一致、结构清楚。正面看清领口/门襟/胸腰与正面装饰；背面看清后领/后背剪裁/拉链或开合；侧面看清袖型、厚度、腰线与下摆轮廓。浅色干净背景，清晰描边、平涂赛璐璐上色，像服装工业设计三视图，适合发给定制工作室打版沟通。不要文字、水印、logo、人物、身体部位。',
  },
  parts: {
    label: '拆解稿',
    defaultSize: '2304x1728',
    prompt:
      '根据参考图的服装设计，生成一张原创 COS【服装单品拆解设计稿 / costume parts sheet】。要求：把整套服装拆成独立单品并整齐摆放在同一画面中（如外套、上衣、裙/裤、帽子、鞋子、手套、领饰、腰带、丝带、包等，按参考图实际有的部件拆分）；每个单品单独画出，贴纸式白边描边、平涂赛璐璐上色、结构清楚。重要：只画服饰与配件，绝对不要出现人体、假人、头、脸、四肢、手脚、脖子、皮肤等任何身体部位，也不要把衣服穿在人身上。浅色干净背景（可淡色圆点或简洁底纹），排版疏朗美观，像二次元服装设定拆解图，方便发给定制工作室认件打版。不要文字、水印、logo、人物、身体部位。',
  },
};

function isDesignView(v: string): v is DesignView {
  return v === 'three' || v === 'parts';
}

export async function POST(req: Request) {
  try {
    const user = requireUser(await getCurrentUserRow());
    const body = await req.json();
    const viewRaw = String(body.view || '').trim();
    if (!isDesignView(viewRaw)) {
      return jsonError(new Error('请指定类型：three（三视图合图）或 parts（拆解稿）'));
    }
    const view = viewRaw;
    const imageBase64 = String(body.imageBase64 || '').trim();
    const storeImageBase64 = String(body.storeImageBase64 || '').trim();
    const note = String(body.note || '').trim();
    const meta = VIEW_META[view];
    const size = String(body.size || '').trim() || meta.defaultSize;

    if (!imageBase64) {
      return jsonError(new Error('请上传角色参考图'));
    }
    if (user.drawCount <= 0) {
      return jsonError(new Error('次数不足：绘梦次数已用完，请联系管理员补充'));
    }

    const prompt = note
      ? `${meta.prompt}\n补充要求：${note}`
      : meta.prompt;

    console.info('[design] start', { view, size, note: note.slice(0, 80) });

    let arkImageUrl: string;
    try {
      const ark = await generateWithArk({
        prompt,
        style: '赛璐璐',
        mode: 'img2img',
        size,
        image: [imageBase64],
      });
      arkImageUrl = ark.imageUrl;
      console.info('[design] ark ok', { view });
    } catch (err) {
      console.error('[design] ark failed', view, err);
      throw err;
    }

    arkImageUrl = await applyConfiguredWatermark(arkImageUrl);

    const [updated] = await db
      .update(users)
      .set({ drawCount: user.drawCount - 1 })
      .where(eq(users.id, user.id))
      .returning();

    try {
      const drawPath = cosStoragePath('design', user.id);
      const outputStored = await persistImage(arkImageUrl, {
        s3FileName: `${drawPath}/${view}-output.jpg`,
        fallback: (src) => src,
      });
      const refStored = await persistRefImages(
        [storeImageBase64 || imageBase64],
        drawPath,
        serializeRefImagesForStorage
      );

      const recordPrompt = formatDesignRecordPrompt(meta.label, note);

      const [row] = await db
        .insert(drawRecords)
        .values({
          userId: user.id,
          prompt: recordPrompt.slice(0, 2000),
          style: '设计稿',
          mode: 'img2img',
          imageUrl: outputStored,
          refImageUrl: refStored,
        })
        .returning();

      const imageUrl = (await resolveStoredImageUrl(row.imageUrl)) || row.imageUrl;

      return jsonOk({
        view,
        label: meta.label,
        image: {
          id: row.id,
          imageUrl,
          prompt: row.prompt,
          style: row.style,
          createdAt: row.createdAt.toISOString().slice(0, 10),
          mode: 'img2img' as const,
        },
        quota: {
          analyzeCount: updated.analyzeCount,
          drawCount: updated.drawCount,
        },
      });
    } catch (err) {
      await db.update(users).set({ drawCount: user.drawCount }).where(eq(users.id, user.id));
      throw err;
    }
  } catch (error) {
    return jsonError(error, '设计稿生成失败');
  }
}
