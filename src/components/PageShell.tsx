'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CrystalBadge } from './CrystalBadge';
import { ToastProvider } from './Toast';

interface PageShellProps {
  children: React.ReactNode;
  showNav?: boolean;
}

// mock 用户状态（简单的客户端存储）
const useUserState = () => {
  const [user, setUser] = React.useState<{ nickname: string; isAdmin: boolean } | null>(null);
  const [analyzeCount, setAnalyzeCount] = React.useState(2);
  const [drawCount, setDrawCount] = React.useState(2);
  const router = useRouter();

  React.useEffect(() => {
    const u = localStorage.getItem('cos_user');
    if (u) {
      setUser(JSON.parse(u));
    }
    const a = localStorage.getItem('cos_analyze_count');
    const d = localStorage.getItem('cos_draw_count');
    if (a) setAnalyzeCount(parseInt(a, 10));
    if (d) setDrawCount(parseInt(d, 10));
  }, []);

  const logout = React.useCallback(() => {
    localStorage.removeItem('cos_user');
    setUser(null);
    router.push('/login');
  }, [router]);

  return { user, analyzeCount, drawCount, setAnalyzeCount, setDrawCount, logout };
};

export const PageShell: React.FC<PageShellProps> = ({ children, showNav = true }) => {
  const pathname = usePathname();
  const { user, analyzeCount, drawCount, logout } = useUserState();

  const navItems = [
    { href: '/home', label: '工坊大厅', icon: '🏰' },
    { href: '/analyze', label: '服饰鉴定', icon: '🔮' },
    { href: '/draw', label: '绘梦工坊', icon: '🎨' },
    { href: '/profile', label: '角色卡', icon: '✨' },
  ];

  return (
    <div className="min-h-screen relative">
      {/* 星光背景 */}
      <div className="cos-starry-bg" />

      {/* 顶部导航 */}
      {showNav && (
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-5xl">
          <div
            className="flex items-center justify-between px-6 py-3 rounded-full backdrop-blur-xl"
            style={{
              background: 'rgba(26, 16, 51, 0.75)',
              border: '1px solid rgba(255, 60, 172, 0.25)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 30px rgba(255, 60, 172, 0.1)',
            }}
          >
            <Link href="/home" className="flex items-center gap-2 font-bold">
              <span className="text-xl">✦</span>
              <span className="text-lg cos-gradient-text">COS魔法工坊</span>
            </Link>

            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-[#FF3CAC]/30 to-[#21E6C1]/20 text-white shadow-[0_0_15px_rgba(255,60,172,0.3)]'
                        : 'text-[#B8AAD4] hover:text-white hover:bg-[rgba(255,60,172,0.1)]'
                    )}
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <CrystalBadge count={analyzeCount} label="鉴定" variant="pink" size="sm" />
                <CrystalBadge count={drawCount} label="绘梦" variant="cyan" size="sm" />
              </div>
              <div className="w-px h-6 bg-[rgba(255,60,172,0.2)]" />
              <button
                onClick={logout}
                className="w-9 h-9 rounded-full bg-[rgba(255,60,172,0.15)] border border-[rgba(255,60,172,0.3)] flex items-center justify-center text-sm hover:bg-[rgba(255,60,172,0.3)] transition-colors"
                title="退出"
              >
                {user?.nickname?.charAt(0) || '旅'}
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* 页面内容 */}
      <main className={cn('relative z-10', showNav && 'pt-24 pb-16')}>
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
};
