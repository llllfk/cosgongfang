import { count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { analyzeRecords, drawRecords, users } from '@/db/schema';
import { getCurrentUserRow, requireAdmin } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { resolveStoredImageUrl, resolveStoredRefUrls } from '@/lib/usage-media';
import { displayDrawPrompt, designUserNoteOnly } from '@/lib/design-prompt-display';

type UsageType = 'all' | 'analyze' | 'draw';

type UsageItem = {
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
    report?: Record<string, unknown>;
  };
};

type PageKey = { id: string; kind: 'analyze' | 'draw'; createdAt: Date };

async function countAnalyze(userId: string) {
  const base = db.select({ value: count() }).from(analyzeRecords);
  const [row] = userId
    ? await base.where(eq(analyzeRecords.userId, userId))
    : await base;
  return Number(row?.value || 0);
}

async function countDraw(userId: string) {
  const base = db.select({ value: count() }).from(drawRecords);
  const [row] = userId ? await base.where(eq(drawRecords.userId, userId)) : await base;
  return Number(row?.value || 0);
}

async function listAnalyzeKeys(userId: string, limit: number, offset: number): Promise<PageKey[]> {
  const base = db
    .select({ id: analyzeRecords.id, createdAt: analyzeRecords.createdAt })
    .from(analyzeRecords);
  const rows = await (userId ? base.where(eq(analyzeRecords.userId, userId)) : base)
    .orderBy(desc(analyzeRecords.createdAt))
    .limit(limit)
    .offset(offset);
  return rows.map((r) => ({ id: r.id, kind: 'analyze' as const, createdAt: r.createdAt }));
}

async function listDrawKeys(userId: string, limit: number, offset: number): Promise<PageKey[]> {
  const base = db
    .select({ id: drawRecords.id, createdAt: drawRecords.createdAt })
    .from(drawRecords);
  const rows = await (userId ? base.where(eq(drawRecords.userId, userId)) : base)
    .orderBy(desc(drawRecords.createdAt))
    .limit(limit)
    .offset(offset);
  return rows.map((r) => ({ id: r.id, kind: 'draw' as const, createdAt: r.createdAt }));
}

async function listMergedKeys(userId: string, limit: number, offset: number): Promise<PageKey[]> {
  const result = userId
    ? await db.execute<{ id: string; created_at: Date; kind: string }>(sql`
        SELECT id, created_at, kind FROM (
          SELECT id, created_at, 'analyze'::text AS kind FROM analyze_records WHERE user_id = ${userId}
          UNION ALL
          SELECT id, created_at, 'draw'::text AS kind FROM draw_records WHERE user_id = ${userId}
        ) AS u
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `)
    : await db.execute<{ id: string; created_at: Date; kind: string }>(sql`
        SELECT id, created_at, kind FROM (
          SELECT id, created_at, 'analyze'::text AS kind FROM analyze_records
          UNION ALL
          SELECT id, created_at, 'draw'::text AS kind FROM draw_records
        ) AS u
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
  const rows = Array.isArray(result) ? result : (result as { rows?: typeof result }).rows || [];
  return rows.map((r) => ({
    id: String(r.id),
    kind: r.kind === 'draw' ? ('draw' as const) : ('analyze' as const),
    createdAt: new Date(r.created_at),
  }));
}

async function hydrateAnalyze(ids: string[]): Promise<UsageItem[]> {
  if (!ids.length) return [];
  const rows = await db
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
      report: analyzeRecords.report,
      userId: users.id,
      nickname: users.nickname,
      account: users.account,
    })
    .from(analyzeRecords)
    .innerJoin(users, eq(analyzeRecords.userId, users.id))
    .where(inArray(analyzeRecords.id, ids));

  const byId = new Map(rows.map((r) => [r.id, r]));
  const items: UsageItem[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    items.push({
      id: row.id,
      type: 'analyze',
      createdAt: row.createdAt.toISOString(),
      summary:
        (row.report as { summary?: string } | null)?.summary ||
        row.fabricGuess?.[0] ||
        row.costumeStructure?.[0] ||
        '定制需求报告',
      detail: '扣 1 次鉴定次数',
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
        report: row.report || undefined,
      },
    });
  }
  return items;
}

async function hydrateDraw(ids: string[]): Promise<UsageItem[]> {
  if (!ids.length) return [];
  const rows = await db
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
    .innerJoin(users, eq(drawRecords.userId, users.id))
    .where(inArray(drawRecords.id, ids));

  const byId = new Map(rows.map((r) => [r.id, r]));
  const items: UsageItem[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    const shown = displayDrawPrompt(row.prompt, row.style);
    const userNote = designUserNoteOnly(row.prompt, row.style);
    items.push({
      id: row.id,
      type: 'draw',
      createdAt: row.createdAt.toISOString(),
      summary: shown,
      detail: `${row.style} · ${row.mode === 'img2img' ? '图生图' : '文生图'} · 扣 1 次绘梦次数`,
      userId: row.userId,
      nickname: row.nickname,
      account: row.account,
      style: row.style,
      mode: row.mode,
      prompt: row.style === '设计稿' ? userNote || undefined : row.prompt,
      imageUrl: await resolveStoredImageUrl(row.imageUrl),
      refImageUrls: await resolveStoredRefUrls(row.refImageUrl),
    });
  }
  return items;
}

export async function GET(req: Request) {
  try {
    requireAdmin(await getCurrentUserRow());
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') || 'all') as UsageType;
    const userId = String(searchParams.get('userId') || '').trim();
    const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || 20) || 20));
    const offset = (page - 1) * pageSize;

    let total = 0;
    if (type === 'all' || type === 'analyze') total += await countAnalyze(userId);
    if (type === 'all' || type === 'draw') total += await countDraw(userId);

    let keys: PageKey[] = [];
    if (type === 'analyze') {
      keys = await listAnalyzeKeys(userId, pageSize, offset);
    } else if (type === 'draw') {
      keys = await listDrawKeys(userId, pageSize, offset);
    } else {
      keys = await listMergedKeys(userId, pageSize, offset);
    }

    const analyzeIds = keys.filter((k) => k.kind === 'analyze').map((k) => k.id);
    const drawIds = keys.filter((k) => k.kind === 'draw').map((k) => k.id);
    const [analyzeItems, drawItems] = await Promise.all([
      hydrateAnalyze(analyzeIds),
      hydrateDraw(drawIds),
    ]);
    const byKey = new Map<string, UsageItem>();
    for (const item of analyzeItems) byKey.set(`analyze:${item.id}`, item);
    for (const item of drawItems) byKey.set(`draw:${item.id}`, item);

    const items = keys
      .map((k) => byKey.get(`${k.kind}:${k.id}`))
      .filter((x): x is UsageItem => !!x);

    return jsonOk({ items, total, page, pageSize });
  } catch (error) {
    return jsonError(error);
  }
}
