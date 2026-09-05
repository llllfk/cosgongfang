'use client';

import * as React from 'react';
import { PageShell } from '@/components/PageShell';
import { GlowCard } from '@/components/GlowCard';
import { GlowButton } from '@/components/GlowButton';
import { MagicCircle } from '@/components/MagicCircle';
import { SectionTitle } from '@/components/SectionTitle';
import { useToast } from '@/components/Toast';
import { UploadIcon, ScissorsIcon } from '@/components/Icons';
import {
  generateDesignSheet,
  getQuota,
  type DesignView,
  type DrawImage,
} from '@/api/client';
import { compressImageFile, compressImageDataUrl } from '@/lib/image-compress';
import { cn } from '@/lib/utils';

type SheetState = {
  status: 'idle' | 'loading' | 'done' | 'error';
  image?: DrawImage;
  error?: string;
};

const MODE_META: Record<
  DesignView,
  { title: string; desc: string; idleHint: string; loadingText: string; filename: string }
> = {
  three: {
    title: '三视图',
    desc: '正 / 后 / 侧合图 · 1次',
    idleHint: '上传参考图后，生成正后侧合图',
    loadingText: '正在生成三视图合图…',
    filename: '设计稿-三视图.jpg',
  },
  parts: {
    title: '拆解稿',
    desc: '单品贴纸排版 · 1次',
    idleHint: '上传参考图后，生成单品拆解排版',
    loadingText: '正在拆解服装单品并排版…',
    filename: '设计稿-拆解稿.jpg',
  },
};

async function downloadImage(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export default function DesignPage() {
  const { showToast } = useToast();
  const [mode, setMode] = React.useState<DesignView>('three');
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [note, setNote] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [drawCount, setDrawCount] = React.useState(0);
  const [sheets, setSheets] = React.useState<Record<DesignView, SheetState>>({
    three: { status: 'idle' },
    parts: { status: 'idle' },
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const runningRef = React.useRef(false);

  const current = sheets[mode];
  const meta = MODE_META[mode];

  const syncQuota = React.useCallback(() => {
    const d = localStorage.getItem('cos_draw_count');
    if (d != null) setDrawCount(Math.max(0, parseInt(d, 10) || 0));
  }, []);

  React.useEffect(() => {
    syncQuota();
    getQuota()
      .then((q) => setDrawCount(q.drawCount))
      .catch(() => syncQuota());
    const onChange = () => syncQuota();
    window.addEventListener('cos-quota-changed', onChange);
    return () => window.removeEventListener('cos-quota-changed', onChange);
  }, [syncQuota]);

  const patchSheet = (view: DesignView, patch: Partial<SheetState>) => {
    setSheets((prev) => ({ ...prev, [view]: { ...prev[view], ...patch } }));
  };

  const handleFile = async (file: File) => {
    if (generating) return;
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error');
      return;
    }
    try {
      const dataUrl = await compressImageFile(file, { maxEdge: 1536, quality: 0.82 });
      setImagePreview(dataUrl);
      setSheets({ three: { status: 'idle' }, parts: { status: 'idle' } });
    } catch {
      showToast('图片压缩失败，请换一张再试', 'error');
    }
  };

  const handleGenerate = async (view: DesignView = mode) => {
    if (generating || runningRef.current) return;
    if (!imagePreview) {
      showToast('请先上传角色参考图', 'error');
      return;
    }

    let remain = drawCount;
    try {
      const q = await getQuota();
      remain = q.drawCount;
      setDrawCount(q.drawCount);
    } catch {
      syncQuota();
    }
    if (remain < 1) {
      showToast('绘梦次数不足，请联系管理员补充', 'error');
      return;
    }

    runningRef.current = true;
    setGenerating(true);
    patchSheet(view, { status: 'loading', error: undefined });

    try {
      const [visionImage, storeImage] = await Promise.all([
        compressImageDataUrl(imagePreview, { maxEdge: 1280, quality: 0.8 }),
        compressImageDataUrl(imagePreview, { maxEdge: 720, quality: 0.7 }),
      ]);
      const data = await generateDesignSheet({
        view,
        imageBase64: visionImage,
        storeImageBase64: storeImage,
        note: note.trim() || undefined,
        size: '2304x1728',
      });
      patchSheet(view, { status: 'done', image: data.image, error: undefined });
      syncQuota();
      showToast(`${MODE_META[view].title}已生成`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败';
      patchSheet(view, { status: 'error', error: message });
      getQuota()
        .then((q) => setDrawCount(q.drawCount))
        .catch(() => syncQuota());
      showToast(message, 'error');
    } finally {
      runningRef.current = false;
      setGenerating(false);
    }
  };

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionTitle
          title="设计稿"
          subtitle="三视图合图或单品拆解稿，各生成一张图，方便与定制工作室对齐款式"
          icon={<ScissorsIcon size={22} className="text-[#21E6C1]" />}
        />

        <div className="grid lg:grid-cols-5 gap-6 mt-8">
          <div className="lg:col-span-2">
            <GlowCard hoverable={false} className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <UploadIcon size={18} className="text-[#FF3CAC]" />
                上传角色参考图
              </h3>

              <div className="flex gap-2 mb-5">
                {(['three', 'parts'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={generating}
                    onClick={() => setMode(key)}
                    className={cn(
                      'flex-1 rounded-xl px-3 py-2.5 text-left border transition-all',
                      mode === key
                        ? 'border-[#21E6C1] bg-[rgba(33,230,193,0.12)] shadow-[0_0_16px_rgba(33,230,193,0.2)]'
                        : 'border-[rgba(184,170,212,0.2)] bg-[rgba(13,8,32,0.35)] hover:border-[rgba(33,230,193,0.35)]'
                    )}
                  >
                    <p className="text-sm font-bold text-white">{MODE_META[key].title}</p>
                    <p className="text-[11px] text-[#7A6B99] mt-0.5">{MODE_META[key].desc}</p>
                  </button>
                ))}
              </div>

              <div
                className={
                  'relative rounded-2xl border-2 border-dashed overflow-hidden transition-all cursor-pointer min-h-[260px] ' +
                  (dragOver
                    ? 'border-[#FF3CAC] bg-[rgba(255,60,172,0.1)]'
                    : 'border-[rgba(255,60,172,0.3)] bg-[rgba(13,8,32,0.4)]')
                }
                onClick={() => !generating && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!generating) setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
              >
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="参考图"
                    className="w-full h-full object-contain p-4 max-h-[320px]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[260px] p-8 text-center">
                    <UploadIcon size={28} className="text-[#FF3CAC] mb-3" />
                    <p className="text-white font-medium mb-1">点击或拖拽上传</p>
                    <p className="text-xs text-[#7A6B99]">建议全身或半身服装清晰图</p>
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

              <label className="block text-sm text-[#B8AAD4] mt-5 mb-2">补充说明（可选）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={generating}
                rows={3}
                placeholder={
                  mode === 'parts'
                    ? '例如：拆出帽子/裙/靴，贴纸白边，两套配色上下排列……'
                    : '例如：左正中后右侧，弱化五官，突出裙摆层次……'
                }
                className="cos-glow-input w-full px-4 py-3 text-sm resize-none"
              />

              <GlowButton
                className="w-full mt-5"
                loading={generating}
                disabled={!imagePreview || drawCount < 1}
                onClick={() => handleGenerate()}
              >
                {generating
                  ? meta.loadingText
                  : drawCount < 1
                    ? '次数不足'
                    : mode === 'three'
                      ? '生成三视图合图'
                      : '生成服装拆解稿'}
              </GlowButton>

              <p className="text-xs text-[#7A6B99] mt-3 leading-relaxed">
                {mode === 'three'
                  ? '三视图合成一张图，消耗 1 次绘梦额度。'
                  : '拆解稿生成一张单品排版图，消耗 1 次绘梦额度。'}
                当前剩余：<span className="text-[#21E6C1]">{drawCount}</span> 次
              </p>
            </GlowCard>
          </div>

          <div className="lg:col-span-3">
            <GlowCard hoverable={false} className="p-5 min-h-[420px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-white">{meta.title}</h4>
                  <p className="text-xs text-[#7A6B99] mt-1">
                    {mode === 'three'
                      ? '正 / 后 / 侧三个视角排在同一张图里'
                      : '单品贴纸排版，便于工作室认件与备料'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {current.status === 'error' && (
                    <button
                      type="button"
                      className="text-xs text-[#FF3CAC] hover:underline"
                      disabled={generating}
                      onClick={() => handleGenerate(mode)}
                    >
                      重试
                    </button>
                  )}
                  {current.status === 'done' && current.image?.imageUrl && (
                    <button
                      type="button"
                      className="text-xs text-[#21E6C1] hover:underline"
                      onClick={() =>
                        downloadImage(current.image!.imageUrl, meta.filename).catch(() =>
                          window.open(current.image!.imageUrl, '_blank')
                        )
                      }
                    >
                      下载
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center rounded-xl bg-[rgba(13,8,32,0.45)] border border-[rgba(184,170,212,0.12)] overflow-hidden min-h-[360px]">
                {current.status === 'idle' && (
                  <div className="px-6 text-center">
                    <MagicCircle
                      size="md"
                      active={false}
                      text={
                        imagePreview ? `图片已就绪，点击左侧生成${meta.title}` : meta.idleHint
                      }
                    />
                  </div>
                )}
                {current.status === 'loading' && (
                  <MagicCircle size="md" active text={meta.loadingText} />
                )}
                {current.status === 'error' && (
                  <p className="text-sm text-[#FFB3C0] px-6 text-center leading-relaxed">
                    {current.error || '生成失败'}
                  </p>
                )}
                {current.status === 'done' && current.image?.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.image.imageUrl}
                    alt={meta.title}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </GlowCard>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
