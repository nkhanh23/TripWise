import React from 'react';

export const AdminPlacesPage: React.FC = () => {
  const adminPlaces = [
    {
      id: 'ponagar',
      name: 'Tháp Bà Ponagar',
      category: 'Di tích lịch sử',
      coords: '12.2706, 109.1947',
      status: 'Verified',
      views: '2,420'
    },
    {
      id: 'chondam',
      name: 'Chợ Đầm Nha Trang',
      category: 'Mua sắm & Ẩm thực',
      coords: '12.2530, 109.1915',
      status: 'Verified',
      views: '1,890'
    },
    {
      id: 'haisangiobien',
      name: 'Hải Sản Gió Biển',
      category: 'Ẩm thực & Nhà hàng',
      coords: '12.2415, 109.1960',
      status: 'Draft',
      views: '420'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-6">
        <div>
          <h2 className="font-bold text-display-lg text-on-background">Quản lý địa điểm 🏢</h2>
          <p className="font-semibold text-body-md text-on-surface-variant">Danh sách và trạng thái cơ sở dữ liệu địa điểm du lịch trên hệ thống.</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-tripwise-lime text-on-surface border border-tripwise-lime hover:bg-surface-container-high px-4 py-2.5 rounded-xl font-bold text-label-md transition-colors">
            Nhập hàng loạt (Batch Import)
          </button>
          <button className="bg-primary hover:bg-primary-container text-white px-4 py-2.5 rounded-xl font-bold text-label-md shadow-md transition-all flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Thêm địa điểm mới
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-surface-container-low p-4 rounded-2xl border border-outline-variant">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc khu vực..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary w-full transition-all"
          />
        </div>
        <div className="flex gap-3">
          <select className="bg-surface border border-outline-variant px-4 py-2.5 rounded-xl text-on-surface font-semibold text-label-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
            <option>Khu vực: Nha Trang</option>
            <option>Đà Lạt</option>
            <option>Phú Quốc</option>
          </select>
          <select className="bg-surface border border-outline-variant px-4 py-2.5 rounded-xl text-on-surface font-semibold text-label-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
            <option>Danh mục: Tất cả</option>
            <option>Di tích lịch sử</option>
            <option>Ẩm thực & Nhà hàng</option>
            <option>Cà phê</option>
          </select>
          <select className="bg-surface border border-outline-variant px-4 py-2.5 rounded-xl text-on-surface font-semibold text-label-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
            <option>Trạng thái: Tất cả</option>
            <option>Đã duyệt</option>
            <option>Chờ duyệt</option>
          </select>
        </div>
      </div>

      {/* Places Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              <th className="p-4 pl-6">Tên địa điểm</th>
              <th className="p-4">Danh mục</th>
              <th className="p-4">Tọa độ</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4">Lượt xem</th>
              <th className="p-4 pr-6 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant font-body-sm text-body-sm text-on-background">
            {adminPlaces.map((place) => (
              <tr key={place.id} className="hover:bg-surface-container-low/50 transition-colors">
                <td className="p-4 pl-6 font-bold flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {place.name.charAt(0)}
                  </div>
                  {place.name}
                </td>
                <td className="p-4 text-on-surface-variant">{place.category}</td>
                <td className="p-4 font-mono text-xs">{place.coords}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] inline-flex items-center gap-1 ${
                    place.status === 'Verified'
                      ? 'bg-tripwise-lime/30 text-on-surface-variant border border-tripwise-lime/60'
                      : 'bg-surface-container-high text-on-surface-variant border border-outline-variant'
                  }`}>
                    <span className="material-symbols-outlined text-[10px]">
                      {place.status === 'Verified' ? 'check_circle' : 'pending'}
                    </span>
                    {place.status === 'Verified' ? 'Đã duyệt (Verified)' : 'Chờ duyệt (Draft)'}
                  </span>
                </td>
                <td className="p-4 font-semibold text-on-surface-variant">{place.views}</td>
                <td className="p-4 pr-6 text-right space-x-2">
                  <button className="p-1.5 border border-outline-variant text-outline hover:text-primary rounded-lg hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button className="p-1.5 border border-outline-variant text-outline hover:text-red-500 rounded-lg hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
