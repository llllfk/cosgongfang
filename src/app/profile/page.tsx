'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { GlowCard } from '@/components/GlowCard';
import { CrystalBadge } from '@/components/CrystalBadge';
import { SectionTitle } from '@/components/SectionTitle';
import { UserIcon, GemIcon, SettingsIcon } from '@/components/Icons';

export default function ProfilePage() {
  const [user, setUser] = React.useState<{
    nickname: string;
    account: string;
    joinDate: string;
    analyzeCount: number;
    drawCount: number;
    isAdmin: boolean;
  } | null>(null);

  React.useEffect(() => {
    const u = localStorage.getItem('cos_user');
    if (u) {
      setUser(JSON.parse(u));
    } else {
      // 默认mock
      setUser({
        nickname: '星野纱织',
        account: 'hoshino',
        joinDate: '2024-03-15',
        analyzeCount: 2,
        drawCount: 2,
        isAdmin: false,
      });
    }
  }, []);

  if (!user) return null;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6">
        <SectionTitle
          title="我的角色卡"
          subtitle="你的专属工坊档案"
          icon={<UserIcon size={22} className="text-[#FF3CAC]" />}
        />

        {/* 角色卡大卡片 */}
        <div className="mt-8 mb-8">
          <GlowCard glowColor="pink" hoverable={false} className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* 头像 */}
              <div className="relative">
                <div
                  className="w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center text-5xl cos-float"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255, 60, 172, 0.3), rgba(33, 230, 193, 0.2))',
                    border: '3px solid rgba(255, 60, 172, 0.5)',
                    boxShadow: '0 0 40px rgba(255, 60, 172, 0.3)',
                  }}
                >
                  ✨
                </div>
                <div
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: 'linear-gradient(90deg, #FF3CAC, #21E6C1)',
                    color: '#0D0820',
                  }}
                >
                  Lv.1 新旅者
                </div>
              </div>

              {/* 信息 */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold cos-gradient-text mb-1">
                  {user.nickname}
                </h2>
                <p className="text-[#B8AAD4] text-sm mb-4">@{user.account}</p>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-[#B8AAD4]">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>加入工坊：{user.joinDate}</span>
                  </div>
                  {user.isAdmin && (
                    <div className="flex items-center gap-2">
                      <span>👑</span>
                      <span className="text-[#FFE66D]">工会管理员</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* 额度水晶卡 */}
        <SectionTitle title="魔力水晶" subtitle="你的剩余魔力额度" icon={<GemIcon size={20} className="text-[#FFE66D]" />} />

        <div className="grid md:grid-cols-2 gap-6 mt-6 mb-8">
          {/* 鉴定魔力 */}
          <GlowCard glowColor="pink" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="text-xl">🔮</span>
                服饰鉴定
              </h3>
              <CrystalBadge count={user.analyzeCount} variant="pink" size="md" />
            </div>
            <p className="text-sm text-[#B8AAD4] mb-4">
              上传角色图，AI 一键拆解服饰构成、面料、配色、工艺等全部细节
            </p>
            <div className="h-2 rounded-full bg-[rgba(13,8,32,0.6)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (user.analyzeCount / 10) * 100)}%`,
                  background: 'linear-gradient(90deg, #FF3CAC, #784BA0)',
                  boxShadow: '0 0 10px rgba(255, 60, 172, 0.6)',
                }}
              />
            </div>
          </GlowCard>

          {/* 绘梦魔力 */}
          <GlowCard glowColor="cyan" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="text-xl">🎨</span>
                绘梦生成
              </h3>
              <CrystalBadge count={user.drawCount} variant="cyan" size="md" />
            </div>
            <p className="text-sm text-[#B8AAD4] mb-4">
              文生图 + 图生图双模式，多种风格预设，生成你的专属COS设计稿
            </p>
            <div className="h-2 rounded-full bg-[rgba(13,8,32,0.6)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (user.drawCount / 10) * 100)}%`,
                  background: 'linear-gradient(90deg, #21E6C1, #0ABAB5)',
                  boxShadow: '0 0 10px rgba(33, 230, 193, 0.6)',
                }}
              />
            </div>
          </GlowCard>
        </div>

        {/* 其他入口 */}
        <SectionTitle title="更多操作" icon={<SettingsIcon size={20} className="text-[#B8AAD4]" />} />

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <GlowCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(255,230,109,0.15)] border border-[rgba(255,230,109,0.3)] flex items-center justify-center">
                💎
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">补充魔力</h4>
                <p className="text-xs text-[#7A6B99]">获取更多使用次数</p>
              </div>
            </div>
          </GlowCard>

          <GlowCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(255,60,172,0.15)] border border-[rgba(255,60,172,0.3)] flex items-center justify-center">
                📜
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">历史鉴定</h4>
                <p className="text-xs text-[#7A6B99]">查看鉴定记录</p>
              </div>
            </div>
          </GlowCard>

          {user.isAdmin && (
            <Link href="/admin">
              <GlowCard className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(33,230,193,0.15)] border border-[rgba(33,230,193,0.3)] flex items-center justify-center">
                    👑
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">工会大厅</h4>
                    <p className="text-xs text-[#7A6B99]">管理员专属</p>
                  </div>
                </div>
              </GlowCard>
            </Link>
          )}
        </div>
      </div>
    </PageShell>
  );
}
