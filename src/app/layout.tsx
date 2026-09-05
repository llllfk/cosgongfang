import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastRoot } from '@/components/ToastRoot';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'COS定制工坊 · 二次元服饰AI工作台',
    template: '%s | COS定制工坊',
  },
  description: '面向COSPLAY服装制作的AI工具，服饰鉴定拆解面料配色，绘梦工坊生成设计稿',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[var(--cos-bg-main)] text-[var(--cos-text-main)]">
        <ToastRoot>{children}</ToastRoot>
      </body>
    </html>
  );
}
