/**
 * 火山方舟 ARK
 * - Seedream 生图：POST {ARK_BASE_URL}/images/generations
 * - 视觉鉴定：POST {ARK_BASE_URL}/chat/completions（doubao-seed-1-6-vision 等）
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

/** 单件服装拆解（上衣/下装/外搭等） */
export type CostumePart = {
  name: string;
  structure: string;
  details: string[];
  fabric: string[];
  craft: string[];
};

/** 采购清单 */
export type MaterialList = {
  lining: string[];
  hardware: string[];
  notions: string[];
  wig: string[];
};

/** 发给打版师的定制需求报告（结构化） */
export type PatternMakerReport = {
  summary: string;
  parts: CostumePart[];
  printsEmbroidery: string[];
  accessories: string[];
  colorScheme: { name: string; hex: string }[];
  materials: MaterialList;
  sizingNotes: string[];
  risks: string[];
  /** 可直接粘贴发给工作室的完整说明 */
  toPatternMaker: string;
};

/** 落库兼容：旧 7 维 + 完整报告 */
export type ArkAnalyzeResult = {
  costumeStructure: string[];
  fabricGuess: string[];
  colorScheme: { name: string; hex: string }[];
  accessories: string[];
  materials: string[];
  craftDifficulties: string[];
  patternTips: string[];
  report: PatternMakerReport;
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

function isolateJsonCandidate(text: string): string {
  let s = text.trim();
  // 弯引号 → 直引号，避免 JSON 解析失败
  s = s.replace(/[\u201c\u201d\u201e\u201f]/g, '"').replace(/[\u2018\u2019]/g, "'");
  if (s.startsWith('```')) {
    const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) s = fenced[1].trim();
  }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return s;
}

/** 字符串内的裸换行/制表符 → 转义（模型常见问题） */
function escapeControlCharsInStrings(json: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        // 判断是收尾引号，还是内容里误写的引号
        let j = i + 1;
        while (j < json.length && /\s/.test(json[j])) j++;
        const next = json[j];
        const looksLikeEnd =
          next === undefined || next === ',' || next === '}' || next === ']' || next === ':';
        if (looksLikeEnd) {
          inString = false;
          out += ch;
        } else {
          out += '\\"';
        }
        continue;
      }
      if (ch === '\n') {
        out += '\\n';
        continue;
      }
      if (ch === '\r') {
        out += '\\r';
        continue;
      }
      if (ch === '\t') {
        out += '\\t';
        continue;
      }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

/** 去掉对象/数组尾逗号 */
function stripTrailingCommas(json: string): string {
  return json.replace(/,\s*([}\]])/g, '$1');
}

/** 补全因截断缺失的 ] } */
function closeTruncatedJson(json: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  // 若截断在字符串中，先合上引号
  let patched = json;
  if (inString) patched += '"';
  while (stack.length) patched += stack.pop();
  return patched;
}

function tryParseJson(raw: string): unknown {
  const attempts = [
    raw,
    stripTrailingCommas(raw),
    escapeControlCharsInStrings(raw),
    stripTrailingCommas(escapeControlCharsInStrings(raw)),
    closeTruncatedJson(stripTrailingCommas(escapeControlCharsInStrings(raw))),
  ];
  let lastErr: Error | null = null;
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr || new Error('JSON 解析失败');
}

function extractJsonObject(text: string): unknown {
  const candidate = isolateJsonCandidate(text);
  try {
    return tryParseJson(candidate);
  } catch (e) {
    const hint = e instanceof Error ? e.message : '未知错误';
    throw new Error(`模型返回的 JSON 无法解析（${hint}）。请重试一次`);
  }
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
    const clothesOnly =
      /仅服饰|不要出现人体|绝对不要出现人体|身体部位|单品拆解|三视图合图/.test(base);
    const refHint = clothesOnly
      ? refCount > 1
        ? `这是 ${refCount} 张 COS 服装结构参考图，请只提取服装与配件做原创设计稿；完全忽略人物身体与五官，禁止画出任何身体部位。`
        : '这是一张 COS 服装结构参考图，请只提取服装与配件做原创设计稿；完全忽略人物身体与五官，禁止画出任何身体部位。'
      : refCount > 1
        ? `这是 ${refCount} 张 COS 服装结构参考图（按顺序为图1～图${refCount}），请综合参考服装剪裁与层次做原创设计稿，不要复刻任何受版权保护的角色形象或官方立绘。`
        : '这是一张 COS 服装结构参考图，请参考服装剪裁与层次做原创设计稿；保持姿态与构图可参考，但不要复刻受版权保护的角色形象或官方立绘。';
    return [
      refHint,
      `编辑要求（必须严格执行）：${base}`,
      stylePart ? `画风要求${stylePart}` : '',
      clothesOnly
        ? '最终画面只能出现服饰与配件，禁止人体、假人、头脸手脚等身体部位。'
        : '若涉及配色修改，请把服装主色/辅色整体替换为目标色系，不要只改局部小点缀。',
      clothesOnly
        ? '输出为可打版的原创 COS 服饰设计稿，细节清晰，无人物身体。'
        : '输出为可打版的原创 COS 服装设计稿，细节清晰，构图完整。',
    ]
      .filter(Boolean)
      .join('');
  }
  return `${base}${stylePart}。输出为可打版的原创 COS 服装设计稿，细节清晰，构图完整，避免复刻受版权保护的角色形象`;
}

const PART_NAMES = ['上衣', '下装', '外搭', '内衬', '领口袖口', '印花刺绣', '配饰'] as const;

function asPartList(v: unknown): CostumePart[] {
  const fallback: CostumePart[] = PART_NAMES.map((name) => ({
    name,
    structure: name === '配饰' || name === '印花刺绣' ? '无（或图中未看清，推测）' : '未明确识别，需对照原图确认（推测）',
    details: [],
    fabric: [],
    craft: [],
  }));

  if (!Array.isArray(v) || v.length === 0) return fallback;

  const parsed = v
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = String(row.name || '').trim();
      if (!name) return null;
      return {
        name,
        structure: String(row.structure || '').trim() || '待确认',
        details: asStringList(row.details, []),
        fabric: asStringList(row.fabric, []),
        craft: asStringList(row.craft, []),
      } satisfies CostumePart;
    })
    .filter(Boolean) as CostumePart[];

  // 保证七类都有，缺的补上
  const byName = new Map(parsed.map((p) => [p.name, p]));
  return PART_NAMES.map((name) => {
    const hit = byName.get(name);
    if (hit) return hit;
    const fuzzy = parsed.find((p) => p.name.includes(name) || name.includes(p.name));
    if (fuzzy) return { ...fuzzy, name };
    return {
      name,
      structure: '无（或图中未看清，推测）',
      details: [],
      fabric: [],
      craft: [],
    };
  });
}

function asMaterialList(v: unknown): MaterialList {
  if (!v || typeof v !== 'object') {
    return {
      lining: ['粘合衬（有纺）按部位加衬（推测）'],
      hardware: ['按开合方式备拉链/按扣（推测）'],
      notions: ['缝纫线、衬与常规辅料按实购'],
      wig: ['若需造型假发，按角色发色另购（推测）'],
    };
  }
  const row = v as Record<string, unknown>;
  return {
    lining: asStringList(row.lining, ['内衬/衬料待确认']),
    hardware: asStringList(row.hardware, ['五金件待确认']),
    notions: asStringList(row.notions, ['辅料待确认']),
    wig: asStringList(row.wig, ['假发需求待确认（无则写无）']),
  };
}

function flattenReport(report: PatternMakerReport): Omit<ArkAnalyzeResult, 'report'> {
  const costumeStructure = report.parts.map((p) => {
    const detail = p.details.length ? `；细节：${p.details.join('、')}` : '';
    return `${p.name}：${p.structure}${detail}`;
  });

  const fabricGuess = report.parts.flatMap((p) =>
    p.fabric.map((f) => `${p.name}面料：${f}`)
  );

  const craftDifficulties = [
    ...report.parts.flatMap((p) => p.craft.map((c) => `${p.name}工艺：${c}`)),
    ...report.risks.map((r) => `风险/待确认：${r}`),
  ];

  const materials = [
    ...report.materials.lining.map((x) => `内衬：${x}`),
    ...report.materials.hardware.map((x) => `五金：${x}`),
    ...report.materials.notions.map((x) => `辅料：${x}`),
    ...report.materials.wig.map((x) => `假发：${x}`),
  ];

  const accessories = [
    ...report.accessories,
    ...report.printsEmbroidery.map((x) => `印花/刺绣：${x}`),
  ];

  const patternTips = [
    ...report.sizingNotes,
    report.toPatternMaker ? `给打版师：${report.toPatternMaker}` : '',
  ].filter(Boolean);

  return {
    costumeStructure: costumeStructure.length
      ? costumeStructure
      : ['未识别到明确服装结构（推测）'],
    fabricGuess: fabricGuess.length
      ? fabricGuess
      : ['面料信息不足，建议按角色设定二次确认'],
    colorScheme: report.colorScheme,
    accessories: accessories.length ? accessories : ['未见明显配件，或被裁切遮挡'],
    materials: materials.length
      ? materials
      : ['建议按常规辅料清单采购：拉链、粘合衬、线'],
    craftDifficulties: craftDifficulties.length
      ? craftDifficulties
      : ['注意贴合度与定型工艺'],
    patternTips: patternTips.length
      ? patternTips
      : ['按真人尺寸放缝份，先做白坯确认比例'],
  };
}

function parsePatternMakerReport(parsed: Record<string, unknown>): PatternMakerReport {
  const materials = asMaterialList(parsed.materials);
  const parts = asPartList(parsed.parts);
  const summary =
    String(parsed.summary || '').trim() ||
    '已根据角色图整理定制需求，请对照拆解与采购清单沟通打版。';
  const toPatternMaker =
    String(parsed.toPatternMaker || '').trim() ||
    [
      summary,
      ...parts.map((p) => `${p.name}：${p.structure}`),
      `配色：${asColorList(parsed.colorScheme)
        .map((c) => `${c.name}${c.hex}`)
        .join('、')}`,
    ].join('\n');

  return {
    summary,
    parts,
    printsEmbroidery: asStringList(parsed.printsEmbroidery, ['无明显印花/刺绣，或未看清（推测）']),
    accessories: asStringList(parsed.accessories, ['未见明显独立配件，或被裁切遮挡']),
    colorScheme: asColorList(parsed.colorScheme),
    materials,
    sizingNotes: asStringList(parsed.sizingNotes, [
      '请提供身高/胸围/腰围/臀围；默认按角色比例微调实穿松量（推测）',
    ]),
    risks: asStringList(parsed.risks, ['部分细节可能被遮挡，建议工作室对照原图二次确认']),
    toPatternMaker,
  };
}

/** 服饰鉴定：看图输出打版师可用的定制需求报告 */
export async function analyzeCostumeWithArk(imageBase64: string): Promise<ArkAnalyzeResult> {
  const apiKey = requireEnv('ARK_API_KEY');
  const model = process.env.ARK_VISION_MODEL || 'ep-20260905114204-jclfm';
  const imageUrl = normalizeImageDataUrl(imageBase64);

  const system = `你是二次元 COS 服饰解析专家，也是资深打版顾问。根据用户上传的角色图片，完成服饰拆解，并输出可直接发给打版师/定制工作室的定制需求报告。

要求：
1. 拆分：上衣、下装、外搭、内衬、领口袖口、印花刺绣、配饰（没有的写「无」或「未看清（推测）」）；
2. 给出面料、工艺建议（可执行，含材质手感/克重/定型等）；
3. 给出辅料、五金、假发等采购清单；
4. 标注看不清、需向客户确认的风险点；
5. 输出结构清晰，不要闲聊，不要 Markdown。

必须只输出一个合法 JSON 对象（不要 Markdown、不要代码围栏、不要注释）。
JSON 规范：
- 字符串一律用英文双引号；字符串内部禁止出现未转义的英文双引号，改用「」或『』；
- 换行写成 \\n；不要尾逗号；不要单引号键名。
字段如下：
{
  "summary": "一句话需求摘要",
  "parts": [{
    "name": "上衣|下装|外搭|内衬|领口袖口|印花刺绣|配饰",
    "structure": "款式与穿着层次说明",
    "details": ["结构细节"],
    "fabric": ["面料建议"],
    "craft": ["工艺建议"]
  }],
  "printsEmbroidery": ["印花/刺绣专项"],
  "accessories": ["独立配件清单"],
  "colorScheme": [{"name": "主色", "hex": "#RRGGBB"}],
  "materials": {
    "lining": ["内衬/衬料"],
    "hardware": ["拉链、扣、五金"],
    "notions": ["其它辅料"],
    "wig": ["假发/造型发，无则写无"]
  },
  "sizingNotes": ["量体与版型注意"],
  "risks": ["看不清/需确认"],
  "toPatternMaker": "发给打版师的完整说明，分点用\\n分隔"
}
每项具体可执行。看不清时合理推测并注明「推测」。`;

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请根据这张角色图，输出可直接发给打版师的 COS 定制需求报告 JSON。',
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 6000,
    response_format: { type: 'json_object' },
  };

  const controller = new AbortController();
  const timeoutMs = Number(process.env.ARK_VISION_TIMEOUT_MS || 300_000);
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
    const report = parsePatternMakerReport(parsed);
    return {
      ...flattenReport(report),
      report,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `服饰鉴定超时（>${Math.round(timeoutMs / 1000)}s）。可换更小图片，或将 ARK_VISION_MODEL 换成更快的视觉模型后重试`
      );
    }
    throw err instanceof Error ? new Error(`服饰鉴定失败：${err.message}`) : err;
  } finally {
    clearTimeout(timer);
  }
}

function mapArkGenerateError(message: string): Error {
  const msg = message.toLowerCase();
  if (
    msg.includes('copyright') ||
    msg.includes('版权') ||
    msg.includes('intellectual property') ||
    msg.includes('ip restriction')
  ) {
    return new Error(
      '生图被版权风控拦截：参考图或提示词可能涉及受保护角色/官方立绘。请去掉角色名与作品名，改用服装结构/面料/配色描述，或换原创参考图后再试'
    );
  }
  if (msg.includes('sensitive') || msg.includes('risk') || msg.includes('违规')) {
    return new Error('生图内容未通过安全审核，请修改提示词或参考图后重试');
  }
  return new Error(`火山生图失败：${message}`);
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
      throw mapArkGenerateError(msg);
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
