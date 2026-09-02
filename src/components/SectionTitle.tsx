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
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[rgba(255,60,172,0.15)] border border-[rgba(255,60,172,0.3)]">
            {icon}
          </div>
        )}
        <h2 className="text-2xl md:text-3xl font-bold cos-gradient-text">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-[2px] w-12 rounded-full bg-gradient-to-r from-[#FF3CAC] to-transparent" />
        {subtitle && (
          <span className="text-sm text-[var(--cos-text-sub)]">{subtitle}</span>
        )}
      </div>
    </div>
  );
};
