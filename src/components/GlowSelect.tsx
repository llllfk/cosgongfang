'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type GlowSelectOption = {
  value: string;
  label: string;
  /** 选项前的示意图标（如下拉比例小方块） */
  icon?: React.ReactNode;
};

type GlowSelectProps = {
  value: string;
  options: GlowSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** 下拉菜单最小宽度，默认跟随触发器 */
  menuClassName?: string;
};

export function GlowSelect({
  value,
  options,
  onChange,
  placeholder = '请选择',
  className,
  disabled,
  menuClassName,
}: GlowSelectProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          'cos-glow-input w-full min-w-[140px] px-3 py-2 text-sm text-left',
          'inline-flex items-center justify-between gap-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          open && 'border-[rgba(255,60,172,0.55)] shadow-[0_0_0_2px_rgba(255,60,172,0.25)]'
        )}
      >
        <span className={cn('truncate flex items-center gap-2 min-w-0', !selected && 'text-[#7A6B99]')}>
          {selected?.icon}
          <span className="truncate">{selected?.label || placeholder}</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className={cn(
            'flex-shrink-0 text-[#B8AAD4] transition-transform duration-200',
            open && 'rotate-180 text-[#FF3CAC]'
          )}
          aria-hidden
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 mt-2 left-0 right-0 min-w-full overflow-hidden',
            'rounded-xl border border-[rgba(255,60,172,0.35)]',
            'bg-[rgba(26,16,51,0.96)] backdrop-blur-md',
            'shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_24px_rgba(255,60,172,0.15)]',
            'max-h-60 overflow-y-auto py-1',
            menuClassName
          )}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value || '__empty__'}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2.5 text-left text-sm transition-colors',
                  'inline-flex items-center gap-2.5',
                  active
                    ? 'bg-[rgba(255,60,172,0.2)] text-white'
                    : 'text-[#B8AAD4] hover:bg-[rgba(255,60,172,0.12)] hover:text-white'
                )}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
