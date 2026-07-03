"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppContent } from './AppContent';
import { FilmGrainOverlay } from '../motion/FilmGrainOverlay';
import { Button } from '../ui/Button';

export interface SystemPageShellProps {
  children: React.ReactNode;
  variant?: 'public' | 'app';
  badgeText?: string;
}

export const SystemPageShell: React.FC<SystemPageShellProps> = ({
  children,
  variant = 'public'
}) => {
  const router = useRouter();

  if (variant === 'app') {
    return (
      <AppContent variant="standard" className="relative flex flex-col justify-center items-center py-20">
        <FilmGrainOverlay />
        <div style={{ maxWidth: 800, width: '100%', margin: '0 auto' }}>
          {children}
        </div>
      </AppContent>
    );
  }

  // Public Variant
  return (
    <div className="relative min-h-screen flex flex-col bg-[#F7E7C6] overflow-y-auto text-on-surface w-full">
      <FilmGrainOverlay />

      {/* Top Header navbar */}
      <header
        style={{
          width: '100%',
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          fontFamily: "'Be Vietnam Pro', sans-serif",
          zIndex: 40,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span className="material-symbols-outlined text-brand text-3xl font-bold" style={{ color: '#20A7D8' }}>explore</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 26, color: '#20A7D8', textShadow: '2px 2px 0 #111111' }}>
            TripWise
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/"
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#111111',
              textDecoration: 'none',
              borderBottom: '2px dashed #111111',
              paddingBottom: 2
            }}
            className="hover:text-brand"
          >
            Về trang chủ
          </Link>
          <Button variant="secondary" size="sm" onClick={() => router.push('/planner')}>
            Tạo trip demo
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '32px 24px 64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%' }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          width: '100%',
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '16px 24px',
          borderTop: '2px dashed #D8B98A',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          fontSize: 11,
          fontWeight: 700,
          color: '#7A6A58',
          fontFamily: "'Be Vietnam Pro', sans-serif",
          zIndex: 40
        }}
        className="flex-wrap gap-2 text-center"
      >
        <div>© 2026 TripWise. Hệ thống phản hồi mã lỗi.</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link href="/" style={{ color: '#7A6A58', textDecoration: 'none' }} className="hover:underline">Điều khoản</Link>
          <Link href="/" style={{ color: '#7A6A58', textDecoration: 'none' }} className="hover:underline">Bảo mật</Link>
          <Link href="/" style={{ color: '#7A6A58', textDecoration: 'none' }} className="hover:underline">Liên hệ</Link>
        </div>
      </footer>
    </div>
  );
};
