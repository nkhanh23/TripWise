import React from 'react';
import { useNavigate } from 'react-router-dom';

export const SavedTripsPage: React.FC = () => {
  const navigate = useNavigate();

  const trips = [
    {
      id: 'nha-trang-123',
      title: 'Nha Trang Hè Rực Rỡ',
      destination: 'Nha Trang, Vietnam',
      duration: '3 ngày 2 đêm',
      date: '12/07 - 14/07/2026',
      status: 'Planned',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZl-b4O8uE5F02letlae5D7LiMmm8M9ftFv09JxI9Y-FI5waGnmVNC_ULC8gbahg1OTA-HysTS-Fsi8HE_5AUeVaZh29w60haMKFjTZuz5W-xN7VO75DMg40Lm4O53zHdzgUfMjm67G-_WFbMIYYGiIPIMLrM1G49NzzHDzrnRV14Ij-3F3dbDONNlXzML15y8Fxelfkx9vhLi2y8MqmD9q9cNfri_yS5SpkR2lk6J4oeqk2-h51mW5YfKZQUi_8agC5fl0B4SIRgw',
      distance: '25 km',
      stops: 9,
      transport: 'Motorbike'
    },
    {
      id: 'dalat-456',
      title: 'Đà Lạt Mộng Mơ',
      destination: 'Đà Lạt, Lâm Đồng',
      duration: '2 ngày 1 đêm',
      date: '18/07 - 19/07/2026',
      status: 'Planned',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCN0C3WskfP6u286lBqGZp93R2Wl_OQz_a-V10fFv5H_g82K5iUf_a-w8r7G_B0m96sN7Xp6z_eR6M9h1WUtN4QBzOlpmPuUW4bMhCb7V6StxcH8T5DRD01BTH87zbBFjYo3JcuNZguTccuRGfc-E4juK6gir0-i1YWUd_-lnaOEEeEeX3ycqCf5ATwTLv017vF2R19Whh369LeH09VXOqeEbSzsZncPr9XGm5ivU8VXwL70BnCETWJcbDQG85ktvjB5aB_Yr_QBmq_',
      distance: '12 km',
      stops: 4,
      transport: 'Car'
    },
    {
      id: 'phu-quoc-789',
      title: 'Phú Quốc Summer Trip',
      destination: 'Phú Quốc, Kiên Giang',
      duration: '5 ngày 4 đêm',
      date: '01/05 - 05/05/2026',
      status: 'Completed',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCN0C3WskfP6u286lBqGZp93R2Wl_OQz_a-V10fFv5H_g82K5iUf_a-w8r7G_B0m96sN7Xp6z_eR6M9h1WUtN4QBzOlpmPuUW4bMhCb7V6StxcH8T5DRD01BTH87zbBFjYo3JcuNZguTccuRGfc-E4juK6gir0-i1YWUd_-lnaOEEeEeX3ycqCf5ATwTLv017vF2R19Whh369LeH09VXOqeEbSzsZncPr9XGm5ivU8VXwL70BnCETWJcbDQG85ktvjB5aB_Yr_QBmq_',
      distance: '45 km',
      stops: 12,
      transport: 'Car'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-6">
        <div>
          <h2 className="font-bold text-display-lg text-on-background">Thư viện chuyến đi 🗂️</h2>
          <p className="font-semibold text-body-md text-on-surface-variant">Quản lý và xem lại các lịch trình du lịch của bạn.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              type="text"
              placeholder="Tìm kiếm chuyến đi..."
              className="pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary w-64 transition-all"
            />
          </div>
          <button
            onClick={() => navigate('/planner')}
            className="bg-tripwise-blue hover:bg-primary-container text-white px-5 py-2.5 rounded-xl font-bold text-label-md shadow-md transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tạo chuyến đi mới
          </button>
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-xl border border-outline-variant">
        <div className="flex gap-2">
          {['Tất cả', 'Bản nháp (Drafts)', 'Sắp đi (Planned)', 'Đã đi (Completed)'].map((tab, idx) => (
            <button
              key={idx}
              className={`px-4 py-1.5 rounded-lg font-semibold text-label-md transition-all ${
                idx === 0
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant text-label-md font-semibold">
          <span>Sắp xếp theo:</span>
          <select className="bg-transparent border-none focus:outline-none font-bold text-primary cursor-pointer">
            <option>Gần đây nhất</option>
            <option>Tên chuyến đi</option>
            <option>Thời gian</option>
          </select>
        </div>
      </div>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 shadow-sm flex flex-col group"
          >
            {/* Banner Photo */}
            <div className="relative h-44 overflow-hidden">
              <img
                alt={trip.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                src={trip.image}
              />
              <div className="absolute top-3 right-3 bg-surface-container-lowest/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-outline-variant shadow-sm text-[10px] font-bold text-on-surface">
                {trip.duration}
              </div>
            </div>

            {/* Content info */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-title-lg text-on-background">{trip.title}</h3>
                  <button className="text-on-surface-variant hover:text-primary">
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </div>
                <p className="font-semibold text-body-sm text-on-surface-variant mb-4 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                  {trip.destination}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                    trip.status === 'Planned'
                      ? 'bg-primary-fixed text-on-primary-fixed border border-primary/20'
                      : 'bg-tripwise-lime/30 text-on-surface-variant border border-tripwise-lime/60'
                  }`}>
                    {trip.status === 'Planned' ? 'Đã lên kế hoạch' : 'Đã hoàn thành'}
                  </span>
                  <span className="bg-tripwise-lime/30 text-on-surface-variant border border-tripwise-lime/60 px-2.5 py-0.5 rounded-full font-semibold text-[10px]">
                    Đã tối ưu
                  </span>
                </div>
              </div>

              <div className="border-t border-outline-variant pt-4 mt-auto">
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mb-0.5">route</span>
                    <span className="text-[10px] text-on-surface-variant leading-none">Distance</span>
                    <span className="font-bold text-on-background text-xs mt-1">{trip.distance}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mb-0.5">pin_drop</span>
                    <span className="text-[10px] text-on-surface-variant leading-none">Stops</span>
                    <span className="font-bold text-on-background text-xs mt-1">{trip.stops} stops</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mb-0.5">directions_bike</span>
                    <span className="text-[10px] text-on-surface-variant leading-none">Vehicle</span>
                    <span className="font-bold text-on-background text-xs mt-1">{trip.transport}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  className="w-full bg-surface hover:bg-surface-container border border-outline-variant text-primary py-2 rounded-xl font-bold text-label-md transition-colors"
                >
                  Mở chi tiết
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
