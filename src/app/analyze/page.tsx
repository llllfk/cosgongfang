'use client';

import * as React from 'react';
import { PageShell } from '@/components/PageShell';
import { GlowCard } from '@/components/GlowCard';
import { GlowButton } from '@/components/GlowButton';
import { MagicCircle } from '@/components/MagicCircle';
import { SectionTitle } from '@/components/SectionTitle';
import { useToast } from '@/components/Toast';
import { UploadIcon, ShirtIcon, ScissorsIcon, PaletteIcon } from '@/components/Icons';
import type { AnalyzeResult } from '@/api/client';
import { submitAnalyze, getQuota } from '@/api/client';
import { compressImageFile, compressImageDataUrl } from '@/lib/image-compress';

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
      const message = '鉴定魔力不足，请联系管理员补充后再试。';
      setQuotaError(message);
      showToast(message, 'error');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setQuotaError(null);
    try {
      const storeImageBase64 = await compressImageDataUrl(imagePreview, {
        maxEdge: 720,
        quality: 0.7,
      });
      const data = await submitAnalyze({
        imageBase64: imagePreview,
        storeImageBase64,
      });
      setResult(data);
      if (data.imageUrl) {
        setImagePreview(data.imageUrl);
      }
      syncAnalyzeQuota();
      showToast('✨ 服饰鉴定完成！', 'success');
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

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionTitle
          title="服饰鉴定"
          subtitle="上传角色图，AI拆解服饰的全部秘密"
          icon={<ShirtIcon size={22} className="text-[#FF3CAC]" />}
        />

        <div className="grid lg:grid-cols-5 gap-6 mt-8">
          {/* 左栏：上传区 */}
          <div className="lg:col-span-2">
            <GlowCard glowColor="pink" hoverable={false} className="p-6 h-full">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <UploadIcon size={18} className="text-[#FF3CAC]" />
                上传角色图
              </h3>

              <div
                className={
                  'relative rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-200 cursor-pointer ' +
                  (dragOver
                    ? 'border-[#FF3CAC] bg-[rgba(255,60,172,0.1)]'
                    : 'border-[rgba(255,60,172,0.3)] bg-[rgba(13,8,32,0.4)] hover:border-[rgba(255,60,172,0.5)]')
                }
                style={{ minHeight: 280 }}
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
                  {loading ? '魔法阵运转中…' : analyzeCount <= 0 ? '魔力不足' : '开始鉴定'}
                </GlowButton>
                {imagePreview && (
                  <GlowButton variant="ghost" onClick={handleReset} disabled={loading}>
                    重置
                  </GlowButton>
                )}
              </div>

              {analyzeCount <= 0 && (
                <div className="mt-4 rounded-xl px-3 py-2 border border-[rgba(255,85,119,0.35)] bg-[rgba(255,85,119,0.1)] text-xs text-[#FFB3C0]">
                  鉴定魔力已用完，请联系管理员补充。
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
                  每次鉴定消耗 1 点鉴定魔力
                </span>
                <span className={analyzeCount <= 0 ? 'text-[#FFB3C0]' : 'text-[#FF3CAC]'}>
                  当前剩余：{analyzeCount} 点
                </span>
              </div>
            </GlowCard>
          </div>

          {/* 右栏：鉴定书展示区 */}
          <div className="lg:col-span-3">
            <GlowCard glowColor="cyan" hoverable={false} className="p-6 min-h-[500px]">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ScissorsIcon size={18} className="text-[#21E6C1]" />
                服饰鉴定书
              </h3>

              {loading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <MagicCircle active text="魔法阵运转中，正在解析服饰…" />
                </div>
              )}

              {!loading && !result && (
                <div className="flex flex-col items-center justify-center py-16">
                  <MagicCircle
                    size="md"
                    active={false}
                    text={
                      imagePreview
                        ? '图片已就绪，点击左侧「开始鉴定」'
                        : '上传角色图后，再点击「开始鉴定」'
                    }
                  />
                </div>
              )}

              {!loading && result && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {DIMENSIONS.map((dim) => {
                    const items = (result as any)[dim.key] as string[] | { name: string; hex: string }[];
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
                                  style={{ backgroundColor: c.hex, boxShadow: `0 0 8px ${c.hex}50` }}
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
                                <span
                                  className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      dim.color === 'pink' ? '#FF3CAC' : '#21E6C1',
                                    boxShadow:
                                      dim.color === 'pink'
                                        ? '0 0 6px #FF3CAC'
                                        : '0 0 6px #21E6C1',
                                  }}
                                />
                                <span className="leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </GlowCard>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
