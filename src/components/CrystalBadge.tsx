'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CrystalBadgeProps {
  count: number;
  label?: string;
  variant?: 'pink' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CrystalBadge: React.FC<CrystalBadgeProps> = ({
  count,
  label,
  variant = 'pink',
  size = 'md',
  className,
}) => {
  const sizeStyles: Record<string, string> = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-4 py-1.5 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-3',
  };

  const variantStyles: Record<string, string> = {
    pink: 'bg-[rgba(255,60,172,0.12)] border-[rgba(255,60,172,0.4)] text-[#FFB3D9]',
    cyan: 'bg-[rgba(33,230,193,0.12)] border-[rgba(33,230,193,0.4)] text-[#7EF0DC]',
  };

  const crystalColor: Record<typeof variant, string> = {
    pink: '#FF3CAC',
    cyan: '#21E6C1',
  };

  const crystalSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border backdrop-blur-md font-semibold',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      <CrystalIcon color={crystalColor[variant]} size={crystalSize} />
      <span className="text-white font-bold">{count}</span>
      {label && <span className="opacity-80">{label}</span>}
    </div>
  );
};

const CrystalIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: `drop-shadow(0 0 4px ${color})` }}
  >
    <path
      d="M12 2L4 9l8 13 8-13-8-7z"
      fill={color}
      fillOpacity="0.3"
      stroke={color}
      strokeWidth="1.5"
    />
    <path d="M12 2L7 9h10L12 2z" fill={color} fillOpacity="0.6" />
    <path d="M12 22L12 9" stroke={color} strokeWidth="1" opacity="0.5" />
    <path d="M4 9L12 9" stroke={color} strokeWidth="1" opacity="0.5" />
    <path d="M20 9L12 9" stroke={color} strokeWidth="1" opacity="0.5" />
  </svg>
);
