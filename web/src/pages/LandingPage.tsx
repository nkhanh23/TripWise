import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { PublicHeader } from '../components/layout/PublicHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Textarea } from '../components/ui/Textarea';
import { KineticTitle } from '../components/motion/KineticTitle';
import { BounceCard } from '../components/motion/BounceCard';
import { FilmGrainOverlay } from '../components/motion/FilmGrainOverlay';
import { SectionHeader } from '../components/layout/SectionHeader';
import { TimelineItem } from '../components/trip/TimelineItem';
import type { TimelineItemProps } from '../components/trip/TimelineItem';
import { MapPanel } from '../components/map/MapPanel';
import { DestinationCard } from '../components/trip/DestinationCard';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateTrip = () => {
    if (!promptText.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/planner');
    }, 1200);
  };

  const handleSuggestionClick = (text: string) => {
    setPromptText(text);
  };

  // Mock timeline items matching the list:
  // 1. 08:00 Tháp Bà Ponagar
  // 2. 10:30 Bãi biển Nha Trang
  // 3. 12:00 Ăn hải sản
  // 4. 15:00 Chợ Đầm
  const mockPreviewItems: TimelineItemProps[] = [
    {
      time: '08:00',
      title: 'Tháp Bà Ponagar',
      location: 'Vĩnh Phước, Nha Trang',
      type: 'place' as const,
      selected: false,
    },
    {
      time: '10:30',
      title: 'Bãi biển Nha Trang',
      location: 'Trần Phú, Nha Trang',
      type: 'place' as const,
      selected: true,
    },
    {
      time: '12:00',
      title: 'Ăn hải sản',
      location: 'Phạm Văn Đồng, Nha Trang',
      type: 'meal' as const,
      selected: false,
    },
    {
      time: '15:00',
      title: 'Chợ Đầm',
      location: 'Vạn Thạnh, Nha Trang',
      type: 'place' as const,
      selected: false,
    },
  ];

  const mockPreviewMarkers = [
    { id: '1', lat: 12.2706, lng: 109.1947, label: 'Tháp Bà Ponagar', type: 'place' as const },
    { id: '2', lat: 12.2600, lng: 109.1960, label: 'Bãi biển Nha Trang', type: 'place' as const, selected: true },
    { id: '3', lat: 12.2730, lng: 109.2020, label: 'Ăn hải sản', type: 'place' as const },
    { id: '4', lat: 12.2520, lng: 109.1900, label: 'Chợ Đầm', type: 'place' as const },
  ];

  const features = [
    {
      title: 'Itinerary theo ngày',
      desc: 'Lịch trình rõ ràng theo buổi, dễ chỉnh và dễ theo dõi.',
      icon: 'schedule',
      badge: 'Thời gian',
      color: '#20A7D8',
    },
    {
      title: 'Bản đồ + route',
      desc: 'Marker, tuyến đường và thời gian di chuyển hiển thị trực quan.',
      icon: 'map',
      badge: 'Bản đồ',
      color: '#B8F24A',
    },
    {
      title: 'Weather-aware',
      desc: 'Gợi ý đổi hoạt động nếu thời tiết không thuận lợi.',
      icon: 'thunderstorm',
      badge: 'Thời tiết',
      color: '#E6392E',
    },
    {
      title: 'Budget-friendly',
      desc: 'Ước tính chi phí và cảnh báo khi vượt ngân sách.',
      icon: 'payments',
      badge: 'Ngân sách',
      color: '#FFD166',
    },
    {
      title: 'Save & reuse',
      desc: 'Lưu trip, mở lại, chỉnh sửa hoặc tái dùng cho lần sau.',
      icon: 'bookmark',
      badge: 'Tích hợp',
      color: '#F77F00',
    },
  ];

  const steps = [
    { step: '01', title: 'Nhập nhu cầu', desc: 'Gõ tự nhiên như đang nhắn cho một người bạn.' },
    { step: '02', title: 'AI hiểu sở thích', desc: 'TripWise phân tích ngày đi, ngân sách, phong cách và món ăn bạn thích.' },
    { step: '03', title: 'Chọn địa điểm thật', desc: 'Hệ thống ưu tiên địa điểm có thể đưa vào lịch trình thực tế.' },
    { step: '04', title: 'Vẽ route trên bản đồ', desc: 'Route và thời gian di chuyển được hiển thị trực quan.' },
  ];

  const popularDestinations = [
    { name: 'Nha Trang', location: 'Khánh Hòa', tags: ['biển', 'hải sản', 'check-in'], rating: 4.8, price: 'Tạo trip' },
    { name: 'Đà Lạt', location: 'Lâm Đồng', tags: ['cafe', 'chill', 'săn mây'], rating: 4.7, price: 'Tạo trip' },
    { name: 'Đà Nẵng', location: 'Miền Trung', tags: ['biển', 'food', 'cuối tuần'], rating: 4.8, price: 'Tạo trip' },
    { name: 'Hội An', location: 'Quảng Nam', tags: ['phố cổ', 'văn hóa', 'ảnh đẹp'], rating: 4.6, price: 'Tạo trip' },
    { name: 'Phú Quốc', location: 'Kiên Giang', tags: ['đảo', 'resort', 'hoàng hôn'], rating: 4.9, price: 'Tạo trip' },
    { name: 'Hà Nội', location: 'Thủ đô', tags: ['văn hóa', 'phố cổ', 'ẩm thực'], rating: 4.7, price: 'Tạo trip' },
  ];

  return (
    <AppShell>
      <FilmGrainOverlay />
      <PublicHeader
        onSignIn={() => navigate('/login')}
        onGetStarted={() => navigate('/planner')}
      />

      {/* Main layout container */}
      <div style={{ width: '100%' }}>
        
        {/* HERO SECTION */}
        <section 
          style={{ 
            padding: '72px 24px', 
            display: 'flex', 
            justifyContent: 'center',
            backgroundColor: '#F7E7C6'
          }}
        >
          <div style={{ maxWidth: 1180, width: '100%' }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left column (52%) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-4">
                <Badge variant="sticker" icon="auto_awesome">AI-Powered Travel Planner</Badge>
                <KineticTitle
                  text="AI lập lịch trình. Bản đồ dẫn đường. Bạn chỉ việc đi. 🗺️"
                  size="hero"
                  variant="pop"
                  highlightWords={['AI', 'Bản', 'đồ']}
                />
                <p
                  style={{
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    fontSize: 16,
                    color: '#3A2F2A',
                    fontWeight: 500,
                    lineHeight: 1.6,
                  }}
                >
                  Nhập điểm đến, thời gian, ngân sách và sở thích. TripWise tạo lịch trình chi tiết theo từng ngày, gợi ý địa điểm thật, kèm tuyến đường di chuyển trực quan.
                </p>
              </div>

              {/* Prompt box */}
              <Card variant="default" className="space-y-4 shadow-comic">
                <Textarea
                  variant="notepad"
                  label="Bạn muốn đi đâu du lịch?"
                  placeholder="Ví dụ: Nha Trang 3 ngày 2 đêm, đi cùng bạn bè, thích biển, hải sản, đi tiết kiệm..."
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={2}
                />
                
                {/* Example suggestion chips */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }} className="text-xs font-bold text-text-muted">Gợi ý nhanh:</span>
                  {[
                    'Nha Trang 3N2Đ, thích biển',
                    'Đà Lạt 2 ngày, cafe chill',
                    'Đà Nẵng cuối tuần, hải sản',
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSuggestionClick(s)}
                      style={{
                        fontFamily: "'Be Vietnam Pro', sans-serif",
                        background: '#FFF6DE',
                        border: '1.5px solid #111111',
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      className="hover:bg-yellow-soft transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="primary"
                    onClick={handleCreateTrip}
                    loading={loading}
                    disabled={!promptText.trim()}
                    className="flex-1"
                  >
                    Tạo lịch trình ngay ⚡
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/component-library')}
                  >
                    Xem Library Demo
                  </Button>
                </div>
                
                <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif", display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#7A6A58', fontWeight: 600 }}>
                  <span>⚡ AI tạo lịch trình trong 10-20 giây</span>
                  <span>📍 Dùng địa điểm thật + route trực quan</span>
                </div>
              </Card>
            </div>

            {/* Right column (48%) - HeroAppPreview */}
            <div className="lg:col-span-6 flex justify-center">
              <BounceCard className="w-full max-w-lg">
                <Card 
                  variant="poster" 
                  posterColor="#20A7D8" 
                  title="TripWise Cockpit Live Preview" 
                  subtitle="Lộ trình di chuyển ngày 1"
                  className="shadow-comic-lg"
                >
                  {/* Stats Bar */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      backgroundColor: '#FFFDF3', 
                      border: '2px solid #111111',
                      borderRadius: 10,
                      padding: '8px 12px',
                      marginBottom: 12,
                      fontFamily: "'Be Vietnam Pro', sans-serif",
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  >
                    <span className="flex items-center gap-1">📍 12.4 km</span>
                    <span className="flex items-center gap-1">🛑 4 stops</span>
                    <span className="flex items-center gap-1">📅 3N2Đ</span>
                    <span className="flex items-center gap-1">💰 Budget vừa phải</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 h-[300px] pt-1">
                    {/* Left: mini timeline stack (5 cols) */}
                    <div className="sm:col-span-6 space-y-2 overflow-y-auto pr-1">
                      {mockPreviewItems.map((item, idx) => (
                        <TimelineItem
                          key={idx}
                          {...item}
                          index={idx + 1}
                        />
                      ))}
                    </div>

                    {/* Right: Map placeholder (6 cols) */}
                    <div className="sm:col-span-6 h-full">
                      <MapPanel
                        markers={mockPreviewMarkers}
                        showRoute
                        height="100%"
                      />
                    </div>
                  </div>
                </Card>
              </BounceCard>
            </div>
          </div>
        </section>

        {/* FEATURE SECTION */}
        <section 
          id="features" 
          style={{ 
            padding: '72px 24px', 
            backgroundColor: '#FFF6DE', 
            display: 'flex', 
            justifyContent: 'center',
            borderTop: '2px solid #111111'
          }}
        >
          <div style={{ maxWidth: 1180, width: '100%' }} className="space-y-8">
            <div className="text-center max-w-xl mx-auto">
              <SectionHeader
                title="TripWise giúp chuyến đi bớt rối hơn 🧭"
                badge="Tính năng"
                align="center"
                subtitle="Không còn phải mở 10 tab để tự ghép lịch trình, bản đồ, thời tiết và chi phí."
              />
            </div>

            {/* Responsive grid of 5 cards */}
            <div 
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 20,
                justifyContent: 'center'
              }}
            >
              {features.map((feat, idx) => (
                <div 
                  key={idx} 
                  style={{
                    flex: '1 1 300px',
                    maxWidth: idx < 3 ? 'calc(33.333% - 14px)' : 'calc(50% - 10px)',
                  }}
                  className="min-w-[280px]"
                >
                  <BounceCard delay={idx * 60} className="h-full">
                    <Card
                      variant="ticket"
                      hoverable
                      className="h-full flex flex-col justify-between shadow-comic-md"
                      badge={<Badge variant="sticker">{feat.badge}</Badge>}
                    >
                      <div className="space-y-3">
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            backgroundColor: feat.color + '20',
                            border: '2px solid #111111',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: feat.color,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                            {feat.icon}
                          </span>
                        </div>
                        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: '#111111' }}>
                          {feat.title}
                        </h3>
                        <p style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 13, color: '#3A2F2A', lineHeight: 1.6, fontWeight: 500 }}>
                          {feat.desc}
                        </p>
                      </div>
                    </Card>
                  </BounceCard>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section 
          id="how-it-works" 
          style={{ 
            padding: '72px 24px', 
            backgroundColor: '#F7E7C6', 
            display: 'flex', 
            justifyContent: 'center',
            borderTop: '2px solid #111111'
          }}
        >
          <div style={{ maxWidth: 1180, width: '100%' }} className="space-y-8">
            <div className="text-center max-w-xl mx-auto">
              <SectionHeader
                title="Cách TripWise hoạt động ⚙️"
                badge="Quy trình"
                align="center"
                subtitle="Lên lịch trình sâu mà không cần tự ghép route và thời gian."
              />
            </div>

            <div className="relative">
              {/* Dashed connector line */}
              <div
                style={{
                  position: 'absolute',
                  top: '40%',
                  left: '12%',
                  right: '12%',
                  height: 0,
                  borderTop: '3px dashed #D8B98A',
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
                className="hidden lg:block"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                {steps.map((item, idx) => (
                  <BounceCard key={idx} delay={idx * 100}>
                    <Card variant="poster" title={`Bước ${item.step}`} posterColor="#FFFDF3" className="h-full shadow-comic-md">
                      <div className="space-y-2">
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 48,
                            color: '#B8F24A',
                            textShadow: '2px 2px 0 #111111',
                            lineHeight: 1,
                          }}
                        >
                          {item.step}
                        </div>
                        <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: '#111111' }}>
                          {item.title}
                        </h4>
                        <p style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 13, color: '#3A2F2A', lineHeight: 1.6, fontWeight: 500 }}>
                          {item.desc}
                        </p>
                      </div>
                    </Card>
                  </BounceCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* POPULAR DESTINATIONS SECTION */}
        <section 
          id="destinations" 
          style={{ 
            padding: '72px 24px', 
            backgroundColor: '#FFF6DE', 
            display: 'flex', 
            justifyContent: 'center',
            borderTop: '2px solid #111111'
          }}
        >
          <div style={{ maxWidth: 1180, width: '100%' }} className="space-y-8">
            <div className="text-center max-w-xl mx-auto">
              <SectionHeader
                title="Điểm đến phổ biến 🌍"
                badge="Khám phá"
                align="center"
                subtitle="Khởi động nhanh với các điểm đến quen thuộc cho lịch trình ngắn ngày."
              />
            </div>

            {/* Grid 3 columns on desktop, responsive stack */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
              {popularDestinations.map((dest, idx) => (
                <BounceCard key={idx} delay={idx * 50}>
                  <DestinationCard
                    name={dest.name}
                    location={dest.location}
                    tags={dest.tags}
                    rating={dest.rating}
                    price={dest.price}
                    onAdd={() => navigate('/planner')}
                  />
                </BounceCard>
              ))}
            </div>
          </div>
        </section>

        {/* AI TRAVEL PLANNING SHOWCASE */}
        <section 
          style={{ 
            padding: '72px 24px', 
            backgroundColor: '#F7E7C6', 
            display: 'flex', 
            justifyContent: 'center',
            borderTop: '2px solid #111111'
          }}
        >
          <div style={{ maxWidth: 1180, width: '100%' }} className="space-y-8">
            <div className="text-center max-w-xl mx-auto">
              <SectionHeader
                title="AI thấu hiểu sở thích của bạn 🧠"
                badge="Thông minh"
                align="center"
                subtitle="Không chỉ tạo địa điểm ngẫu nhiên, AI sắp xếp theo mạch thời gian và phong cách du lịch thực tế."
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-panel border-ink rounded-[24px] p-8 shadow-comic">
              {/* Left Column: Prompt and Stickers (52%) */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
                <Card variant="speech" title="Yêu cầu từ người dùng" className="flex-1">
                  <p style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 15, color: '#111111', fontWeight: 600, fontStyle: 'italic', lineHeight: 1.6 }}>
                    "Nha Trang 3 ngày 2 đêm, đi cùng bạn bè, thích biển, hải sản, check-in đẹp, ngân sách vừa phải."
                  </p>
                </Card>

                {/* AI Reasoning chips stickers */}
                <div className="space-y-3">
                  <h4 style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>AI Phân tích & Tối ưu:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="success" icon="check">Tối ưu di chuyển</Badge>
                    <Badge variant="warn" icon="payments">Phù hợp budget</Badge>
                    <Badge variant="info" icon="photo_camera">Ưu tiên biển buổi sáng</Badge>
                    <Badge variant="sticker">Ăn hải sản buổi tối 🦀</Badge>
                  </div>
                </div>
              </div>

              {/* Right Column: Itinerary Preview (48%) */}
              <div className="lg:col-span-6 space-y-4">
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>Lịch trình preview:</h4>
                
                <div className="space-y-4">
                  {/* Day 1 */}
                  <div style={{ background: '#FFF6DE', border: '2px solid #111111', borderRadius: 12, padding: 14 }} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge variant="sticker">Day 1</Badge>
                      <span style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 11, fontWeight: 700, color: '#7A6A58' }}>Khởi hành</span>
                    </div>
                    <ul style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 13, fontWeight: 600, paddingLeft: 16 }} className="list-disc space-y-1 text-text-primary">
                      <li>Check-in khách sạn</li>
                      <li>Tháp Bà Ponagar</li>
                      <li>Bãi biển Trần Phú</li>
                    </ul>
                  </div>

                  {/* Day 2 */}
                  <div style={{ background: '#FFF6DE', border: '2px solid #111111', borderRadius: 12, padding: 14 }} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge variant="sticker">Day 2</Badge>
                      <span style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 11, fontWeight: 700, color: '#7A6A58' }}>Khám phá</span>
                    </div>
                    <ul style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 13, fontWeight: 600, paddingLeft: 16 }} className="list-disc space-y-1 text-text-primary">
                      <li>Tour du ngoạn đảo Nha Trang</li>
                      <li>Thưởng thức hải sản tươi sống</li>
                      <li>Cafe biển Sunset chill</li>
                    </ul>
                  </div>

                  {/* Day 3 */}
                  <div style={{ background: '#FFF6DE', border: '2px solid #111111', borderRadius: 12, padding: 14 }} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge variant="sticker">Day 3</Badge>
                      <span style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 11, fontWeight: 700, color: '#7A6A58' }}>Mua sắm & Về</span>
                    </div>
                    <ul style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 13, fontWeight: 600, paddingLeft: 16 }} className="list-disc space-y-1 text-text-primary">
                      <li>Tham quan mua sắm Chợ Đầm</li>
                      <li>Mua quà lưu niệm yến sào</li>
                      <li>Rời Nha Trang (Check-out)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA SECTION */}
        <section 
          style={{ 
            padding: '72px 24px', 
            backgroundColor: '#FFD166',
            display: 'flex',
            justifyContent: 'center',
            borderTop: '2px solid #111111'
          }}
        >
          <div 
            style={{ 
              maxWidth: 1180, 
              width: '100%',
              backgroundColor: '#FFF6DE',
              border: '3px solid #111111',
              boxShadow: '6px 6px 0 #111111',
              borderRadius: 28,
              padding: '48px 24px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="space-y-3 relative z-10">
              <Badge variant="sticker" icon="explore">Adventure is calling</Badge>
              <KineticTitle
                text="Sẵn sàng cho chuyến đi tiếp theo của bạn? 🎒"
                size="section"
                variant="bounce"
                className="justify-center"
              />
              <p
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  maxWidth: 500,
                  margin: '12px auto 0',
                  fontSize: 15,
                  color: '#3A2F2A',
                  fontWeight: 600,
                  lineHeight: 1.6,
                }}
              >
                Nhập một câu mô tả. TripWise biến nó thành lịch trình có thể đi ngay.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center relative z-10 pt-6">
              <Button variant="danger" size="lg" onClick={() => navigate('/planner')}>
                Bắt đầu lập kế hoạch ⚡
              </Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/component-library')}>
                Xem demo
              </Button>
            </div>

            {/* Background decorative cartoon symbols */}
            <div className="absolute -bottom-6 -left-6 opacity-10 pointer-events-none transform -rotate-12">
              <span className="material-symbols-outlined" style={{ fontSize: 120 }}>map</span>
            </div>
            <div className="absolute -top-6 -right-6 opacity-10 pointer-events-none transform rotate-12">
              <span className="material-symbols-outlined" style={{ fontSize: 120 }}>explore</span>
            </div>
          </div>
        </section>

        {/* FOOTER SECTION */}
        <footer 
          style={{ 
            padding: '40px 24px 24px', 
            backgroundColor: '#FFFDF3',
            borderTop: '2px solid #111111',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div style={{ maxWidth: 1180, width: '100%' }} className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-brand text-2xl font-bold">explore</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: '#20A7D8', textShadow: '1px 1px 0 #111111' }}>
                TripWise
              </span>
            </div>
            <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 12, color: '#7A6A58', fontWeight: 600 }} className="flex gap-6">
              <a href="#" className="hover:underline hover:text-brand">Terms of Service</a>
              <a href="#" className="hover:underline hover:text-brand">Privacy Policy</a>
              <a href="#" className="hover:underline hover:text-brand">Contact Us</a>
            </div>
            <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 11, color: '#7A6A58', fontWeight: 600 }}>
              © 2026 TripWise - AI Smart Travel Planner. Powered by Gemini API.
            </div>
          </div>
        </footer>
      </div>
    </AppShell>
  );
};
