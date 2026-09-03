import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { analyzeRecords, drawRecords, users } from '@/db/schema';
import { getCurrentUserRow, requireAdmin } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { resolveStoredImageUrl, resolveStoredRefUrls } from '@/lib/usage-media';

export async function GET(req: Request) {
  try {
    requireAdmin(await getCurrentUserRow());
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const userId = searchParams.get('userId') || '';

    const items: Array<{
      id: string;
      type: 'analyze' | 'draw';
      createdAt: string;
      summary: string;
      detail: string;
      userId: string;
      nickname: string;
      account: string;
      style?: string;
      mode?: string;
      prompt?: string;
      imageUrl?: string;
      inputImageUrl?: string;
      refImageUrls?: string[];
      analyze?: {
        costumeStructure: string[];
        fabricGuess: string[];
        colorScheme: { name: string; hex: string }[];
        accessories: string[];
        materials: string[];
        craftDifficulties: string[];
        patternTips: string[];
      };
    }> = [];

    if (type === 'all' || type === 'analyze') {
      const base = db
        .select({
          id: analyzeRecords.id,
          createdAt: analyzeRecords.createdAt,
          imageUrl: analyzeRecords.imageUrl,
          fabricGuess: analyzeRecords.fabricGuess,
          costumeStructure: analyzeRecords.costumeStructure,
          colorScheme: analyzeRecords.colorScheme,
          accessories: analyzeRecords.accessories,
          materials: analyzeRecords.materials,
          craftDifficulties: analyzeRecords.craftDifficulties,
          patternTips: analyzeRecords.patternTips,
          userId: users.id,
          nickname: users.nickname,
          account: users.account,
        })
        .from(analyzeRecords)
        .innerJoin(users, eq(analyzeRecords.userId, users.id));

      const rows = await (userId
        ? base.where(eq(analyzeRecords.userId, userId))
        : base
      )
        .orderBy(desc(analyzeRecords.createdAt))
        .limit(200);

      for (const row of rows) {
        items.push({
          id: row.id,
          type: 'analyze',
          createdAt: row.createdAt.toISOString(),
          summary: row.fabricGuess?.[0] || row.costumeStructure?.[0] || '服饰鉴定',
          detail: '扣 1 次鉴定魔力',
          userId: row.userId,
          nickname: row.nickname,
          account: row.account,
          inputImageUrl: await resolveStoredImageUrl(row.imageUrl),
          analyze: {
            costumeStructure: row.costumeStructure || [],
            fabricGuess: row.fabricGuess || [],
            colorScheme: row.colorScheme || [],
            accessories: row.accessories || [],
            materials: row.materials || [],
            craftDifficulties: row.craftDifficulties || [],
            patternTips: row.patternTips || [],
          },
        });
      }
    }

    if (type === 'all' || type === 'draw') {
      const base = db
        .select({
          id: drawRecords.id,
          createdAt: drawRecords.createdAt,
          prompt: drawRecords.prompt,
          style: drawRecords.style,
          mode: drawRecords.mode,
          imageUrl: drawRecords.imageUrl,
          refImageUrl: drawRecords.refImageUrl,
          userId: users.id,
          nickname: users.nickname,
          account: users.account,
        })
        .from(drawRecords)
        .innerJoin(users, eq(drawRecords.userId, users.id));

      const rows = await (userId ? base.where(eq(drawRecords.userId, userId)) : base)
        .orderBy(desc(drawRecords.createdAt))
        .limit(200);

      for (const row of rows) {
        items.push({
          id: row.id,
          type: 'draw',
          createdAt: row.createdAt.toISOString(),
          summary: row.prompt,
          detail: `${row.style} · ${row.mode === 'img2img' ? '图生图' : '文生图'} · 扣 1 次绘梦魔力`,
          userId: row.userId,
          nickname: row.nickname,
          account: row.account,
          style: row.style,
          mode: row.mode,
          prompt: row.prompt,
          imageUrl: await resolveStoredImageUrl(row.imageUrl),
          refImageUrls: await resolveStoredRefUrls(row.refImageUrl),
        });
      }
    }

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return jsonOk({ items: items.slice(0, 200) });
  } catch (error) {
    return jsonError(error);
  }
}
