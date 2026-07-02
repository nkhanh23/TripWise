import React, { useState } from 'react';
import { FilmGrainOverlay } from '../components/motion/FilmGrainOverlay';
import { KineticTitle } from '../components/motion/KineticTitle';
import { BounceCard } from '../components/motion/BounceCard';
import { SectionHeader } from '../components/layout/SectionHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { TripHeader } from '../components/trip/TripHeader';
import { TripStats } from '../components/trip/TripStats';
import { Timeline } from '../components/trip/Timeline';
import { DestinationCard } from '../components/trip/DestinationCard';
import { WeatherCard } from '../components/trip/WeatherCard';
import { BudgetCard } from '../components/trip/BudgetCard';
import { MapPanel } from '../components/map/MapPanel';
import { MapMarker } from '../components/map/MapMarker';
import { RouteInstructionCard } from '../components/map/RouteInstructionCard';
import { NearestPlaceLabel } from '../components/map/NearestPlaceLabel';

export const ComponentLibraryPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState(0);

  const colors = [
    { name: 'canvas', hex: '#F7E7C6', desc: 'Canvas Background' },
    { name: 'canvas-alt', hex: '#F3C99B', desc: 'Canvas Accent' },
    { name: 'surface', hex: '#FFF6DE', desc: 'Surface Base' },
    { name: 'panel', hex: '#FFFDF3', desc: 'Content Panel' },
    { name: 'brand', hex: '#20A7D8', desc: 'Primary Accent' },
    { name: 'brand-dark', hex: '#087CA7', desc: 'Primary Active' },
    { name: 'red', hex: '#E6392E', desc: 'Hot Alert / Red' },
    { name: 'yellow', hex: '#FFD166', desc: 'Sticker Highlight' },
    { name: 'lime', hex: '#B8F24A', desc: 'Arcade Lime' },
    { name: 'orange', hex: '#F77F00', desc: 'Ticket Orange' },
    { name: 'ink', hex: '#111111', desc: 'Ink Black' },
    { name: 'stroke-soft', hex: '#D8B98A', desc: 'Sepia Divider' },
    { name: 'text-muted', hex: '#7A6A58', desc: 'Muted text' },
  ];

  const mockTimelineItems = [
    {
      time: '08:00',
      title: 'Khách sạn Novotel Nha Trang',
      location: '50 Trần Phú, Lộc Thọ, Nha Trang',
      duration: 'Phút check-in',
      type: 'accommodation' as const,
    },
    {
      time: '09:30',
      title: 'Di chuyển bằng xe máy',
      location: 'bike',
      duration: '15 phút',
      cost: '15.000 ₫',
      type: 'transfer' as const,
    },
    {
      time: '10:00',
      title: 'Tháp Bà Ponagar',
      location: '2 Tháng 4, Vĩnh Phước, Nha Trang',
      duration: '1.5 tiếng',
      cost: '30.000 ₫',
      tags: ['Di tích', 'Lịch sử', 'Chụp ảnh'],
      type: 'place' as const,
    },
    {
      time: '12:30',
      title: 'Ăn trưa Hải Sản Gió Biển',
      location: 'Phạm Văn Đồng, Vĩnh Thọ, Nha Trang',
      duration: '1 tiếng',
      cost: '350.000 ₫',
      tags: ['Hải sản', 'Bình dân'],
      type: 'meal' as const,
    },
  ];

  const mockMapMarkers = [
    { id: '1', lat: 12.268, lng: 109.196, label: 'Khách sạn Novotel Nha Trang', type: 'accommodation' as const },
    { id: '2', lat: 12.2706, lng: 109.1947, label: 'Tháp Bà Ponagar', type: 'place' as const },
    { id: '3', lat: 12.273, lng: 109.202, label: 'Ăn trưa Hải Sản Gió Biển', type: 'place' as const },
  ];

  return (
    <div style={{ backgroundColor: '#F7E7C6', minHeight: '100vh', paddingBottom: 80 }} className="relative">
      <FilmGrainOverlay />

      {/* Navigation header banner */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#FFF6DE',
          borderBottom: '2px solid #111111',
          boxShadow: '0 2px 0 #111111',
          padding: '12px 32px',
        }}
      >
        <div style={{ display: 'flex', gap: 24, overflowX: 'auto', alignItems: 'center', width: '100%' }}>
          <span
            style={{
              fontFamily: "'Luckiest Guy', 'Bangers', cursive",
              fontSize: 22,
              color: '#20A7D8',
              textShadow: '2px 2px 0 #111111',
            }}
          >
            TripWise Cockpit
          </span>
          {['tokens', 'buttons', 'forms', 'cards', 'kinetic', 'trip', 'map', 'states'].map((id) => (
            <a
              key={id}
              href={`#${id}`}
              style={{
                fontWeight: 700,
                color: '#3A2F2A',
                textDecoration: 'none',
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
              className="hover:text-brand"
            >
              {id}
            </a>
          ))}
        </div>
      </nav>

      <div style={{ width: '100%', padding: '40px 48px' }} className="space-y-16">
        {/* Hero Title Intro */}
        <div className="text-center py-12 bg-surface border-ink-thick shadow-comic-lg rounded-[28px] p-8 space-y-4">
          <KineticTitle
            text="TripWise Component Library 🗺️"
            size="hero"
            variant="pop"
            className="justify-center"
            highlightWords={['Library']}
          />
          <p
            style={{
              maxWidth: 600,
              margin: '12px auto 0',
              fontSize: 16,
              color: '#3A2F2A',
              fontWeight: 500,
              lineHeight: 1.6,
            }}
          >
            Hệ thống Design System v2 theo phong cách <strong>Kinetic Typography + 1930s Retro Cartoon Travel</strong>.
            Tất cả components đều được trang bị viền đen dày, hard offset shadows, màu nền poster cổ điển và rubber hose motions.
          </p>
        </div>

        {/* SECTION 1: TOKENS */}
        <div id="tokens" className="pt-16 border-t border-stroke-soft">
          <SectionHeader title="Design Tokens Preview" badge="Foundation" subtitle="Bảng màu, typography và shadows cơ sở." />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-panel border-ink rounded-[24px] p-8 shadow-comic">
            {/* Color grid */}
            <div>
              <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 20, marginBottom: 16 }}>Bảng màu (Colors)</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {colors.map((c) => (
                  <div key={c.name} className="flex flex-col items-center">
                    <div
                      style={{
                        backgroundColor: c.hex,
                        width: 60,
                        height: 60,
                        border: '2px solid #111111',
                        borderRadius: 8,
                        boxShadow: '2px 2px 0 #111111',
                      }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: '#111111' }}>{c.name}</span>
                    <span style={{ fontSize: 9, color: '#7A6A58', fontWeight: 600 }}>{c.hex}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography and Shadows */}
            <div className="space-y-6">
              <div>
                <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 20, marginBottom: 12 }}>Chữ (Typography)</h4>
                <div className="space-y-2">
                  <div style={{ fontFamily: "'Luckiest Guy', cursive", fontSize: 32, textShadow: '2px 2px 0 #111111' }}>Display Hero Font</div>
                  <div style={{ fontFamily: "'Bangers', cursive", fontSize: 28, textShadow: '2px 2px 0 #111111', letterSpacing: '0.04em' }}>Bangers Retro Heading</div>
                  <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 700, fontSize: 15 }}>Vietnamese UI Bold Body Text</div>
                  <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 14, color: '#7A6A58' }}>Vietnamese Regular Body Text</div>
                </div>
              </div>

              <div>
                <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 20, marginBottom: 12 }}>Comic Shadows & Border Radius</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="p-3 bg-surface border-ink shadow-comic-sm rounded-tiny text-xs font-bold">shadow-comic-sm (2px)</div>
                  <div className="p-3 bg-surface border-ink shadow-comic rounded-tiny text-xs font-bold">shadow-comic-md (4px)</div>
                  <div className="p-3 bg-surface border-ink shadow-comic-lg rounded-tiny text-xs font-bold">shadow-comic-lg (6px)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: BUTTONS */}
        <div id="buttons" className="pt-16 border-t border-stroke-soft">
          <SectionHeader title="Nút bấm (Buttons)" badge="Interactive" subtitle="Tất cả các states, sizes và style variants." />
          
          <div className="bg-panel border-ink rounded-[24px] p-8 shadow-comic space-y-6">
            <div className="space-y-3">
              <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 18 }}>Variants</h4>
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="primary">Primary CTA</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="danger">Danger Action</Button>
                <Button variant="ghost">Ghost link</Button>
                <Button variant="sticker">Sticker Skewed 🏷️</Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 18 }}>Sizes</h4>
              <div className="flex flex-wrap gap-4 items-center">
                <Button size="sm" variant="primary">Small button</Button>
                <Button size="md" variant="primary">Medium button</Button>
                <Button size="lg" variant="primary">Large button</Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 18 }}>States</h4>
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="primary" disabled>Disabled state</Button>
                <Button variant="primary" loading>Loading state</Button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: FORMS */}
        <div id="forms" className="pt-16 border-t border-stroke-soft">
          <SectionHeader title="Trường nhập liệu (Forms)" badge="Inputs" subtitle="Cấu hình input, textarea, và notepad style." />
          
          <div className="bg-panel border-ink rounded-[24px] p-8 shadow-comic grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Input label="Điểm đến yêu thích" placeholder="Ví dụ: Nha Trang, Khánh Hoà" helperText="Nhập thành phố hoặc danh lam thắng cảnh." />
              <Input label="Nhập Email" placeholder="khang.nguyen@example.com" leftIcon="mail" />
              <Input label="Mật khẩu" placeholder="••••••••" error="Mật khẩu phải chứa ít nhất 8 ký tự." />
            </div>
            <div className="space-y-4">
              <Textarea label="Mô tả sở thích chuyến đi" placeholder="Tôi muốn đi nghỉ dưỡng 3 ngày, ăn nhiều hải sản..." rows={3} />
              <Textarea label="Sổ tay ghi chú (Notepad variant)" variant="notepad" placeholder="Ghi lại các việc cần làm tại đây..." rows={4} />
            </div>
          </div>
        </div>

        {/* SECTION 4: CARDS & BADGES */}
        <div id="cards" className="pt-16 border-t border-stroke-soft">
          <SectionHeader title="Khung hiển thị (Cards & Badges)" badge="Components" subtitle="Tem nhãn trạng thái và cấu trúc khung poster, speech bubble." />
          
          <div className="space-y-8">
            {/* Badges and tabs */}
            <div className="bg-panel border-ink rounded-[24px] p-8 shadow-comic space-y-6">
              <div className="space-y-3">
                <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 18 }}>Trạng thái (Badges)</h4>
                <div className="flex flex-wrap gap-3 items-center">
                  <Badge variant="info">Thông tin</Badge>
                  <Badge variant="success" icon="check_circle">Đã tối ưu</Badge>
                  <Badge variant="warn" icon="warning">Cảnh báo</Badge>
                  <Badge variant="error" icon="error">Lỗi kết nối</Badge>
                  <Badge variant="neutral">Nháp</Badge>
                  <Badge variant="sticker">Sticker Tag 🏷️</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 18 }}>Day Tabs Selection</h4>
                <Tabs
                  tabs={[
                    { id: '1', label: 'Day 1' },
                    { id: '2', label: 'Day 2' },
                    { id: '3', label: 'Day 3' },
                  ]}
                  variant="default"
                />
              </div>

              <div>
                <Button variant="secondary" onClick={() => setModalOpen(true)}>Mở Modal Trải Nghiệm</Button>
                <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Thông tin chi tiết" footer={<Button variant="primary" onClick={() => setModalOpen(false)}>Đồng ý</Button>}>
                  <p className="font-semibold text-body-sm text-on-surface-variant">
                    Nội dung hộp thoại hiển thị theo phong cách Cuphead-inspired. Có viền đen rõ rệt, tiêu đề Luckiest Guy hoành tráng, nút đóng góc trên nảy nhẹ.
                  </p>
                </Modal>
              </div>
            </div>

            {/* Cards row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card title="Thẻ mặc định" subtitle="Default Card variant">
                <p className="text-sm text-text-secondary leading-relaxed">Nền vanilla kem nhạt, viền đen dày vừa phải, bóng đổ đổ cứng 4px.</p>
              </Card>

              <Card variant="poster" title="Postcard Travel" subtitle="Poster Card variant">
                <p className="text-sm text-text-secondary leading-relaxed">Card mang phong cách poster du lịch thập niên 1930s, phần header dải màu xanh nổi bật.</p>
              </Card>

              <Card variant="speech" title="Speech bubble" subtitle="AI gợi ý cho bạn:">
                <p className="text-sm text-text-secondary leading-relaxed">Khung hội thoại bong bóng dành riêng cho trợ lý ảo AI hướng dẫn lịch trình.</p>
              </Card>
            </div>
          </div>
        </div>

        {/* SECTION 5: KINETIC TYPOGRAPHY */}
        <div id="kinetic" className="pt-16 border-t border-stroke-soft">
          <SectionHeader title="Chữ động nghệ thuật (Kinetic Typography)" badge="Motion" subtitle="Headline nảy nổ, tạo điểm nhấn visual mạnh mẽ." />
          
          <div className="bg-panel border-ink rounded-[24px] p-8 shadow-comic space-y-6">
            <BounceCard>
              <KineticTitle
                text="Chữ nảy nổ Kinetic Typography ⚡"
                size="section"
                variant="bounce"
                highlightWords={['Kinetic']}
                shadowVariant="cyan"
              />
            </BounceCard>
            <div className="pt-4 border-t border-stroke-light space-y-2">
              <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 18 }}>Text shadows layer màu cổ điển:</h4>
              <div className="flex flex-wrap gap-8">
                <span style={{ fontFamily: "'Luckiest Guy', cursive", fontSize: 24, textShadow: '2px 2px 0 #E6392E, 4px 4px 0 #111111' }}>Red + Ink Shadow</span>
                <span style={{ fontFamily: "'Luckiest Guy', cursive", fontSize: 24, textShadow: '2px 2px 0 #20A7D8, 4px 4px 0 #111111' }}>Cyan + Ink Shadow</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 6: TRIP COMPONENTS */}
        <div id="trip" className="pt-16 border-t border-stroke-soft">
          <SectionHeader title="Khối dữ liệu chuyến đi (Trip Wise)" badge="Core App" subtitle="Timeline, stats, weather, budget và postcard địa điểm." />
          
          <div className="space-y-8">
            <TripHeader
              title="Khám phá Nha Trang 3 ngày 2 đêm"
              subtitle="Lịch trình tối ưu tự động bởi AI"
              destination="Nha Trang, Khánh Hòa"
              dateRange="02/07 - 04/07/2026"
              duration="3 ngày"
              status="optimized"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Timeline (440px width) */}
              <div className="lg:col-span-5 bg-panel border-ink rounded-[20px] p-6 shadow-comic">
                <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 20, marginBottom: 16 }}>Timeline ngày đi</h4>
                <Timeline
                  days={3}
                  selectedDay={activeDay}
                  onDayChange={setActiveDay}
                  items={mockTimelineItems}
                  selectedItemIndex={selectedTimelineItem}
                  onItemClick={setSelectedTimelineItem}
                />
              </div>

              {/* Stats / Weather / Budget panel */}
              <div className="lg:col-span-7 space-y-6">
                <TripStats
                  stats={[
                    { label: 'Số ngày', value: '3 ngày', icon: 'calendar_today', highlight: true },
                    { label: 'Địa điểm đi', value: '12 điểm', icon: 'map' },
                    { label: 'Ngân sách tiêu', value: '4.2M ₫', icon: 'payments' },
                    { label: 'Quãng đường', value: '87 km', icon: 'navigation' },
                  ]}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <WeatherCard location="Nha Trang, Khánh Hòa" temperature={31} condition="sunny" rainChance={5} humidity={62} />
                  <BudgetCard estimated={5000000} spent={4200000} breakdown={[
                    { label: 'Khách sạn', amount: 1500000, icon: 'hotel' },
                    { label: 'Hải sản', amount: 800000, icon: 'restaurant' },
                    { label: 'Di chuyển', amount: 300000, icon: 'directions_car' },
                  ]} />
                </div>
              </div>
            </div>

            {/* Destination cards row */}
            <div>
              <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 20, marginBottom: 16 }}>Địa điểm gợi ý (Postcard cards)</h4>
              <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                <DestinationCard
                  name="Tháp Bà Ponagar"
                  location="Nha Trang, Khánh Hòa"
                  category="Di tích lịch sử"
                  tags={['Văn hoá Chăm', 'Di tích']}
                  rating={4.8}
                  price="30.000 ₫"
                  onAdd={() => {}}
                />
                <DestinationCard
                  name="Hòn Chồng Nha Trang"
                  location="Nha Trang, Khánh Hòa"
                  category="Cảnh quan tự nhiên"
                  tags={['Ngắm hoàng hôn', 'Bờ biển']}
                  rating={4.6}
                  price="Miễn phí"
                  onAdd={() => {}}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 7: MAP COMPONENTS */}
        <div id="map" className="pt-16 border-t border-stroke-soft">
          <SectionHeader title="Bản đồ hiển thị (Map HUD overlays)" badge="Navigation" subtitle="Layout panel bản đồ, marker ghim nảy, HUD chỉ đường." />
          
          <div className="space-y-6">
            <MapPanel
              markers={mockMapMarkers}
              showRoute
              searchBar
              height="450px"
              overlayContent={
                <RouteInstructionCard
                  instruction="Rẽ trái vào đường Phạm Văn Đồng hướng về phía cầu Trần Phú"
                  distance="450 m"
                  eta="2 phút"
                  stepIndex={3}
                  totalSteps={8}
                  direction="left"
                />
              }
            />

            <div className="flex flex-wrap gap-4 items-center bg-panel border-ink p-5 rounded-[16px] shadow-comic">
              <span className="font-bold text-sm">Ghim marker mẫu:</span>
              <div className="flex gap-16 relative h-16 w-80 items-center justify-center">
                <MapMarker number={1} label="Marker điểm" style={{ left: '20%', top: '50%' }} />
                <MapMarker number={2} label="Selected Marker" selected style={{ left: '50%', top: '50%' }} />
                <MapMarker type="accommodation" label="Novotel Hotel" style={{ left: '80%', top: '50%' }} />
              </div>
              <div className="flex-1 flex justify-end">
                <NearestPlaceLabel name="Tháp Bà Ponagar" distance="450m" category="place" />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 8: STATES */}
        <div id="states" className="pt-16 border-t border-stroke-soft">
          <SectionHeader title="Trạng thái phản hồi (Feedback states)" badge="Status" subtitle="Trang thái trống, lỗi banner, và skeleton tải trang." />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left lists */}
            <div className="space-y-6 bg-panel border-ink rounded-[24px] p-6 shadow-comic">
              <ErrorBanner message="Không thể kết nối đến máy chủ AI TripWise. Vui lòng kiểm tra kết nối mạng của bạn." onRetry={() => {}} />
              <ErrorBanner variant="inline" message="Lỗi định dạng toạ độ bản đồ." onDismiss={() => {}} />
              
              <div className="space-y-4 pt-4 border-t border-stroke-light">
                <h4 style={{ fontFamily: "'Luckiest Guy', 'Bangers', cursive", fontSize: 18 }}>Skeletons (Loading)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton variant="card" />
                  <Skeleton variant="timeline" />
                </div>
              </div>
            </div>

            {/* Right empty state */}
            <div className="bg-panel border-ink rounded-[24px] p-6 shadow-comic flex items-center justify-center">
              <EmptyState
                title="Chưa có chuyến đi nào!"
                description="Bạn chưa thiết kế lịch trình nào trong kho lưu trữ của mình. Nhấp nút phía dưới để lập chuyến đi đầu tiên."
                ctaLabel="Lập lịch chuyến đi ⚡"
                onCta={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
