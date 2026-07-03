"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { SystemPageShell } from '@/components/layout/SystemPageShell';
import { SystemActionGrid } from '@/components/layout/SystemActionGrid';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KineticTitle } from '@/components/motion/KineticTitle';

export const ForbiddenPage: React.FC = () => {
  const router = useRouter();

  return (
    <SystemPageShell variant="public" badgeText="403 - BLOCKED">
      <div className="space-y-8" style={{ width: '100%', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        
        {/* Main Card */}
        <Card
          style={{
            width: '100%',
            padding: 24,
            boxSizing: 'border-box'
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Visual Block - Left Column span 5 */}
            <div className="col-span-12 lg:col-span-5 flex justify-center">
              <div
                style={{
                  width: '100%',
                  maxWidth: 260,
                  height: 180,
                  backgroundColor: '#FFF6DE',
                  border: '3px solid #111111',
                  borderRadius: 16,
                  boxShadow: '4px 4px 0 #111111',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Boarding pass watermark */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(#111 2px, transparent 2px)', backgroundSize: '20px 20px' }} />

                {/* Big Stamp graphic */}
                <div
                  style={{
                    width: 110,
                    height: 110,
                    border: '3.5px dashed #E6392E',
                    borderRadius: '50%',
                    color: '#E6392E',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: 'rotate(10deg)',
                    fontWeight: 900,
                    fontSize: 10,
                    textAlign: 'center'
                  }}
                  className="animate-pop-in"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 32 }}>block</span>
                  NO TICKET
                </div>

                <span
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    backgroundColor: '#E6392E',
                    color: '#FFF6DE',
                    border: '1.5px solid #111111',
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontSize: 8,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    transform: 'rotate(-2deg)'
                  }}
                >
                  Access Denied
                </span>
              </div>
            </div>

            {/* Info details - Right Column span 7 */}
            <div className="col-span-12 lg:col-span-7 space-y-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    backgroundColor: '#E6392E',
                    color: '#FFF6DE',
                    border: '2px solid #111111',
                    borderRadius: 6,
                    padding: '2px 10px',
                    textTransform: 'uppercase',
                    transform: 'skewX(-3deg)',
                    boxShadow: '2px 2px 0 #111111'
                  }}
                >
                  Mã lỗi 403
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#E6392E' }}>FORBIDDEN AREA</span>
              </div>

              <div className="space-y-2">
                <KineticTitle text="Bạn chưa có vé vào khu vực này 🎫" size="card" variant="pop" />
                <p style={{ fontSize: 13, color: '#7A6A58', fontWeight: 650, lineHeight: 1.5 }}>
                  Tài khoản Explorer hiện tại của bạn không được cấp quyền để truy cập trang cài đặt hệ thống Admin hoặc quản trị cao cấp này.
                </p>
              </div>

              {/* Main Actions links */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                <Button variant="primary" size="md" onClick={() => router.push('/dashboard')}>
                  Về Dashboard
                </Button>
                <Button variant="secondary" size="md" onClick={() => router.push('/login')}>
                  Đăng nhập tài khoản khác
                </Button>
                <Button variant="ghost" size="md" onClick={() => router.push('/')}>
                  Liên hệ hỗ trợ
                </Button>
              </div>
            </div>

          </div>
        </Card>

        {/* Suggested Action title */}
        <div style={{ borderBottom: '2.5px solid #111111', paddingBottom: 6 }}>
          <h4 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: '#111111', margin: 0 }}>
             Tìm lộ trình an toàn khác
          </h4>
        </div>

        {/* Action Grid links */}
        <SystemActionGrid />

      </div>
    </SystemPageShell>
  );
};
