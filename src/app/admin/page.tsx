'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { GlowCard } from '@/components/GlowCard';
import { GlowButton } from '@/components/GlowButton';
import { CrystalBadge } from '@/components/CrystalBadge';
import { SectionTitle } from '@/components/SectionTitle';
import { Modal } from '@/components/Modal';
import { GlowSelect } from '@/components/GlowSelect';
import { GlowNumberInput } from '@/components/GlowNumberInput';
import { UsageDetailBody } from '@/components/UsageDetailBody';
import { PreviewableImage } from '@/components/ImageLightbox';
import { useToast } from '@/components/Toast';
import { SettingsIcon, PlusIcon, EditIcon, UserIcon } from '@/components/Icons';
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminAdjustQuota,
  getGlobalConfig,
  updateGlobalConfig,
  adminListUsage,
} from '@/api/client';
import type { User, GlobalConfig, UsageItem } from '@/api/client';
import { sanitizeAccountInput, validateAccount } from '@/lib/account';

const USERS_PAGE_SIZE = 12;
const USAGE_PAGE_SIZE = 20;

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AdminPage() {
  const { showToast } = useToast();
  const [users, setUsers] = React.useState<User[]>([]);
  const [usersTotal, setUsersTotal] = React.useState(0);
  const [usersPage, setUsersPage] = React.useState(1);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [userSearch, setUserSearch] = React.useState('');
  const [debouncedUserQ, setDebouncedUserQ] = React.useState('');
  const [filterUsers, setFilterUsers] = React.useState<User[]>([]);
  const [config, setConfig] = React.useState<GlobalConfig | null>(null);

  // 模态框状态
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [adjusting, setAdjusting] = React.useState(false);
  const [savingConfig, setSavingConfig] = React.useState(false);
  const [tab, setTab] = React.useState<'users' | 'config' | 'usage'>('users');
  const [usage, setUsage] = React.useState<UsageItem[]>([]);
  const [usageTotal, setUsageTotal] = React.useState(0);
  const [usagePage, setUsagePage] = React.useState(1);
  const [usageLoading, setUsageLoading] = React.useState(false);
  const [usageType, setUsageType] = React.useState<'all' | 'analyze' | 'draw'>('all');
  const [usageUserId, setUsageUserId] = React.useState('');
  const [usageDetail, setUsageDetail] = React.useState<UsageItem | null>(null);

  // 表单状态
  const [createForm, setCreateForm] = React.useState({
    account: '',
    nickname: '',
    password: '',
    analyzeCount: 2,
    drawCount: 2,
  });
  const [editForm, setEditForm] = React.useState({
    account: '',
    nickname: '',
    analyzeCount: 0,
    drawCount: 0,
    status: 'active' as 'active' | 'frozen',
    password: '',
  });
  const [adjustForm, setAdjustForm] = React.useState({ delta: 5, type: 'analyze' as 'analyze' | 'draw' });
  const [configForm, setConfigForm] = React.useState({
    defaultAnalyzeCount: 2,
    defaultDrawCount: 2,
    watermarkText: '',
    wechatQrUrl: null as string | null,
    hasWechatQr: false,
  });
  const [wechatQrDraft, setWechatQrDraft] = React.useState<string | null>(null);
  const [clearWechatQr, setClearWechatQr] = React.useState(false);
  const wechatQrInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const next = userSearch.trim();
      if (next === debouncedUserQ) return;
      setDebouncedUserQ(next);
      setUsersPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [userSearch, debouncedUserQ]);

  const loadUsers = React.useCallback(
    async (opts?: { page?: number; q?: string }) => {
      const page = opts?.page ?? usersPage;
      const q = opts?.q ?? debouncedUserQ;
      setUsersLoading(true);
      try {
        const res = await adminListUsers({
          page,
          pageSize: USERS_PAGE_SIZE,
          q: q || undefined,
        });
        setUsers(res.items);
        setUsersTotal(res.total);
        const maxPage = Math.max(1, Math.ceil(res.total / res.pageSize) || 1);
        if (page > maxPage) {
          setUsersPage(maxPage);
        }
      } catch {
        setUsers([]);
        setUsersTotal(0);
      } finally {
        setUsersLoading(false);
      }
    },
    [usersPage, debouncedUserQ]
  );

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  React.useEffect(() => {
    getGlobalConfig()
      .then((c) => {
        setConfig(c);
        setConfigForm({
          defaultAnalyzeCount: c.defaultAnalyzeCount,
          defaultDrawCount: c.defaultDrawCount,
          watermarkText: c.watermarkText || '',
          wechatQrUrl: c.wechatQrUrl || null,
          hasWechatQr: !!c.hasWechatQr,
        });
        setWechatQrDraft(null);
        setClearWechatQr(false);
      })
      .catch(() => {});
  }, []);

  const loadUsage = React.useCallback(async () => {
    setUsageLoading(true);
    try {
      const res = await adminListUsage({
        type: usageType,
        userId: usageUserId || undefined,
        page: usagePage,
        pageSize: USAGE_PAGE_SIZE,
      });
      setUsage(res.items);
      setUsageTotal(res.total);
      const maxPage = Math.max(1, Math.ceil(res.total / res.pageSize) || 1);
      if (usagePage > maxPage) {
        setUsagePage(maxPage);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载使用记录失败', 'error');
      setUsage([]);
      setUsageTotal(0);
    } finally {
      setUsageLoading(false);
    }
  }, [usageType, usageUserId, usagePage, showToast]);

  React.useEffect(() => {
    if (tab === 'usage') {
      loadUsage();
      adminListUsers({ page: 1, pageSize: 100 })
        .then((res) => setFilterUsers(res.items))
        .catch(() => setFilterUsers([]));
    }
  }, [tab, loadUsage]);

  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / USERS_PAGE_SIZE) || 1);
  const usageTotalPages = Math.max(1, Math.ceil(usageTotal / USAGE_PAGE_SIZE) || 1);

  // 招募旅者
  const handleCreate = async () => {
    if (creating) return;
    if (!createForm.account || !createForm.nickname) {
      showToast('请填写账号和昵称', 'error');
      return;
    }
    try {
      validateAccount(createForm.account);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '账号格式不正确', 'error');
      return;
    }
    setCreating(true);
    try {
      await adminCreateUser({
        ...createForm,
        account: createForm.account.trim(),
      });
      setCreateModalOpen(false);
      setCreateForm({ account: '', nickname: '', password: '', analyzeCount: 2, drawCount: 2 });
      setUserSearch('');
      setDebouncedUserQ('');
      setUsersPage(1);
      await loadUsers({ page: 1, q: '' });
      showToast('✨ 新旅者已加入工坊！', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '招募失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  // 编辑角色卡
  const openEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      account: user.account,
      nickname: user.nickname,
      analyzeCount: user.analyzeCount,
      drawCount: user.drawCount,
      status: user.status,
      password: '',
    });
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (editing || !selectedUser) return;
    if (!editForm.nickname.trim()) {
      showToast('请填写昵称', 'error');
      return;
    }
    try {
      validateAccount(editForm.account);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '账号格式不正确', 'error');
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      showToast('新密码至少 6 位', 'error');
      return;
    }
    setEditing(true);
    try {
      const updated = await adminUpdateUser({
        id: selectedUser.id,
        account: editForm.account.trim(),
        nickname: editForm.nickname.trim(),
        analyzeCount: editForm.analyzeCount,
        drawCount: editForm.drawCount,
        status: editForm.status,
        ...(editForm.password.trim() ? { password: editForm.password.trim() } : {}),
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditModalOpen(false);
      showToast(
        editForm.password.trim()
          ? '✦ 角色卡已更新，密码已重置'
          : '✦ 角色卡已更新',
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setEditing(false);
    }
  };

  // 补充次数
  const openAdjust = (user: User) => {
    setSelectedUser(user);
    setAdjustForm({ delta: 5, type: 'analyze' });
    setAdjustModalOpen(true);
  };

  const handleAdjust = async () => {
    if (adjusting || !selectedUser) return;
    setAdjusting(true);
    try {
      const updated = await adminAdjustQuota(selectedUser.id, adjustForm.type, adjustForm.delta);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setAdjustModalOpen(false);
      showToast(
        `💎 已为 ${selectedUser.nickname} 补充 ${adjustForm.delta} 点${
          adjustForm.type === 'analyze' ? '鉴定' : '绘梦'
        }次数`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : '补充失败', 'error');
    } finally {
      setAdjusting(false);
    }
  };

  // 全局配置保存
  const handleConfigSave = async () => {
    if (savingConfig) return;
    setSavingConfig(true);
    try {
      const newConfig = await updateGlobalConfig({
        defaultAnalyzeCount: configForm.defaultAnalyzeCount,
        defaultDrawCount: configForm.defaultDrawCount,
        watermarkText: configForm.watermarkText,
        ...(clearWechatQr
          ? { clearWechatQr: true }
          : wechatQrDraft
            ? { wechatQrImageBase64: wechatQrDraft }
            : {}),
      });
      setConfig(newConfig);
      setConfigForm({
        defaultAnalyzeCount: newConfig.defaultAnalyzeCount,
        defaultDrawCount: newConfig.defaultDrawCount,
        watermarkText: newConfig.watermarkText || '',
        wechatQrUrl: newConfig.wechatQrUrl || null,
        hasWechatQr: !!newConfig.hasWechatQr,
      });
      setWechatQrDraft(null);
      setClearWechatQr(false);
      showToast('⚙️ 工坊法则已更新', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleWechatQrPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error');
      return;
    }
    try {
      const { compressImageFile } = await import('@/lib/image-compress');
      const dataUrl = await compressImageFile(file, { maxEdge: 1024, quality: 0.9 });
      setWechatQrDraft(dataUrl);
      setClearWechatQr(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '读取二维码失败', 'error');
    }
  };

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* 页面标题 + 返回 */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
          <SectionTitle
            title="工会大厅"
            subtitle="管理员专属空间，管理旅者与工坊法则"
            icon={<SettingsIcon size={22} className="text-[#FFE66D]" />}
          />
          <Link href="/home" className="flex-shrink-0">
            <GlowButton variant="ghost" size="sm" className="w-full sm:w-auto">
              ← 返回工坊
            </GlowButton>
          </Link>
        </div>

        <div className="flex justify-center mb-6 sm:mb-8 cos-tab-scroll px-1">
          <div className="cos-tab-capsule flex-shrink-0">
            <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
              旅者
            </button>
            <button className={tab === 'config' ? 'active' : ''} onClick={() => setTab('config')}>
              法则
            </button>
            <button className={tab === 'usage' ? 'active' : ''} onClick={() => setTab('usage')}>
              记录
            </button>
          </div>
        </div>

        {/* 用户管理区 */}
        {tab === 'users' ? (
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UserIcon size={20} className="text-[#FF3CAC]" />
                旅者名册
              </h2>
              <p className="text-sm text-[#7A6B99] mt-1">
                {debouncedUserQ
                  ? `找到 ${usersTotal} 位旅者 · 第 ${usersPage}/${usersTotalPages} 页`
                  : `共 ${usersTotal} 位旅者 · 第 ${usersPage}/${usersTotalPages} 页`}
              </p>
            </div>
            <GlowButton onClick={() => setCreateModalOpen(true)} icon={<PlusIcon size={16} />} className="w-full sm:w-auto">
              招募旅者
            </GlowButton>
          </div>

          <div className="mb-6">
            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="按昵称或账号搜索…"
              className="cos-glow-input w-full sm:max-w-sm px-4 py-2.5 text-sm"
              aria-label="按昵称或账号搜索旅者"
            />
          </div>

          {/* 角色卡网格 */}
          {usersLoading && users.length === 0 ? (
            <GlowCard hoverable={false} className="p-8 text-center">
              <p className="text-[#B8AAD4]">加载旅者名册…</p>
            </GlowCard>
          ) : users.length === 0 ? (
            <GlowCard hoverable={false} className="p-8 text-center">
              <p className="text-[#B8AAD4]">
                {usersTotal === 0 && !debouncedUserQ
                  ? '还没有旅者，去招募一位吧'
                  : '没有匹配的旅者，试试其他关键词'}
              </p>
            </GlowCard>
          ) : (
          <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-5 ${usersLoading ? 'opacity-60' : ''}`}>
            {users.map((user) => (
              <GlowCard
                key={user.id}
                glowColor={user.isAdmin ? 'yellow' : 'pink'}
                className="p-5"
              >
                <div className="flex items-start gap-4 mb-4">
                  {/* 头像 */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      background: user.isAdmin
                        ? 'linear-gradient(135deg, rgba(255, 230, 109, 0.3), rgba(255, 60, 172, 0.2))'
                        : 'linear-gradient(135deg, rgba(255, 60, 172, 0.25), rgba(33, 230, 193, 0.15))',
                      border: `2px solid ${
                        user.isAdmin ? 'rgba(255, 230, 109, 0.5)' : 'rgba(255, 60, 172, 0.4)'
                      }`,
                    }}
                  >
                    {user.isAdmin ? '👑' : '✨'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-white truncate">{user.nickname}</h3>
                      {user.status === 'frozen' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,85,119,0.2)] text-[#FF8FA0] border border-[rgba(255,85,119,0.3)]">
                          停用
                        </span>
                      )}
                      {user.isAdmin && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,230,109,0.2)] text-[#FFE66D] border border-[rgba(255,230,109,0.3)]">
                          超管
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#7A6B99]">@{user.account}</p>
                    <p className="text-xs text-[#7A6B99] mt-0.5">加入：{user.joinDate}</p>
                  </div>
                </div>

                {/* 额度显示 */}
                <div className="flex gap-2 mb-4">
                  <CrystalBadge count={user.analyzeCount} label="鉴定" variant="pink" size="sm" />
                  <CrystalBadge count={user.drawCount} label="绘梦" variant="cyan" size="sm" />
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openAdjust(user)}
                    className="flex-1 py-2 text-xs font-medium rounded-lg bg-[rgba(255,230,109,0.1)] text-[#FFE66D] border border-[rgba(255,230,109,0.3)] hover:bg-[rgba(255,230,109,0.2)] transition-colors"
                  >
                    💎 补充次数
                  </button>
                  <button
                    onClick={() => openEdit(user)}
                    className="flex-1 py-2 text-xs font-medium rounded-lg bg-[rgba(33,230,193,0.1)] text-[#7EF0DC] border border-[rgba(33,230,193,0.3)] hover:bg-[rgba(33,230,193,0.2)] transition-colors flex items-center justify-center gap-1"
                  >
                    <EditIcon size={12} />
                    编辑角色卡
                  </button>
                </div>
              </GlowCard>
            ))}
          </div>
          )}

          {usersTotalPages > 1 ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <GlowButton
                variant="ghost"
                size="sm"
                disabled={usersPage <= 1 || usersLoading}
                onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </GlowButton>
              <span className="text-sm text-[#B8AAD4]">
                {usersPage} / {usersTotalPages}
              </span>
              <GlowButton
                variant="ghost"
                size="sm"
                disabled={usersPage >= usersTotalPages || usersLoading}
                onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
              >
                下一页
              </GlowButton>
            </div>
          ) : null}
        </div>
        ) : null}

        {/* 工坊法则区 */}
        {tab === 'config' ? (
        <div>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <SettingsIcon size={20} className="text-[#21E6C1]" />
            工坊法则
            <span className="text-xs font-normal text-[#7A6B99] ml-2">全局配置</span>
          </h2>

          <GlowCard glowColor="cyan" hoverable={false} className="p-6 max-w-xl">
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-[#B8AAD4] mb-2 ml-1">
                  新旅者默认鉴定次数
                </label>
                <div className="flex items-center gap-3">
                  <GlowNumberInput
                    value={configForm.defaultAnalyzeCount}
                    onChange={(v) => setConfigForm((p) => ({ ...p, defaultAnalyzeCount: v }))}
                    min={0}
                    size="lg"
                    className="w-32"
                  />
                  <span className="text-sm text-[#B8AAD4]">次 / 新旅者</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#B8AAD4] mb-2 ml-1">
                  新旅者默认绘梦次数
                </label>
                <div className="flex items-center gap-3">
                  <GlowNumberInput
                    value={configForm.defaultDrawCount}
                    onChange={(v) => setConfigForm((p) => ({ ...p, defaultDrawCount: v }))}
                    min={0}
                    size="lg"
                    className="w-32"
                  />
                  <span className="text-sm text-[#B8AAD4]">次 / 新旅者</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#B8AAD4] mb-2 ml-1">
                  生成图水印文字
                </label>
                <input
                  type="text"
                  value={configForm.watermarkText}
                  onChange={(e) =>
                    setConfigForm((p) => ({ ...p, watermarkText: e.target.value.slice(0, 64) }))
                  }
                  placeholder="例如：大晓COS定制工坊（留空则不加水印）"
                  maxLength={64}
                  className="cos-glow-input w-full px-4 py-2.5"
                />
                <p className="text-xs text-[#7A6B99] mt-1.5 ml-1">
                  绘梦工坊与设计稿出图后，会在右下角自动叠加该文字
                </p>
              </div>

              <div>
                <label className="block text-sm text-[#B8AAD4] mb-2 ml-1">
                  补充次数 · 管理员微信二维码
                </label>
                <p className="text-xs text-[#7A6B99] mb-3 ml-1">
                  旅者在「我的角色卡 → 补充次数」中可扫码联系你
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div
                    className="w-36 h-36 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{
                      background: 'rgba(13, 8, 32, 0.6)',
                      border: '1px solid rgba(33, 230, 193, 0.35)',
                    }}
                  >
                    {clearWechatQr ? (
                      <span className="text-xs text-[#7A6B99] px-3 text-center">保存后将清除</span>
                    ) : wechatQrDraft || configForm.wechatQrUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={wechatQrDraft || configForm.wechatQrUrl || ''}
                        alt="微信二维码预览"
                        className="w-full h-full object-contain bg-white"
                      />
                    ) : (
                      <span className="text-xs text-[#7A6B99] px-3 text-center">尚未上传</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={wechatQrInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleWechatQrPick}
                    />
                    <GlowButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => wechatQrInputRef.current?.click()}
                    >
                      {wechatQrDraft || configForm.hasWechatQr ? '更换二维码' : '上传二维码'}
                    </GlowButton>
                    {(wechatQrDraft || configForm.hasWechatQr) && !clearWechatQr ? (
                      <GlowButton
                        variant="danger"
                        size="sm"
                        type="button"
                        onClick={() => {
                          setWechatQrDraft(null);
                          setClearWechatQr(true);
                        }}
                      >
                        清除二维码
                      </GlowButton>
                    ) : null}
                    {clearWechatQr ? (
                      <GlowButton
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setClearWechatQr(false)}
                      >
                        撤销清除
                      </GlowButton>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <GlowButton variant="accent" onClick={handleConfigSave} loading={savingConfig}>
                  {savingConfig ? '保存中…' : '保存法则'}
                </GlowButton>
              </div>
            </div>
          </GlowCard>
        </div>
        ) : null}

        {/* 全员使用记录 */}
        {tab === 'usage' ? (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  📜 使用记录
                </h2>
                <p className="text-sm text-[#7A6B99] mt-1">
                  查询全部旅者的鉴定 / 绘梦使用情况（共 {usageTotal} 条 · 第 {usagePage}/
                  {usageTotalPages} 页）
                </p>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <GlowSelect
                  value={usageType}
                  onChange={(v) => {
                    setUsageType(v as 'all' | 'analyze' | 'draw');
                    setUsagePage(1);
                  }}
                  options={[
                    { value: 'all', label: '全部功能' },
                    { value: 'analyze', label: '仅鉴定' },
                    { value: 'draw', label: '仅绘梦' },
                  ]}
                />
                <GlowSelect
                  value={usageUserId}
                  onChange={(v) => {
                    setUsageUserId(v);
                    setUsagePage(1);
                  }}
                  className="min-w-[180px]"
                  options={[
                    { value: '', label: '全部旅者' },
                    ...filterUsers.map((u) => ({
                      value: u.id,
                      label: `${u.nickname} (@${u.account})`,
                    })),
                  ]}
                />
                <GlowButton
                  variant="ghost"
                  size="sm"
                  loading={usageLoading}
                  onClick={loadUsage}
                >
                  刷新
                </GlowButton>
              </div>
            </div>

            {usageLoading && usage.length === 0 ? (
              <GlowCard hoverable={false} className="p-10 text-center text-[#B8AAD4]">
                记录读取中…
              </GlowCard>
            ) : usage.length === 0 ? (
              <GlowCard hoverable={false} className="p-10 text-center text-[#B8AAD4]">
                暂无匹配的使用记录
              </GlowCard>
            ) : (
              <div className={`space-y-3 ${usageLoading ? 'opacity-60' : ''}`}>
                {usage.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    className="w-full text-left"
                    onClick={() => setUsageDetail(item)}
                  >
                    <GlowCard
                      glowColor={item.type === 'analyze' ? 'pink' : 'cyan'}
                      className="p-4"
                    >
                      <div className="flex items-start gap-3">
                        {(item.type === 'analyze'
                          ? item.inputImageUrl
                          : item.imageUrl || item.refImageUrls?.[0]) ? (
                          <PreviewableImage
                            src={
                              item.type === 'analyze'
                                ? item.inputImageUrl
                                : item.imageUrl || item.refImageUrls?.[0]
                            }
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-[rgba(255,60,172,0.25)]"
                          />
                        ) : (
                          <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
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
                            <span className="font-bold text-white text-sm">
                              {item.nickname || '未知旅者'}
                            </span>
                            <span className="text-[11px] text-[#7A6B99]">
                              @{item.account}
                            </span>
                            <span className="text-[11px] text-[#7A6B99]">
                              {formatTime(item.createdAt)}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,230,109,0.12)] text-[#FFE66D] border border-[rgba(255,230,109,0.25)]">
                              {item.type === 'analyze' ? '鉴定 -1' : '绘梦 -1'}
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

            {usageTotalPages > 1 ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <GlowButton
                  variant="ghost"
                  size="sm"
                  disabled={usagePage <= 1 || usageLoading}
                  onClick={() => setUsagePage((p) => Math.max(1, p - 1))}
                >
                  上一页
                </GlowButton>
                <span className="text-sm text-[#B8AAD4]">
                  {usagePage} / {usageTotalPages}
                </span>
                <GlowButton
                  variant="ghost"
                  size="sm"
                  disabled={usagePage >= usageTotalPages || usageLoading}
                  onClick={() => setUsagePage((p) => Math.min(usageTotalPages, p + 1))}
                >
                  下一页
                </GlowButton>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 招募旅者模态框 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="招募新旅者"
        footer={
          <>
            <GlowButton variant="ghost" onClick={() => setCreateModalOpen(false)} disabled={creating}>
              取消
            </GlowButton>
            <GlowButton onClick={handleCreate} loading={creating}>
              {creating ? '招募中…' : '确认招募'}
            </GlowButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">账号</label>
            <input
              type="text"
              value={createForm.account}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, account: sanitizeAccountInput(e.target.value) }))
              }
              placeholder="仅字母或数字，如 hoshino01"
              className="cos-glow-input w-full px-4 py-2.5"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              maxLength={32}
            />
            <p className="text-xs text-[#7A6B99] mt-1.5">仅支持英文字母或数字，不能含中文和特殊字符</p>
          </div>
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">昵称</label>
            <input
              type="text"
              value={createForm.nickname}
              onChange={(e) => setCreateForm((p) => ({ ...p, nickname: e.target.value }))}
              placeholder="旅者的名字"
              className="cos-glow-input w-full px-4 py-2.5"
            />
          </div>
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">初始密码</label>
            <input
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="设置初始密码"
              className="cos-glow-input w-full px-4 py-2.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#B8AAD4] mb-2">鉴定次数</label>
              <GlowNumberInput
                value={createForm.analyzeCount}
                onChange={(v) => setCreateForm((p) => ({ ...p, analyzeCount: v }))}
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm text-[#B8AAD4] mb-2">绘梦次数</label>
              <GlowNumberInput
                value={createForm.drawCount}
                onChange={(v) => setCreateForm((p) => ({ ...p, drawCount: v }))}
                min={0}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 编辑角色卡模态框 */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="编辑角色卡"
        footer={
          <>
            <GlowButton variant="ghost" onClick={() => setEditModalOpen(false)} disabled={editing}>
              取消
            </GlowButton>
            <GlowButton variant="accent" onClick={handleEdit} loading={editing}>
              {editing ? '保存中…' : '保存修改'}
            </GlowButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">账号</label>
            <input
              type="text"
              value={editForm.account}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, account: sanitizeAccountInput(e.target.value) }))
              }
              className="cos-glow-input w-full px-4 py-2.5"
              placeholder="字母或数字，至少 6 位"
              inputMode="text"
              autoComplete="off"
            />
            <p className="text-xs text-[#7A6B99] mt-1.5">修改后旅者需用新账号登录</p>
          </div>
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">昵称</label>
            <input
              type="text"
              value={editForm.nickname}
              onChange={(e) => setEditForm((p) => ({ ...p, nickname: e.target.value }))}
              className="cos-glow-input w-full px-4 py-2.5"
              placeholder="旅者昵称"
            />
          </div>
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">
              重置密码<span className="text-[#7A6B99] font-normal">（留空则不改）</span>
            </label>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
              className="cos-glow-input w-full px-4 py-2.5"
              placeholder="至少 6 位新密码"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">账户状态</label>
            <div className="cos-tab-capsule w-full">
              <button
                type="button"
                className={'flex-1 ' + (editForm.status === 'active' ? 'active' : '')}
                onClick={() => setEditForm((p) => ({ ...p, status: 'active' }))}
              >
                正常启用
              </button>
              <button
                type="button"
                className={'flex-1 ' + (editForm.status === 'frozen' ? 'active' : '')}
                onClick={() => setEditForm((p) => ({ ...p, status: 'frozen' }))}
              >
                停用账户
              </button>
            </div>
            <p className="text-xs text-[#7A6B99] mt-2">
              停用后该旅者将无法登录工坊（不能停用自己）。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#B8AAD4] mb-2">鉴定次数</label>
              <GlowNumberInput
                value={editForm.analyzeCount}
                onChange={(v) => setEditForm((p) => ({ ...p, analyzeCount: v }))}
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm text-[#B8AAD4] mb-2">绘梦次数</label>
              <GlowNumberInput
                value={editForm.drawCount}
                onChange={(v) => setEditForm((p) => ({ ...p, drawCount: v }))}
                min={0}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 补充次数模态框 */}
      <Modal
        open={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`为 ${selectedUser?.nickname || ''} 补充次数`}
        footer={
          <>
            <GlowButton variant="ghost" onClick={() => setAdjustModalOpen(false)} disabled={adjusting}>
              取消
            </GlowButton>
            <GlowButton onClick={handleAdjust} loading={adjusting}>
              {adjusting ? '补充中…' : '确认补充'}
            </GlowButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">额度类型</label>
            <div className="cos-tab-capsule w-full">
              <button
                className={'flex-1 ' + (adjustForm.type === 'analyze' ? 'active' : '')}
                onClick={() => setAdjustForm((p) => ({ ...p, type: 'analyze' }))}
              >
                🔮 鉴定次数
              </button>
              <button
                className={'flex-1 ' + (adjustForm.type === 'draw' ? 'active' : '')}
                onClick={() => setAdjustForm((p) => ({ ...p, type: 'draw' }))}
              >
                🎨 绘梦次数
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">补充数量</label>
            <GlowNumberInput
              value={adjustForm.delta}
              onChange={(v) => setAdjustForm((p) => ({ ...p, delta: v }))}
              min={1}
              size="lg"
            />
          </div>
          <p className="text-xs text-[#7A6B99] text-center">
            当前剩余：{selectedUser ? (adjustForm.type === 'analyze' ? selectedUser.analyzeCount : selectedUser.drawCount) : 0} 次
            → 补充后：
            <span className="text-[#FFE66D] font-bold">
              {selectedUser
                ? (adjustForm.type === 'analyze'
                    ? selectedUser.analyzeCount
                    : selectedUser.drawCount) + adjustForm.delta
                : 0}{' '}
              次
            </span>
          </p>
        </div>
      </Modal>

      <Modal
        open={!!usageDetail}
        onClose={() => setUsageDetail(null)}
        title={usageDetail?.type === 'analyze' ? '鉴定使用详情' : '绘梦使用详情'}
        className="max-w-2xl"
        footer={
          <GlowButton variant="ghost" size="sm" onClick={() => setUsageDetail(null)}>
            关闭
          </GlowButton>
        }
      >
        {usageDetail ? (
          <UsageDetailBody
            item={usageDetail}
            meta={
              <p className="text-[#7A6B99]">
                {usageDetail.nickname} @{usageDetail.account} · {formatTime(usageDetail.createdAt)}
              </p>
            }
          />
        ) : null}
      </Modal>
    </PageShell>
  );
}
