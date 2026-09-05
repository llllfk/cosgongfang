'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/PageShell';
import { GlowCard } from '@/components/GlowCard';
import { CrystalBadge } from '@/components/CrystalBadge';
import { SectionTitle } from '@/components/SectionTitle';
import { Modal } from '@/components/Modal';
import { GlowButton } from '@/components/GlowButton';
import { UsageDetailBody } from '@/components/UsageDetailBody';
import { UserIcon, GemIcon, SettingsIcon, SparklesIcon } from '@/components/Icons';
import { getCurrentUser, getMyUsage, type User, type UsageItem } from '@/api/client';

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [usage, setUsage] = React.useState<UsageItem[]>([]);
  const [loadingUsage, setLoadingUsage] = React.useState(true);
  const [filter, setFilter] = React.useState<'all' | 'analyze' | 'draw'>('all');
  const [detail, setDetail] = React.useState<UsageItem | null>(null);

  const load = React.useCallback(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => router.replace('/login'));
    setLoadingUsage(true);
    getMyUsage()
      .then(setUsage)
      .catch(() => setUsage([]))
      .finally(() => setLoadingUsage(false));
  }, [router]);

  React.useEffect(() => {
    load();
    const onChange = () => {
      const raw = localStorage.getItem('cos_user');
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {
          /* ignore */
        }
      }
      getMyUsage().then(setUsage).catch(() => {});
    };
    window.addEventListener('cos-quota-changed', onChange);
    return () => window.removeEventListener('cos-quota-changed', onChange);
  }, [load]);

  const filtered = usage.filter((item) => (filter === 'all' ? true : item.type === filter));

  if (!user) return null;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <SectionTitle
          title="我的角色卡"
          subtitle="你的专属工坊档案"
          icon={<UserIcon size={22} className="text-[#FF3CAC]" />}
        />

        <div className="mt-8 mb-8">
          <GlowCard glowColor="pink" hoverable={false} className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
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

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold cos-gradient-text mb-1">{user.nickname}</h2>
                <p className="text-[#B8AAD4] text-sm mb-4">@{user.account}</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 justify-center md:justify-start text-sm text-[#B8AAD4]">
                  <div className="inline-flex items-center gap-2 leading-none">
                    <span className="text-base leading-none" aria-hidden>
                      📅
                    </span>
                    <span className="leading-none">加入工坊：{user.joinDate}</span>
                  </div>
                  {user.isAdmin && (
                    <div className="inline-flex items-center gap-2 leading-none">
                      <span className="text-base leading-none" aria-hidden>
                        👑
                      </span>
                      <span className="text-[#FFE66D] leading-none">工会管理员</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlowCard>
        </div>

        <SectionTitle
          title="剩余额度"
          subtitle="你的剩余可用次数"
          icon={<GemIcon size={20} className="text-[#FFE66D]" />}
        />

        <div className="grid md:grid-cols-2 gap-6 mt-6 mb-10">
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

        <SectionTitle
          title="使用记录"
          subtitle="查询你自己的鉴定与绘梦使用情况"
          icon={<span className="text-xl">📜</span>}
        />

        <div className="flex justify-center mt-6 mb-6">
          <div className="cos-tab-capsule">
            {(
              [
                { key: 'all', label: '全部' },
                { key: 'analyze', label: '服饰鉴定' },
                { key: 'draw', label: '绘梦工坊' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                className={filter === tab.key ? 'active' : ''}
                onClick={() => setFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mb-10">
          {loadingUsage ? (
            <GlowCard hoverable={false} className="p-10 text-center text-[#B8AAD4]">
              记录读取中…
            </GlowCard>
          ) : filtered.length === 0 ? (
            <GlowCard hoverable={false} className="p-10 text-center">
              <div className="flex justify-center mb-3">
                <SparklesIcon size={36} className="text-[#FF3CAC]" />
              </div>
              <p className="text-[#B8AAD4]">还没有使用记录，去工坊开始创作吧</p>
            </GlowCard>
          ) : (
            <div className="space-y-4">
              {filtered.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => setDetail(item)}
                  className="w-full text-left"
                >
                  <GlowCard
                    glowColor={item.type === 'analyze' ? 'pink' : 'cyan'}
                    className="p-4 md:p-5"
                  >
                    <div className="flex items-start gap-4">
                      {(item.inputImageUrl || item.imageUrl || item.refImageUrls?.[0]) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            item.type === 'analyze'
                              ? item.inputImageUrl
                              : item.imageUrl || item.refImageUrls?.[0]
                          }
                          alt=""
                          className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-[rgba(255,60,172,0.3)]"
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{
                            background:
                              item.type === 'analyze'
                                ? 'rgba(255,60,172,0.15)'
                                : 'rgba(33,230,193,0.15)',
                            border:
                              item.type === 'analyze'
                                ? '1px solid rgba(255,60,172,0.35)'
                                : '1px solid rgba(33,230,193,0.35)',
                          }}
                        >
                          {item.type === 'analyze' ? '🔮' : '🎨'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white">
                            {item.type === 'analyze' ? '服饰鉴定' : '绘梦出品'}
                          </span>
                          <span className="text-[11px] text-[#7A6B99]">{formatTime(item.createdAt)}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,230,109,0.12)] text-[#FFE66D] border border-[rgba(255,230,109,0.25)]">
                            -1 次
                          </span>
                        </div>
                        <p className="text-sm text-[#B8AAD4] line-clamp-2">{item.summary}</p>
                        {item.detail ? (
                          <p className="text-xs text-[#7A6B99] mt-1">{item.detail}</p>
                        ) : null}
                      </div>
                    </div>
                  </GlowCard>
                </button>
              ))}
            </div>
          )}
        </div>

        <SectionTitle title="更多操作" icon={<SettingsIcon size={20} className="text-[#B8AAD4]" />} />

        <div className="grid md:grid-cols-3 gap-4 mt-6 mb-8">
          <GlowCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(255,230,109,0.15)] border border-[rgba(255,230,109,0.3)] flex items-center justify-center">
                💎
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">补充次数</h4>
                <p className="text-xs text-[#7A6B99]">联系管理员获取次数</p>
              </div>
            </div>
          </GlowCard>

          <GlowCard className="p-5" onClick={() => setFilter('all')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(255,60,172,0.15)] border border-[rgba(255,60,172,0.3)] flex items-center justify-center">
                📜
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">历史记录</h4>
                <p className="text-xs text-[#7A6B99]">共 {usage.length} 条使用记录</p>
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

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.type === 'analyze' ? '鉴定详情' : '绘梦详情'}
        className="max-w-2xl"
        footer={
          <GlowButton variant="ghost" size="sm" onClick={() => setDetail(null)}>
            关闭
          </GlowButton>
        }
      >
        {detail ? (
          <UsageDetailBody
            item={detail}
            meta={<p className="text-[#7A6B99]">{formatTime(detail.createdAt)}</p>}
          />
        ) : null}
      </Modal>
    </PageShell>
  );
}
