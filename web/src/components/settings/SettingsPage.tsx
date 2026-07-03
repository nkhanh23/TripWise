"use client";
import React, { useState } from 'react';
import { AppContent } from '@/components/layout/AppContent';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('AI Travel Preferences');
  const [budget, setBudget] = useState('Med');
  const [styles, setStyles] = useState<string[]>(['Nghỉ dưỡng/Chill', 'Khám phá ẩm thực', 'Chụp ảnh check-in']);
  const [transports, setTransports] = useState<string[]>(['Xe máy', 'Ô tô']);
  const [diets, setDiets] = useState<string[]>(['Hải sản', 'Món ăn địa phương']);

  const handleStyleToggle = (style: string) => {
    setStyles(prev => 
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const handleTransportToggle = (transport: string) => {
    setTransports(prev => 
      prev.includes(transport) ? prev.filter(t => t !== transport) : [...prev, transport]
    );
  };

  const handleDietToggle = (diet: string) => {
    setDiets(prev => 
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );
  };

  return (
    <AppContent variant="standard" className="space-y-6 pt-4">
      {/* Header */}
      <div style={{ borderBottom: '2.5px solid var(--stroke-ink)', paddingBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Cài đặt tài khoản & Thiết lập ⚙️</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 650, margin: '6px 0 0' }}>Quản lý cấu hình tài khoản cá nhân và tùy chọn sở thích lập lịch AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Sidebar selectors */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: 'profile', label: 'Hồ sơ cá nhân', icon: 'person' },
            { id: 'ai-pref', label: 'Sở thích du lịch (AI)', icon: 'auto_awesome' },
            { id: 'system', label: 'Cấu hình hệ thống', icon: 'settings' },
            { id: 'security', label: 'Bảo mật & Tài khoản', icon: 'lock' }
          ].map((tab, idx) => {
            const isActive = activeTab === tab.label || (idx === 1 && activeTab === 'AI Travel Preferences');
            const tabStyle: React.CSSProperties = {
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-input)',
              border: isActive ? '2.5px solid var(--color-brand)' : '2.5px solid var(--stroke-soft)',
              backgroundColor: isActive ? 'var(--color-brand-soft)' : 'var(--color-panel)',
              color: isActive ? 'var(--color-brand-dark)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: isActive ? '2px 2px 0 var(--stroke-ink)' : 'none',
              textAlign: 'left',
              fontFamily: "'Be Vietnam Pro', sans-serif"
            };
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.label)}
                style={tabStyle}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Side Settings Panel */}
        <div 
          style={{
            backgroundColor: 'var(--color-panel)',
            border: '3px solid var(--stroke-ink)',
            borderRadius: 'var(--radius-card)',
            padding: 24,
            boxShadow: 'var(--shadow-card)',
            fontFamily: "'Be Vietnam Pro', sans-serif"
          }}
          className="lg:col-span-9 space-y-6"
        >
          <div>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-brand)' }}>psychology</span>
              Sở thích du lịch mặc định
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 650, marginTop: 4, marginBottom: 0 }}>
              AI của TripWise sẽ ưu tiên sử dụng các thông tin này để tự động thiết kế lịch trình tối ưu nhất cho bạn.
            </p>
          </div>

          <div className="space-y-5">
            {/* Default Budget */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase', marginBottom: 6 }}>Ngân sách mặc định</label>
              <div style={{ display: 'flex', backgroundColor: 'var(--color-surface)', borderRadius: 10, padding: 3, border: '1.5px solid var(--stroke-ink)', maxWidth: 320 }}>
                {['Low', 'Med', 'High'].map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBudget(b)}
                    style={{
                      flex: 1,
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 10px',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                      backgroundColor: budget === b ? 'var(--color-yellow)' : 'transparent',
                      fontFamily: "'Be Vietnam Pro', sans-serif"
                    }}
                  >
                    {b === 'Low' ? 'Tiết kiệm' : b === 'Med' ? 'Tiêu chuẩn' : 'Thoải mái'}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Transport */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase', marginBottom: 6 }}>Phương tiện yêu thích</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Đi bộ', 'Xe máy', 'Ô tô', 'Tàu hoả/Xe bus'].map((t) => {
                  const isSelected = transports.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTransportToggle(t)}
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '6px 14px',
                        borderRadius: 12,
                        border: '1.5px solid var(--stroke-ink)',
                        backgroundColor: isSelected ? 'var(--color-brand-soft)' : 'var(--color-panel)',
                        color: isSelected ? 'var(--color-brand-dark)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '2px 2px 0 var(--stroke-ink)' : 'none',
                        transform: isSelected ? 'translate(-1px, -1px)' : 'none',
                        transition: 'all 120ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {t === 'Đi bộ' ? 'directions_walk' : t === 'Xe máy' ? 'two_wheeler' : t === 'Ô tô' ? 'directions_car' : 'directions_bus'}
                      </span>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Travel styles */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase', marginBottom: 6 }}>Phong cách du lịch ưu tiên</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Nghỉ dưỡng/Chill', 'Khám phá ẩm thực', 'Chụp ảnh check-in', 'Thiên nhiên/Leo núi', 'Lịch sử & Văn hoá'].map(s => {
                  const isSelected = styles.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStyleToggle(s)}
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '6px 14px',
                        borderRadius: 12,
                        border: '1.5px solid var(--stroke-ink)',
                        backgroundColor: isSelected ? 'var(--color-yellow)' : 'var(--color-panel)',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '2px 2px 0 var(--stroke-ink)' : 'none',
                        transform: isSelected ? 'translate(-1px, -1px)' : 'none',
                        transition: 'all 120ms ease'
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dietary Preference */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase', marginBottom: 6 }}>Chế độ ăn uống & Dị ứng</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Hải sản', 'Món ăn địa phương', 'Món chay', 'Tránh đồ cay'].map(d => {
                  const isSelected = diets.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleDietToggle(d)}
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '6px 14px',
                        borderRadius: 12,
                        border: '1.5px solid var(--stroke-ink)',
                        backgroundColor: isSelected ? 'var(--color-lime)' : 'var(--color-panel)',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '2px 2px 0 var(--stroke-ink)' : 'none',
                        transform: isSelected ? 'translate(-1px, -1px)' : 'none',
                        transition: 'all 120ms ease'
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Tip Banner */}
          <div style={{
            backgroundColor: 'var(--color-lime-soft)',
            border: '2px dashed var(--stroke-ink)',
            borderRadius: 14,
            padding: 16,
            display: 'flex',
            alignItems: 'start',
            gap: 12,
            fontFamily: "'Be Vietnam Pro', sans-serif"
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-brand-dark)', marginTop: 2 }}>lightbulb</span>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 650, margin: 0, lineHeight: 1.5 }}>
              <strong>Mẹo:</strong> Bạn vẫn có thể tùy chỉnh lại toàn bộ các thông số này trên từng chuyến đi riêng biệt trước khi bấm Tạo lịch trình tại AI Planner.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '2px dashed var(--stroke-light)' }}>
            <button 
              type="button"
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: '8px 16px',
                borderRadius: 'var(--radius-button)',
                border: '2px solid var(--stroke-ink)',
                backgroundColor: 'var(--color-panel)',
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button 
              type="button"
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: '8px 16px',
                borderRadius: 'var(--radius-button)',
                border: '2px solid var(--stroke-ink)',
                backgroundColor: 'var(--color-brand)',
                color: 'var(--text-inverse)',
                boxShadow: '2px 2px 0 var(--stroke-ink)',
                cursor: 'pointer',
              }}
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </AppContent>
  );
};
