"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { SystemPageShell } from '@/components/layout/SystemPageShell';
import { SystemActionGrid } from '@/components/layout/SystemActionGrid';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KineticTitle } from '@/components/motion/KineticTitle';

export const NotFoundPage: React.FC = () => {
  const router = useRouter();

  return (
    <SystemPageShell variant="public" badgeText="404 - LOST">
      <div className="space-y-8" style={{ width: '100%', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        
        {/* Error Main Card */}
        <Card
          style={{
            width: '100%',
            padding: 24,
            boxSizing: 'border-box'
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Visual block - Left Column span 5 */}
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
                {/* Torn grid background */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(#111 1.5px, transparent 1.5px)', backgroundSize: '15px 15px' }} />
                
                {/* Dotted route lines with markers and question mark */}
                <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <path d="M 20 150 Q 80 80 140 100 T 230 40" fill="none" stroke="#111111" strokeWidth="2.5" strokeDasharray="6,6" />
                  <path d="M 20 150 Q 80 80 140 100 T 230 40" fill="none" stroke="#E6392E" strokeWidth="1.5" strokeDasharray="5,5" />
                </svg>

                {/* Markers */}
                <div style={{ position: 'absolute', bottom: 20, left: 16, width: 14, height: 14, border: '2.5px solid #111111', backgroundColor: '#B8F24A', borderRadius: '50%' }} />
                
                {/* Question mark marker */}
                <div
                  style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    backgroundColor: '#E6392E',
                    border: '2px solid #111111',
                    boxShadow: '2px 2px 0 #111111',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF6DE',
                    fontWeight: 900,
                    fontSize: 18,
                    fontFamily: "var(--font-display)"
                  }}
                  className="animate-bounce"
                >
                  ?
                </div>

                <span
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    backgroundColor: '#FFD166',
                    border: '1.5px solid #111111',
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontSize: 8,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    transform: 'rotate(-4deg)'
                  }}
                >
                  Wrong Turn
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
                  Mã lỗi 404
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#E6392E' }}>LOST WAYFARER</span>
              </div>

              <div className="space-y-2">
                <KineticTitle text="Lạc đường rồi! 🗺️" size="card" variant="pop" />
                <p style={{ fontSize: 13, color: '#7A6A58', fontWeight: 650, lineHeight: 1.5 }}>
                  Trang bạn đang tìm kiếm có thể đã đổi địa chỉ, bị xóa tạm thời hoặc chưa từng tồn tại trên bản đồ hành trình của TripWise.
                </p>
              </div>

              {/* Main Actions links */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8 }}>
                <Button variant="primary" size="md" onClick={() => router.push('/')}>
                  Về trang chủ
                </Button>
                <Button variant="secondary" size="md" onClick={() => router.push('/dashboard')}>
                  Mở Dashboard
                </Button>
                <Button variant="ghost" size="md" onClick={() => router.push('/explore')}>
                  Khám phá địa điểm
                </Button>
              </div>
            </div>

          </div>
        </Card>

        {/* Suggested Action title */}
        <div style={{ borderBottom: '2.5px solid #111111', paddingBottom: 6 }}>
          <h4 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: '#111111', margin: 0 }}>
             Gợi ý hành trình thay thế dành cho bạn
          </h4>
        </div>

        {/* Action Grid links */}
        <SystemActionGrid />

      </div>
    </SystemPageShell>
  );
};
