"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { SystemPageShell } from '@/components/layout/SystemPageShell';
import { SystemActionGrid } from '@/components/layout/SystemActionGrid';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KineticTitle } from '@/components/motion/KineticTitle';

export const TripNotFoundPage: React.FC = () => {
  const router = useRouter();

  return (
    <SystemPageShell variant="app" badgeText="TRIP MISSING">
      <div className="space-y-8" style={{ width: '100%', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        
        {/* Main Card */}
        <Card
          style={{
            width: '100%',
            padding: 24,
            boxSizing: 'border-box'
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Reasons block - Left Column span 6 */}
            <div className="col-span-12 lg:col-span-6 space-y-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    backgroundColor: '#E6392E',
                    color: '#FFFDF3',
                    border: '1.5px solid #111111',
                    borderRadius: 6,
                    padding: '2px 8px',
                    textTransform: 'uppercase',
                    transform: 'skewX(-2deg)'
                  }}
                >
                  Trip missing
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#7A6A58' }}>Mã tham chiếu: nha-trang-123</span>
              </div>

              <div className="space-y-2">
                <KineticTitle text="Không tìm thấy chuyến đi 🗺️" size="card" variant="pop" />
                <p style={{ fontSize: 13, color: '#7A6A58', fontWeight: 650, lineHeight: 1.5 }}>
                  Hành trình du lịch này không còn tồn tại trên máy chủ của TripWise hoặc bạn chưa được phân quyền truy xuất.
                </p>
              </div>

              {/* Reasons list */}
              <div 
                style={{ 
                  backgroundColor: '#FFF6DE', 
                  border: '2px solid #111111', 
                  borderRadius: 16, 
                  padding: 16, 
                  boxShadow: '3px 3px 0 #111111' 
                }}
                className="space-y-2 text-xs font-bold text-outline"
              >
                <div style={{ fontWeight: 900, fontSize: 13, color: '#111111', marginBottom: 6 }}>
                  Nguyên nhân khả thi:
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="material-symbols-outlined text-warning" style={{ fontSize: 16 }}>warning</span>
                  <span>Đường dẫn (URL) chia sẻ chuyến đi chưa chính xác.</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="material-symbols-outlined text-warning" style={{ fontSize: 16 }}>warning</span>
                  <span>Chuyến đi đã bị chủ sở hữu xóa vĩnh viễn khỏi thư viện.</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="material-symbols-outlined text-warning" style={{ fontSize: 16 }}>warning</span>
                  <span>Bạn chưa đăng nhập đúng tài khoản Explorer có quyền xem.</span>
                </div>
              </div>

              {/* Actions row */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8 }}>
                <Button variant="primary" size="md" onClick={() => router.push('/planner')}>
                  Tạo lịch trình mới
                </Button>
                <Button variant="secondary" size="md" onClick={() => router.push('/trips')}>
                  Xem trips đã lưu
                </Button>
                <Button variant="ghost" size="md" onClick={() => router.push('/explore')}>
                  Khám phá địa điểm
                </Button>
              </div>
            </div>

            {/* Suggested prompt card - Right Column span 6 */}
            <div className="col-span-12 lg:col-span-6 space-y-4">
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 20,
                  padding: 20,
                  boxShadow: '4px 4px 0 #111111',
                  boxSizing: 'border-box'
                }}
                className="space-y-4"
              >
                <div style={{ fontWeight: 900, fontSize: 14, color: '#111111' }}>
                  💡 Bạn muốn lập lại lịch trình tương tự?
                </div>
                <p style={{ fontSize: 11, color: '#7A6A58', fontWeight: 650, margin: 0 }}>
                  Sử dụng prompt mẫu Nha Trang bên dưới để AI lập lại một chuyến đi hoàn chỉnh chỉ trong 10 giây:
                </p>

                {/* Textarea preview notepad look */}
                <div
                  style={{
                    backgroundColor: '#FFF6DE',
                    border: '2px solid #111111',
                    borderRadius: 12,
                    padding: 14,
                    fontStyle: 'italic',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#3A2F2A',
                    lineHeight: 1.5,
                    boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.05)'
                  }}
                >
                  {"\"Tạo chuyến du lịch Nha Trang 3 ngày 2 đêm dành cho 2 người, phong cách Chill & Foodie, di chuyển bằng xe máy, ngân sách vừa phải, thích check-in biển và hải sản ngon.\""}
                </div>

                <Button
                  variant="secondary"
                  size="md"
                  style={{ width: '100%' }}
                  onClick={() => router.push('/planner?presetPrompt=true')}
                >
                  Tạo lại bằng AI 🤖
                </Button>
              </div>
            </div>

          </div>
        </Card>

        {/* Suggested Action Grid */}
        <div style={{ borderBottom: '2.5px solid #111111', paddingBottom: 6 }}>
          <h4 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: '#111111', margin: 0 }}>
             Khám phá thêm các công cụ hỗ trợ
          </h4>
        </div>
        <SystemActionGrid />

      </div>
    </SystemPageShell>
  );
};
