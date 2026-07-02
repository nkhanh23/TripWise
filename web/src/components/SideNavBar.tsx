import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface SideNavBarProps {}

export const SideNavBar: React.FC<SideNavBarProps> = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
    { path: '/planner', label: 'AI Planner', icon: 'auto_awesome' },
    { path: '/saved-trips', label: 'Chuyến đi đã lưu', icon: 'map' },
    { path: '/explore', label: 'Khám phá', icon: 'explore' },
    { path: '/settings', label: 'Cài đặt', icon: 'settings' },
    { path: '/admin/places', label: 'Quản trị', icon: 'admin_panel_settings' },
  ];

  return (
    <nav className="bg-surface-container-lowest border-r border-outline-variant flex flex-col items-center py-6 space-y-6 absolute left-0 top-0 h-full w-20 z-50">
      <Link to="/" className="mb-4 text-center group">
        <span className="material-symbols-outlined text-primary text-3xl font-bold transition-transform duration-200 group-hover:scale-105">explore</span>
        <span className="block font-bold text-primary text-[10px]">TripWise</span>
      </Link>

      <div className="w-full flex-1 flex flex-col space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex flex-col items-center justify-center p-2.5 transition-all duration-200 hover:bg-surface-container-low ${
                isActive
                  ? 'text-primary border-l-4 border-primary bg-surface-container-high scale-105 font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span 
                className="material-symbols-outlined mb-1 text-[22px]" 
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-bold text-[9px] leading-tight text-center tracking-normal px-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
        <img
          alt="User profile"
          className="w-10 h-10 rounded-full border border-outline-variant object-cover hover:scale-105 transition-transform cursor-pointer"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDM2sK1bLorca8zPyVHso6jW1VkgR-VsriJM8ncICEYxihVfucFneUbfLqwBRr5GY-6WoIfe6_oszzZ8hMUtN4QBzOlpmPuUW4bMhCb7V6StxcH8T5DRD01BTH87zbBFjYo3JcuNZguTccuRGfc-E4juK6gir0-i1YWUd_-lnaOEEeEeX3ycqCf5ATwTLv017vF2R19Whh369LeH09VXOqeEbSzsZncPr9XGm5ivU8VXwL70BnCETWJcbDQG85ktvjB5aB_Yr_QBmq_"
        />
      </div>
    </nav>
  );
};
