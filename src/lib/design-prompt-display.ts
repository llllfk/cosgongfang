/**
 * 设计稿落库 / 展示用文案：只保留类型标签与用户补充说明，不含系统提示词。
 */

export function formatDesignRecordPrompt(label: string, userNote?: string): string {
  const note = (userNote || '').trim();
  return note ? `[设计稿·${label}] ${note}` : `[设计稿·${label}]`;
}

/** 从已存 prompt 提取展示文案（兼容旧的长系统提示词记录） */
export function displayDrawPrompt(prompt: string, style?: string | null): string {
  const p = (prompt || '').trim();
  if (!p) return '';

  const isDesign = style === '设计稿' || p.startsWith('[设计稿·');
  if (!isDesign) return p;

  const labelMatch = p.match(/^\[设计稿·([^\]]+)\]/);
  const label = labelMatch?.[1] || '设计稿';
  const noteFromSuffix = p.match(/\n补充要求：([\s\S]+)$/)?.[1]?.trim();
  if (noteFromSuffix) return formatDesignRecordPrompt(label, noteFromSuffix);

  const afterLabel = p.replace(/^\[设计稿·[^\]]+\]\s*/, '').trim();
  // 旧记录把整段系统 prompt 存进去了
  if (
    !afterLabel ||
    afterLabel.length > 80 ||
    /根据参考图的服装设计|绝对不要出现|必须只|单品拆解设计稿|三视图合图/.test(afterLabel)
  ) {
    return formatDesignRecordPrompt(label);
  }
  return formatDesignRecordPrompt(label, afterLabel);
}

/** 详情里是否展示「提示词」区块（设计稿无用户备注时不展示长文） */
export function designUserNoteOnly(prompt: string, style?: string | null): string | null {
  const display = displayDrawPrompt(prompt, style);
  if (!(style === '设计稿' || display.startsWith('[设计稿·'))) return display || null;
  const note = display.replace(/^\[设计稿·[^\]]+\]\s*/, '').trim();
  return note || null;
}
