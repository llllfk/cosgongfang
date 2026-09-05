import { fingerprintImage } from '@/lib/auth';
import type { ArkAnalyzeResult, PatternMakerReport } from '@/lib/ark';

/** 无视觉模型时的兜底报告（开发/降级） */
export function buildAnalyzeResult(imageBase64: string): ArkAnalyzeResult {
  const tag = fingerprintImage(imageBase64 || 'empty');
  const report: PatternMakerReport = {
    summary: `根据参考图整理的 COS 定制需求（样本 ${tag}）`,
    parts: [
      {
        name: '上衣',
        structure: '立领交叉短款外套',
        details: ['交叉门襟', '短款下摆'],
        fabric: ['暗纹提花绸缎，光泽强、垂坠好，建议 120-160g'],
        craft: ['立领加衬保形', '交叉结构注意领口贴合'],
      },
      {
        name: '下装',
        structure: '百褶及膝短裙，高腰',
        details: ['均匀百褶', '膝上约 2-3cm'],
        fabric: ['制服呢或厚雪纺，挺括，建议 180-220g'],
        craft: ['百褶定型，蒸汽处理'],
      },
      {
        name: '外搭',
        structure: '无',
        details: [],
        fabric: [],
        craft: [],
      },
      {
        name: '内衬',
        structure: '收腰修身衬裙，蕾丝领口',
        details: ['可拆卸更佳'],
        fabric: ['雪纺 + 蕾丝拼接'],
        craft: ['领口蕾丝包边'],
      },
      {
        name: '领口袖口',
        structure: '立领 + 常规袖口',
        details: ['立领交叉'],
        fabric: ['同外套面料加衬'],
        craft: ['领座定型'],
      },
      {
        name: '印花刺绣',
        structure: '无大面积印花（样本）',
        details: [],
        fabric: [],
        craft: [],
      },
      {
        name: '配饰',
        structure: '头饰与手套等',
        details: ['头顶大蝴蝶结', '蕾丝短手套', '丝带 choker'],
        fabric: [],
        craft: ['蝴蝶结内部加硬衬'],
      },
    ],
    printsEmbroidery: ['无明显大面积印花（样本）'],
    accessories: ['头顶大蝴蝶结发饰 × 1', '蕾丝短手套 × 2', '颈圈式丝带 choker × 1'],
    colorScheme: [
      { name: '酒红外套', hex: '#8B1A3B' },
      { name: '米白衬裙', hex: '#FFF5E6' },
      { name: '墨绿腰封', hex: '#2D5A3D' },
      { name: '金色镶边', hex: '#D4AF37' },
    ],
    materials: {
      lining: ['粘合衬（有纺）× 1m', '裙衬硬网纱 × 0.5m'],
      hardware: ['金属按扣 × 6', '隐形拉链 × 2（20cm + 30cm）'],
      notions: ['缝纫线配色', '腰封硬衬'],
      wig: ['按角色发色另购造型假发（可选）'],
    },
    sizingNotes: ['请提供身高/三围', '上衣后中开拉链方便穿脱', '腰封宽度建议 8-10cm'],
    risks: ['此为本地样本数据，正式环境请以识图结果为准'],
    toPatternMaker: `【定制需求摘要】样本 ${tag}\n上衣：立领交叉短款外套；内搭蕾丝衬裙；下装百褶及膝裙。\n请按配色与辅料清单打版，先做白坯确认比例。`,
  };

  return {
    costumeStructure: report.parts.map((p) => `${p.name}：${p.structure}`),
    fabricGuess: report.parts.flatMap((p) => p.fabric.map((f) => `${p.name}：${f}`)),
    colorScheme: report.colorScheme,
    accessories: report.accessories,
    materials: [
      ...report.materials.lining.map((x) => `内衬：${x}`),
      ...report.materials.hardware.map((x) => `五金：${x}`),
      ...report.materials.notions.map((x) => `辅料：${x}`),
      ...report.materials.wig.map((x) => `假发：${x}`),
    ],
    craftDifficulties: report.parts.flatMap((p) => p.craft.map((c) => `${p.name}：${c}`)),
    patternTips: [...report.sizingNotes, `给打版师：${report.toPatternMaker}`],
    report,
  };
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 生成 SVG 设计稿 data URL，作为绘梦出品真实落库内容 */
export function buildDrawImageSvg(prompt: string, style: string, mode: string): string {
  const safePrompt = escapeXml(prompt.slice(0, 120));
  const safeStyle = escapeXml(style);
  const safeMode = escapeXml(mode);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2A1B4D"/>
      <stop offset="100%" stop-color="#1A1033"/>
    </linearGradient>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FF3CAC"/>
      <stop offset="100%" stop-color="#21E6C1"/>
    </linearGradient>
  </defs>
  <rect width="768" height="768" fill="url(#g)"/>
  <text x="384" y="220" text-anchor="middle" fill="url(#t)" font-size="42" font-family="Segoe UI, sans-serif" font-weight="700">COS 绘梦出品</text>
  <text x="384" y="280" text-anchor="middle" fill="#B8AAD4" font-size="20" font-family="Segoe UI, sans-serif">${safeMode} · ${safeStyle}</text>
  <foreignObject x="80" y="320" width="608" height="280">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color:#F5F0FF;font:18px/1.6 Segoe UI,sans-serif;word-break:break-word;text-align:center;">
      ${safePrompt}
    </div>
  </foreignObject>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

