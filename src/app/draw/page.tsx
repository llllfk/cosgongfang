'use client';

import * as React from 'react';
import { PageShell } from '@/components/PageShell';
import { GlowCard } from '@/components/GlowCard';
import { GlowButton } from '@/components/GlowButton';
import { MagicCircle } from '@/components/MagicCircle';
import { SectionTitle } from '@/components/SectionTitle';
import { useToast } from '@/components/Toast';
import { UploadIcon, PaletteIcon, SparklesIcon } from '@/components/Icons';
import { text2img, img2img, getDrawHistory } from '@/api/mock';
import type { DrawImage } from '@/api/mock';

const STYLE_PRESETS = [
  { key: 'cel', label: '赛璐璐', color: '#FF3CAC' },
  { key: 'thick', label: '厚涂', color: '#21E6C1' },
  { key: 'watercolor', label: '水彩', color: '#FFE66D' },
  { key: 'lineart', label: '线稿', color: '#B8AAD4' },
  { key: 'realistic', label: '写实风', color: '#784BA0' },
  { key: 'chibi', label: 'Q版', color: '#FFB3D9' },
];

export default function DrawPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = React.useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = React.useState('');
  const [selectedStyle, setSelectedStyle] = React.useState('cel');
  const [refImage, setRefImage] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [images, setImages] = React.useState<DrawImage[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 加载历史mock
  React.useEffect(() => {
    getDrawHistory().then(setImages).catch(() => {});
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setRefImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('请输入提示词描述', 'error');
      return;
    }
    if (activeTab === 'image' && !refImage) {
      showToast('请上传参考图', 'error');
      return;
    }

    setGenerating(true);
    try {
      const styleLabel = STYLE_PRESETS.find((s) => s.key === selectedStyle)?.label || '赛璐璐';
      const newImg =
        activeTab === 'text'
          ? await text2img({ prompt, style: styleLabel })
          : await img2img({ imageBase64: refImage || '', prompt, style: styleLabel });

      setImages((prev) => [newImg, ...prev]);
      showToast('✨ 工坊出品完成！', 'success');
    } catch {
      showToast('生成失败，请重试', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6">
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
              onClick={() => setActiveTab('text')}
            >
              ✨ 文生图
            </button>
            <button
              className={activeTab === 'image' ? 'active' : ''}
              onClick={() => setActiveTab('image')}
            >
              🖼️ 图生图
            </button>
          </div>
        </div>

        {/* 生成区域 */}
        <GlowCard glowColor="cyan" hoverable={false} className="p-6 md:p-8 mb-8">
          {activeTab === 'image' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#B8AAD4] mb-3 ml-1">
                参考图
              </label>
              <div
                className="rounded-xl border-2 border-dashed border-[rgba(33,230,193,0.3)] bg-[rgba(13,8,32,0.4)] hover:border-[rgba(33,230,193,0.5)] cursor-pointer transition-all p-4 flex items-center justify-center"
                style={{ minHeight: 140 }}
                onClick={() => fileInputRef.current?.click()}
              >
                {refImage ? (
                  <div className="relative">
                    <img src={refImage} alt="参考图" className="max-h-32 rounded-lg" />
                    <button
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/70 text-white text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRefImage(null);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <UploadIcon size={24} className="text-[#21E6C1] mx-auto mb-2" />
                    <p className="text-sm text-[#B8AAD4]">点击上传参考图</p>
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
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-[#B8AAD4] mb-3 ml-1">
              提示词描述
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === 'text'
                  ? '描述你想要的COS服装，例如：哥特萝莉风洋装，黑色蕾丝，十字装饰，暗黑系…'
                  : '描述修改方向，例如：改成国风汉服风格，飘带，仙气…'
              }
              className="cos-glow-input w-full px-4 py-3 text-base resize-none"
              rows={4}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-[#B8AAD4] mb-3 ml-1">
              风格预设
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style.key}
                  onClick={() => setSelectedStyle(style.key)}
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
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-[#7A6B99] flex items-center gap-1.5">
              <SparklesIcon size={12} />
              <span>每次生成消耗 1 点绘梦魔力</span>
            </div>
            <GlowButton variant="primary" onClick={handleGenerate} loading={generating}>
              {generating ? '魔法阵运转中…' : '开始生成'}
            </GlowButton>
          </div>
        </GlowCard>

        {/* 出品展示区 */}
        <SectionTitle
          title="工坊出品"
          subtitle="你所有的绘梦生成记录"
          icon={<SparklesIcon size={20} className="text-[#FFE66D]" />}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {generating && (
            <GlowCard glowColor="pink" hoverable={false} className="aspect-square flex items-center justify-center">
              <MagicCircle size="sm" text="生成中…" />
            </GlowCard>
          )}

          {images.length === 0 && !generating ? (
            <div className="col-span-full">
              <GlowCard hoverable={false} className="p-12 text-center">
                <div className="text-5xl mb-4">🎨</div>
                <p className="text-[#B8AAD4]">还没有出品哦，快去绘梦吧～</p>
              </GlowCard>
            </div>
          ) : (
            images.map((img) => (
              <GlowCard
                key={img.id}
                glowColor={img.mode === 'text2img' ? 'pink' : 'cyan'}
                className="aspect-square relative overflow-hidden group"
              >
                <div className="w-full h-full bg-gradient-to-br from-[#2A1B4D] to-[#1A1033] flex items-center justify-center">
                  <div className="text-center p-4">
                    <div className="text-4xl mb-2">{img.mode === 'text2img' ? '✨' : '🖼️'}</div>
                    <p className="text-xs text-[#B8AAD4] line-clamp-2">{img.prompt}</p>
                  </div>
                </div>

                {/* 角标 */}
                <div
                  className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm"
                  style={{
                    background:
                      img.mode === 'text2img'
                        ? 'rgba(255, 60, 172, 0.8)'
                        : 'rgba(33, 230, 193, 0.8)',
                    color: img.mode === 'text2img' ? 'white' : '#0D0820',
                  }}
                >
                  工坊出品
                </div>

                {/* 悬浮遮罩 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="text-xs text-white">
                    <p className="font-medium">{img.style}</p>
                    <p className="text-[#B8AAD4] text-[10px]">{img.createdAt}</p>
                  </div>
                </div>
              </GlowCard>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
