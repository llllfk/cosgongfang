'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { GlowCard } from '@/components/GlowCard';
import { GlowButton } from '@/components/GlowButton';
import { MagicCircle } from '@/components/MagicCircle';
import { SectionTitle } from '@/components/SectionTitle';
import { useToast } from '@/components/Toast';
import { UploadIcon, ShirtIcon, ScissorsIcon } from '@/components/Icons';
import type { AnalyzeResult } from '@/api/client';
import { submitAnalyze, getQuota } from '@/api/client';
import { compressImageFile, compressImageDataUrl } from '@/lib/image-compress';
import {
  copyTextToClipboard,
  downloadAnalyzeReportDocx,
  formatAnalyzeReportMarkdown,
} from '@/lib/analyze-report-export';

// 7个维度配置
const DIMENSIONS = [
  { key: 'costumeStructure', label: '服装构成', icon: '👘', color: 'pink' as const },
  { key: 'fabricGuess', label: '面料推测', icon: '🧵', color: 'cyan' as const },
  { key: 'colorScheme', label: '配色方案', icon: '🎨', color: 'pink' as const, isColor: true },
  { key: 'accessories', label: '配件清单', icon: '🎀', color: 'cyan' as const },
  { key: 'materials', label: '辅料明细', icon: '📎', color: 'pink' as const },
  { key: 'craftDifficulties', label: '工艺难点', icon: '⚔️', color: 'cyan' as const },
  { key: 'patternTips', label: '打版要点', icon: '📐', color: 'pink' as const },
];

/** 鉴定加载阶段文案（按时间推进，非真实后端进度） */
const ANALYZE_LOAD_STEPS = [
  { label: '图片上传确认中…' },
  { label: '图片分析中…' },
  { label: '服饰结构拆解中…' },
  { label: '面料与工艺推断中…' },
  { label: '采购清单整理中…' },
  { label: '报告生成中…' },
  { label: '打版说明润色中…' },
  { label: '即将完成，请稍候…' },
] as const;

function AnalyzeLoadingPanel() {
  const [progress, setProgress] = React.useState(4);
  const [stepIndex, setStepIndex] = React.useState(0);

  React.useEffect(() => {
    const started = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - started) / 1000;
      // 前快后慢，长时间任务卡在 96% 附近，完成由外层关闭
      const target = Math.min(96, 100 * (1 - Math.exp(-elapsed / 55)));
      setProgress((prev) => Math.max(prev, target));
      // 约每 12～14 秒换一句，末段更慢
      const byTime = Math.min(
        ANALYZE_LOAD_STEPS.length - 1,
        Math.floor(elapsed / 12)
      );
      setStepIndex(byTime);
    };

    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, []);

  const step = ANALYZE_LOAD_STEPS[stepIndex] ?? ANALYZE_LOAD_STEPS[0];
  const pct = Math.round(progress);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 min-h-[280px] w-full px-4">
      <MagicCircle active text={step.label} />
      <div className="w-full max-w-xs mt-6 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-[#7A6B99]">
          <span>
            步骤 {stepIndex + 1}/{ANALYZE_LOAD_STEPS.length}
          </span>
          <span className="tabular-nums text-[#21E6C1]">{pct}%</span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden bg-[rgba(13,8,32,0.65)] border border-[rgba(33,230,193,0.2)]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={step.label}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #FF3CAC 0%, #21E6C1 100%)',
              boxShadow: '0 0 12px rgba(33, 230, 193, 0.45)',
            }}
          />
        </div>
        <p className="text-[11px] text-center text-[#7A6B99] leading-relaxed">
          识图与报告整理通常需要 1～3 分钟，请勿关闭页面
        </p>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  const { showToast } = useToast();
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AnalyzeResult | null>(null);
  const [analyzeCount, setAnalyzeCount] = React.useState(0);
  const [quotaError, setQuotaError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const submittingRef = React.useRef(false);

  const syncAnalyzeQuota = React.useCallback(() => {
    const a = localStorage.getItem('cos_analyze_count');
    if (a != null) setAnalyzeCount(Math.max(0, parseInt(a, 10) || 0));
  }, []);

  React.useEffect(() => {
    syncAnalyzeQuota();
    getQuota()
      .then((q) => setAnalyzeCount(q.analyzeCount))
      .catch(() => syncAnalyzeQuota());
    const onChange = () => syncAnalyzeQuota();
    window.addEventListener('cos-quota-changed', onChange);
    return () => window.removeEventListener('cos-quota-changed', onChange);
  }, [syncAnalyzeQuota]);

  const handleFile = async (file: File) => {
    if (loading) return;
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error');
      return;
    }
    try {
      const dataUrl = await compressImageFile(file, { maxEdge: 1536, quality: 0.82 });
      setImagePreview(dataUrl);
      setResult(null);
      setQuotaError(null);
    } catch {
      showToast('图片压缩失败，请换一张再试', 'error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (loading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (loading || submittingRef.current) return;
    if (!imagePreview) {
      showToast('请先上传角色图片', 'error');
      return;
    }

    let remain = analyzeCount;
    try {
      const q = await getQuota();
      remain = q.analyzeCount;
      setAnalyzeCount(q.analyzeCount);
    } catch {
      syncAnalyzeQuota();
      remain = Number(localStorage.getItem('cos_analyze_count') || analyzeCount);
    }
    if (remain <= 0) {
      const message = '鉴定次数不足，请联系管理员补充后再试。';
      setQuotaError(message);
      showToast(message, 'error');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setQuotaError(null);
    try {
      // 识图用中等分辨率即可（过大 base64 会显著拖慢 Ark）
      const [visionImage, storeImageBase64] = await Promise.all([
        compressImageDataUrl(imagePreview, { maxEdge: 1024, quality: 0.78 }),
        compressImageDataUrl(imagePreview, { maxEdge: 720, quality: 0.7 }),
      ]);
      const data = await submitAnalyze({
        imageBase64: visionImage,
        storeImageBase64,
      });
      setResult(data);
      if (data.imageUrl) {
        setImagePreview(data.imageUrl);
      }
      syncAnalyzeQuota();
      showToast('定制需求报告已生成', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '鉴定失败，请重试';
      setQuotaError(message);
      showToast(message, 'error');
      getQuota()
        .then((q) => setAnalyzeCount(q.analyzeCount))
        .catch(() => syncAnalyzeQuota());
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (loading) return;
    setImagePreview(null);
    setResult(null);
    setQuotaError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyReport = async () => {
    if (!result) return;
    try {
      const text = formatAnalyzeReportMarkdown(result);
      await copyTextToClipboard(text);
      showToast('报告已复制，可直接发给工作室', 'success');
    } catch {
      showToast('复制失败，请手动选择文本复制', 'error');
    }
  };

  const handleDownloadReport = () => {
    if (!result) return;
    const stamp = (result.createdAt || new Date().toISOString().slice(0, 10)).replace(/[^\d-]/g, '');
    downloadAnalyzeReportDocx(result, `COS定制需求报告-${stamp}.docx`);
    showToast('Word 报告已下载', 'success');
  };

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionTitle
          title="定制需求报告"
          subtitle="上传角色图，拆解服饰并生成可发给打版师的报告"
          icon={<ShirtIcon size={22} className="text-[#FF3CAC]" />}
        />

        <div className="grid lg:grid-cols-5 gap-6 mt-8 lg:items-stretch">
          {/* 左栏：上传区 */}
          <div className="lg:col-span-2 flex min-h-0">
            <GlowCard glowColor="pink" hoverable={false} className="p-6 w-full h-full flex flex-col overflow-hidden">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <UploadIcon size={18} className="text-[#FF3CAC]" />
                上传角色图
              </h3>

              <div
                className={
                  'relative rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-200 cursor-pointer flex-1 min-h-[280px] ' +
                  (dragOver
                    ? 'border-[#FF3CAC] bg-[rgba(255,60,172,0.1)]'
                    : 'border-[rgba(255,60,172,0.3)] bg-[rgba(13,8,32,0.4)] hover:border-[rgba(255,60,172,0.5)]')
                }
                onClick={() => {
                  if (loading) return;
                  fileInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!loading) setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <div className="relative w-full h-full">
                    <img
                      src={imagePreview}
                      alt="预览"
                      className="w-full h-full object-contain p-4"
                      style={{ maxHeight: 360 }}
                    />
                    <button
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white text-sm hover:bg-black/80 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{
                        background: 'rgba(255, 60, 172, 0.15)',
                        border: '1px solid rgba(255, 60, 172, 0.4)',
                      }}
                    >
                      <UploadIcon size={28} className="text-[#FF3CAC]" />
                    </div>
                    <p className="text-white font-medium mb-1">点击或拖拽上传</p>
                    <p className="text-xs text-[#7A6B99]">支持 JPG / PNG / WEBP，上传后自动压缩</p>
                    <p className="text-xs text-[#7A6B99] mt-2">建议使用全身图，鉴定效果最佳</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <GlowButton
                  variant="primary"
                  className="flex-1"
                  onClick={handleAnalyze}
                  loading={loading}
                  disabled={!imagePreview || analyzeCount <= 0}
                >
                  {loading ? '处理中…' : analyzeCount <= 0 ? '次数不足' : '开始鉴定'}
                </GlowButton>
                {imagePreview && (
                  <GlowButton variant="ghost" onClick={handleReset} disabled={loading}>
                    重置
                  </GlowButton>
                )}
              </div>

              {analyzeCount <= 0 && (
                <div className="mt-4 rounded-xl px-3 py-2 border border-[rgba(255,85,119,0.35)] bg-[rgba(255,85,119,0.1)] text-xs text-[#FFB3C0]">
                  鉴定次数已用完，请联系管理员补充。
                </div>
              )}
              {quotaError && (
                <div className="mt-3 rounded-xl px-3 py-2 border border-[rgba(255,85,119,0.35)] bg-[rgba(255,85,119,0.1)] text-xs text-[#FFB3C0] flex gap-2">
                  <span className="flex-1">{quotaError}</span>
                  <button type="button" className="text-[#7A6B99]" onClick={() => setQuotaError(null)}>
                    关闭
                  </button>
                </div>
              )}

              <div className="mt-4 text-xs text-[#7A6B99] flex flex-col gap-1">
                <span className="inline-flex items-center gap-1.5">
                  <span>💎</span>
                  每次鉴定消耗 1 点鉴定额度
                </span>
                <span className={analyzeCount <= 0 ? 'text-[#FFB3C0]' : 'text-[#FF3CAC]'}>
                  当前剩余：{analyzeCount} 点
                </span>
              </div>
            </GlowCard>
          </div>

          {/* 右栏：鉴定书展示区（限高 + 内部滚动，避免结果无限拉高） */}
          <div className="lg:col-span-3 flex min-h-0">
            <GlowCard
              glowColor="cyan"
              hoverable={false}
              className="p-6 w-full flex flex-col overflow-hidden min-h-[500px] max-h-[min(720px,calc(100dvh-200px))]"
            >
              <div className="flex items-center justify-between gap-3 mb-4 shrink-0 flex-wrap">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ScissorsIcon size={18} className="text-[#21E6C1]" />
                  定制需求报告
                </h3>
                {result && !loading ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <GlowButton variant="ghost" size="sm" onClick={handleCopyReport}>
                      复制给工作室
                    </GlowButton>
                    <GlowButton variant="accent" size="sm" onClick={handleDownloadReport}>
                      下载 Word
                    </GlowButton>
                    <Link href="/design">
                      <GlowButton variant="primary" size="sm">
                        去生成设计稿
                      </GlowButton>
                    </Link>
                  </div>
                ) : null}
              </div>

              {loading && <AnalyzeLoadingPanel />}

              {!loading && !result && (
                <div className="flex-1 flex flex-col items-center justify-center py-8 min-h-[280px]">
                  <MagicCircle
                    size="md"
                    active={false}
                    text={
                      imagePreview
                        ? '图片已就绪，点击左侧「开始鉴定」生成报告'
                        : '上传角色图后，再点击「开始鉴定」'
                    }
                  />
                </div>
              )}

              {!loading && result && (
                <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain pr-2 min-h-0">
                  {result.report ? (
                    <>
                      <div className="rounded-xl p-4 border border-[rgba(255,60,172,0.25)] bg-[rgba(255,60,172,0.08)]">
                        <p className="text-xs text-[#FFB3D9] font-semibold mb-1">需求摘要</p>
                        <p className="text-sm text-white leading-relaxed">{result.report.summary}</p>
                      </div>

                      <div className="rounded-xl p-4 border border-[rgba(33,230,193,0.2)] bg-[rgba(33,230,193,0.06)]">
                        <h4 className="font-bold text-sm text-[#7EF0DC] mb-3">一、服装拆解</h4>
                        <div className="space-y-3">
                          {result.report.parts.map((part) => (
                            <div
                              key={part.name}
                              className="rounded-lg p-3 bg-[rgba(13,8,32,0.45)] border border-[rgba(184,170,212,0.12)]"
                            >
                              <p className="text-sm font-semibold text-white mb-1">{part.name}</p>
                              <p className="text-xs text-[#B8AAD4] leading-relaxed mb-2">{part.structure}</p>
                              {part.details.length > 0 && (
                                <p className="text-xs text-[#7A6B99] mb-1">
                                  细节：{part.details.join('、')}
                                </p>
                              )}
                              {part.fabric.length > 0 && (
                                <p className="text-xs text-[#B8AAD4]">
                                  面料：{part.fabric.join('；')}
                                </p>
                              )}
                              {part.craft.length > 0 && (
                                <p className="text-xs text-[#B8AAD4] mt-0.5">
                                  工艺：{part.craft.join('；')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl p-4 border border-[rgba(255,60,172,0.2)] bg-[rgba(255,60,172,0.06)]">
                        <h4 className="font-bold text-sm text-[#FFB3D9] mb-3">二、配色</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.report.colorScheme.map((c, i) => (
                            <div
                              key={`${c.name}-${i}`}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(13,8,32,0.6)] border border-[rgba(184,170,212,0.15)]"
                            >
                              <div
                                className="w-5 h-5 rounded-full border border-white/20"
                                style={{ backgroundColor: c.hex }}
                              />
                              <span className="text-xs text-white">{c.name}</span>
                              <span className="text-xs text-[#7A6B99] font-mono">{c.hex}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl p-4 border border-[rgba(33,230,193,0.2)] bg-[rgba(33,230,193,0.06)]">
                        <h4 className="font-bold text-sm text-[#7EF0DC] mb-3">三、配件与印绣</h4>
                        <ul className="space-y-1.5 text-sm text-[#E8E0F5]">
                          {result.report.accessories.map((item, i) => (
                            <li key={`a-${i}`}>· {item}</li>
                          ))}
                          {result.report.printsEmbroidery.map((item, i) => (
                            <li key={`p-${i}`}>· {item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl p-4 border border-[rgba(255,60,172,0.2)] bg-[rgba(255,60,172,0.06)]">
                        <h4 className="font-bold text-sm text-[#FFB3D9] mb-3">四、采购清单</h4>
                        <div className="grid sm:grid-cols-2 gap-3 text-xs text-[#B8AAD4]">
                          <div>
                            <p className="text-white font-medium mb-1">内衬</p>
                            {result.report.materials.lining.map((x, i) => (
                              <p key={i}>· {x}</p>
                            ))}
                          </div>
                          <div>
                            <p className="text-white font-medium mb-1">五金</p>
                            {result.report.materials.hardware.map((x, i) => (
                              <p key={i}>· {x}</p>
                            ))}
                          </div>
                          <div>
                            <p className="text-white font-medium mb-1">辅料</p>
                            {result.report.materials.notions.map((x, i) => (
                              <p key={i}>· {x}</p>
                            ))}
                          </div>
                          <div>
                            <p className="text-white font-medium mb-1">假发</p>
                            {result.report.materials.wig.map((x, i) => (
                              <p key={i}>· {x}</p>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl p-4 border border-[rgba(33,230,193,0.2)] bg-[rgba(33,230,193,0.06)]">
                        <h4 className="font-bold text-sm text-[#7EF0DC] mb-2">五、打版注意</h4>
                        <ul className="space-y-1 text-sm text-[#E8E0F5]">
                          {result.report.sizingNotes.map((item, i) => (
                            <li key={i}>· {item}</li>
                          ))}
                        </ul>
                        {result.report.risks.length > 0 && (
                          <>
                            <h4 className="font-bold text-sm text-[#FFB3D9] mt-3 mb-2">待确认</h4>
                            <ul className="space-y-1 text-sm text-[#E8E0F5]">
                              {result.report.risks.map((item, i) => (
                                <li key={i}>· {item}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>

                      <div className="rounded-xl p-4 border border-[rgba(255,230,109,0.3)] bg-[rgba(255,230,109,0.08)]">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <h4 className="font-bold text-sm text-[#FFE66D]">发给打版师</h4>
                          <button
                            type="button"
                            className="text-xs text-[#FFE66D] hover:text-white transition-colors underline-offset-2 hover:underline"
                            onClick={async () => {
                              if (!result.report?.toPatternMaker) return;
                              try {
                                await copyTextToClipboard(result.report.toPatternMaker);
                                showToast('打版说明已复制', 'success');
                              } catch {
                                showToast('复制失败', 'error');
                              }
                            }}
                          >
                            仅复制本段
                          </button>
                        </div>
                        <pre className="text-xs text-[#E8E0F5] whitespace-pre-wrap leading-relaxed font-sans">
                          {result.report.toPatternMaker}
                        </pre>
                      </div>
                    </>
                  ) : (
                    DIMENSIONS.map((dim) => {
                      const items = (result as any)[dim.key] as
                        | string[]
                        | { name: string; hex: string }[];
                      return (
                        <div
                          key={dim.key}
                          className="rounded-xl p-4"
                          style={{
                            background:
                              dim.color === 'pink'
                                ? 'rgba(255, 60, 172, 0.06)'
                                : 'rgba(33, 230, 193, 0.06)',
                            border:
                              dim.color === 'pink'
                                ? '1px solid rgba(255, 60, 172, 0.2)'
                                : '1px solid rgba(33, 230, 193, 0.2)',
                          }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{dim.icon}</span>
                            <h4
                              className="font-bold text-sm"
                              style={{
                                color: dim.color === 'pink' ? '#FFB3D9' : '#7EF0DC',
                              }}
                            >
                              {dim.label}
                            </h4>
                          </div>
                          {dim.isColor && Array.isArray(items) ? (
                            <div className="flex flex-wrap gap-3">
                              {(items as { name: string; hex: string }[]).map((c, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(13,8,32,0.6)] border border-[rgba(184,170,212,0.15)]"
                                >
                                  <div
                                    className="w-5 h-5 rounded-full border border-white/20"
                                    style={{ backgroundColor: c.hex }}
                                  />
                                  <span className="text-xs text-white">{c.name}</span>
                                  <span className="text-xs text-[#7A6B99] font-mono">{c.hex}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              {(items as string[]).map((item, i) => (
                                <li key={i} className="flex gap-2 text-sm text-[#E8E0F5]">
                                  <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-[#FF3CAC]" />
                                  <span className="leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </GlowCard>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
