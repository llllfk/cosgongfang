'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type GlowNumberInputProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  /** sm | md | lg */
  size?: 'sm' | 'md' | 'lg';
};

function clamp(n: number, min: number, max?: number) {
  let v = n;
  if (v < min) v = min;
  if (max !== undefined && v > max) v = max;
  return v;
}

const sizeStyles = {
  sm: { wrap: 'h-9', input: 'text-sm', btn: 'w-8 text-base' },
  md: { wrap: 'h-10', input: 'text-base', btn: 'w-9 text-lg' },
  lg: { wrap: 'h-12', input: 'text-xl font-bold', btn: 'w-10 text-xl' },
};

function StepBtn({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center flex-shrink-0',
        'text-[#B8AAD4] hover:text-white',
        'bg-[rgba(255,60,172,0.08)] hover:bg-[rgba(255,60,172,0.2)]',
        'border border-[rgba(255,60,172,0.25)]',
        'transition-colors duration-200',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[rgba(255,60,172,0.08)] disabled:hover:text-[#B8AAD4]',
        className
      )}
    >
      {children}
    </button>
  );
}

export function GlowNumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  className,
  disabled,
  size = 'md',
}: GlowNumberInputProps) {
  const [draft, setDraft] = React.useState(String(value));
  const focused = React.useRef(false);
  const s = sizeStyles[size];

  React.useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    const next = clamp(Number.isNaN(parsed) ? min : parsed, min, max);
    onChange(next);
    setDraft(String(next));
  };

  const bump = (delta: number) => {
    const next = clamp(value + delta, min, max);
    onChange(next);
    setDraft(String(next));
  };

  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div
      className={cn(
        'inline-flex items-stretch w-full overflow-hidden rounded-xl',
        'border border-[rgba(255,60,172,0.25)]',
        'bg-[rgba(13,8,32,0.6)]',
        'focus-within:border-[rgba(255,60,172,0.55)] focus-within:shadow-[0_0_0_2px_rgba(255,60,172,0.25)]',
        'transition-all duration-200',
        disabled && 'opacity-50 pointer-events-none',
        s.wrap,
        className
      )}
    >
      <StepBtn
        onClick={() => bump(-step)}
        disabled={disabled || atMin}
        className={cn(s.btn, 'rounded-l-xl border-r-0')}
      >
        −
      </StepBtn>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          commit(draft);
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '');
          setDraft(next);
          if (next !== '') onChange(clamp(parseInt(next, 10), min, max));
        }}
        className={cn(
          'flex-1 min-w-0 bg-transparent text-center text-white outline-none',
          'placeholder:text-[#7A6B99]',
          s.input
        )}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <StepBtn
        onClick={() => bump(step)}
        disabled={disabled || atMax}
        className={cn(s.btn, 'rounded-r-xl border-l-0')}
      >
        +
      </StepBtn>
    </div>
  );
}
