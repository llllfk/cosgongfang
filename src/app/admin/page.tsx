'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { GlowCard } from '@/components/GlowCard';
import { GlowButton } from '@/components/GlowButton';
import { CrystalBadge } from '@/components/CrystalBadge';
import { SectionTitle } from '@/components/SectionTitle';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { SettingsIcon, PlusIcon, EditIcon, UserIcon } from '@/components/Icons';
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminAdjustQuota,
  getGlobalConfig,
  updateGlobalConfig,
} from '@/api/mock';
import type { User, GlobalConfig } from '@/api/mock';

export default function AdminPage() {
  const { showToast } = useToast();
  const [users, setUsers] = React.useState<User[]>([]);
  const [config, setConfig] = React.useState<GlobalConfig | null>(null);

  // 模态框状态
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // 表单状态
  const [createForm, setCreateForm] = React.useState({
    account: '',
    nickname: '',
    password: '',
    analyzeCount: 2,
    drawCount: 2,
  });
  const [editForm, setEditForm] = React.useState({ nickname: '', analyzeCount: 0, drawCount: 0 });
  const [adjustForm, setAdjustForm] = React.useState({ delta: 5, type: 'analyze' as 'analyze' | 'draw' });
  const [configForm, setConfigForm] = React.useState({ defaultAnalyzeCount: 2, defaultDrawCount: 2 });

  // 加载数据
  React.useEffect(() => {
    adminListUsers().then(setUsers);
    getGlobalConfig().then((c) => {
      setConfig(c);
      setConfigForm(c);
    });
  }, []);

  // 招募旅者
  const handleCreate = async () => {
    if (!createForm.account || !createForm.nickname) {
      showToast('请填写账号和昵称', 'error');
      return;
    }
    const newUser = await adminCreateUser(createForm);
    setUsers((prev) => [...prev, newUser]);
    setCreateModalOpen(false);
    setCreateForm({ account: '', nickname: '', password: '', analyzeCount: 2, drawCount: 2 });
    showToast('✨ 新旅者已加入工坊！', 'success');
  };

  // 编辑角色卡
  const openEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      nickname: user.nickname,
      analyzeCount: user.analyzeCount,
      drawCount: user.drawCount,
    });
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    const updated = await adminUpdateUser({
      id: selectedUser.id,
      nickname: editForm.nickname,
      analyzeCount: editForm.analyzeCount,
      drawCount: editForm.drawCount,
    });
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setEditModalOpen(false);
    showToast('✦ 角色卡已更新', 'success');
  };

  // 补充魔力
  const openAdjust = (user: User) => {
    setSelectedUser(user);
    setAdjustForm({ delta: 5, type: 'analyze' });
    setAdjustModalOpen(true);
  };

  const handleAdjust = async () => {
    if (!selectedUser) return;
    const updated = await adminAdjustQuota(selectedUser.id, adjustForm.type, adjustForm.delta);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setAdjustModalOpen(false);
    showToast(
      `💎 已为 ${selectedUser.nickname} 补充 ${adjustForm.delta} 点${
        adjustForm.type === 'analyze' ? '鉴定' : '绘梦'
      }魔力`,
      'success'
    );
  };

  // 全局配置保存
  const handleConfigSave = async () => {
    const newConfig = await updateGlobalConfig(configForm);
    setConfig(newConfig);
    showToast('⚙️ 工坊法则已更新', 'success');
  };

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6">
        {/* 页面标题 + 返回 */}
        <div className="flex items-center justify-between mb-8">
          <SectionTitle
            title="工会大厅"
            subtitle="管理员专属空间，管理旅者与工坊法则"
            icon={<SettingsIcon size={22} className="text-[#FFE66D]" />}
          />
          <Link href="/home">
            <GlowButton variant="ghost" size="sm">
              ← 返回工坊
            </GlowButton>
          </Link>
        </div>

        {/* 用户管理区 */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UserIcon size={20} className="text-[#FF3CAC]" />
                旅者名册
              </h2>
              <p className="text-sm text-[#7A6B99] mt-1">共 {users.length} 位旅者</p>
            </div>
            <GlowButton onClick={() => setCreateModalOpen(true)} icon={<PlusIcon size={16} />}>
              招募旅者
            </GlowButton>
          </div>

          {/* 角色卡网格 */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                          冻结
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

                {/* 魔力显示 */}
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
                    💎 补充魔力
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
        </div>

        {/* 工坊法则区 */}
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
                  <input
                    type="number"
                    value={configForm.defaultAnalyzeCount}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        defaultAnalyzeCount: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="cos-glow-input w-32 px-4 py-2.5 text-center font-bold text-lg"
                    min={0}
                  />
                  <span className="text-sm text-[#B8AAD4]">次 / 新旅者</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#B8AAD4] mb-2 ml-1">
                  新旅者默认绘梦次数
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={configForm.defaultDrawCount}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        defaultDrawCount: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="cos-glow-input w-32 px-4 py-2.5 text-center font-bold text-lg"
                    min={0}
                  />
                  <span className="text-sm text-[#B8AAD4]">次 / 新旅者</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <GlowButton variant="accent" onClick={handleConfigSave}>
                  保存法则
                </GlowButton>
              </div>
            </div>
          </GlowCard>
        </div>
      </div>

      {/* 招募旅者模态框 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="招募新旅者"
        footer={
          <>
            <GlowButton variant="ghost" onClick={() => setCreateModalOpen(false)}>
              取消
            </GlowButton>
            <GlowButton onClick={handleCreate}>确认招募</GlowButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">账号</label>
            <input
              type="text"
              value={createForm.account}
              onChange={(e) => setCreateForm((p) => ({ ...p, account: e.target.value }))}
              placeholder="输入登录账号"
              className="cos-glow-input w-full px-4 py-2.5"
            />
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
              <input
                type="number"
                value={createForm.analyzeCount}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    analyzeCount: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                className="cos-glow-input w-full px-4 py-2.5 text-center"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm text-[#B8AAD4] mb-2">绘梦次数</label>
              <input
                type="number"
                value={createForm.drawCount}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    drawCount: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                className="cos-glow-input w-full px-4 py-2.5 text-center"
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
            <GlowButton variant="ghost" onClick={() => setEditModalOpen(false)}>
              取消
            </GlowButton>
            <GlowButton variant="accent" onClick={handleEdit}>
              保存修改
            </GlowButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">昵称</label>
            <input
              type="text"
              value={editForm.nickname}
              onChange={(e) => setEditForm((p) => ({ ...p, nickname: e.target.value }))}
              className="cos-glow-input w-full px-4 py-2.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#B8AAD4] mb-2">鉴定次数</label>
              <input
                type="number"
                value={editForm.analyzeCount}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    analyzeCount: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                className="cos-glow-input w-full px-4 py-2.5 text-center"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm text-[#B8AAD4] mb-2">绘梦次数</label>
              <input
                type="number"
                value={editForm.drawCount}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    drawCount: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                className="cos-glow-input w-full px-4 py-2.5 text-center"
                min={0}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 补充魔力模态框 */}
      <Modal
        open={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`为 ${selectedUser?.nickname || ''} 补充魔力`}
        footer={
          <>
            <GlowButton variant="ghost" onClick={() => setAdjustModalOpen(false)}>
              取消
            </GlowButton>
            <GlowButton onClick={handleAdjust}>确认补充</GlowButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">魔力类型</label>
            <div className="cos-tab-capsule w-full">
              <button
                className={'flex-1 ' + (adjustForm.type === 'analyze' ? 'active' : '')}
                onClick={() => setAdjustForm((p) => ({ ...p, type: 'analyze' }))}
              >
                🔮 鉴定魔力
              </button>
              <button
                className={'flex-1 ' + (adjustForm.type === 'draw' ? 'active' : '')}
                onClick={() => setAdjustForm((p) => ({ ...p, type: 'draw' }))}
              >
                🎨 绘梦魔力
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">补充数量</label>
            <input
              type="number"
              value={adjustForm.delta}
              onChange={(e) =>
                setAdjustForm((p) => ({
                  ...p,
                  delta: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="cos-glow-input w-full px-4 py-3 text-center font-bold text-xl"
              min={1}
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
    </PageShell>
  );
}
