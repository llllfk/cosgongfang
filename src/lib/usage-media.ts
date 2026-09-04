import {
  isS3MediaRef,
  parseStoredRefList,
  resolveMediaUrl,
  resolveRefImageUrls,
} from '@/lib/coze-storage';

/** 使用记录：输入图 / 参考图是否可直接展示（未解析的 s3: 引用不算） */
export function isDisplayableImageUrl(url?: string | null): boolean {
  if (!url) return false;
  if (isS3MediaRef(url)) return false;
  return (
    url.startsWith('data:image/') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  );
}

/** 解析绘梦参考图字段（单图 / JSON 数组；含 s3: 引用，需 resolveRefImageUrls 解析） */
export function parseRefImageUrls(ref?: string | null): string[] {
  const items = parseStoredRefList(ref);
  return items.filter(isDisplayableImageUrl);
}

/**
 * 落库用：尽量保留可展示参考图（无 S3 时）。
 * 多图时按体积贪心塞入；单图过大则记数量占位。
 */
export function serializeRefImagesForStorage(refs: string[], maxChars = 2_500_000): string | undefined {
  const clean = refs
    .map((x) => String(x || '').trim())
    .filter((x) => isDisplayableImageUrl(x) || x.startsWith('data:'))
    .slice(0, 10);
  if (clean.length === 0) return undefined;

  if (clean.length === 1) {
    return clean[0].length <= maxChars ? clean[0] : `uploaded:1`;
  }

  const kept: string[] = [];
  for (const img of clean) {
    const trial = JSON.stringify([...kept, img]);
    if (trial.length > maxChars) continue;
    kept.push(img);
  }

  if (kept.length === 0) return `uploaded:${clean.length}`;
  if (kept.length === 1) return kept[0];
  return JSON.stringify(kept);
}

/** 落库用：鉴定上传图（无 S3 时） */
export function serializeAnalyzeImageForStorage(image: string, maxChars = 2_500_000): string {
  const v = String(image || '');
  if (!v) return '';
  if (v.length <= maxChars) return v;
  return `uploaded:${v.slice(0, 48)}…`;
}

/** API 返回前：解析单图字段 */
export async function resolveStoredImageUrl(stored?: string | null): Promise<string | undefined> {
  if (!stored) return undefined;
  const url = await resolveMediaUrl(stored);
  if (url) return url;
  return isDisplayableImageUrl(stored) ? stored : undefined;
}

/** API 返回前：解析参考图列表 */
export async function resolveStoredRefUrls(ref?: string | null): Promise<string[]> {
  const direct = parseRefImageUrls(ref);
  if (direct.length > 0) return direct;
  return resolveRefImageUrls(ref);
}
