import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-16 py-8">
      {/* Top Navbar Header inside landing page */}
      <header className="flex justify-between items-center px-6 py-4 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <span className="material-symbols-outlined text-primary text-3xl font-bold">explore</span>
          <span className="font-bold text-title-lg text-primary">TripWise</span>
        </div>
        <nav className="hidden md:flex gap-6 text-label-md font-bold text-on-surface-variant">
          <a href="#features" className="hover:text-primary">Features</a>
          <a href="#how-it-works" className="hover:text-primary">How it works</a>
          <a href="#destinations" className="hover:text-primary">Destinations</a>
          <a href="#pricing" className="hover:text-primary">Pricing</a>
        </nav>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-xl font-semibold text-label-md transition-colors"
          >
            Sign in
          </button>
          <button 
            onClick={() => navigate('/planner')}
            className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl font-bold text-label-md shadow-sm transition-all"
          >
            Get started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center px-4">
        {/* Left Copywriting */}
        <div className="lg:col-span-6 space-y-6">
          <span className="bg-primary-fixed text-primary px-3.5 py-1 rounded-full font-bold text-label-sm inline-flex items-center gap-1 border border-primary/20">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            AI Powered Travel Planner
          </span>
          <h1 className="font-bold text-display-lg text-on-background leading-tight">
            Lập lịch du lịch bằng AI, nhìn route trực quan trên bản đồ.
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Nhập điểm đến, thời gian, ngân sách, sở thích. TripWise tạo lịch trình theo ngày, gợi ý địa điểm thật, kèm tuyến đường di chuyển.
          </p>

          {/* Quick Search prompt textarea */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-md space-y-3">
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Bạn muốn đi đâu?</label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Nha Trang 3 ngày 2 đêm, thích biển, ăn hải sản, du lịch tự túc tiết kiệm..."
              className="w-full bg-surface border border-outline-variant rounded-xl p-3 font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary transition-shadow resize-none"
            />
            <div className="flex flex-wrap gap-2 pt-1.5 items-center">
              <span className="text-[10px] text-on-surface-variant font-semibold">Gợi ý nhanh:</span>
              <button className="bg-surface-container border border-outline-variant px-2.5 py-1 rounded-lg text-[9px] font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors">
                Nha Trang 3 ngày
              </button>
              <button className="bg-surface-container border border-outline-variant px-2.5 py-1 rounded-lg text-[9px] font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors">
                Phú Quốc gia đình
              </button>
              <button className="bg-surface-container border border-outline-variant px-2.5 py-1 rounded-lg text-[9px] font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors">
                Sapa cuối tuần
              </button>
            </div>
            <button
              onClick={() => navigate('/planner')}
              className="w-full bg-primary hover:bg-primary-container text-white py-3 rounded-xl font-bold text-label-md shadow-md transition-all hover:-translate-y-0.5 flex justify-center items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">magic_button</span>
              Tạo lịch trình ngay
            </button>
          </div>
        </div>

        {/* Right Preview image */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="relative w-full max-w-lg rounded-2xl overflow-hidden border border-outline-variant shadow-2xl bg-surface-container-lowest p-2 group hover:scale-[1.01] transition-transform duration-300">
            <img
              alt="TripWise Preview Cockpit"
              className="w-full h-auto object-cover rounded-xl"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZl-b4O8uE5F02letlae5D7LiMmm8M9ftFv09JxI9Y-FI5waGnmVNC_ULC8gbahg1OTA-HysTS-Fsi8HE_5AUeVaZh29w60haMKFjTZuz5W-xN7VO75DMg40Lm4O53zHdzgUfMjm67G-_WFbMIYYGiIPIMLrM1G49NzzHDzrnRV14Ij-3F3dbDONNlXzML15y8Fxelfkx9vhLi2y8MqmD9q9cNfri_yS5SpkR2lk6J4oeqk2-h51mW5YfKZQUi_8agC5fl0B4SIRgw"
            />
            <div className="absolute top-4 left-4 bg-surface-container-lowest/90 backdrop-blur-sm px-3.5 py-1.5 rounded-lg border border-outline-variant shadow-md flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <span className="font-bold text-[10px] text-on-surface">TripWise Cockpit Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section id="features" className="space-y-8 px-4 border-t border-outline-variant pt-16">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="font-bold text-display-md text-on-background">Tính năng nổi bật</h2>
          <p className="font-semibold text-body-md text-on-surface-variant">Thiết kế tinh xảo và các tính năng tối ưu giúp chuyến đi trọn vẹn hơn.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Timeline', icon: 'schedule', desc: 'Lịch trình chi tiết từng giờ, dễ dàng sửa đổi theo ý muốn.' },
            { title: 'Map & Route', icon: 'map', desc: 'Bản đồ trực quan hiển thị đường di chuyển, tính khoảng cách cực chuẩn.' },
            { title: 'Weather aware', icon: 'light_mode', desc: 'Gợi ý thông minh dựa trên điều kiện thời tiết của địa điểm.' },
            { title: 'Budget helper', icon: 'payments', desc: 'Ước tính chi phí chi tiết, cảnh báo khi vượt quá ngân sách.' }
          ].map((feat, idx) => (
            <div key={idx} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-3 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">{feat.icon}</span>
              </div>
              <h3 className="font-bold text-title-md text-on-background">{feat.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="space-y-8 px-4 border-t border-outline-variant pt-16">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="font-bold text-display-md text-on-background">Cách hoạt động</h2>
          <p className="font-semibold text-body-md text-on-surface-variant">Lập kế hoạch chỉ trong 4 bước đơn giản.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Nhập nhu cầu', desc: 'Mô tả chuyến đi bằng form tiện lợi hoặc một câu prompt tự nhiên.' },
            { step: '02', title: 'AI phân tích', desc: 'AI tự động tính toán các sở thích, giới hạn ngân sách và thời tiết.' },
            { step: '03', title: 'Chọn địa điểm thật', desc: 'Hệ thống gợi ý các địa điểm du lịch thực tế từ cơ sở dữ liệu.' },
            { step: '04', title: 'Tính route & xuất bản đồ', desc: 'Tự động vẽ tuyến đường di chuyển tối ưu trên bản đồ OpenStreetMap.' }
          ].map((item, idx) => (
            <div key={idx} className="space-y-2 relative">
              <span className="font-bold text-display-lg text-tripwise-lime opacity-40">{item.step}</span>
              <h3 className="font-bold text-title-md text-on-background">{item.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-outline-variant pt-8 pb-4 text-center text-xs text-on-surface-variant flex justify-between px-4">
        <span>© 2026 TripWise. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
};
