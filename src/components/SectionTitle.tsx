'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center';
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  icon,
  className,
  align = 'left',
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        align === 'center' && 'items-center text-center',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3',
          align === 'center' && 'justify-center',
          className
        )}
      >
        {icon && (
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[rgba(255,60,172,0.15)] border border-[rgba(255,60,172,0.3)] flex-shrink-0">
            {icon}
          </div>
        )}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold cos-gradient-text">{title}</h2>
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-3 gap-y-1',
          align === 'center' && 'justify-center'
        )}
      >
        <div className="h-[2px] w-12 rounded-full bg-gradient-to-r from-[#FF3CAC] to-transparent flex-shrink-0" />
        {subtitle && (
          <span className="text-sm text-[var(--cos-text-sub)]">{subtitle}</span>
        )}
      </div>
    </div>
  );
};
