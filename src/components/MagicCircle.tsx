'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface MagicCircleProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const MagicCircle: React.FC<MagicCircleProps> = ({
  size = 'md',
  text = '召唤魔法阵开始鉴定',
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className={cn('cos-magic-circle', size === 'sm' && 'cos-magic-circle--sm')}>
        <div className="cos-magic-circle__ring" />
        <div className="cos-magic-circle__rune">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <span key={i} />
          ))}
        </div>
        <div className="cos-magic-circle__core" />
      </div>
      <p className="text-[var(--cos-text-sub)] text-sm font-medium animate-pulse">{text}</p>
    </div>
  );
};
