import type { AnalyzeResult } from '@/api/client';

function lines(title: string, items: string[]) {
  if (!items.length) return '';
  return [`### ${title}`, ...items.map((x) => `- ${x}`), ''].join('\n');
}

/** 将鉴定结果格式化为可发给工作室的 Markdown 文本（复制用） */
export function formatAnalyzeReportMarkdown(result: AnalyzeResult): string {
  const date = result.createdAt || new Date().toISOString().slice(0, 10);
  const report = result.report;

  if (report) {
    const partBlocks = report.parts
      .map((p) => {
        const chunks = [
          `#### ${p.name}`,
          p.structure,
          p.details.length ? `细节：${p.details.join('、')}` : '',
          p.fabric.length ? `面料：${p.fabric.join('；')}` : '',
          p.craft.length ? `工艺：${p.craft.join('；')}` : '',
        ].filter(Boolean);
        return chunks.join('\n');
      })
      .join('\n\n');

    const colors = report.colorScheme
      .map((c) => `- ${c.name}（${c.hex}）`)
      .join('\n');

    return [
      '# COS 定制需求报告',
      '',
      `生成日期：${date}`,
      result.id ? `报告编号：${result.id}` : '',
      '',
      '## 一、需求摘要',
      report.summary,
      '',
      '## 二、服装拆解（面料 / 工艺）',
      partBlocks,
      '',
      '## 三、配色',
      colors || '- （无）',
      '',
      '## 四、配件与印绣',
      ...report.accessories.map((x) => `- ${x}`),
      ...report.printsEmbroidery.map((x) => `- ${x}`),
      '',
      '## 五、采购清单',
      lines('内衬', report.materials.lining),
      lines('五金', report.materials.hardware),
      lines('辅料', report.materials.notions),
      lines('假发', report.materials.wig),
      '## 六、打版注意',
      ...report.sizingNotes.map((x) => `- ${x}`),
      '',
      report.risks.length
        ? ['## 七、待确认问题', ...report.risks.map((x) => `- ${x}`), ''].join('\n')
        : '',
      '## 发给打版师（可直接转发）',
      report.toPatternMaker,
      '',
      '——',
      '由 COS定制工坊 生成，请工作室对照角色参考图核对细节。',
      '',
    ]
      .filter((x) => x !== '')
      .join('\n');
  }

  // 旧 7 维兜底
  const colorLines = (result.colorScheme || []).map((c) => `- ${c.name}（${c.hex}）`);
  return [
    '# COS 定制需求报告',
    '',
    `生成日期：${date}`,
    '',
    lines('服装构成', result.costumeStructure || []),
    lines('面料推测', result.fabricGuess || []),
    '### 配色方案',
    ...(colorLines.length ? colorLines : ['- （无）']),
    '',
    lines('配件清单', result.accessories || []),
    lines('辅料明细', result.materials || []),
    lines('工艺难点', result.craftDifficulties || []),
    lines('打版要点', result.patternTips || []),
    '——',
    '由 COS定制工坊 生成，请工作室对照角色参考图核对细节。',
    '',
  ].join('\n');
}

export function downloadTextFile(filename: string, content: string, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBlobFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

/* ─── 无依赖 DOCX（OOXML + STORE zip） ─── */

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type DocBlock =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'li'; text: string }
  | { type: 'spacer' };

function buildReportBlocks(result: AnalyzeResult): DocBlock[] {
  const date = result.createdAt || new Date().toISOString().slice(0, 10);
  const report = result.report;
  const blocks: DocBlock[] = [
    { type: 'h1', text: 'COS 定制需求报告' },
    { type: 'p', text: `生成日期：${date}` },
  ];
  if (result.id) blocks.push({ type: 'p', text: `报告编号：${result.id}` });
  blocks.push({ type: 'spacer' });

  if (report) {
    blocks.push({ type: 'h2', text: '一、需求摘要' }, { type: 'p', text: report.summary }, { type: 'spacer' });
    blocks.push({ type: 'h2', text: '二、服装拆解（面料 / 工艺）' });
    for (const p of report.parts) {
      blocks.push({ type: 'h3', text: p.name });
      if (p.structure) blocks.push({ type: 'p', text: p.structure });
      if (p.details.length) blocks.push({ type: 'p', text: `细节：${p.details.join('、')}` });
      if (p.fabric.length) blocks.push({ type: 'p', text: `面料：${p.fabric.join('；')}` });
      if (p.craft.length) blocks.push({ type: 'p', text: `工艺：${p.craft.join('；')}` });
      blocks.push({ type: 'spacer' });
    }

    blocks.push({ type: 'h2', text: '三、配色' });
    if (report.colorScheme.length) {
      for (const c of report.colorScheme) {
        blocks.push({ type: 'li', text: `${c.name}（${c.hex}）` });
      }
    } else {
      blocks.push({ type: 'li', text: '（无）' });
    }
    blocks.push({ type: 'spacer' });

    blocks.push({ type: 'h2', text: '四、配件与印绣' });
    for (const x of report.accessories) blocks.push({ type: 'li', text: x });
    for (const x of report.printsEmbroidery) blocks.push({ type: 'li', text: x });
    if (!report.accessories.length && !report.printsEmbroidery.length) {
      blocks.push({ type: 'li', text: '（无）' });
    }
    blocks.push({ type: 'spacer' });

    blocks.push({ type: 'h2', text: '五、采购清单' });
    const matGroups: Array<[string, string[]]> = [
      ['内衬', report.materials.lining],
      ['五金', report.materials.hardware],
      ['辅料', report.materials.notions],
      ['假发', report.materials.wig],
    ];
    for (const [label, items] of matGroups) {
      if (!items.length) continue;
      blocks.push({ type: 'h3', text: label });
      for (const x of items) blocks.push({ type: 'li', text: x });
    }
    blocks.push({ type: 'spacer' });

    blocks.push({ type: 'h2', text: '六、打版注意' });
    for (const x of report.sizingNotes) blocks.push({ type: 'li', text: x });
    if (!report.sizingNotes.length) blocks.push({ type: 'li', text: '（无）' });
    blocks.push({ type: 'spacer' });

    if (report.risks.length) {
      blocks.push({ type: 'h2', text: '七、待确认问题' });
      for (const x of report.risks) blocks.push({ type: 'li', text: x });
      blocks.push({ type: 'spacer' });
    }

    blocks.push(
      { type: 'h2', text: '发给打版师（可直接转发）' },
      { type: 'p', text: report.toPatternMaker },
      { type: 'spacer' }
    );
  } else {
    const pushList = (title: string, items: string[]) => {
      blocks.push({ type: 'h2', text: title });
      if (items.length) for (const x of items) blocks.push({ type: 'li', text: x });
      else blocks.push({ type: 'li', text: '（无）' });
      blocks.push({ type: 'spacer' });
    };
    pushList('服装构成', result.costumeStructure || []);
    pushList('面料推测', result.fabricGuess || []);
    blocks.push({ type: 'h2', text: '配色方案' });
    const colors = result.colorScheme || [];
    if (colors.length) {
      for (const c of colors) blocks.push({ type: 'li', text: `${c.name}（${c.hex}）` });
    } else {
      blocks.push({ type: 'li', text: '（无）' });
    }
    blocks.push({ type: 'spacer' });
    pushList('配件清单', result.accessories || []);
    pushList('辅料明细', result.materials || []);
    pushList('工艺难点', result.craftDifficulties || []);
    pushList('打版要点', result.patternTips || []);
  }

  blocks.push({ type: 'p', text: '由 COS定制工坊 生成，请工作室对照角色参考图核对细节。' });
  return blocks;
}

function paragraphXml(text: string, opts?: { bold?: boolean; size?: number; indent?: boolean }): string {
  const size = opts?.size ?? 21; // half-points, 21 = 10.5pt
  const bold = opts?.bold ? '<w:b/>' : '';
  const ind = opts?.indent ? '<w:ind w:left="420"/>' : '';
  const runs = text.split(/\n/).map((line, i) => {
    const br = i > 0 ? '<w:br/>' : '';
    return `${br}<w:r><w:rPr>${bold}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei"/></w:rPr><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`;
  });
  return `<w:p><w:pPr>${ind}<w:spacing w:after="120"/></w:pPr>${runs.join('')}</w:p>`;
}

function blocksToDocumentXml(blocks: DocBlock[]): string {
  const parts = blocks.map((b) => {
    if (b.type === 'spacer') return '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>';
    if (b.type === 'h1') return paragraphXml(b.text, { bold: true, size: 36 });
    if (b.type === 'h2') return paragraphXml(b.text, { bold: true, size: 28 });
    if (b.type === 'h3') return paragraphXml(b.text, { bold: true, size: 24 });
    if (b.type === 'li') return paragraphXml(`• ${b.text}`, { size: 21, indent: true });
    return paragraphXml(b.text, { size: 21 });
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${parts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

/** CRC-32（ZIP 所需） */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = (n >>> 16) & 0xff;
  b[3] = (n >>> 24) & 0xff;
  return b;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/** 生成未压缩 ZIP（STORE），兼容 Word / WPS */
function zipStore(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    const local = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      file.data,
    ]);
    localParts.push(local);

    const central = concatBytes([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    centralParts.push(central);
    offset += local.length;
  }

  const centralDir = concatBytes(centralParts);
  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return concatBytes([...localParts, centralDir, end]);
}

/** 将鉴定结果打包为 Word .docx Blob */
export function buildAnalyzeReportDocx(result: AnalyzeResult): Blob {
  const encoder = new TextEncoder();
  const documentXml = blocksToDocumentXml(buildReportBlocks(result));
  const zip = zipStore([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: encoder.encode(ROOT_RELS) },
    { name: 'word/document.xml', data: encoder.encode(documentXml) },
    { name: 'word/_rels/document.xml.rels', data: encoder.encode(DOC_RELS) },
  ]);
  return new Blob([zip], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export function downloadAnalyzeReportDocx(result: AnalyzeResult, filename: string) {
  downloadBlobFile(filename, buildAnalyzeReportDocx(result));
}
