import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { analyzeRecords, drawRecords } from '@/db/schema';
import { getCurrentUserRow, requireUser } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { resolveStoredImageUrl, resolveStoredRefUrls } from '@/lib/usage-media';

export type UsageItem = {
  id: string;
  type: 'analyze' | 'draw';
  createdAt: string;
  summary: string;
  detail?: string;
  style?: string;
  mode?: string;
  imageUrl?: string;
  inputImageUrl?: string;
  refImageUrls?: string[];
  prompt?: string;
  analyze?: {
    costumeStructure: string[];
    fabricGuess: string[];
    colorScheme: { name: string; hex: string }[];
    accessories: string[];
    materials: string[];
    craftDifficulties: string[];
    patternTips: string[];
  };
};

export async function GET() {
  try {
    const user = requireUser(await getCurrentUserRow());

    const [analyzes, draws] = await Promise.all([
      db
        .select()
        .from(analyzeRecords)
        .where(eq(analyzeRecords.userId, user.id))
        .orderBy(desc(analyzeRecords.createdAt))
        .limit(100),
      db
        .select()
        .from(drawRecords)
        .where(eq(drawRecords.userId, user.id))
        .orderBy(desc(drawRecords.createdAt))
        .limit(100),
    ]);

    const analyzeItems: UsageItem[] = await Promise.all(
      analyzes.map(async (row) => ({
        id: row.id,
        type: 'analyze' as const,
        createdAt: row.createdAt.toISOString(),
        summary: row.fabricGuess?.[0] || row.costumeStructure?.[0] || '服饰鉴定',
        detail: `鉴定维度 ${row.costumeStructure?.length || 0} 项`,
        inputImageUrl: await resolveStoredImageUrl(row.imageUrl),
        analyze: {
          costumeStructure: row.costumeStructure,
          fabricGuess: row.fabricGuess,
          colorScheme: row.colorScheme,
          accessories: row.accessories,
          materials: row.materials,
          craftDifficulties: row.craftDifficulties,
          patternTips: row.patternTips,
        },
      }))
    );

    const drawItems: UsageItem[] = await Promise.all(
      draws.map(async (row) => ({
        id: row.id,
        type: 'draw' as const,
        createdAt: row.createdAt.toISOString(),
        summary: row.prompt,
        detail: `${row.style} · ${row.mode === 'img2img' ? '图生图' : '文生图'}`,
        style: row.style,
        mode: row.mode,
        prompt: row.prompt,
        imageUrl: await resolveStoredImageUrl(row.imageUrl),
        refImageUrls: await resolveStoredRefUrls(row.refImageUrl),
      }))
    );

    const items = [...analyzeItems, ...drawItems].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );

    return jsonOk({ items });
  } catch (error) {
    return jsonError(error);
  }
}
