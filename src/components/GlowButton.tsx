'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type GlowButtonVariant = 'primary' | 'accent' | 'ghost' | 'danger';
type GlowButtonSize = 'sm' | 'md' | 'lg';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlowButtonVariant;
  size?: GlowButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const GlowButton = React.forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, icon, children, disabled, ...props }, ref) => {
    const baseStyles = 'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-250 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

    const variants: Record<GlowButtonVariant, string> = {
      primary:
        'bg-gradient-to-r from-[#FF3CAC] to-[#784BA0] text-white hover:shadow-[0_0_28px_rgba(255,60,172,0.55)] hover:-translate-y-0.5 active:translate-y-0',
      accent:
        'bg-gradient-to-r from-[#21E6C1] to-[#0ABAB5] text-[#0D0820] hover:shadow-[0_0_28px_rgba(33,230,193,0.55)] hover:-translate-y-0.5 active:translate-y-0',
      ghost:
        'bg-transparent text-[#B8AAD4] border border-[rgba(255,60,172,0.3)] hover:text-white hover:border-[rgba(255,60,172,0.7)] hover:bg-[rgba(255,60,172,0.08)] hover:-translate-y-0.5',
      danger:
        'bg-gradient-to-r from-[#FF5577] to-[#FF3366] text-white hover:shadow-[0_0_28px_rgba(255,85,119,0.55)] hover:-translate-y-0.5',
    };

    const sizes: Record<GlowButtonSize, string> = {
      sm: 'px-4 py-2 text-sm gap-1.5',
      md: 'px-6 py-3 text-base gap-2',
      lg: 'px-8 py-4 text-lg gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);
GlowButton.displayName = 'GlowButton';
