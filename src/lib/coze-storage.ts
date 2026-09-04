/**
 * Coze S3 对象存储（扣子编程内置存储）
 * 文档：https://docs.coze.cn/guides_integrate_storage_sdk
 *
 * 数据库存 `s3:object-key`；读取时用签名 URL 给前端展示。
 * 未配置 COZE_BUCKET_* 时回退 data URL 内联（仅适合本地开发）。
 */

import { randomUUID } from 'crypto';
import { S3Storage } from 'coze-coding-dev-sdk';

const S3_PREFIX = 's3:';
const DEFAULT_PRESIGN_SEC = 60 * 60 * 24 * 7; // 7 天

let storage: S3Storage | null = null;

export function isCozeStorageEnabled(): boolean {
  return !!(
    process.env.COZE_BUCKET_ENDPOINT_URL?.trim() &&
    process.env.COZE_BUCKET_NAME?.trim()
  );
}

/** 生成带随机目录的对象路径前缀，避免同用户多次上传互相覆盖 */
export function cosStoragePath(scope: string, userId: string): string {
  const safeScope = scope.replace(/[^a-zA-Z0-9/_-]/g, '');
  return `cos/${safeScope}/${userId}/${randomUUID()}`;
}

function getStorage(): S3Storage {
  if (!isCozeStorageEnabled()) {
    throw new Error('未配置 Coze 对象存储：请设置 COZE_BUCKET_ENDPOINT_URL 与 COZE_BUCKET_NAME');
  }
  if (!storage) {
    storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      bucketName: process.env.COZE_BUCKET_NAME,
      accessKey: process.env.COZE_BUCKET_ACCESS_KEY || 'coze',
      secretKey: process.env.COZE_BUCKET_SECRET_KEY || 'coze',
      region: process.env.COZE_BUCKET_REGION || 'cn-beijing',
    });
  }
  return storage;
}

export function toS3Ref(objectKey: string): string {
  return `${S3_PREFIX}${objectKey}`;
}

export type S3MediaRef = `s3:${string}`;

export function isS3MediaRef(value?: string | null): value is S3MediaRef {
  return !!value && value.startsWith(S3_PREFIX);
}

export function s3KeyFromRef(ref: string): string {
  return ref.startsWith(S3_PREFIX) ? ref.slice(S3_PREFIX.length) : ref;
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; contentType: string; ext: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) throw new Error('无效的图片 data URL');
  const contentType = m[1];
  const buffer = Buffer.from(m[2], 'base64');
  let ext = 'jpg';
  if (contentType.includes('png')) ext = 'png';
  else if (contentType.includes('webp')) ext = 'webp';
  else if (contentType.includes('gif')) ext = 'gif';
  return { buffer, contentType, ext };
}

/** 上传 data URL / http(s) URL，返回 s3: 引用 */
export async function uploadImageSource(
  source: string,
  fileName: string
): Promise<string> {
  const src = String(source || '').trim();
  if (!src) throw new Error('缺少图片');

  const client = getStorage();

  if (src.startsWith('http://') || src.startsWith('https://')) {
    const key = await client.uploadFromUrl({ url: src, timeout: 120_000 });
    return toS3Ref(key);
  }

  if (src.startsWith('data:')) {
    const { buffer, contentType, ext } = parseDataUrl(src);
    const safeName = fileName.includes('.') ? fileName : `${fileName}.${ext}`;
    const key = await client.uploadFile({
      fileContent: buffer,
      fileName: safeName,
      contentType,
    });
    return toS3Ref(key);
  }

  throw new Error('不支持的图片格式');
}

/** 批量上传参考图，返回落库字符串（单 key 或 JSON 数组） */
export async function uploadRefImages(
  sources: string[],
  namePrefix: string
): Promise<string | undefined> {
  const clean = sources.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10);
  if (clean.length === 0) return undefined;

  const keys = await Promise.all(
    clean.map((src, i) => uploadImageSource(src, `${namePrefix}/ref-${i + 1}`))
  );
  if (keys.length === 1) return keys[0];
  return JSON.stringify(keys);
}

/**
 * 持久化图片：已配置 S3 则上传并返回 s3: 引用；否则走原有内联逻辑。
 */
export async function persistImage(
  source: string,
  options: {
    s3FileName: string;
    /** 未配置 S3 或 S3 上传失败时的落库函数 */
    fallback: (src: string) => string;
  }
): Promise<string> {
  const src = String(source || '').trim();
  if (!src) throw new Error('缺少图片');

  if (!isCozeStorageEnabled()) {
    const inline = options.fallback(src);
    if (!inline) throw new Error('图片落库失败');
    return inline;
  }

  try {
    return await uploadImageSource(src, options.s3FileName);
  } catch (err) {
    console.error('[coze-storage] upload failed, fallback inline', err);
    const inline = options.fallback(src);
    if (!inline || inline.startsWith('uploaded:')) {
      throw new Error('图片上传存储失败，请稍后重试');
    }
    return inline;
  }
}

export async function persistRefImages(
  sources: string[],
  namePrefix: string,
  fallback: (refs: string[]) => string | undefined
): Promise<string | undefined> {
  if (!isCozeStorageEnabled()) return fallback(sources);
  return uploadRefImages(sources, namePrefix);
}

/** 将库内引用解析为可展示的 URL */
export async function resolveMediaUrl(
  stored?: string | null,
  expireTime = DEFAULT_PRESIGN_SEC
): Promise<string | undefined> {
  if (!stored) return undefined;
  if (stored.startsWith('data:image/') || stored.startsWith('http://') || stored.startsWith('https://')) {
    return stored;
  }
  if (!isS3MediaRef(stored)) return undefined;

  if (!isCozeStorageEnabled()) return undefined;

  try {
    const url = await getStorage().generatePresignedUrl({
      key: s3KeyFromRef(stored),
      expireTime,
    });
    return url;
  } catch (err) {
    console.error('[coze-storage] presign failed', stored.slice(0, 80), err);
    return undefined;
  }
}

/** 解析参考图字段（可能为 s3: / data: / http / JSON 数组） */
export function parseStoredRefList(ref?: string | null): string[] {
  if (!ref) return [];
  if (ref.startsWith('[')) {
    try {
      const parsed = JSON.parse(ref) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || '').trim()).filter(Boolean);
      }
    } catch {
      /* ignore */
    }
    return [];
  }
  return [ref];
}

export async function resolveRefImageUrls(ref?: string | null): Promise<string[]> {
  const items = parseStoredRefList(ref);
  const resolved = await Promise.all(items.map((item) => resolveMediaUrl(item)));
  return resolved.filter((x): x is string => !!x);
}

export async function resolveMediaUrls(stored: string[]): Promise<string[]> {
  const resolved = await Promise.all(stored.map((s) => resolveMediaUrl(s)));
  return resolved.filter((x): x is string => !!x);
}
