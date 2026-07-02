import React from 'react';
import { useNavigate } from 'react-router-dom';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-100px)] py-8">
      {/* Outer Card container */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row shadow-2xl h-[620px]">
        {/* Left Side branding */}
        <div className="md:w-1/2 bg-[#131b2e] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="material-symbols-outlined text-primary text-3xl font-bold">explore</span>
            <span className="font-bold text-title-lg text-primary">TripWise</span>
          </div>

          <div className="space-y-4 relative z-10 my-auto">
            <h3 className="font-bold text-display-xs text-tripwise-lime leading-tight">Tạo hành trình của riêng bạn.</h3>
            <p className="font-body-sm text-body-sm text-outline-variant leading-relaxed">
              Hơn 5,000+ chuyến đi đã được tối ưu hóa thành công bởi trí tuệ nhân tạo. Đăng ký tài khoản miễn phí để lưu và chia sẻ lịch trình.
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
          <div className="space-y-4">
            <div>
              <h2 className="font-bold text-display-xs text-on-background">Tạo tài khoản mới 🚀</h2>
              <p className="font-semibold text-body-sm text-on-surface-variant mt-1">Khám phá thế giới cùng kế hoạch thông minh từ AI.</p>
            </div>

            {/* Inputs */}
            <div className="space-y-3.5">
              <div>
                <label className="block font-semibold text-label-sm text-on-surface-variant mb-1">Họ và tên</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">person</span>
                  <input
                    type="text"
                    placeholder="Khánh Nguyễn"
                    className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-xl font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-label-sm text-on-surface-variant mb-1">Địa chỉ Email</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">mail</span>
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-xl font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-label-sm text-on-surface-variant mb-1">Mật khẩu</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">lock</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-xl font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
                {/* password strength mock bar */}
                <div className="flex gap-1 mt-2">
                  <div className="h-1.5 w-1/3 bg-amber-500 rounded-full"></div>
                  <div className="h-1.5 w-1/3 bg-amber-500 rounded-full"></div>
                  <div className="h-1.5 w-1/3 bg-surface-container-high rounded-full"></div>
                </div>
                <span className="text-[9px] text-amber-600 font-bold mt-1 block">Mật khẩu ở mức trung bình</span>
              </div>
              <div>
                <label className="block font-semibold text-label-sm text-on-surface-variant mb-1">Xác nhận mật khẩu</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">lock</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-xl font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer mt-3 select-none">
              <input type="checkbox" className="mt-1 accent-primary" />
              <span className="text-[10px] text-on-surface-variant leading-snug">
                Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của TripWise.
              </span>
            </label>
          </div>

          <div className="space-y-4 pt-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-primary hover:bg-primary-container text-white py-2.5 rounded-xl font-bold text-label-md shadow-md transition-all flex justify-center items-center gap-1"
            >
              Đăng ký tài khoản miễn phí ⚡
            </button>
            <p className="text-center text-[11px] text-on-surface-variant font-semibold">
              Đã có tài khoản?{' '}
              <button onClick={() => navigate('/login')} className="text-primary font-bold hover:underline">Đăng nhập ngay</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
