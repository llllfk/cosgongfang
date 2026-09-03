'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#0D0820]/80 backdrop-blur-sm" />
      <div
        className={cn(
          'relative cos-modal-enter w-full max-w-md',
          'flex flex-col max-h-[min(90vh,860px)] overflow-hidden',
          'rounded-[24px] p-6',
          'bg-gradient-to-br from-[rgba(42,27,77,0.95)] to-[rgba(26,16,51,0.95)]',
          'border border-[rgba(255,60,172,0.4)]',
          'shadow-[0_0_60px_rgba(255,60,172,0.25),0_20px_60px_rgba(0,0,0,0.5)]',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-xl font-bold cos-gradient-text">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#B8AAD4] hover:text-white hover:bg-[rgba(255,60,172,0.15)] transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="text-[var(--cos-text-sub)] flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
          {children}
        </div>
        {footer ? (
          <div className="mt-4 pt-1 flex justify-end gap-3 flex-shrink-0">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};
