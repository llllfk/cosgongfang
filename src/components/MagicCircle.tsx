'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface MagicCircleProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  /** 为 true 时旋转；空状态请传 false，避免误以为正在鉴定 */
  active?: boolean;
}

export const MagicCircle: React.FC<MagicCircleProps> = ({
  size = 'md',
  text = '上传图片后开始鉴定',
  className,
  active = true,
}) => {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div
        className={cn(
          'cos-magic-circle',
          size === 'sm' && 'cos-magic-circle--sm',
          !active && 'cos-magic-circle--paused'
        )}
      >
        <div className="cos-magic-circle__ring" />
        <div className="cos-magic-circle__rune">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <span key={i} />
          ))}
        </div>
        <div className="cos-magic-circle__core" />
      </div>
      <p
        className={cn(
          'text-[var(--cos-text-sub)] text-sm font-medium text-center max-w-xs',
          active && 'animate-pulse'
        )}
      >
        {text}
      </p>
    </div>
  );
};
