import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-100px)] py-8 text-center">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] p-12 max-w-lg w-full shadow-2xl space-y-6 flex flex-col items-center">
        {/* Stylized icon/illustration mock */}
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
          <span className="material-symbols-outlined text-5xl">explore_off</span>
          <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-tripwise-lime border-4 border-white animate-pulse"></span>
        </div>

        <h1 className="font-bold text-display-lg text-primary leading-none tracking-tight">404</h1>
        
        <div className="space-y-2">
          <h2 className="font-bold text-display-xs text-on-background">Úi! Có vẻ bạn đã đi lạc đường...</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            Trang bạn đang tìm kiếm không tồn tại, đã bị di chuyển hoặc lịch trình chuyến đi này không còn hoạt động trên hệ thống.
          </p>
        </div>

        <div className="flex gap-4 w-full pt-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 bg-primary hover:bg-primary-container text-white py-3 rounded-xl font-bold text-label-md shadow-md transition-colors"
          >
            Quay lại Bảng điều khiển 🏠
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-3 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-xl font-semibold text-label-md transition-colors"
          >
            Trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};
