import React from 'react';
import { useNavigate } from 'react-router-dom';

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-100px)] py-8">
      {/* Outer Card container */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row shadow-2xl h-[560px]">
        {/* Left Side branding */}
        <div className="md:w-1/2 bg-[#131b2e] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="material-symbols-outlined text-primary text-3xl font-bold">explore</span>
            <span className="font-bold text-title-lg text-primary">TripWise</span>
          </div>

          <div className="space-y-4 relative z-10 my-auto">
            <h3 className="font-bold text-display-xs text-tripwise-lime leading-tight">Lập kế hoạch thông minh, du lịch tối ưu.</h3>
            <p className="font-body-sm text-body-sm text-outline-variant leading-relaxed">
              "TripWise giúp tôi lập kế hoạch đi Nha Trang chỉ trong 10 giây. Lộ trình bản đồ rất thực tế!" - Khánh Nguyễn.
            </p>
          </div>

          <div className="text-[10px] text-outline-variant">
            © 2026 TripWise - AI Smart Travel Planner.
          </div>

          {/* Decorative ambient background glows */}
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-tripwise-lime/10 blur-3xl" />
        </div>

        {/* Right Side Form */}
        <div className="md:w-1/2 p-8 flex flex-col justify-between bg-surface-container-lowest">
          <div className="space-y-5">
            <div>
              <h2 className="font-bold text-display-xs text-on-background">Chào mừng trở lại! 👋</h2>
              <p className="font-semibold text-body-sm text-on-surface-variant mt-1">Đăng nhập để tiếp tục lên kế hoạch cho những chuyến đi.</p>
            </div>

            {/* Social Oauth logins */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 p-2.5 border border-outline-variant bg-surface hover:bg-surface-container rounded-xl font-bold text-[11px] text-on-surface transition-colors shadow-sm">
                <img alt="Google" className="w-4 h-4" src="https://lh3.googleusercontent.com/COxitBE2501sRqQa11st8_FAyLI1g55v172v8S7106m7TGDxgl1vG=s32" />
                Google
              </button>
              <button className="flex items-center justify-center gap-2 p-2.5 border border-outline-variant bg-surface hover:bg-surface-container rounded-xl font-bold text-[11px] text-on-surface transition-colors shadow-sm">
                <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
                Apple
              </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-outline-variant"></div>
              <span className="flex-shrink mx-3 text-[10px] text-on-surface-variant font-semibold uppercase">hoặc sử dụng Email</span>
              <div className="flex-grow border-t border-outline-variant"></div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-label-sm text-on-surface-variant mb-1.5">Địa chỉ Email</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">mail</span>
                  <input
                    type="email"
                    placeholder="khang.nguyen@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-label-sm text-on-surface-variant mb-1.5 flex justify-between">
                  Mật khẩu
                  <button className="text-primary font-bold hover:underline">Quên mật khẩu?</button>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">lock</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-primary hover:bg-primary-container text-white py-2.5 rounded-xl font-bold text-label-md shadow-md transition-all flex justify-center items-center gap-1"
            >
              Đăng nhập vào TripWise ⚡
            </button>
            <p className="text-center text-[11px] text-on-surface-variant font-semibold">
              Chưa có tài khoản?{' '}
              <button onClick={() => navigate('/register')} className="text-primary font-bold hover:underline">Đăng ký ngay</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
