'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = React.useContext(ToastContext);
  // 无 provider 时返回空实现，避免 SSR / 边界场景崩溃
  if (!ctx) {
    return { showToast: () => {} };
  }
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const showToast = React.useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const typeStyles: Record<ToastType, string> = {
    success: 'border-[rgba(33,230,193,0.5)] bg-[rgba(33,230,193,0.1)] text-[#7EF0DC]',
    error: 'border-[rgba(255,85,119,0.5)] bg-[rgba(255,85,119,0.1)] text-[#FFB3C0]',
    info: 'border-[rgba(255,60,172,0.5)] bg-[rgba(255,60,172,0.1)] text-[#FFB3D9]',
  };

  const typeIcon: Record<ToastType, string> = {
    success: '✦',
    error: '✕',
    info: '✧',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed z-[210] flex flex-col gap-3 pointer-events-none
        bottom-20 left-4 right-4 items-center
        md:bottom-auto md:top-6 md:right-6 md:left-auto md:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'cos-toast-enter px-5 py-3 rounded-xl backdrop-blur-md border shadow-lg w-full max-w-[360px] flex items-center gap-3 pointer-events-auto',
              typeStyles[toast.type]
            )}
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(255,60,172,0.15)' }}
          >
            <span className="text-lg font-bold flex-shrink-0">{typeIcon[toast.type]}</span>
            <span className="text-sm font-medium text-white">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
