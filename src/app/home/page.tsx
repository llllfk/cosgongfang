'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { GlowCard } from '@/components/GlowCard';
import { GlowButton } from '@/components/GlowButton';
import { SectionTitle } from '@/components/SectionTitle';
import { CrystalBadge } from '@/components/CrystalBadge';
import { SparklesIcon, PaletteIcon, GemIcon, ShirtIcon } from '@/components/Icons';

export default function HomePage() {
  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6">
        {/* Hero 欢迎区 */}
        <section className="text-center mb-16 pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-sm font-medium"
            style={{
              background: 'rgba(255, 230, 109, 0.1)',
              border: '1px solid rgba(255, 230, 109, 0.3)',
              color: '#FFE66D',
            }}
          >
            <SparklesIcon size={14} />
            <span>欢迎回来，新旅者</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 cos-gradient-text leading-tight">
            COS魔法工坊
          </h1>
          <p className="text-lg text-[#B8AAD4] max-w-xl mx-auto">
            AI 拆解二次元服饰的秘密，绘梦生成你的专属设计稿
          </p>

          {/* 体力水晶胶囊展示 */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <CrystalBadge count={2} label="鉴定魔力" variant="pink" size="lg" />
            <CrystalBadge count={2} label="绘梦魔力" variant="cyan" size="lg" />
          </div>
        </section>

        {/* 功能入口卡片区 */}
        <section className="mb-16">
          <SectionTitle
            title="选择你的魔法"
            subtitle="两大核心能力，开启你的COS创作之旅"
            icon={<GemIcon size={22} className="text-[#FF3CAC]" />}
          />

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {/* 服饰鉴定 */}
            <Link href="/analyze">
              <GlowCard glowColor="pink" className="p-8 h-full group">
                <div className="flex items-start justify-between mb-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255, 60, 172, 0.25), rgba(255, 60, 172, 0.08))',
                      border: '1px solid rgba(255, 60, 172, 0.4)',
                      boxShadow: '0 0 20px rgba(255, 60, 172, 0.2)',
                    }}
                  >
                    <ShirtIcon size={32} className="text-[#FF3CAC]" />
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[rgba(255,60,172,0.15)] text-[#FFB3D9] border border-[rgba(255,60,172,0.3)]">
                    热门
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:cos-gradient-text transition-all">
                  服饰鉴定
                </h3>
                <p className="text-[#B8AAD4] leading-relaxed mb-6">
                  上传角色图，AI 一键拆解服饰的全部秘密。
                  服装构成、面料推测、配色方案、配件辅料、工艺难点、打版要点……
                  一份完整的服饰鉴定书，帮你从看图到上手。
                </p>
                <div className="flex items-center gap-2 text-[#FF3CAC] font-semibold group-hover:gap-3 transition-all">
                  <span>开始鉴定</span>
                  <span>→</span>
                </div>
              </GlowCard>
            </Link>

            {/* 绘梦工坊 */}
            <Link href="/draw">
              <GlowCard glowColor="cyan" className="p-8 h-full group">
                <div className="flex items-start justify-between mb-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(33, 230, 193, 0.25), rgba(33, 230, 193, 0.08))',
                      border: '1px solid rgba(33, 230, 193, 0.4)',
                      boxShadow: '0 0 20px rgba(33, 230, 193, 0.2)',
                    }}
                  >
                    <PaletteIcon size={32} className="text-[#21E6C1]" />
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[rgba(33,230,193,0.15)] text-[#7EF0DC] border border-[rgba(33,230,193,0.3)]">
                    新功能
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:cos-gradient-text transition-all">
                  绘梦工坊
                </h3>
                <p className="text-[#B8AAD4] leading-relaxed mb-6">
                  文字描述或参考图输入，AI 生成 COS 服装设计稿。
                  支持赛璐璐、厚涂、水彩等多种风格预设，
                  文生图 + 图生图双模式，让灵感落地成画。
                </p>
                <div className="flex items-center gap-2 text-[#21E6C1] font-semibold group-hover:gap-3 transition-all">
                  <span>进入工坊</span>
                  <span>→</span>
                </div>
              </GlowCard>
            </Link>
          </div>
        </section>

        {/* 新用户引导横幅 */}
        <section>
          <div
            className="relative rounded-[24px] p-8 overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 230, 109, 0.1) 0%, rgba(255, 60, 172, 0.1) 50%, rgba(33, 230, 193, 0.1) 100%)',
              border: '1px solid rgba(255, 230, 109, 0.3)',
            }}
          >
            {/* 装饰 */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFE66D]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#FF3CAC]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <span className="text-2xl">🎁</span>
                  新旅者首次降临，工坊赠礼！
                </h3>
                <p className="text-[#B8AAD4]">
                  2次服饰鉴定 + 2次绘梦生成，免费体验全部核心能力
                </p>
              </div>
              <div className="flex items-center gap-3">
                <CrystalBadge count={2} label="鉴定" variant="pink" />
                <span className="text-[#7A6B99]">+</span>
                <CrystalBadge count={2} label="绘梦" variant="cyan" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
