'use client';

import * as React from 'react';
import { PageShell } from '@/components/PageShell';
import { GlowCard } from '@/components/GlowCard';
import { GlowButton } from '@/components/GlowButton';
import { MagicCircle } from '@/components/MagicCircle';
import { SectionTitle } from '@/components/SectionTitle';
import { useToast } from '@/components/Toast';
import { UploadIcon, ShirtIcon, ScissorsIcon, PaletteIcon } from '@/components/Icons';
import type { AnalyzeResult } from '@/api/mock';
import { submitAnalyze } from '@/api/mock';

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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!imagePreview) {
      showToast('请先上传角色图片', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await submitAnalyze({ imageBase64: imagePreview });
      setResult(data);
      showToast('✨ 服饰鉴定完成！', 'success');
    } catch {
      showToast('鉴定失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6">
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
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
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
                    <p className="text-xs text-[#7A6B99]">支持 JPG / PNG / WEBP 格式</p>
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
                  disabled={!imagePreview}
                >
                  {loading ? '魔法阵运转中…' : '开始鉴定'}
                </GlowButton>
                {imagePreview && (
                  <GlowButton variant="ghost" onClick={handleReset}>
                    重置
                  </GlowButton>
                )}
              </div>

              <div className="mt-4 text-xs text-[#7A6B99] flex items-center gap-1.5">
                <span>💎</span>
                <span>每次鉴定消耗 1 点鉴定魔力</span>
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
                  <MagicCircle text="魔法阵运转中，正在解析服饰…" />
                </div>
              )}

              {!loading && !result && (
                <div className="flex flex-col items-center justify-center py-16">
                  <MagicCircle size="md" text="上传角色图后，召唤魔法阵开始鉴定" />
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
