/** 浏览器端图片压缩：缩小长边并转 JPEG，降低 base64 体积 */

export type CompressOptions = {
  /** 最长边像素，默认 1536 */
  maxEdge?: number;
  /** JPEG 质量 0~1，默认 0.82 */
  quality?: number;
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

function canvasToJpegDataUrl(
  img: HTMLImageElement,
  maxEdge: number,
  quality: number
): string {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error('无法读取图片尺寸');

  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持画布压缩');
  ctx.drawImage(img, 0, 0, tw, th);

  // 已经很小且本身是 jpeg 时，仍统一输出 jpeg，保证体积可控
  return canvas.toDataURL('image/jpeg', quality);
}

/** 压缩本地文件为 JPEG data URL */
export async function compressImageFile(
  file: File,
  options?: CompressOptions
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请上传图片文件');
  }
  // gif 动图压缩会丢帧，原样读入
  if (file.type === 'image/gif') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('读取图片失败'));
      reader.readAsDataURL(file);
    });
  }

  const maxEdge = options?.maxEdge ?? 1536;
  const quality = options?.quality ?? 0.82;
  const img = await loadImageFromFile(file);
  return canvasToJpegDataUrl(img, maxEdge, quality);
}

/** 压缩已有 data URL */
export async function compressImageDataUrl(
  dataUrl: string,
  options?: CompressOptions
): Promise<string> {
  if (dataUrl.startsWith('data:image/gif')) return dataUrl;
  const maxEdge = options?.maxEdge ?? 1536;
  const quality = options?.quality ?? 0.82;
  const img = await loadImageFromDataUrl(dataUrl);
  return canvasToJpegDataUrl(img, maxEdge, quality);
}

/** 使用记录落库用：更小体积，保证可回显 */
export async function compressImagesForRecord(dataUrls: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const url of dataUrls) {
    const src = String(url || '').trim();
    if (!src) continue;
    try {
      out.push(await compressImageDataUrl(src, { maxEdge: 720, quality: 0.7 }));
    } catch {
      // 压缩失败仍尽量保留原图（可能被服务端截断）
      if (src.startsWith('data:image/') || src.startsWith('http')) out.push(src);
    }
  }
  return out;
}
