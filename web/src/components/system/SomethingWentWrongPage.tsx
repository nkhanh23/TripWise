"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SystemPageShell } from '@/components/layout/SystemPageShell';
import { SystemActionGrid } from '@/components/layout/SystemActionGrid';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KineticTitle } from '@/components/motion/KineticTitle';

export const SomethingWentWrongPage: React.FC = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const errorId = 'TW-500-DEMO-2026';

  const handleRetry = () => {
    setLoading(true);
    setToastMessage('Đang kết nối lại máy lập lịch... 🔄');
    
    setTimeout(() => {
      setLoading(false);
      setToastMessage('Khởi động lại máy lập lịch AI thành công! ⚙️');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    }, 1000);
  };

  const handleCopyError = () => {
    navigator.clipboard.writeText(errorId);
    setToastMessage('Đã sao chép mã lỗi lỗi vào Clipboard! 📋');
  };

  return (
    <SystemPageShell variant="public" badgeText="500 - CRASH">
      {/* Toast popup */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            backgroundColor: '#B8F24A',
            border: '2.5px solid #111111',
            borderRadius: 14,
            boxShadow: '4px 4px 0 #111111',
            padding: '10px 20px',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: 13,
            fontWeight: 800,
            color: '#111111',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
          className="animate-pop-in"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>info</span>
          {toastMessage}
        </div>
      )}

      <div className="space-y-8" style={{ width: '100%', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        
        {/* Main Error Card */}
        <Card
          style={{
            width: '100%',
            padding: 24,
            boxSizing: 'border-box'
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Illustration Gear - Left Column span 5 */}
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
                {/* Gears spinning and smoke effect */}
                <div style={{ position: 'absolute', width: 64, height: 64, border: '3px solid #111111', borderRadius: '50%', backgroundColor: '#FFD166', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 44, color: '#111111' }}>settings</span>
                </div>
                <div style={{ position: 'absolute', top: 40, left: 60, width: 32, height: 32, border: '2.5px solid #111111', borderRadius: '50%', backgroundColor: '#20A7D8' }}>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20, color: '#111111', animationDirection: 'reverse' }}>settings</span>
                </div>

                {/* Cloud of smoke */}
                <div style={{ position: 'absolute', top: 20, width: 44, height: 20, borderRadius: 20, backgroundColor: 'rgba(122,106,88,0.25)', border: '2px solid #111111' }} className="animate-bounce" />

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
                    transform: 'rotate(2deg)'
                  }}
                >
                  Gear Jammed
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
                  Mã lỗi 500
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#E6392E' }}>GEAR CRASH</span>
              </div>

              <div className="space-y-2">
                <KineticTitle text="Máy lập lịch bị kẹt bánh răng ⚙️" size="card" variant="pop" />
                <p style={{ fontSize: 13, color: '#7A6A58', fontWeight: 650, lineHeight: 1.5 }}>
                  Máy chủ lập lịch trình tự động của TripWise tạm thời gặp sự cố kỹ thuật. Hãy kiên nhẫn, kỹ sư của chúng tôi đang gỡ rối.
                </p>
              </div>

              {/* Main Actions links */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                <Button variant="primary" size="md" onClick={handleRetry} disabled={loading}>
                  Thử lại
                </Button>
                <Button variant="secondary" size="md" onClick={() => router.push('/dashboard')}>
                  Về Dashboard
                </Button>
                <Button variant="ghost" size="md" onClick={() => setShowDetails(!showDetails)}>
                  {showDetails ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                </Button>
              </div>

              {/* Error Details mock accordion */}
              {showDetails && (
                <div
                  style={{
                    backgroundColor: '#FFFDF3',
                    border: '2.5px solid #111111',
                    borderRadius: 14,
                    padding: 16,
                    fontSize: 11,
                    fontFamily: "'Courier New', Courier, monospace"
                  }}
                  className="animate-pop-in space-y-2"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Mã giao dịch lỗi:</strong>
                    <button
                      onClick={handleCopyError}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#20A7D8',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      aria-label="Sao chép mã lỗi"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_copy</span>
                      Sao chép
                    </button>
                  </div>
                  <div>Error ID: {errorId}</div>
                  <div style={{ color: '#E6392E', fontWeight: 'bold' }}>Reason: Internal Engine Jammed Exception</div>
                  <div style={{ color: '#7A6A58', fontSize: 10 }}>[Stacktrace hidden to user for safety]</div>
                </div>
              )}
            </div>

          </div>
        </Card>

        {/* Suggested Action title */}
        <div style={{ borderBottom: '2.5px solid #111111', paddingBottom: 6 }}>
          <h4 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: '#111111', margin: 0 }}>
             Các hoạt động thay thế trong lúc chờ đợi
          </h4>
        </div>

        {/* Action Grid links */}
        <SystemActionGrid />

      </div>
    </SystemPageShell>
  );
};
