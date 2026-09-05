'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type LightboxProps = {
  src: string | null;
  alt?: string;
  onClose: () => void;
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const SCALE_STEP = 0.25;

function clampScale(n: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(n * 100) / 100));
}

function ToolBtn({
  label,
  onClick,
  children,
  disabled,
  wide,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'h-8 sm:h-10 flex-shrink-0 rounded-full flex items-center justify-center font-semibold text-white/90 disabled:opacity-35 disabled:cursor-not-allowed bg-[rgba(42,27,77,0.9)] border border-[rgba(255,60,172,0.35)] hover:bg-[rgba(255,60,172,0.25)] active:bg-[rgba(255,60,172,0.35)] transition-colors',
        wide
          ? 'px-2.5 sm:px-3 text-[11px] sm:text-xs tracking-wide'
          : 'w-8 sm:w-10 text-sm sm:text-base'
      )}
    >
      {children}
    </button>
  );
}

/** 全屏图片预览：支持放大 / 缩小 / 旋转 */
export function ImageLightbox({ src, alt = '预览', onClose }: LightboxProps) {
  const [mounted, setMounted] = React.useState(false);
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dragRef = React.useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!src) return;
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
  }, [src]);

  const zoomBy = React.useCallback((delta: number) => {
    setScale((s) => clampScale(s + delta));
  }, []);

  const resetView = React.useCallback(() => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  }, []);

  React.useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomBy(SCALE_STEP);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomBy(-SCALE_STEP);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setRotation((r) => (r + 90) % 360);
      } else if (e.key === '0') {
        e.preventDefault();
        resetView();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [src, onClose, zoomBy, resetView]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    zoomBy(e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    e.stopPropagation();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  if (!src || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
    >
      <div className="absolute inset-0 bg-[#0D0820]/90 backdrop-blur-sm" />

      <div
        className="relative z-[1] flex-1 flex items-center justify-center overflow-hidden p-4 sm:p-8"
        onWheel={onWheel}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-w-[min(96vw,1200px)] max-h-[min(72vh,1000px)] sm:max-h-[min(78vh,1000px)] object-contain rounded-xl shadow-[0_0_60px_rgba(255,60,172,0.2)] select-none touch-none"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: dragging ? 'none' : 'transform 120ms ease-out',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (scale === 1) {
              setScale(2);
            } else {
              resetView();
            }
          }}
        />
      </div>

      <div
        className="relative z-[2] flex-shrink-0 flex justify-center px-2 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="cos-tab-scroll flex flex-nowrap items-center gap-0.5 sm:gap-1.5 rounded-full px-1 py-1"
          style={{
            background: 'rgba(13, 8, 32, 0.72)',
            border: '1px solid rgba(255, 60, 172, 0.3)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
          }}
        >
          <ToolBtn label="缩小" onClick={() => zoomBy(-SCALE_STEP)} disabled={scale <= MIN_SCALE}>
            −
          </ToolBtn>
          <span className="w-10 sm:w-14 flex-shrink-0 text-center text-[11px] sm:text-sm text-[#B8AAD4] tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <ToolBtn label="放大" onClick={() => zoomBy(SCALE_STEP)} disabled={scale >= MAX_SCALE}>
            ＋
          </ToolBtn>
          <ToolBtn label="向左旋转" onClick={() => setRotation((r) => (r + 270) % 360)}>
            ↺
          </ToolBtn>
          <ToolBtn label="向右旋转" onClick={() => setRotation((r) => (r + 90) % 360)}>
            ↻
          </ToolBtn>
          <ToolBtn label="重置视图" wide onClick={resetView}>
            复位
          </ToolBtn>
          <ToolBtn label="关闭" onClick={onClose}>
            ✕
          </ToolBtn>
        </div>
      </div>
    </div>,
    document.body
  );
}

type PreviewableImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  /** 点击预览用的大图，默认等于 src */
  previewSrc?: string;
};

/** 可点击放大预览的图片 */
export function PreviewableImage({
  src,
  previewSrc,
  className,
  alt = '',
  onClick,
  ...rest
}: PreviewableImageProps) {
  const [open, setOpen] = React.useState(false);
  const full = previewSrc || src || null;
  if (!src) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn('cursor-zoom-in', className)}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
          if (full) setOpen(true);
        }}
        {...rest}
      />
      <ImageLightbox
        src={open ? full : null}
        alt={alt || '预览'}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
