import React, { useState } from 'react';
import { TravelMap } from '../components/TravelMap';

export const ExplorePlacesPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);

  const categories = ['Tất cả', 'Điểm tham quan', 'Ăn uống', 'Cà phê', 'Khách sạn'];

  const places = [
    {
      id: 'ponagar',
      name: 'Tháp Bà Ponagar',
      category: 'Di tích lịch sử',
      rating: '4.8 ⭐ (1.2k views)',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZl-b4O8uE5F02letlae5D7LiMmm8M9ftFv09JxI9Y-FI5waGnmVNC_ULC8gbahg1OTA-HysTS-Fsi8HE_5AUeVaZh29w60haMKFjTZuz5W-xN7VO75DMg40Lm4O53zHdzgUfMjm67G-_WFbMIYYGiIPIMLrM1G49NzzHDzrnRV14Ij-3F3dbDONNlXzML15y8Fxelfkx9vhLi2y8MqmD9q9cNfri_yS5SpkR2lk6J4oeqk2-h51mW5YfKZQUi_8agC5fl0B4SIRgw',
      tags: ['Văn hoá Chăm', 'Gần trung tâm'],
      lat: 12.2706,
      lng: 109.1947
    },
    {
      id: 'honchong',
      name: 'Hòn Chồng Nha Trang',
      category: 'Cảnh quan tự nhiên',
      rating: '4.6 ⭐ (890 views)',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCN0C3WskfP6u286lBqGZp93R2Wl_OQz_a-V10fFv5H_g82K5iUf_a-w8r7G_B0m96sN7Xp6z_eR6M9h1WUtN4QBzOlpmPuUW4bMhCb7V6StxcH8T5DRD01BTH87zbBFjYo3JcuNZguTccuRGfc-E4juK6gir0-i1YWUd_-lnaOEEeEeX3ycqCf5ATwTLv017vF2R19Whh369LeH09VXOqeEbSzsZncPr9XGm5ivU8VXwL70BnCETWJcbDQG85ktvjB5aB_Yr_QBmq_',
      tags: ['Ngắm hoàng hôn', 'Bờ biển'],
      lat: 12.2530,
      lng: 109.1915
    },
    {
      id: 'haisangiobien',
      name: 'Hải Sản Gió Biển',
      category: 'Ẩm thực & Nhà hàng',
      rating: '4.5 ⭐ (420 views)',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZl-b4O8uE5F02letlae5D7LiMmm8M9ftFv09JxI9Y-FI5waGnmVNC_ULC8gbahg1OTA-HysTS-Fsi8HE_5AUeVaZh29w60haMKFjTZuz5W-xN7VO75DMg40Lm4O53zHdzgUfMjm67G-_WFbMIYYGiIPIMLrM1G49NzzHDzrnRV14Ij-3F3dbDONNlXzML15y8Fxelfkx9vhLi2y8MqmD9q9cNfri_yS5SpkR2lk6J4oeqk2-h51mW5YfKZQUi_8agC5fl0B4SIRgw',
      tags: ['Hải sản tươi', 'Bình dân'],
      lat: 12.2415,
      lng: 109.1960
    }
  ];

  const mapMarkers = places.map(p => ({
    position: [p.lat, p.lng] as [number, number],
    label: p.name
  }));

  const mapCoordinates = places.map(p => [p.lat, p.lng] as [number, number]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Left Panel (Search & List) */}
      <div className="lg:col-span-5 flex flex-col space-y-5 overflow-y-auto pr-2">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="font-bold text-display-md text-on-background">Khám phá địa điểm 🗺️</h2>
            <p className="font-semibold text-body-sm text-on-surface-variant">Tìm kiếm danh lam thắng cảnh, nhà hàng, khách sạn.</p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              type="text"
              defaultValue="Nha Trang, Khánh Hòa"
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary w-full transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full font-semibold text-label-sm whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Place List */}
        <div className="space-y-4 flex-1">
          {places.map((place) => (
            <div
              key={place.id}
              onMouseEnter={() => setHoveredPlaceId(place.id)}
              onMouseLeave={() => setHoveredPlaceId(null)}
              className={`bg-surface-container-lowest border rounded-2xl overflow-hidden hover:scale-[1.01] transition-all shadow-sm flex h-32 relative ${
                hoveredPlaceId === place.id ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              {/* Photo */}
              <div className="w-1/3 h-full overflow-hidden">
                <img
                  alt={place.name}
                  className="w-full h-full object-cover"
                  src={place.image}
                />
              </div>

              {/* Info content */}
              <div className="p-4 w-2/3 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-title-md text-on-background leading-tight">{place.name}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-on-surface-variant font-medium">{place.category}</span>
                    <span className="text-[10px] text-on-surface-variant font-bold">{place.rating}</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {place.tags.map((tag, idx) => (
                      <span key={idx} className="bg-surface-container border border-outline-variant px-2 py-0.5 rounded text-[8px] font-semibold text-on-surface-variant">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex gap-2 justify-end mt-2">
                  <button className="bg-primary hover:bg-primary-container text-white px-2.5 py-1 rounded-lg text-[9px] font-bold shadow-sm transition-all flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">add</span>
                    Thêm vào trip
                  </button>
                  <button className="p-1 border border-outline-variant text-outline hover:text-red-500 rounded-lg hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-[14px]">favorite</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel (Map View) */}
      <div className="lg:col-span-7 h-full relative">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full h-full overflow-hidden relative shadow-sm">
          <TravelMap
            center={[12.258, 109.194]}
            markers={mapMarkers}
            routeCoordinates={mapCoordinates}
          />
        </div>
      </div>
    </div>
  );
};
