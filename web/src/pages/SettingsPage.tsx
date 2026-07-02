import React, { useState } from 'react';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-outline-variant pb-6">
        <h2 className="font-bold text-display-lg text-on-background">Cài đặt tài khoản & Thiết lập ⚙️</h2>
        <p className="font-semibold text-body-md text-on-surface-variant">Quản lý cấu hình tài khoản cá nhân và tùy chọn sở thích lập lịch AI.</p>
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
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.label)}
                className={`w-full p-3.5 rounded-xl border flex items-center gap-3 transition-all font-bold text-label-md text-left ${
                  isActive 
                    ? 'border-primary bg-primary-fixed text-primary shadow-sm'
                    : 'border-outline-variant hover:bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Side Settings Panel */}
        <div className="lg:col-span-9 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-title-lg text-on-background flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">psychology</span>
              Sở thích du lịch mặc định
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              AI của TripWise sẽ ưu tiên sử dụng các thông tin này để tự động thiết kế lịch trình tối ưu nhất cho bạn.
            </p>
          </div>

          <div className="space-y-5">
            {/* Default Budget */}
            <div>
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">Ngân sách mặc định</label>
              <div className="flex bg-surface-container rounded-xl p-1 max-w-sm">
                {['Low', 'Med', 'High'].map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBudget(b)}
                    className={`flex-1 py-2 rounded-lg font-semibold text-label-md transition-all ${
                      budget === b
                        ? 'bg-surface-container-lowest shadow-sm text-primary font-bold'
                        : 'text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    {b === 'Low' ? 'Tiết kiệm' : b === 'Med' ? 'Tiêu chuẩn' : 'Thoải mái'}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Transport */}
            <div>
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">Phương tiện yêu thích</label>
              <div className="flex flex-wrap gap-3">
                {['Đi bộ', 'Xe máy', 'Ô tô', 'Tàu hoả/Xe bus'].map((t) => {
                  const isSelected = transports.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTransportToggle(t)}
                      className={`px-4 py-2.5 rounded-xl border font-semibold text-label-md transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'border-2 border-primary bg-primary-fixed text-primary font-bold'
                          : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container'
                      }`}
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
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">Phong cách du lịch ưu tiên</label>
              <div className="flex flex-wrap gap-2">
                {['Nghỉ dưỡng/Chill', 'Khám phá ẩm thực', 'Chụp ảnh check-in', 'Thiên nhiên/Leo núi', 'Lịch sử & Văn hoá'].map(s => {
                  const isSelected = styles.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStyleToggle(s)}
                      className={`px-3 py-1.5 rounded-lg border font-body-sm text-body-sm transition-all ${
                        isSelected
                          ? 'border-2 border-primary bg-primary-fixed text-primary font-bold'
                          : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dietary Preference */}
            <div>
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">Chế độ ăn uống & Dị ứng</label>
              <div className="flex flex-wrap gap-2">
                {['Hải sản', 'Món ăn địa phương', 'Món chay', 'Tránh đồ cay'].map(d => {
                  const isSelected = diets.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleDietToggle(d)}
                      className={`px-3 py-1.5 rounded-lg border font-body-sm text-body-sm transition-all ${
                        isSelected
                          ? 'border-2 border-primary bg-primary-fixed text-primary font-bold'
                          : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Tip Banner */}
          <div className="bg-tripwise-lime/20 border border-tripwise-lime/40 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-0.5">lightbulb</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              <strong>Mẹo:</strong> Bạn vẫn có thể tùy chỉnh lại toàn bộ các thông số này trên từng chuyến đi riêng biệt trước khi bấm Tạo lịch trình tại AI Planner.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-outline-variant flex justify-end gap-3">
            <button className="px-5 py-2.5 bg-surface hover:bg-surface-container border border-outline-variant text-on-surface-variant rounded-xl font-semibold text-label-md transition-colors">
              Hủy
            </button>
            <button className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl font-bold text-label-md shadow-sm transition-colors">
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
