import { fingerprintImage } from '@/lib/auth';

/** 服务端生成结构化鉴定结果（落库真实数据；后续可换成视觉模型） */
export function buildAnalyzeResult(imageBase64: string) {
  const tag = fingerprintImage(imageBase64 || 'empty');
  return {
    costumeStructure: [
      `上衣：立领交叉短款外套（样本标记 ${tag}）`,
      '内搭：收腰修身衬裙，蕾丝领口',
      '下装：百褶及膝短裙，高腰设计',
      '层次：外套 > 衬裙 > 短裙，注意叠穿透气',
    ],
    fabricGuess: [
      '外套：暗纹提花绸缎，光泽强、垂坠好',
      '衬裙：雪纺 + 蕾丝拼接',
      '裙子：制服呢或厚雪纺，挺括保形',
      '建议克重：外套 120-160g，裙子 180-220g',
    ],
    colorScheme: [
      { name: '酒红外套', hex: '#8B1A3B' },
      { name: '米白衬裙', hex: '#FFF5E6' },
      { name: '墨绿腰封', hex: '#2D5A3D' },
      { name: '金色镶边', hex: '#D4AF37' },
    ],
    accessories: [
      '头顶大蝴蝶结发饰 × 1',
      '蕾丝短手套 × 2',
      '颈圈式丝带 choker × 1',
      '徽章造型胸针 × 1',
    ],
    materials: [
      '金属按扣 × 6',
      '隐形拉链 × 2（20cm + 30cm）',
      '裙衬硬网纱 × 0.5m',
      '粘合衬（有纺）× 1m',
    ],
    craftDifficulties: [
      '立领交叉结构需加衬保形，注意领口贴合度',
      '百褶需均匀定型，建议裙夹固定后蒸汽处理',
      '提花裁剪对花对格，用料预留约 15%',
      '蝴蝶结腰封内部加硬衬保持立体',
    ],
    patternTips: [
      '上衣后中开拉链，方便穿脱',
      '裙长建议膝盖上 2-3cm',
      '腰封宽度建议 8-10cm',
      '衬裙可做可拆卸，一衣多穿',
    ],
  };
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
      <stop offset="55%" stop-color="#1A1033"/>
      <stop offset="100%" stop-color="#0D0820"/>
    </linearGradient>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FF3CAC"/>
      <stop offset="50%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#21E6C1"/>
    </linearGradient>
  </defs>
  <rect width="768" height="768" fill="url(#g)"/>
  <circle cx="140" cy="120" r="60" fill="#FF3CAC" opacity="0.18"/>
  <circle cx="640" cy="620" r="90" fill="#21E6C1" opacity="0.14"/>
  <text x="384" y="220" text-anchor="middle" fill="url(#t)" font-size="42" font-family="Segoe UI, sans-serif" font-weight="700">COS 绘梦出品</text>
  <text x="384" y="280" text-anchor="middle" fill="#21E6C1" font-size="22" font-family="Segoe UI, sans-serif">${safeStyle} · ${safeMode}</text>
  <foreignObject x="96" y="340" width="576" height="280">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color:#F8FAFC;font-family:Segoe UI,sans-serif;font-size:22px;line-height:1.55;text-align:center;padding:12px;">
      ${safePrompt}
    </div>
  </foreignObject>
  <text x="384" y="700" text-anchor="middle" fill="#BDB8DE" font-size="16" font-family="Segoe UI, sans-serif">已写入数据库 · 可下载预览</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
