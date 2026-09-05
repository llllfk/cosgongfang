'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { GlowButton } from '@/components/GlowButton';
import { loginApi, registerApi } from '@/api/client';
import { SparklesIcon } from '@/components/Icons';
import { sanitizeAccountInput, validateAccount } from '@/lib/account';
import { validatePassword } from '@/lib/password';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<AuthMode>('login');
  const [account, setAccount] = React.useState('');
  const [nickname, setNickname] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordConfirm, setPasswordConfirm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setPassword('');
    setPasswordConfirm('');
  };

  const handleLogin = async () => {
    if (!account.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await loginApi(account.trim(), password);
      router.push('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const normalizedAccount = validateAccount(account);
      const name = nickname.trim();
      if (!name) throw new Error('请填写昵称');
      if (name.length > 32) throw new Error('昵称过长');
      const pwd = validatePassword(password);
      if (pwd !== passwordConfirm) throw new Error('两次输入的密码不一致');

      await registerApi({
        account: normalizedAccount,
        nickname: name,
        password: pwd,
        passwordConfirm,
      });
      router.push('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (mode === 'login') {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden cos-safe-top cos-safe-bottom">
      <div className="cos-starry-bg" />

      <div className="absolute left-[-100px] top-1/2 -translate-y-1/2 opacity-30 pointer-events-none hidden lg:block">
        <div className="cos-magic-circle" style={{ width: 400, height: 400 }}>
          <div className="cos-magic-circle__ring" />
          <div className="cos-magic-circle__rune">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <span key={i} />
            ))}
          </div>
          <div className="cos-magic-circle__core" />
        </div>
      </div>

      <div className="absolute right-[-80px] top-1/4 opacity-20 pointer-events-none hidden lg:block">
        <div className="cos-magic-circle cos-magic-circle--sm">
          <div className="cos-magic-circle__ring" />
          <div className="cos-magic-circle__rune">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <span key={i} />
            ))}
          </div>
          <div className="cos-magic-circle__core" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div
          className="rounded-[32px] p-8 md:p-10 backdrop-blur-xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(42, 27, 77, 0.8) 0%, rgba(26, 16, 51, 0.9) 100%)',
            border: '1px solid rgba(255, 60, 172, 0.35)',
            boxShadow:
              '0 0 60px rgba(255, 60, 172, 0.2), 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 cos-float"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 60, 172, 0.2), rgba(33, 230, 193, 0.2))',
                border: '1px solid rgba(255, 60, 172, 0.4)',
                boxShadow: '0 0 30px rgba(255, 60, 172, 0.3)',
              }}
            >
              <SparklesIcon size={32} className="text-[#FF3CAC]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold cos-gradient-text mb-2">大晓COS定制工坊</h1>
            <p className="text-sm text-[#B8AAD4]">✦ 二次元服饰鉴定 · 绘梦设计工坊 ✦</p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="cos-tab-capsule flex-shrink-0">
              <button
                type="button"
                className={mode === 'login' ? 'active' : ''}
                onClick={() => switchMode('login')}
              >
                登录
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'active' : ''}
                onClick={() => switchMode('register')}
              >
                注册
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#B8AAD4] mb-2 ml-1">
                旅者之名（账号）
              </label>
              <input
                type="text"
                value={account}
                onChange={(e) =>
                  setAccount(
                    mode === 'register' ? sanitizeAccountInput(e.target.value) : e.target.value
                  )
                }
                placeholder="字母或数字，至少 6 位"
                autoComplete="username"
                className="cos-glow-input w-full px-4 py-3 text-base"
              />
            </div>

            {mode === 'register' ? (
              <div>
                <label className="block text-sm font-medium text-[#B8AAD4] mb-2 ml-1">昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="展示用的昵称"
                  autoComplete="nickname"
                  maxLength={32}
                  className="cos-glow-input w-full px-4 py-3 text-base"
                />
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-[#B8AAD4] mb-2 ml-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === 'register' ? '8–20 位，字母 / 数字 / 特殊符号' : '输入密码'
                }
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                className="cos-glow-input w-full px-4 py-3 text-base"
              />
            </div>

            {mode === 'register' ? (
              <div>
                <label className="block text-sm font-medium text-[#B8AAD4] mb-2 ml-1">
                  确认密码
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                  className="cos-glow-input w-full px-4 py-3 text-base"
                />
              </div>
            ) : null}

            {error ? <p className="text-sm text-[#FF3CAC] text-center">{error}</p> : null}

            <GlowButton type="submit" size="lg" loading={loading} className="w-full mt-6">
              {loading
                ? mode === 'login'
                  ? '进入中…'
                  : '注册中…'
                : mode === 'login'
                  ? '进入定制工坊'
                  : '注册并进入工坊'}
            </GlowButton>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-[#7A6B99]">
          ✦ 拆解二次元服饰，用针线织就热爱 ✦
        </p>
      </div>
    </div>
  );
}
