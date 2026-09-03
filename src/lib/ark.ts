/**
 * 火山方舟 ARK
 * - Seedream 生图：POST {ARK_BASE_URL}/images/generations
 * - 视觉鉴定：POST {ARK_BASE_URL}/chat/completions（doubao-seed-evolving 等）
 */

export type ArkGenerateParams = {
  prompt: string;
  style?: string;
  /** 图生图参考图：单张或多张 data URL / http(s) URL */
  image?: string | string[];
  mode?: 'text2img' | 'img2img';
  /** Seedream size：如 2048x2048 / 1728x2304，或 2K */
  size?: string;
};

export type ArkGenerateResult = {
  imageUrl: string;
  revisedPrompt?: string;
};

export type ArkAnalyzeResult = {
  costumeStructure: string[];
  fabricGuess: string[];
  colorScheme: { name: string; hex: string }[];
  accessories: string[];
  materials: string[];
  craftDifficulties: string[];
  patternTips: string[];
};

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`缺少环境变量 ${name}`);
  return v;
}

function arkBaseUrl() {
  return (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
}

function normalizeImageDataUrl(image: string) {
  const raw = image.trim();
  if (!raw) throw new Error('缺少图片');
  if (raw.startsWith('data:image/') || raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  return `data:image/jpeg;base64,${raw}`;
}

function asStringList(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return fallback;
  const list = v.map((x) => String(x || '').trim()).filter(Boolean);
  return list.length ? list : fallback;
}

function asColorList(v: unknown): { name: string; hex: string }[] {
  if (!Array.isArray(v)) {
    return [{ name: '主色', hex: '#8B5CF6' }];
  }
  const list = v
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as { name?: unknown; hex?: unknown };
      const name = String(row.name || '').trim();
      let hex = String(row.hex || '').trim();
      if (hex && !hex.startsWith('#')) hex = `#${hex}`;
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) hex = '#8B5CF6';
      if (!name) return null;
      return { name, hex };
    })
    .filter(Boolean) as { name: string; hex: string }[];
  return list.length ? list : [{ name: '主色', hex: '#8B5CF6' }];
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error('模型未返回可解析的 JSON');
}

function buildPrompt(
  prompt: string,
  style?: string,
  mode?: 'text2img' | 'img2img',
  refCount = 0
) {
  const base = prompt.trim();
  const stylePart = style?.trim() ? `，画面风格：${style.trim()}` : '';
  if (mode === 'img2img') {
    const refHint =
      refCount > 1
        ? `这是 ${refCount} 张 COS 服装参考图（按顺序为图1～图${refCount}），请综合参考它们的服装结构与元素进行编辑。`
        : '这是一张 COS 服装参考图，请在尽量保持人物姿态、构图与服装结构的前提下进行编辑。';
    return [
      refHint,
      `编辑要求（必须严格执行）：${base}`,
      stylePart ? `画风要求${stylePart}` : '',
      '若涉及配色修改，请把服装主色/辅色整体替换为目标色系，不要只改局部小点缀。',
      '高质量 COS 服装设计稿，细节清晰，构图完整。',
    ]
      .filter(Boolean)
      .join('');
  }
  return `${base}${stylePart}。高质量 COS 服装设计稿，细节清晰，构图完整`;
}

/** 服饰鉴定：看图输出 7 维结构化结果 */
export async function analyzeCostumeWithArk(imageBase64: string): Promise<ArkAnalyzeResult> {
  const apiKey = requireEnv('ARK_API_KEY');
  const model = process.env.ARK_VISION_MODEL || 'doubao-seed-evolving';
  const imageUrl = normalizeImageDataUrl(imageBase64);

  const system = `你是资深 COS 服装打版顾问。根据用户上传的角色图，输出给裁缝使用的服饰鉴定书。
必须只输出一个 JSON 对象，不要 Markdown，不要其它说明。字段如下：
{
  "costumeStructure": string[],   // 服装构成与穿着层次
  "fabricGuess": string[],        // 面料推测（材质/克重/垂坠/光泽）
  "colorScheme": [{"name": string, "hex": "#RRGGBB"}], // 主色/辅色/点缀色
  "accessories": string[],        // 配件清单
  "materials": string[],          // 辅料明细（拉链纽扣等）
  "craftDifficulties": string[],  // 工艺难点
  "patternTips": string[]         // 打版要点提醒
}
每项 3~6 条，中文，具体可执行。若看不清某细节，基于常见 COS 做法合理推测并注明“推测”。`;

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请鉴定这张角色图的服装，按约定 JSON 输出七个维度。',
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 2200,
  };

  const controller = new AbortController();
  const timeoutMs = Number(process.env.ARK_VISION_TIMEOUT_MS || 120000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${arkBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    let json: {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    } = {};
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      throw new Error(json.error?.message || text.slice(0, 300) || `ARK HTTP ${res.status}`);
    }

    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('火山识图未返回内容');

    const parsed = extractJsonObject(content) as Record<string, unknown>;
    return {
      costumeStructure: asStringList(parsed.costumeStructure, ['未识别到明确上装结构（推测）']),
      fabricGuess: asStringList(parsed.fabricGuess, ['面料信息不足，建议按角色设定二次确认']),
      colorScheme: asColorList(parsed.colorScheme),
      accessories: asStringList(parsed.accessories, ['未见明显配件，或被裁切遮挡']),
      materials: asStringList(parsed.materials, ['建议按常规辅料清单采购：拉链、粘合衬、线']),
      craftDifficulties: asStringList(parsed.craftDifficulties, ['注意贴合度与定型工艺']),
      patternTips: asStringList(parsed.patternTips, ['按真人尺寸放缝份，先做白坯确认比例']),
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('服饰鉴定超时，请稍后重试');
    }
    throw err instanceof Error ? new Error(`服饰鉴定失败：${err.message}`) : err;
  } finally {
    clearTimeout(timer);
  }
}

/** Seedream-5.0-pro 禁止传这些字段，传了会 400 */
export async function generateWithArk(params: ArkGenerateParams): Promise<ArkGenerateResult> {
  const apiKey = requireEnv('ARK_API_KEY');
  const baseUrl = arkBaseUrl();
  const model = process.env.ARK_IMAGE_MODEL || 'doubao-seedream-5-0-pro-260628';

  const refImages = (Array.isArray(params.image) ? params.image : params.image ? [params.image] : [])
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .map(normalizeImageDataUrl)
    .slice(0, 10);

  const mode: 'text2img' | 'img2img' =
    refImages.length > 0 ? 'img2img' : params.mode || 'text2img';

  const finalPrompt = buildPrompt(params.prompt, params.style, mode, refImages.length);

  const body: Record<string, unknown> = {
    model,
    prompt: finalPrompt,
    size: params.size?.trim() || process.env.ARK_IMAGE_SIZE || '2048x2048',
    response_format: 'url',
    watermark: false,
  };

  if (refImages.length === 1) {
    body.image = refImages[0];
  } else if (refImages.length > 1) {
    body.image = refImages;
  }

  console.info('[ark:generate]', {
    model,
    mode,
    size: body.size,
    refCount: refImages.length,
    prompt: finalPrompt.slice(0, 200),
  });

  const controller = new AbortController();
  const timeoutMs = Number(process.env.ARK_TIMEOUT_MS || 240000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    let json: {
      error?: { message?: string; code?: string };
      data?: Array<{ url?: string; b64_json?: string }>;
    } = {};
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      const msg = json.error?.message || text.slice(0, 300) || `ARK HTTP ${res.status}`;
      throw new Error(`火山生图失败：${msg}`);
    }

    const item = json.data?.[0];
    if (item?.url) {
      return { imageUrl: item.url };
    }
    if (item?.b64_json) {
      return { imageUrl: `data:image/jpeg;base64,${item.b64_json}` };
    }
    throw new Error('火山生图成功但未返回图片数据');
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('火山生图超时，请稍后重试（Seedream Pro 可能需要 1~2 分钟）');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
