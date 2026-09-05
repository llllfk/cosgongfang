'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CrystalBadge } from './CrystalBadge';
import { ToastProvider, useToast } from './Toast';
import { Modal } from './Modal';
import { GlowButton } from './GlowButton';
import { getCurrentUser, logoutApi, updateProfileApi } from '@/api/client';
import {
  NavHomeChibi,
  NavAnalyzeChibi,
  NavDesignChibi,
  NavDrawChibi,
  NavProfileChibi,
} from './Icons';

interface PageShellProps {
  children: React.ReactNode;
  showNav?: boolean;
}

const NAV_ITEMS = [
  { href: '/home', label: '工坊大厅', short: '大厅', Icon: NavHomeChibi },
  { href: '/analyze', label: '定制报告', short: '报告', Icon: NavAnalyzeChibi },
  { href: '/design', label: '设计稿', short: '设计稿', Icon: NavDesignChibi },
  { href: '/draw', label: '绘梦工坊', short: '绘梦', Icon: NavDrawChibi },
  { href: '/profile', label: '角色卡', short: '角色', Icon: NavProfileChibi },
] as const;

const useUserState = () => {
  const [user, setUser] = React.useState<{
    nickname: string;
    account?: string;
    isAdmin: boolean;
  } | null>(null);
  const [analyzeCount, setAnalyzeCount] = React.useState(0);
  const [drawCount, setDrawCount] = React.useState(0);

  const refresh = React.useCallback(() => {
    const u = localStorage.getItem('cos_user');
    if (u) {
      try {
        const parsed = JSON.parse(u);
        setUser(parsed);
        setAnalyzeCount(Number(parsed.analyzeCount ?? 0));
        setDrawCount(Number(parsed.drawCount ?? 0));
      } catch {
        /* ignore */
      }
    } else {
      setUser(null);
      setAnalyzeCount(0);
      setDrawCount(0);
    }
    const a = localStorage.getItem('cos_analyze_count');
    const d = localStorage.getItem('cos_draw_count');
    if (a) setAnalyzeCount(parseInt(a, 10));
    if (d) setDrawCount(parseInt(d, 10));
  }, []);

  React.useEffect(() => {
    refresh();
    getCurrentUser()
      .then(refresh)
      .catch(() => {
        /* 未登录 */
      });
    const onChange = () => refresh();
    window.addEventListener('cos-quota-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('cos-quota-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [refresh]);

  const logout = React.useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      /* 接口失败也清本地态 */
    }
    localStorage.removeItem('cos_user');
    localStorage.removeItem('cos_analyze_count');
    localStorage.removeItem('cos_draw_count');
    window.dispatchEvent(new Event('cos-quota-changed'));
    setUser(null);
    // 硬跳转，避免部分托管环境 router.push 无反应
    window.location.assign('/login');
  }, []);

  return { user, analyzeCount, drawCount, logout, refresh };
};

function UserMenu({
  user,
  onProfile,
  onLogout,
  loggingOut,
}: {
  user: { nickname: string; account?: string; isAdmin: boolean } | null;
  onProfile: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    // 用 click 捕获阶段判断外侧关闭，避免 mousedown 先卸掉菜单导致「退出」点不到
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  return (
    <div className="relative" ref={menuRef} data-user-menu>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="w-9 h-9 rounded-full bg-[rgba(255,60,172,0.15)] border border-[rgba(255,60,172,0.3)] flex items-center justify-center text-sm hover:bg-[rgba(255,60,172,0.3)] transition-colors"
        title={user?.nickname || '旅者'}
      >
        {user?.nickname?.charAt(0) || '旅'}
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] w-48 rounded-2xl overflow-hidden z-[80]"
          style={{
            background: 'linear-gradient(160deg, rgba(42,27,77,0.98), rgba(26,16,51,0.98))',
            border: '1px solid rgba(255,60,172,0.35)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45), 0 0 24px rgba(255,60,172,0.15)',
          }}
        >
          <div className="px-4 py-3 border-b border-[rgba(255,60,172,0.15)]">
            <p className="text-sm font-semibold text-white truncate">{user?.nickname || '旅者'}</p>
            {user?.account ? (
              <p className="text-[11px] text-[#7A6B99] truncate">@{user.account}</p>
            ) : null}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              onProfile();
            }}
            className="w-full text-left px-4 py-3 text-sm text-[#B8AAD4] hover:text-white hover:bg-[rgba(255,60,172,0.12)] transition-colors"
          >
            ✨ 个人信息修改
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              if (loggingOut) return;
              setMenuOpen(false);
              onLogout();
            }}
            disabled={loggingOut}
            className="w-full text-left px-4 py-3 text-sm text-[#FF3CAC] hover:bg-[rgba(255,60,172,0.12)] transition-colors border-t border-[rgba(255,60,172,0.12)] disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loggingOut ? (
              <>
                <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-[#FF3CAC]/30 border-t-[#FF3CAC] animate-spin" />
                退出中…
              </>
            ) : (
              '退出登录'
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}

const NavBar: React.FC<{
  user: { nickname: string; account?: string; isAdmin: boolean } | null;
  analyzeCount: number;
  drawCount: number;
  logout: () => Promise<void>;
  refresh: () => void;
}> = ({ user, analyzeCount, drawCount, logout, refresh }) => {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [nickname, setNickname] = React.useState('');
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');

  const openProfile = () => {
    setNickname(user?.nickname || '');
    setOldPassword('');
    setNewPassword('');
    setProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (saving) return;
    if (!nickname.trim()) {
      showToast('昵称不能为空', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateProfileApi({
        nickname: nickname.trim(),
        ...(newPassword ? { oldPassword, newPassword } : {}),
      });
      refresh();
      setProfileOpen(false);
      showToast('✦ 个人信息已更新', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const [loggingOut, setLoggingOut] = React.useState(false);
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    // 等一帧让遮罩先渲染出来
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  };

  const navLinkClass = (active: boolean) =>
    cn(
      'px-3 xl:px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap',
      active
        ? 'bg-gradient-to-r from-[#FF3CAC]/30 to-[#21E6C1]/20 text-white shadow-[0_0_15px_rgba(255,60,172,0.3)]'
        : 'text-[#B8AAD4] hover:text-white hover:bg-[rgba(255,60,172,0.1)]'
    );

  return (
    <>
      {loggingOut ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4"
          style={{
            background: 'rgba(13, 8, 32, 0.72)',
            backdropFilter: 'blur(8px)',
          }}
          aria-live="assertive"
          aria-busy="true"
        >
          <div
            className="w-12 h-12 rounded-full border-[3px] border-[rgba(255,60,172,0.25)] border-t-[#FF3CAC] animate-spin"
            style={{ boxShadow: '0 0 24px rgba(255,60,172,0.35)' }}
          />
          <p className="text-sm font-medium text-white tracking-wide">正在退出工坊…</p>
          <p className="text-xs text-[#7A6B99]">请稍候</p>
        </div>
      ) : null}
      {/* 桌面 / 大屏平板顶栏 */}
      <nav className="fixed top-3 md:top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] md:w-[92%] max-w-5xl hidden lg:block">
        <div
          className="flex items-center justify-between px-4 xl:px-6 py-3 rounded-full backdrop-blur-xl"
          style={{
            background: 'rgba(26, 16, 51, 0.75)',
            border: '1px solid rgba(255, 60, 172, 0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 30px rgba(255, 60, 172, 0.1)',
          }}
        >
          <Link href="/home" className="flex items-center gap-2 font-bold min-w-0">
            <span className="text-xl">✦</span>
            <span className="text-lg cos-gradient-text truncate">大晓COS定制工坊</span>
          </Link>

          <div className="flex items-center gap-0.5 xl:gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClass(pathname === item.href)}
                >
                  <Icon size={20} className="inline-block mr-1.5 -mt-0.5 align-middle shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 xl:gap-3 flex-shrink-0">
            <div className="flex gap-1.5 xl:gap-2">
              <CrystalBadge count={analyzeCount} label="鉴定" variant="pink" size="sm" />
              <CrystalBadge count={drawCount} label="绘梦" variant="cyan" size="sm" />
            </div>
            <div className="w-px h-6 bg-[rgba(255,60,172,0.2)]" />
            <UserMenu
              user={user}
              onProfile={openProfile}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          </div>
        </div>
      </nav>

      {/* 手机 / 平板紧凑顶栏 */}
      <header
        className="fixed top-0 left-0 right-0 z-50 lg:hidden cos-safe-top"
        style={{
          background: 'rgba(26, 16, 51, 0.92)',
          borderBottom: '1px solid rgba(255, 60, 172, 0.2)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        }}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 max-w-5xl mx-auto">
          <Link href="/home" className="flex items-center gap-1.5 font-bold min-w-0">
            <span className="text-lg">✦</span>
            <span className="text-base cos-gradient-text truncate">大晓COS定制工坊</span>
          </Link>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <CrystalBadge count={analyzeCount} variant="pink" size="sm" />
            <CrystalBadge count={drawCount} variant="cyan" size="sm" />
            <UserMenu
              user={user}
              onProfile={openProfile}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          </div>
        </div>
      </header>

      {/* 手机 / 平板底部导航 */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden cos-safe-bottom"
        style={{
          background: 'rgba(26, 16, 51, 0.95)',
          borderTop: '1px solid rgba(255, 60, 172, 0.25)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.35)',
        }}
        aria-label="主导航"
      >
        <div className="grid grid-cols-5 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 min-h-[60px] transition-all',
                  active ? 'text-[#FF3CAC]' : 'text-[#7A6B99] active:bg-[rgba(255,60,172,0.08)]'
                )}
              >
                <span
                  className={cn(
                    'inline-flex transition-transform duration-200',
                    active ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,60,172,0.45)]' : 'opacity-85'
                  )}
                >
                  <Icon size={30} />
                </span>
                <span className={cn('text-[10px] font-medium', active && 'text-white')}>
                  {item.short}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="个人信息修改"
        footer={
          <div className="flex justify-end gap-3">
            <GlowButton variant="ghost" size="sm" onClick={() => setProfileOpen(false)} disabled={saving}>
              取消
            </GlowButton>
            <GlowButton size="sm" loading={saving} onClick={handleSaveProfile}>
              {saving ? '保存中…' : '保存'}
            </GlowButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">旅者昵称</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="cos-glow-input w-full px-4 py-2.5 text-sm"
              placeholder="输入新昵称"
              maxLength={32}
            />
          </div>
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">当前密码（改密时必填）</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="cos-glow-input w-full px-4 py-2.5 text-sm"
              placeholder="不改密码可留空"
            />
          </div>
          <div>
            <label className="block text-sm text-[#B8AAD4] mb-2">新密码（可选）</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="cos-glow-input w-full px-4 py-2.5 text-sm"
              placeholder="至少 6 位，不改可留空"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export const PageShell: React.FC<PageShellProps> = ({ children, showNav = true }) => {
  const { user, analyzeCount, drawCount, logout, refresh } = useUserState();

  return (
    <ToastProvider>
      <div className="min-h-screen relative">
        <div className="cos-starry-bg" />

        {showNav ? (
          <NavBar
            user={user}
            analyzeCount={analyzeCount}
            drawCount={drawCount}
            logout={logout}
            refresh={refresh}
          />
        ) : null}

        <main
          className={cn(
            'relative z-10',
            showNav && 'pt-[52px] pb-[72px] lg:pt-24 lg:pb-16'
          )}
        >
          {children}
        </main>
      </div>
    </ToastProvider>
  );
};
