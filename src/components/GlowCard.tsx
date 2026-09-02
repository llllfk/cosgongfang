'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glowColor?: 'pink' | 'cyan' | 'yellow';
}

export const GlowCard = React.forwardRef<HTMLDivElement, GlowCardProps>(
  ({ className, hoverable = true, glowColor = 'pink', children, ...props }, ref) => {
    const glowStyles: Record<string, string> = {
      pink: 'border-[rgba(255,60,172,0.25)] hover:border-[rgba(255,60,172,0.55)] hover:shadow-[0_0_40px_rgba(255,60,172,0.25)]',
      cyan: 'border-[rgba(33,230,193,0.25)] hover:border-[rgba(33,230,193,0.55)] hover:shadow-[0_0_40px_rgba(33,230,193,0.25)]',
      yellow: 'border-[rgba(255,230,109,0.25)] hover:border-[rgba(255,230,109,0.55)] hover:shadow-[0_0_40px_rgba(255,230,109,0.25)]',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'cos-glow-card rounded-[20px] transition-all duration-300 ease-out',
          hoverable && 'hover:-translate-y-1 cursor-pointer',
          glowStyles[glowColor],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlowCard.displayName = 'GlowCard';
