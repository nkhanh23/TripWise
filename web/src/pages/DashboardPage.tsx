import React from 'react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-6">
        <div>
          <h2 className="font-bold text-display-lg text-on-background">Chào Khánh! 👋</h2>
          <p className="font-semibold text-body-md text-on-surface-variant">Chúc bạn có những chuyến hành trình tuyệt vời.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/planner')}
            className="bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-xl font-bold text-label-md shadow-md transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">magic_button</span>
            + New Trip
          </button>
          <button className="bg-tripwise-lime text-on-surface border border-tripwise-lime hover:bg-surface-container-high px-5 py-2.5 rounded-xl font-bold text-label-md transition-colors">
            Import Route
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Continue planning + Recent Trips */}
        <div className="lg:col-span-8 space-y-6">
          {/* Continue Planning Card */}
          <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col justify-between h-56 hover:scale-[1.01] transition-transform duration-300">
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-primary-fixed text-on-primary-fixed text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Draft</span>
                <h3 className="font-bold text-title-lg text-on-background mt-2">Chuyến đi Nha Trang đang lập dở</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Đã chọn ngày (12/07 - 14/07), chưa chọn ngân sách và phương tiện di chuyển...</p>
              </div>
              <span className="font-bold text-primary text-xs">60%</span>
            </div>

            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden my-4">
              <div className="bg-primary h-full rounded-full" style={{ width: '60%' }} />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate('/planner')}
                className="bg-primary hover:bg-primary-container text-white px-4 py-2 rounded-xl font-bold text-label-md transition-colors"
              >
                Tiếp tục thiết lập
              </button>
              <button className="px-4 py-2 bg-surface hover:bg-surface-container border border-outline-variant text-on-surface-variant rounded-xl font-semibold text-label-md transition-colors">
                Xoá bản nháp
              </button>
            </div>
          </div>

          {/* Recent Trips Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-title-lg text-on-background">Chuyến đi gần đây</h3>
              <button onClick={() => navigate('/saved-trips')} className="text-primary font-bold text-label-md hover:underline">View All</button>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'dalat-456',
                  title: 'Đà Lạt Mộng Mơ',
                  details: '12km • 4 spots',
                  status: 'Planned',
                  icon: 'landscape'
                },
                {
                  id: 'phu-quoc-789',
                  title: 'Phú Quốc Summer',
                  details: '45km • 12 spots',
                  status: 'Completed',
                  icon: 'sailing'
                }
              ].map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex justify-between items-center hover:bg-surface-container-low cursor-pointer transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">{trip.icon}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-on-background">{trip.title}</h4>
                      <p className="text-[11px] text-on-surface-variant">{trip.details}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                      trip.status === 'Planned'
                        ? 'bg-primary-fixed text-on-primary-fixed border border-primary/20'
                        : 'bg-tripwise-lime/30 text-on-surface-variant border border-tripwise-lime/60'
                    }`}>
                      {trip.status}
                    </span>
                    <span className="material-symbols-outlined text-outline">chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): AI suggestions + Weather + Saved places */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Suggestions Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-title-md text-on-background flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">psychology</span>
              AI Smart Suggestions
            </h3>
            <div className="space-y-4">
              <div className="bg-surface p-3.5 rounded-xl border border-outline-variant text-[11px] text-on-surface-variant leading-relaxed">
                Dự báo mưa tại Nha Trang vào ngày 13/07. Cân nhắc dời lịch trình biển sang 14/07?
                <div className="flex gap-2 mt-3">
                  <button className="bg-tripwise-lime text-on-surface px-3 py-1 rounded-lg font-bold text-[10px] hover:opacity-90">Áp dụng</button>
                  <button className="text-on-surface-variant hover:text-primary px-3 py-1 font-semibold text-[10px]">Bỏ qua</button>
                </div>
              </div>
              <div className="bg-surface p-3.5 rounded-xl border border-outline-variant text-[11px] text-on-surface-variant leading-relaxed">
                Bạn thường thích nghỉ ngơi 3 ngày cuối tuần. Có muốn thêm 1 ngày cho chuyến đi này?
              </div>
            </div>
          </div>

          {/* Weather Brief Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">WEATHER BRIEF</span>
              <h4 className="font-bold text-on-background mt-1">Nha Trang</h4>
              <p className="text-[11px] text-on-surface-variant">Tomorrow: 30°C</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-display-sm text-on-background">29°C</span>
              <span className="material-symbols-outlined text-amber-500 text-3xl">light_mode</span>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Tìm địa điểm', icon: 'search', path: '/explore' },
              { label: 'Xem bản đồ', icon: 'map', path: '/explore' },
              { label: 'Cài đặt sở thích', icon: 'tune', path: '/settings' },
              { label: 'Thống kê chi phí', icon: 'bar_chart', path: '/saved-trips' }
            ].map((act, idx) => (
              <button
                key={idx}
                onClick={() => navigate(act.path)}
                className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-surface-container-low transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-primary mb-2 text-2xl">{act.icon}</span>
                <span className="font-bold text-[11px] text-on-surface leading-tight">{act.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
