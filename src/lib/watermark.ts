import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { globalConfig } from '@/db/schema';

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function loadImageBuffer(source: string): Promise<Buffer> {
  const src = String(source || '').trim();
  if (!src) throw new Error('缺少图片');

  if (src.startsWith('data:')) {
    const m = src.match(/^data:[^;]+;base64,([\s\S]+)$/);
    if (!m) throw new Error('无效的图片 data URL');
    return Buffer.from(m[1], 'base64');
  }

  if (src.startsWith('http://') || src.startsWith('https://')) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`下载生成图失败 (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error('不支持的图片格式');
}

/** 读取工坊水印文案；空字符串表示不加水印 */
export async function getWatermarkText(): Promise<string> {
  try {
    const rows = await db.select().from(globalConfig).where(eq(globalConfig.id, 1)).limit(1);
    return String(rows[0]?.watermarkText || '').trim();
  } catch (err) {
    console.error('[watermark] read config failed', err);
    return '';
  }
}

/**
 * 给生成图加右下角文字水印。
 * text 为空则原样返回；处理失败时回退原图，避免阻断出图。
 */
export async function applyTextWatermark(source: string, text: string): Promise<string> {
  const wm = String(text || '').trim();
  if (!wm) return source;

  try {
    const input = await loadImageBuffer(source);
    const meta = await sharp(input).metadata();
    const width = meta.width || 1024;
    const height = meta.height || 1024;
    const fontSize = Math.max(18, Math.round(Math.min(width, height) * 0.032));
    const pad = Math.max(14, Math.round(fontSize * 0.7));
    const label = escapeXml(wm.slice(0, 64));

    const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .wm {
      font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Noto Sans SC",
        "Source Han Sans SC", "WenQuanYi Micro Hei", sans-serif;
      font-size: ${fontSize}px;
      font-weight: 600;
    }
  </style>
  <text class="wm" x="${width - pad}" y="${height - pad}" text-anchor="end"
    fill="rgba(0,0,0,0.4)">${label}</text>
  <text class="wm" x="${width - pad - 1}" y="${height - pad - 1}" text-anchor="end"
    fill="rgba(255,255,255,0.78)">${label}</text>
</svg>`);

    const out = await sharp(input)
      .composite([{ input: svg, top: 0, left: 0 }])
      .jpeg({ quality: 92 })
      .toBuffer();

    return `data:image/jpeg;base64,${out.toString('base64')}`;
  } catch (err) {
    console.error('[watermark] apply failed, use original', err);
    return source;
  }
}

/** 按工坊配置自动加水印 */
export async function applyConfiguredWatermark(source: string): Promise<string> {
  const text = await getWatermarkText();
  return applyTextWatermark(source, text);
}
