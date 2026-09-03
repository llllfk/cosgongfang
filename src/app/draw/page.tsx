'use client';

import * as React from 'react';
import { PageShell } from '@/components/PageShell';
import { GlowCard } from '@/components/GlowCard';
import { GlowButton } from '@/components/GlowButton';
import { MagicCircle } from '@/components/MagicCircle';
import { SectionTitle } from '@/components/SectionTitle';
import { useToast } from '@/components/Toast';
import { UploadIcon, PaletteIcon, SparklesIcon } from '@/components/Icons';
import { Modal } from '@/components/Modal';
import { text2img, img2img, getDrawHistory, getQuota } from '@/api/client';
import type { DrawImage } from '@/api/client';
import { compressImageFile, compressImagesForRecord } from '@/lib/image-compress';

const STYLE_PRESETS = [
  { key: 'cel', label: '赛璐璐', color: '#FF3CAC' },
  { key: 'thick', label: '厚涂', color: '#21E6C1' },
  { key: 'watercolor', label: '水彩', color: '#FFE66D' },
  { key: 'lineart', label: '线稿', color: '#B8AAD4' },
  { key: 'realistic', label: '写实风', color: '#784BA0' },
  { key: 'chibi', label: 'Q版', color: '#FFB3D9' },
];

/** Seedream 2K 推荐像素，直接指定比例更稳 */
const ASPECT_PRESETS = [
  { key: '1:1', label: '1:1', hint: '方图', size: '2048x2048', box: 'w-5 h-5' },
  { key: '3:4', label: '3:4', hint: '竖构图', size: '1728x2304', box: 'w-4 h-5' },
  { key: '4:3', label: '4:3', hint: '横构图', size: '2304x1728', box: 'w-5 h-4' },
  { key: '9:16', label: '9:16', hint: '手机竖屏', size: '1600x2848', box: 'w-3 h-5' },
  { key: '16:9', label: '16:9', hint: '宽屏', size: '2848x1600', box: 'w-6 h-3.5' },
] as const;

const MAX_REF_IMAGES = 10;

const GEN_STAGES = [
  { after: 0, text: '魔法阵启动中，正在理解提示词…' },
  { after: 15, text: '正在绘制服装细节，请稍候…' },
  { after: 45, text: '画面精修中，通常还要一会儿…' },
  { after: 90, text: '仍在生成，Seedream 有时需要 1～2 分钟…' },
] as const;

const IMG2IMG_TEMPLATES = [
  {
    key: 'recolor',
    label: '只改配色',
    prompt:
      '保持人物姿态、构图与服装结构完全不变，仅将整体配色改为蓝色系：主色宝蓝，辅色浅蓝与银白点缀，材质光泽与层次保留。',
  },
  {
    key: 'keep-structure',
    label: '保持结构微调',
    prompt:
      '尽量保持原服装轮廓与穿着层次，仅优化面料质感与光影，细节更清晰，适合作为打版参考稿。',
  },
  {
    key: 'restyle',
    label: '换画风',
    prompt:
      '保持角色与服装设计不变，将画面改为更清晰的动画赛璐璐风格：干净描边、平涂上色、高饱和配色。',
  },
  {
    key: 'outfit',
    label: '换装改款',
    prompt:
      '保持人物姿态与身材比例，将服装改为国风汉服风格：齐胸襦裙、飘带与刺绣细节，整体仙气飘逸。',
  },
  {
    key: 'accessories',
    label: '加配件',
    prompt:
      '保持原服装主体不变，补充头饰、手套、腰封与项链等 COS 配件，风格统一，细节可执行。',
  },
] as const;

type GalleryFilter = 'all' | 'text2img' | 'img2img' | 'real' | 'demo';

function isPlaceholderImage(url?: string) {
  if (!url) return true;
  return url.startsWith('data:image/svg') || url.includes('image/svg+xml');
}

function isRealImage(url?: string) {
  if (!url) return false;
  return !isPlaceholderImage(url);
}

function friendlyDrawError(err: unknown): string {
  const raw = err instanceof Error ? err.message : '生成失败，请重试';
  const msg = raw.toLowerCase();
  if (msg.includes('魔力不足') || msg.includes('次数')) {
    return '绘梦魔力不足，请联系管理员补充后再试。';
  }
  if (msg.includes('超时') || msg.includes('timeout') || msg.includes('abort')) {
    return '生成超时了。可减少参考图数量、换小一点的图，或稍后再试（Seedream 有时需 1～2 分钟）。';
  }
  if (msg.includes('请上传参考图') || msg.includes('参考图')) {
    return '图生图需要至少一张参考图，请先上传后再生成。';
  }
  if (msg.includes('提示词')) {
    return '请先填写提示词描述。';
  }
  if (msg.includes('401') || msg.includes('登录') || msg.includes('未授权')) {
    return '登录状态失效，请重新登录后再试。';
  }
  if (msg.includes('ark') || msg.includes('火山') || msg.includes('seedream')) {
    return `生图服务异常：${raw}`;
  }
  return raw;
}

function genStatusText(elapsedSec: number) {
  let text = GEN_STAGES[0].text;
  for (const stage of GEN_STAGES) {
    if (elapsedSec >= stage.after) text = stage.text;
  }
  return text;
}

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
}

function guessExt(url: string) {
  if (url.startsWith('data:image/png')) return 'png';
  if (url.startsWith('data:image/webp')) return 'webp';
  if (url.startsWith('data:image/svg')) return 'svg';
  if (url.includes('.png')) return 'png';
  if (url.includes('.webp')) return 'webp';
  return 'jpg';
}

async function downloadImage(url: string, filename: string) {
  // data URL 可直接本地下载
  if (url.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    return;
  }

  // 外链尽量拉 blob；跨域失败则新开标签页
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export default function DrawPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = React.useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = React.useState('');
  const [selectedStyle, setSelectedStyle] = React.useState<string | null>(null);
  const [selectedAspect, setSelectedAspect] = React.useState<(typeof ASPECT_PRESETS)[number]['key']>('3:4');
  const [refImages, setRefImages] = React.useState<string[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [genElapsed, setGenElapsed] = React.useState(0);
  const [compressing, setCompressing] = React.useState(false);
  const [images, setImages] = React.useState<DrawImage[]>([]);
  const [preview, setPreview] = React.useState<DrawImage | null>(null);
  const [downloading, setDownloading] = React.useState(false);
  const [galleryFilter, setGalleryFilter] = React.useState<GalleryFilter>('all');
  const [lastError, setLastError] = React.useState<string | null>(null);
  const [drawCount, setDrawCount] = React.useState(0);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLDivElement>(null);
  const historyGenRef = React.useRef(0);
  const submittingRef = React.useRef(false);

  const syncDrawQuota = React.useCallback(() => {
    const d = localStorage.getItem('cos_draw_count');
    if (d != null) setDrawCount(Math.max(0, parseInt(d, 10) || 0));
  }, []);

  // 加载历史（避免慢请求在生图成功后把本地结果覆盖掉）
  React.useEffect(() => {
    const gen = ++historyGenRef.current;
    getDrawHistory()
      .then((items) => {
        if (gen !== historyGenRef.current) return;
        setImages(Array.isArray(items) ? items.filter((x) => x?.id) : []);
      })
      .catch(() => {});
  }, []);

  // 同步绘梦魔力
  React.useEffect(() => {
    syncDrawQuota();
    getQuota()
      .then((q) => setDrawCount(q.drawCount))
      .catch(() => syncDrawQuota());
    const onChange = () => syncDrawQuota();
    window.addEventListener('cos-quota-changed', onChange);
    return () => window.removeEventListener('cos-quota-changed', onChange);
  }, [syncDrawQuota]);

  // 生图耗时计时
  React.useEffect(() => {
    if (!generating) {
      setGenElapsed(0);
      return;
    }
    const started = Date.now();
    setGenElapsed(0);
    const timer = window.setInterval(() => {
      setGenElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [generating]);

  const readFilesAsDataUrls = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) {
      showToast('请上传图片文件', 'error');
      return;
    }
    const remain = MAX_REF_IMAGES - refImages.length;
    if (remain <= 0) {
      showToast(`最多上传 ${MAX_REF_IMAGES} 张参考图`, 'error');
      return;
    }
    const accepted = list.slice(0, remain);
    if (list.length > remain) {
      showToast(`最多 ${MAX_REF_IMAGES} 张，已添加前 ${remain} 张`, 'info');
    }

    setCompressing(true);
    try {
      const urls = await Promise.all(
        accepted.map((file) => compressImageFile(file, { maxEdge: 1536, quality: 0.82 }))
      );
      const valid = urls.filter(Boolean);
      if (valid.length) {
        setRefImages((prev) => [...prev, ...valid].slice(0, MAX_REF_IMAGES));
        showToast(`已压缩并添加 ${valid.length} 张参考图`, 'success');
      }
    } catch {
      showToast('图片压缩失败，请换一张再试', 'error');
    } finally {
      setCompressing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) readFilesAsDataUrls(e.dataTransfer.files);
  };

  const removeRefImage = (index: number) => {
    setRefImages((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearRefImages = () => {
    setRefImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (generating || submittingRef.current || compressing) return;
    if (!prompt.trim()) {
      showToast('请输入提示词描述', 'error');
      return;
    }
    if (activeTab === 'image' && refImages.length === 0) {
      showToast('请上传参考图', 'error');
      return;
    }

    // 生成前刷新额度，避免空跑火山
    let remain = drawCount;
    try {
      const q = await getQuota();
      remain = q.drawCount;
      setDrawCount(q.drawCount);
    } catch {
      syncDrawQuota();
      remain = Number(localStorage.getItem('cos_draw_count') || drawCount);
    }
    if (remain <= 0) {
      const message = '绘梦魔力不足，请联系管理员补充后再试。';
      setLastError(message);
      showToast(message, 'error');
      return;
    }

    submittingRef.current = true;
    setGenerating(true);
    setLastError(null);
    // 作废进行中的历史拉取，防止覆盖本次新作品
    historyGenRef.current += 1;
    try {
      const styleLabel =
        STYLE_PRESETS.find((s) => s.key === selectedStyle)?.label || '';
      const aspect = ASPECT_PRESETS.find((a) => a.key === selectedAspect) || ASPECT_PRESETS[1];
      const newImg =
        activeTab === 'text'
          ? await text2img({ prompt, style: styleLabel, size: aspect.size })
          : await img2img({
              imagesBase64: refImages,
              refStoreImages: await compressImagesForRecord(refImages),
              prompt,
              style: styleLabel,
              size: aspect.size,
            });

      setImages((prev) => [newImg, ...prev.filter((x) => x.id !== newImg.id)]);
      syncDrawQuota();
      showToast('✨ 工坊出品完成！', 'success');
      setPreview(newImg);
      requestAnimationFrame(() => {
        galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      const message = friendlyDrawError(err);
      setLastError(message);
      showToast(message, 'error');
      // 失败后也刷新一次额度（服务端可能未扣次）
      getQuota()
        .then((q) => setDrawCount(q.drawCount))
        .catch(() => syncDrawQuota());
      requestAnimationFrame(() => {
        galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } finally {
      submittingRef.current = false;
      setGenerating(false);
    }
  };

  const handleDownload = async (img: DrawImage) => {
    if (!img.imageUrl) {
      showToast('该作品暂无图片可下载', 'error');
      return;
    }
    if (isPlaceholderImage(img.imageUrl)) {
      showToast('这是示例占位图，不是 AI 真实出图', 'info');
    }
    setDownloading(true);
    try {
      const name = `cos-draw-${img.id.slice(0, 8)}.${guessExt(img.imageUrl)}`;
      await downloadImage(img.imageUrl, name);
      showToast('已开始下载', 'success');
    } catch {
      showToast('下载失败，请稍后重试', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const applyTemplate = (text: string) => {
    setPrompt(text);
    showToast('已填入提示词模板，可再按需修改', 'info');
  };

  const filteredImages = React.useMemo(() => {
    return images.filter((img) => {
      if (!img?.id) return false;
      if (galleryFilter === 'text2img') return img.mode === 'text2img';
      if (galleryFilter === 'img2img') return img.mode === 'img2img';
      if (galleryFilter === 'real') return isRealImage(img.imageUrl);
      if (galleryFilter === 'demo') return isPlaceholderImage(img.imageUrl);
      return true;
    });
  }, [images, galleryFilter]);

  const galleryFilters: { key: GalleryFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'text2img', label: '文生图' },
    { key: 'img2img', label: '图生图' },
    { key: 'real', label: 'AI 出品' },
    { key: 'demo', label: '示例占位' },
  ];

  const aspectButtons = (
    <div className="flex flex-wrap gap-2">
      {ASPECT_PRESETS.map((aspect) => {
        const active = selectedAspect === aspect.key;
        return (
          <button
            key={aspect.key}
            type="button"
            title={`${aspect.hint} · ${aspect.size}`}
            onClick={() => setSelectedAspect(aspect.key)}
            className={
              'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border ' +
              (active
                ? 'bg-[rgba(33,230,193,0.18)] border-[rgba(33,230,193,0.65)] text-white'
                : 'bg-[rgba(13,8,32,0.6)] border-[rgba(184,170,212,0.2)] text-[#B8AAD4] hover:border-[rgba(33,230,193,0.4)] hover:text-white')
            }
            style={active ? { boxShadow: '0 0 15px rgba(33,230,193,0.25)' } : undefined}
          >
            <span
              className={
                'inline-block rounded-[3px] border ' +
                aspect.box +
                (active ? ' border-[#21E6C1] bg-[rgba(33,230,193,0.25)]' : ' border-[#7A6B99]')
              }
            />
            <span>{aspect.label}</span>
            <span className="text-[10px] text-[#7A6B99]">{aspect.hint}</span>
          </button>
        );
      })}
    </div>
  );

  const styleButtons = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setSelectedStyle(null)}
        className={
          'px-4 py-2 rounded-full text-sm font-medium transition-all border ' +
          (selectedStyle === null
            ? 'bg-[rgba(184,170,212,0.2)] border-[rgba(184,170,212,0.6)] text-white'
            : 'bg-[rgba(13,8,32,0.6)] border-[rgba(184,170,212,0.2)] text-[#B8AAD4] hover:border-[rgba(184,170,212,0.45)] hover:text-white')
        }
      >
        不限
      </button>
      {STYLE_PRESETS.map((style) => (
        <button
          key={style.key}
          type="button"
          onClick={() =>
            setSelectedStyle((prev) => (prev === style.key ? null : style.key))
          }
          className={
            'px-4 py-2 rounded-full text-sm font-medium transition-all border ' +
            (selectedStyle === style.key
              ? 'bg-[rgba(255,60,172,0.2)] border-[rgba(255,60,172,0.6)] text-white'
              : 'bg-[rgba(13,8,32,0.6)] border-[rgba(184,170,212,0.2)] text-[#B8AAD4] hover:border-[rgba(255,60,172,0.4)] hover:text-white')
          }
          style={
            selectedStyle === style.key
              ? { boxShadow: `0 0 15px ${style.color}40`, borderColor: style.color + '99' }
              : {}
          }
        >
          {style.label}
        </button>
      ))}
    </div>
  );

  const generateBar = (
    <div className="flex flex-col gap-3">
      {drawCount <= 0 && !generating && (
        <div className="rounded-xl px-4 py-3 border border-[rgba(255,85,119,0.35)] bg-[rgba(255,85,119,0.1)] text-sm text-[#FFB3C0]">
          绘梦魔力已用完，暂时无法生成。请联系管理员补充魔力。
        </div>
      )}
      {generating && (
        <div className="rounded-xl px-4 py-3 border border-[rgba(255,60,172,0.25)] bg-[rgba(255,60,172,0.08)]">
          <p className="text-sm text-white font-medium">{genStatusText(genElapsed)}</p>
          <p className="text-xs text-[#7A6B99] mt-1">
            已等待 {formatElapsed(genElapsed)} · 预计约 1～2 分钟，请勿关闭页面
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-[rgba(13,8,32,0.6)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF3CAC] to-[#21E6C1] transition-all duration-1000"
              style={{ width: `${Math.min(92, 8 + genElapsed * 1.1)}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs text-[#7A6B99] flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5">
            <SparklesIcon size={12} />
            每次生成消耗 1 点绘梦魔力
          </span>
          <span className={drawCount <= 0 ? 'text-[#FFB3C0]' : 'text-[#21E6C1]'}>
            当前剩余：{drawCount} 点
          </span>
        </div>
        <GlowButton
          variant="primary"
          onClick={handleGenerate}
          loading={generating}
          disabled={compressing || drawCount <= 0}
        >
          {generating ? '魔法阵运转中…' : drawCount <= 0 ? '魔力不足' : '开始生成'}
        </GlowButton>
      </div>
    </div>
  );

  const refUploadZone = (
    <div className="space-y-3">
      <div
        className={
          'relative rounded-xl border-2 border-dashed overflow-hidden transition-all duration-200 cursor-pointer ' +
          (dragOver
            ? 'border-[#21E6C1] bg-[rgba(33,230,193,0.12)]'
            : 'border-[rgba(33,230,193,0.3)] bg-[rgba(13,8,32,0.4)] hover:border-[rgba(33,230,193,0.5)]')
        }
        style={{ minHeight: refImages.length ? 120 : 280 }}
        onClick={() => {
          if (compressing || generating) return;
          if (refImages.length >= MAX_REF_IMAGES) {
            showToast(`最多上传 ${MAX_REF_IMAGES} 张参考图`, 'error');
            return;
          }
          fileInputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center h-full p-6 text-center" style={{ minHeight: refImages.length ? 120 : 280 }}>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{
              background: 'rgba(33, 230, 193, 0.15)',
              border: '1px solid rgba(33, 230, 193, 0.4)',
            }}
          >
            <UploadIcon size={22} className="text-[#21E6C1]" />
          </div>
          <p className="text-white font-medium mb-1">
            {compressing
              ? '正在压缩图片…'
              : refImages.length
                ? '继续添加参考图'
                : '点击选择或拖拽上传'}
          </p>
          <p className="text-xs text-[#7A6B99]">
            自动压缩 · 支持多选 · JPG / PNG / WEBP · 最多 {MAX_REF_IMAGES} 张
          </p>
          {refImages.length > 0 && (
            <p className="text-xs text-[#21E6C1] mt-2">已选 {refImages.length} / {MAX_REF_IMAGES}</p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) readFilesAsDataUrls(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {refImages.length > 0 && (
        <div className="max-h-[280px] overflow-y-auto overscroll-contain pr-1 rounded-xl">
          <div className="grid grid-cols-2 gap-2">
            {refImages.map((src, index) => (
              <div
                key={`${index}-${src.slice(0, 32)}`}
                className="relative rounded-xl overflow-hidden border border-[rgba(33,230,193,0.25)] bg-[rgba(13,8,32,0.5)] aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`参考图 ${index + 1}`} className="w-full h-full object-cover" />
                <span className="absolute left-2 top-2 text-[10px] px-1.5 py-0.5 rounded-full bg-black/60 text-[#21E6C1]">
                  图{index + 1}
                </span>
                <button
                  type="button"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white text-xs hover:bg-black/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRefImage(index);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {refImages.length > 0 && (
        <button
          type="button"
          onClick={clearRefImages}
          className="text-xs text-[#7A6B99] hover:text-white transition-colors"
        >
          清空全部参考图
        </button>
      )}
    </div>
  );

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionTitle
          title="绘梦工坊"
          subtitle="文生图 · 图生图，生成你的COS设计稿"
          icon={<PaletteIcon size={22} className="text-[#21E6C1]" />}
        />

        {/* Tab 切换 */}
        <div className="flex justify-center mt-8 mb-8">
          <div className="cos-tab-capsule">
            <button
              className={activeTab === 'text' ? 'active' : ''}
              disabled={generating}
              onClick={() => !generating && setActiveTab('text')}
            >
              ✨ 文生图
            </button>
            <button
              className={activeTab === 'image' ? 'active' : ''}
              disabled={generating}
              onClick={() => !generating && setActiveTab('image')}
            >
              🖼️ 图生图
            </button>
          </div>
        </div>

        {/* 文生图：单栏 */}
        {activeTab === 'text' && (
          <GlowCard glowColor="cyan" hoverable={false} className="p-6 md:p-8 mb-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#B8AAD4] mb-3 ml-1">
                提示词描述
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要的COS服装，例如：哥特萝莉风洋装，黑色蕾丝，十字装饰，暗黑系…"
                className="cos-glow-input w-full px-4 py-3 text-base resize-none"
                rows={4}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#B8AAD4] mb-3 ml-1">
                图片比例
              </label>
              {aspectButtons}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#B8AAD4] mb-3 ml-1">
                风格预设<span className="text-[#7A6B99] font-normal">（可选）</span>
              </label>
              {styleButtons}
            </div>

            {generateBar}
          </GlowCard>
        )}

        {/* 图生图：左右结构 */}
        {activeTab === 'image' && (
          <div className="grid lg:grid-cols-5 gap-6 mb-8">
            <div className="lg:col-span-2">
              <GlowCard glowColor="cyan" hoverable={false} className="p-6 h-full">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <UploadIcon size={18} className="text-[#21E6C1]" />
                  参考图
                </h3>
                {refUploadZone}
              </GlowCard>
            </div>

            <div className="lg:col-span-3">
              <GlowCard glowColor="pink" hoverable={false} className="p-6 md:p-8 h-full flex flex-col">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#B8AAD4] mb-3 ml-1">
                    提示词描述
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {IMG2IMG_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => applyTemplate(tpl.prompt)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border border-[rgba(33,230,193,0.35)] text-[#7EF0DC] bg-[rgba(33,230,193,0.08)] hover:bg-[rgba(33,230,193,0.16)] transition-colors"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="可点上方模板快速填入，例如：保持服装款式与姿态不变，将整体配色改为蓝色系…"
                    className="cos-glow-input w-full px-4 py-3 text-base resize-none"
                    rows={5}
                  />
                  <p className="text-[11px] text-[#7A6B99] mt-2">
                    提示：改色/换装请写清「保持什么不变 + 要改什么」，效果更稳。
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#B8AAD4] mb-3 ml-1">
                    图片比例
                  </label>
                  {aspectButtons}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#B8AAD4] mb-3 ml-1">
                    风格预设<span className="text-[#7A6B99] font-normal">（可选）</span>
                  </label>
                  {styleButtons}
                </div>

                <div className="mt-auto">{generateBar}</div>
              </GlowCard>
            </div>
          </div>
        )}

        {/* 出品展示区 */}
        <div ref={galleryRef}>
          <SectionTitle
            title="工坊出品"
            subtitle="你所有的绘梦生成记录"
            icon={<SparklesIcon size={20} className="text-[#FFE66D]" />}
          />
        </div>

        {lastError && (
          <div className="mt-4 rounded-xl border border-[rgba(255,85,119,0.35)] bg-[rgba(255,85,119,0.1)] px-4 py-3 flex gap-3 items-start">
            <div className="flex-1 text-sm text-[#FFB3C0] whitespace-pre-wrap">{lastError}</div>
            <button
              type="button"
              className="text-[#7A6B99] hover:text-white text-sm"
              onClick={() => setLastError(null)}
            >
              关闭
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {galleryFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setGalleryFilter(f.key)}
              className={
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all ' +
                (galleryFilter === f.key
                  ? 'bg-[rgba(255,230,109,0.18)] border-[rgba(255,230,109,0.55)] text-[#FFE66D]'
                  : 'bg-[rgba(13,8,32,0.5)] border-[rgba(184,170,212,0.2)] text-[#B8AAD4] hover:text-white')
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pb-10">
          {generating && (
            <GlowCard glowColor="pink" hoverable={false} className="aspect-square flex flex-col items-center justify-center p-3">
              <MagicCircle size="sm" active text={genStatusText(genElapsed)} />
              <p className="text-[10px] text-[#7A6B99] mt-2">已等待 {formatElapsed(genElapsed)}</p>
            </GlowCard>
          )}

          {filteredImages.length === 0 && !generating ? (
            <div className="col-span-full">
              <GlowCard hoverable={false} className="p-12 text-center">
                <div className="text-5xl mb-4">🎨</div>
                <p className="text-[#B8AAD4]">
                  {images.length === 0
                    ? '还没有出品哦，快去绘梦吧～'
                    : '当前筛选下没有作品，换个筛选试试'}
                </p>
              </GlowCard>
            </div>
          ) : (
            filteredImages.map((img) => {
              const placeholder = isPlaceholderImage(img.imageUrl);
              return (
                <GlowCard
                  key={img.id}
                  glowColor={img.mode === 'text2img' ? 'pink' : 'cyan'}
                  className="aspect-square relative overflow-hidden group cursor-pointer"
                  onClick={() => setPreview(img)}
                >
                  <div className="w-full h-full bg-gradient-to-br from-[#2A1B4D] to-[#1A1033] flex items-center justify-center overflow-hidden">
                    {img.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.imageUrl} alt={img.prompt} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <div className="text-4xl mb-2">{img.mode === 'text2img' ? '✨' : '🖼️'}</div>
                        <p className="text-xs text-[#B8AAD4] line-clamp-2">{img.prompt}</p>
                      </div>
                    )}
                  </div>

                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm"
                      style={{
                        background:
                          img.mode === 'text2img'
                            ? 'rgba(255, 60, 172, 0.8)'
                            : 'rgba(33, 230, 193, 0.8)',
                        color: img.mode === 'text2img' ? 'white' : '#0D0820',
                      }}
                    >
                      {img.mode === 'img2img' ? '图生图' : '文生图'}
                    </span>
                    {placeholder && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-black/70 text-[#FFE66D] border border-[rgba(255,230,109,0.35)]">
                        示例占位
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm bg-black/50 text-white">
                    {placeholder ? '非真实出图' : 'AI 出品'}
                  </div>

                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 gap-2">
                    <div className="text-xs text-white">
                      <p className="font-medium">{img.style}</p>
                      <p className="text-[#B8AAD4] text-[10px] line-clamp-2">{img.prompt}</p>
                      <p className="text-[#7A6B99] text-[10px] mt-1">{img.createdAt}</p>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <GlowButton
                        variant="ghost"
                        size="sm"
                        className="flex-1 !py-1.5 !text-xs"
                        onClick={() => setPreview(img)}
                      >
                        预览
                      </GlowButton>
                      <GlowButton
                        variant="accent"
                        size="sm"
                        className="flex-1 !py-1.5 !text-xs"
                        disabled={!img.imageUrl}
                        onClick={() => handleDownload(img)}
                      >
                        下载
                      </GlowButton>
                    </div>
                  </div>
                </GlowCard>
              );
            })
          )}
        </div>
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="工坊出品预览"
        className="max-w-2xl"
        footer={
          <>
            <GlowButton variant="ghost" size="sm" onClick={() => setPreview(null)}>
              关闭
            </GlowButton>
            <GlowButton
              variant="primary"
              size="sm"
              loading={downloading}
              disabled={!preview?.imageUrl}
              onClick={() => preview && handleDownload(preview)}
            >
              下载图片
            </GlowButton>
          </>
        }
      >
        {preview ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2 text-xs text-[#7A6B99]">
              <span>{preview.style}</span>
              <span>·</span>
              <span>{preview.mode === 'img2img' ? '图生图' : '文生图'}</span>
              <span>·</span>
              <span>{preview.createdAt}</span>
              <span>·</span>
              <span className={isPlaceholderImage(preview.imageUrl) ? 'text-[#FFE66D]' : 'text-[#21E6C1]'}>
                {isPlaceholderImage(preview.imageUrl) ? '示例占位（非真实出图）' : 'AI 真实出品'}
              </span>
            </div>
            <p className="text-white font-medium whitespace-pre-wrap">{preview.prompt}</p>
            {isPlaceholderImage(preview.imageUrl) && (
              <p className="text-xs text-[#FFE66D] bg-[rgba(255,230,109,0.08)] border border-[rgba(255,230,109,0.25)] rounded-lg px-3 py-2">
                这是早期种子/占位图，不是火山 Seedream 生成的真实图片。请重新「开始生成」获取 AI 出品。
              </p>
            )}
            {preview.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.imageUrl}
                alt={preview.prompt}
                className="w-full max-h-[60vh] object-contain rounded-xl border border-[rgba(255,60,172,0.25)] bg-[rgba(13,8,32,0.5)]"
              />
            ) : (
              <p className="text-[#B8AAD4]">暂无预览图</p>
            )}
          </div>
        ) : null}
      </Modal>
    </PageShell>
  );
}
