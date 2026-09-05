'use client';

import type { UsageItem } from '@/api/client';
import { PreviewableImage } from '@/components/ImageLightbox';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-wide text-[#21E6C1] uppercase mb-2">
      {children}
    </p>
  );
}

function AnalyzeOutput({ analyze }: { analyze: NonNullable<UsageItem['analyze']> }) {
  const report = analyze.report;
  if (report) {
    return (
      <div className="space-y-3">
        {report.summary ? (
          <div>
            <p className="text-[#FFE66D] font-semibold mb-1 text-sm">需求摘要</p>
            <p className="text-[#B8AAD4] text-sm leading-relaxed">{report.summary}</p>
          </div>
        ) : null}
        {report.parts?.length ? (
          <div>
            <p className="text-[#FFE66D] font-semibold mb-1.5 text-sm">服装拆解</p>
            <div className="space-y-2">
              {report.parts.map((part) => (
                <div key={part.name} className="text-sm text-[#B8AAD4]">
                  <span className="text-white font-medium">{part.name}</span>：{part.structure}
                  {part.fabric?.length ? (
                    <p className="text-xs text-[#7A6B99] mt-0.5">面料：{part.fabric.join('；')}</p>
                  ) : null}
                  {part.craft?.length ? (
                    <p className="text-xs text-[#7A6B99]">工艺：{part.craft.join('；')}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {report.toPatternMaker ? (
          <div>
            <p className="text-[#FFE66D] font-semibold mb-1 text-sm">发给打版师</p>
            <pre className="text-xs text-[#B8AAD4] whitespace-pre-wrap font-sans leading-relaxed">
              {report.toPatternMaker}
            </pre>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {analyze.colorScheme?.length ? (
        <div>
          <p className="text-[#FFE66D] font-semibold mb-1.5 text-sm">配色方案</p>
          <div className="flex flex-wrap gap-2">
            {analyze.colorScheme.map((c) => (
              <div
                key={`${c.name}-${c.hex}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,60,172,0.2)]"
              >
                <span
                  className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                  style={{ background: c.hex }}
                />
                <span className="text-xs text-[#B8AAD4]">
                  {c.name} <span className="text-[#7A6B99]">{c.hex}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {(
        [
          ['服装构成', analyze.costumeStructure],
          ['面料推测', analyze.fabricGuess],
          ['配件清单', analyze.accessories],
          ['辅料明细', analyze.materials],
          ['工艺难点', analyze.craftDifficulties],
          ['打版要点', analyze.patternTips],
        ] as const
      ).map(([label, list]) =>
        list?.length ? (
          <div key={label}>
            <p className="text-[#FFE66D] font-semibold mb-1 text-sm">{label}</p>
            <ul className="text-[#B8AAD4] space-y-0.5 text-sm">
              {list.map((line) => (
                <li key={line}>◆ {line}</li>
              ))}
            </ul>
          </div>
        ) : null
      )}
    </div>
  );
}

type Props = {
  item: UsageItem;
  /** 顶部元信息（如旅者名） */
  meta?: React.ReactNode;
};

/** 使用记录详情：分开展示当时输入与输出 */
export function UsageDetailBody({ item, meta }: Props) {
  const refs = item.refImageUrls || [];
  const hasAnalyzeInput = !!item.inputImageUrl;
  const hasAnalyzeOut = !!item.analyze;
  const hasDrawOut = !!item.imageUrl;

  return (
    <div className="space-y-4 text-sm">
      {meta}

      {/* —— 输入 —— */}
      <div>
        <SectionLabel>当时输入</SectionLabel>
        {item.type === 'analyze' ? (
          hasAnalyzeInput ? (
            <PreviewableImage
              src={item.inputImageUrl}
              alt="鉴定输入图"
              className="w-full max-h-48 object-contain rounded-xl border border-[rgba(255,60,172,0.25)] bg-[rgba(0,0,0,0.25)]"
            />
          ) : (
            <p className="text-[#7A6B99]">输入图未留存（早期记录或体积过大）</p>
          )
        ) : (
          <div className="space-y-3 rounded-xl border border-[rgba(33,230,193,0.2)] bg-[rgba(33,230,193,0.05)] p-3">
            {item.mode || item.style ? (
              <p className="text-xs text-[#7A6B99]">
                {item.style === '设计稿'
                  ? `设计稿${item.summary?.startsWith('[设计稿·') ? ` · ${item.summary.replace(/^\[设计稿·([^\]]+)\].*$/, '$1')}` : ''}`
                  : `${item.mode === 'img2img' ? '图生图' : '文生图'}${item.style ? ` · 风格：${item.style}` : ''}`}
              </p>
            ) : null}
            {item.prompt ? (
              <p className="text-white whitespace-pre-wrap leading-relaxed">{item.prompt}</p>
            ) : item.style === '设计稿' ? (
              <p className="text-[#7A6B99]">无补充说明</p>
            ) : (
              <p className="text-[#7A6B99]">无提示词</p>
            )}
            {item.mode === 'img2img' || refs.length > 0 ? (
              <div>
                <p className="text-[#FFE66D] font-semibold mb-1.5 text-sm">输入参考图</p>
                {refs.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {refs.map((src, i) => (
                      <PreviewableImage
                        key={`${i}-${src.slice(0, 24)}`}
                        src={src}
                        alt={`参考图 ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border border-[rgba(33,230,193,0.25)]"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[#7A6B99]">参考图未留存（早期记录或体积过大）</p>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* —— 输出 —— */}
      <div>
        <SectionLabel>当时输出</SectionLabel>
        {item.type === 'analyze' ? (
          hasAnalyzeOut ? (
            <div className="rounded-xl border border-[rgba(255,60,172,0.2)] bg-[rgba(255,60,172,0.05)] p-3">
              <AnalyzeOutput analyze={item.analyze!} />
            </div>
          ) : (
            <p className="text-[#7A6B99]">无鉴定结果</p>
          )
        ) : hasDrawOut ? (
          <PreviewableImage
            src={item.imageUrl}
            alt="绘梦输出"
            className="w-full max-h-[42vh] object-contain rounded-xl border border-[rgba(33,230,193,0.25)] bg-[rgba(0,0,0,0.2)]"
          />
        ) : (
          <p className="text-[#7A6B99]">输出图不可用</p>
        )}
      </div>

      {item.detail ? <p className="text-xs text-[#7A6B99]">{item.detail}</p> : null}
    </div>
  );
}
