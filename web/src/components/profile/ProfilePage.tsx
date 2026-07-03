"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContent } from '@/components/layout/AppContent';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { KineticTitle } from '@/components/motion/KineticTitle';
import { FilmGrainOverlay } from '@/components/motion/FilmGrainOverlay';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { getCurrentUser } from '@/lib/api';

export const ProfilePage: React.FC = () => {
  const router = useRouter();

  // View state simulator
  const [viewState, setViewState] = useState<'default' | 'loading' | 'empty' | 'error'>('default');

  // React local states for profile & preferences
  const [selectedTravelStyles, setSelectedTravelStyles] = useState<string[]>(['Chill', 'Foodie', 'Check-in', 'Local experience']);
  const [selectedFoodPreferences, setSelectedFoodPreferences] = useState<string[]>(['Hải sản', 'Cafe', 'Món địa phương', 'Quán bình dân']);
  const [foodNote, setFoodNote] = useState('Không ăn quá cay, thích hải sản nhưng tránh quán quá đông đúc.');
  const [budgetLevel, setBudgetLevel] = useState<'Tiết kiệm' | 'Vừa phải' | 'Thoải mái'>('Vừa phải');
  const [transportation, setTransportation] = useState<'Đi bộ' | 'Xe máy' | 'Ô tô' | 'Xe đạp'>('Xe máy');
  const [tripPace, setTripPace] = useState<'Chậm rãi' | 'Cân bằng' | 'Nhiều điểm'>('Cân bằng');
  const [defaultDuration, setDefaultDuration] = useState('3N2Đ');
  const [travelers, setTravelers] = useState(2);
  const [startTime, setStartTime] = useState('08:00');

  // AI & Privacy Toggles
  const [aiToggles, setAiToggles] = useState({
    realPlaces: true,
    avoidTight: true,
    indoorRain: true,
    budgetAlert: false,
    localPreferred: true,
    restBlocks: true,
  });

  const [privacyToggles, setPrivacyToggles] = useState({
    remindTrip: true,
    weatherAlert: true,
    optSuggestions: true,
    saveHistory: true,
    personalizedAI: true,
  });

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Overlay Modals State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Profile data state
  const [profileName, setProfileName] = useState('Nguyễn Khánh');
  const [profileEmail, setProfileEmail] = useState('khanh@example.com');
  const [profileLocation, setProfileLocation] = useState('Nha Trang, Việt Nam');

  // Temp form fields during editing profile modal
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempLocation, setTempLocation] = useState('');

  // Load real user details from backend
  useEffect(() => {
    const loadUser = async () => {
      setViewState('loading');
      try {
        const user = await getCurrentUser();
        if (user) {
          setProfileName(user.fullName || 'TripWise User');
          setProfileEmail(user.email);
          setViewState('default');
        } else {
          setViewState('error');
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
        setViewState('error');
      }
    };
    loadUser();
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const travelStyleOptions = [
    'Chill', 'Foodie', 'Check-in', 'Nature', 'Culture',
    'Adventure nhẹ', 'Family-friendly', 'Nightlife', 'Shopping', 'Local experience'
  ];

  const foodOptions = [
    'Hải sản', 'Ăn vặt', 'Cafe', 'Món địa phương', 'Ăn chay',
    'Ít cay', 'Không hải sản', 'Ăn tối view đẹp', 'Quán bình dân', 'Nhà hàng thoải mái'
  ];

  const handleStyleToggle = (style: string) => {
    setSelectedTravelStyles(prev => {
      const next = prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style];
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleFoodToggle = (food: string) => {
    setSelectedFoodPreferences(prev => {
      const next = prev.includes(food) ? prev.filter(f => f !== food) : [...prev, food];
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleAiToggle = (key: keyof typeof aiToggles) => {
    setAiToggles(prev => {
      const next = { ...prev, [key]: !prev[key] };
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handlePrivacyToggle = (key: keyof typeof privacyToggles) => {
    setPrivacyToggles(prev => {
      const next = { ...prev, [key]: !prev[key] };
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleSaveChanges = () => {
    setToastMessage('Đã lưu các sở thích du lịch thành công! ✨');
    setHasUnsavedChanges(false);
  };

  const handleResetPreferences = () => {
    setSelectedTravelStyles(['Chill', 'Foodie', 'Check-in']);
    setSelectedFoodPreferences(['Hải sản', 'Cafe', 'Món địa phương']);
    setFoodNote('Không ăn quá cay.');
    setBudgetLevel('Vừa phải');
    setTransportation('Xe máy');
    setTripPace('Cân bằng');
    setDefaultDuration('3N2Đ');
    setTravelers(2);
    setStartTime('08:00');
    setAiToggles({
      realPlaces: true,
      avoidTight: true,
      indoorRain: true,
      budgetAlert: false,
      localPreferred: true,
      restBlocks: true,
    });
    setPrivacyToggles({
      remindTrip: true,
      weatherAlert: true,
      optSuggestions: true,
      saveHistory: true,
      personalizedAI: true,
    });
    setHasUnsavedChanges(false);
    setResetModalOpen(false);
    setToastMessage('Đã hoàn tác và thiết lập lại tùy chọn mặc định! 🔄');
  };

  const openProfileModal = () => {
    setTempName(profileName);
    setTempEmail(profileEmail);
    setTempLocation(profileLocation);
    setProfileModalOpen(true);
  };

  const saveProfileData = () => {
    setProfileName(tempName);
    setProfileEmail(tempEmail);
    setProfileLocation(tempLocation);
    setProfileModalOpen(false);
    setToastMessage('Đã cập nhật thông tin cá nhân! 👤');
  };

  return (
    <AppContent variant="wide" className="relative pb-36 md:pb-24 pt-4">
      <FilmGrainOverlay />

      {/* Retro Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 76,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            backgroundColor: '#B8F24A',
            border: '2.5px solid #111111',
            borderRadius: 14,
            boxShadow: '4px 4px 0 #111111',
            padding: '10px 20px',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: 13,
            fontWeight: 800,
            color: '#111111',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
          className="animate-pop-in"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* Main 12-column template layout */}
      <div className="mt-4">
        
        {/* Toggle States dev-only toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto', paddingBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#7A6A58', alignSelf: 'center', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
             Mô phỏng:
          </span>
          {['default', 'loading', 'empty', 'error'].map((st) => (
            <button
              key={st}
              onClick={() => setViewState(st as any)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                border: '1.5px solid #111111',
                backgroundColor: viewState === st ? '#FFD166' : '#FFF6DE',
                cursor: 'pointer',
                fontFamily: "'Be Vietnam Pro', sans-serif",
                textTransform: 'capitalize'
              }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* LOADING STATE */}
        {viewState === 'loading' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-4 space-y-6">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </aside>
            <section className="lg:col-span-8 space-y-6">
              <Skeleton variant="text" lines={2} />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </section>
          </div>
        )}

        {/* EMPTY STATE */}
        {viewState === 'empty' && (
          <Card>
            <EmptyState
              title="Bạn chưa thiết lập gu du lịch"
              message="Hãy cấu hình hồ sơ và thiết lập phong cách du lịch của bạn để AI của TripWise tạo lịch trình chính xác nhất."
              actions={
                <Button onClick={() => setViewState('default')}>
                  Thiết lập ngay
                </Button>
              }
            />
          </Card>
        )}

        {/* ERROR STATE */}
        {viewState === 'error' && (
          <Card title="Đã có lỗi xảy ra">
            <ErrorBanner
              message="Không thể kết nối đến máy chủ. Không tải được thông tin cá nhân của bạn."
              onRetry={() => setViewState('default')}
            />
          </Card>
        )}

        {/* DEFAULT STATE */}
        {viewState === 'default' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: span 4 */}
            <aside className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-24 h-fit">
              
              {/* Profile Passport Card */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 24,
                  padding: 24,
                  boxShadow: '6px 6px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  position: 'relative',
                  overflow: 'hidden'
                }}
                className="space-y-6"
              >
                {/* Stamp graphic element */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    width: 70,
                    height: 70,
                    border: '3px dashed #E6392E',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#E6392E',
                    fontWeight: 900,
                    fontSize: 8,
                    transform: 'rotate(15deg) scale(0.9)',
                    textTransform: 'uppercase',
                    pointerEvents: 'none',
                    opacity: 0.8
                  }}
                >
                  TripWise 2026
                </div>

                <div className="flex flex-col items-center text-center space-y-3">
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      border: '3px solid #111111',
                      overflow: 'hidden',
                      backgroundColor: '#FFD166',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: 32,
                      boxShadow: '4px 4px 0 #111111'
                    }}
                  >
                    K
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#111111', margin: 0 }}>
                      {profileName}
                    </h3>
                    <div style={{ fontSize: 12, color: '#7A6A58', fontWeight: 650, marginTop: 2 }}>
                      {profileEmail}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      backgroundColor: '#B8F24A',
                      border: '1.5px solid #111111',
                      borderRadius: 6,
                      padding: '2px 8px',
                      textTransform: 'uppercase',
                      transform: 'skewX(-2deg)'
                    }}
                  >
                    TripWise Explorer
                  </span>
                </div>

                <div style={{ borderTop: '2px dashed #EBD8B7', paddingTop: 16 }} className="space-y-2 text-xs font-bold text-outline">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                    {profileLocation}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_today</span>
                    Tham gia từ tháng 08, 2026
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="ghost" size="sm" style={{ flex: 1 }} onClick={() => setAvatarModalOpen(true)}>
                    Đổi avatar
                  </Button>
                  <Button variant="secondary" size="sm" style={{ flex: 1.2 }} onClick={openProfileModal}>
                    Chỉnh hồ sơ
                  </Button>
                </div>
              </div>

              {/* Profile Stats card */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 24,
                  padding: 20,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-4"
              >
                <h4 style={{ fontSize: 13, fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#7A6A58' }}>
                  Thống kê du lịch
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div style={{ backgroundColor: '#FFF6DE', border: '1.5px solid #111111', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Trips đã lưu</span>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#20A7D8', marginTop: 2 }}>6</div>
                  </div>
                  <div style={{ backgroundColor: '#FFF6DE', border: '1.5px solid #111111', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Địa điểm đã lưu</span>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#FFD166', marginTop: 2 }}>8</div>
                  </div>
                  <div style={{ backgroundColor: '#FFF6DE', border: '1.5px solid #111111', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Hoàn tất</span>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#B8F24A', marginTop: 2 }}>2</div>
                  </div>
                  <div style={{ backgroundColor: '#FFF6DE', border: '1.5px solid #111111', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Phổ biến nhất</span>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#E6392E', marginTop: 8 }}>Nha Trang</div>
                  </div>
                </div>
              </div>

              {/* Travel Taste Preview Card (NEW!) */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 24,
                  padding: 20,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-3"
              >
                <h4 style={{ fontSize: 13, fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#7A6A58' }}>
                  Gu du lịch của bạn
                </h4>
                
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedTravelStyles.slice(0, 3).map((opt) => (
                    <span
                      key={opt}
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1.5px solid #111111',
                        backgroundColor: '#FFD166',
                        display: 'inline-block'
                      }}
                    >
                      {opt}
                    </span>
                  ))}
                  {selectedFoodPreferences.slice(0, 2).map((opt) => (
                    <span
                      key={opt}
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1.5px solid #111111',
                        backgroundColor: '#B8F24A',
                        display: 'inline-block'
                      }}
                    >
                      {opt}
                    </span>
                  ))}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1.5px solid #111111',
                      backgroundColor: '#20A7D8',
                      color: '#FFF6DE',
                      display: 'inline-block'
                    }}
                  >
                    {transportation}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1.5px solid #111111',
                      backgroundColor: '#E6392E',
                      color: '#FFF6DE',
                      display: 'inline-block'
                    }}
                  >
                    {defaultDuration}
                  </span>
                </div>

                <div 
                  style={{
                    backgroundColor: '#FFF6DE',
                    border: '1.5px dashed #111111',
                    borderRadius: 12,
                    padding: 10,
                    fontSize: 11,
                    fontWeight: 650,
                    color: '#111111',
                    lineHeight: 1.4
                  }}
                >
                  TripWise sẽ ưu tiên lịch trình {tripPace.toLowerCase()}, di chuyển {budgetLevel.toLowerCase()}, nghỉ ngơi và check-in ẩm thực địa phương.
                </div>
              </div>

              {/* AI Quick Summary Card (NEW!) */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 24,
                  padding: 20,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-3"
              >
                <h4 style={{ fontSize: 13, fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#7A6A58' }}>
                  AI sẽ ưu tiên
                </h4>

                <div className="space-y-2 text-xs font-bold">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined font-bold" style={{ fontSize: 16, color: aiToggles.realPlaces ? '#B8F24A' : '#7A6A58' }}>
                      {aiToggles.realPlaces ? 'check_circle' : 'cancel'}
                    </span>
                    <span style={{ color: aiToggles.realPlaces ? '#111111' : '#7A6A58' }}>Địa điểm thật, có dữ liệu</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined font-bold" style={{ fontSize: 16, color: aiToggles.avoidTight ? '#B8F24A' : '#7A6A58' }}>
                      {aiToggles.avoidTight ? 'check_circle' : 'cancel'}
                    </span>
                    <span style={{ color: aiToggles.avoidTight ? '#111111' : '#7A6A58' }}>Không xếp lịch quá dày</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined font-bold" style={{ fontSize: 16, color: aiToggles.indoorRain ? '#B8F24A' : '#7A6A58' }}>
                      {aiToggles.indoorRain ? 'check_circle' : 'cancel'}
                    </span>
                    <span style={{ color: aiToggles.indoorRain ? '#111111' : '#7A6A58' }}>Gợi ý trong nhà khi mưa</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined font-bold" style={{ fontSize: 16, color: aiToggles.budgetAlert ? '#B8F24A' : '#7A6A58' }}>
                      {aiToggles.budgetAlert ? 'check_circle' : 'cancel'}
                    </span>
                    <span style={{ color: aiToggles.budgetAlert ? '#111111' : '#7A6A58' }}>Cảnh báo vượt ngân sách</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined font-bold" style={{ fontSize: 16, color: aiToggles.localPreferred ? '#B8F24A' : '#7A6A58' }}>
                      {aiToggles.localPreferred ? 'check_circle' : 'cancel'}
                    </span>
                    <span style={{ color: aiToggles.localPreferred ? '#111111' : '#7A6A58' }}>Ưu tiên quán địa phương</span>
                  </div>
                </div>
              </div>

              {/* Account mini card */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 24,
                  padding: 20,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-4"
              >
                <h4 style={{ fontSize: 13, fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#7A6A58' }}>
                  Tài khoản
                </h4>

                <div className="space-y-2 text-xs font-bold">
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #EBD8B7', paddingBottom: 6 }}>
                    <span style={{ color: '#7A6A58' }}>Email</span>
                    <span style={{ color: '#B8F24A' }}>✓ Đã xác minh</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #EBD8B7', paddingBottom: 6 }}>
                    <span style={{ color: '#7A6A58' }}>Gói dịch vụ</span>
                    <span>Free Explorer</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #EBD8B7', paddingBottom: 6 }}>
                    <span style={{ color: '#7A6A58' }}>Ngôn ngữ</span>
                    <span>Tiếng Việt</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 2 }}>
                    <span style={{ color: '#7A6A58' }}>Giao diện</span>
                    <span>Retro Light</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, paddingTop: 6 }}>
                  <Button variant="ghost" size="sm" style={{ flex: 1 }} onClick={() => router.push('/settings')}>
                    Quản lý
                  </Button>
                  <Button variant="danger" size="sm" style={{ flex: 1.2 }} onClick={() => router.push('/')}>
                    Đăng xuất
                  </Button>
                </div>
              </div>

            </aside>

            {/* RIGHT COLUMN: span 8 */}
            <section className="col-span-12 lg:col-span-8 space-y-6">
              
              {/* Preferences Header Section */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 24,
                  padding: 24,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  position: 'relative'
                }}
                className="space-y-2"
              >
                <div 
                  style={{
                    position: 'absolute',
                    top: -12,
                    right: 20,
                    backgroundColor: '#FFD166',
                    border: '2px solid #111111',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontWeight: 900,
                    fontSize: 9,
                    textTransform: 'uppercase',
                    transform: 'skewX(-2deg)'
                  }}
                >
                  AI remembers your travel taste
                </div>

                <KineticTitle text="Sở thích du lịch mặc định ✨" size="section" variant="pop" />
                <p style={{ fontSize: 13, color: '#7A6A58', fontWeight: 650, marginTop: 4 }}>
                  Cấu hình mặc định này giúp AI của TripWise tự động thiết kế lịch trình tối ưu nhất đúng gu của bạn.
                </p>
              </div>

              {/* Travel Preferences selection chip group card */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 24,
                  padding: 20,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-4"
              >
                <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: '#111111' }}>
                  Phong cách du lịch ưu tiên
                </h4>
                <p style={{ fontSize: 11, color: '#7A6A58', fontWeight: 650, margin: '2px 0 10px' }}>
                  Chọn nhiều phong cách để AI cân bằng các hoạt động trong ngày phù hợp.
                </p>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {travelStyleOptions.map((opt) => {
                    const isSelected = selectedTravelStyles.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleStyleToggle(opt)}
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '6px 14px',
                          borderRadius: 9999,
                          border: '1.5px solid #111111',
                          backgroundColor: isSelected ? '#FFD166' : '#FFFDF3',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '2px 2px 0 #111111' : 'none',
                          transform: isSelected ? 'translate(-1px, -1px)' : 'none',
                          transition: 'all 120ms ease'
                        }}
                        className="hover:scale-105"
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Food preferences group card */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 24,
                  padding: 20,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-4"
              >
                <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: '#111111' }}>
                  Gu ẩm thực ưa chuộng
                </h4>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {foodOptions.map((opt) => {
                    const isSelected = selectedFoodPreferences.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleFoodToggle(opt)}
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '6px 14px',
                          borderRadius: 9999,
                          border: '1.5px solid #111111',
                          backgroundColor: isSelected ? '#B8F24A' : '#FFFDF3',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '2px 2px 0 #111111' : 'none',
                          transform: isSelected ? 'translate(-1px, -1px)' : 'none',
                          transition: 'all 120ms ease'
                        }}
                        className="hover:scale-105"
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <div style={{ paddingTop: 8 }}>
                  <Textarea
                    value={foodNote}
                    onChange={(e) => {
                      setFoodNote(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    label="Ghi chú ẩm thực & Dị ứng"
                    placeholder="Nhập thông tin dị ứng hoặc thói quen ăn uống của bạn để AI gợi ý quán ăn phù hợp..."
                  />
                </div>
              </div>

              {/* Trip settings defaults card */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 24,
                  padding: 20,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-5"
              >
                <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: '#111111' }}>
                  Mặc định khi tạo chuyến đi
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Budget Segmented control */}
                  <div className="space-y-1.5">
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Ngân sách mặc định</label>
                    <div style={{ display: 'flex', backgroundColor: '#FFF6DE', borderRadius: 10, padding: 3, border: '1.5px solid #111111' }}>
                      {['Tiết kiệm', 'Vừa phải', 'Thoải mái'].map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setBudgetLevel(b as any);
                            setHasUnsavedChanges(true);
                          }}
                          style={{
                            flex: 1,
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            backgroundColor: budgetLevel === b ? '#FFD166' : 'transparent',
                            fontFamily: "'Be Vietnam Pro', sans-serif"
                          }}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trip Pace Segmented control */}
                  <div className="space-y-1.5">
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Nhịp độ di chuyển</label>
                    <div style={{ display: 'flex', backgroundColor: '#FFF6DE', borderRadius: 10, padding: 3, border: '1.5px solid #111111' }}>
                      {['Chậm rãi', 'Cân bằng', 'Nhiều điểm'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setTripPace(p as any);
                            setHasUnsavedChanges(true);
                          }}
                          style={{
                            flex: 1,
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            backgroundColor: tripPace === p ? '#FFD166' : 'transparent',
                            fontFamily: "'Be Vietnam Pro', sans-serif"
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preferred transport */}
                  <div className="space-y-1.5">
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Phương tiện di chuyển</label>
                    <select
                      value={transportation}
                      onChange={(e) => {
                        setTransportation(e.target.value as any);
                        setHasUnsavedChanges(true);
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: '#FFFDF3',
                        border: '2px solid #111111',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 800,
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Be Vietnam Pro', sans-serif"
                      }}
                    >
                      <option value="Đi bộ">🚶 Đi bộ</option>
                      <option value="Xe máy">🏍️ Xe máy</option>
                      <option value="Ô tô">🚗 Ô tô</option>
                      <option value="Xe đạp">🚲 Xe đạp</option>
                    </select>
                  </div>

                  {/* Travelers count */}
                  <div className="space-y-1.5">
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Số người mặc định</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (travelers > 1) {
                            setTravelers(travelers - 1);
                            setHasUnsavedChanges(true);
                          }
                        }}
                        style={{ width: 34, height: 34, borderRadius: 8, border: '2px solid #111111', backgroundColor: '#FFF6DE', fontWeight: 900, cursor: 'pointer' }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: 14, fontWeight: 950, minWidth: 20, textAlign: 'center' }}>
                        {travelers} người
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTravelers(travelers + 1);
                          setHasUnsavedChanges(true);
                        }}
                        style={{ width: 34, height: 34, borderRadius: 8, border: '2px solid #111111', backgroundColor: '#FFF6DE', fontWeight: 900, cursor: 'pointer' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Trip default duration */}
                  <div className="space-y-1.5">
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Thời lượng mặc định</label>
                    <select
                      value={defaultDuration}
                      onChange={(e) => {
                        setDefaultDuration(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: '#FFFDF3',
                        border: '2px solid #111111',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 800,
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Be Vietnam Pro', sans-serif"
                      }}
                    >
                      <option value="1 ngày">🌅 1 ngày</option>
                      <option value="2N1Đ">🌴 2 ngày 1 đêm (2N1Đ)</option>
                      <option value="3N2Đ">🥥 3 ngày 2 đêm (3N2Đ)</option>
                      <option value="4N3Đ">🍹 4 ngày 3 đêm (4N3Đ)</option>
                    </select>
                  </div>

                  {/* Preferred start time */}
                  <div className="space-y-1.5">
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Bắt đầu khởi hành</label>
                    <select
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: '#FFFDF3',
                        border: '2px solid #111111',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 800,
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Be Vietnam Pro', sans-serif"
                      }}
                    >
                      <option value="07:00">07:00 sáng</option>
                      <option value="08:00">08:00 sáng</option>
                      <option value="09:00">09:00 sáng</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* AI Personalization switch cards */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 24,
                  padding: 20,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-4"
              >
                <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: '#111111' }}>
                  Hành vi cá nhân hóa AI
                </h4>

                <div className="space-y-1">
                  {[
                    { key: 'realPlaces', label: 'Ưu tiên địa điểm thực tế, chính xác và có sẵn' },
                    { key: 'avoidTight', label: 'Tránh sắp xếp lịch trình di chuyển quá dày đặc' },
                    { key: 'indoorRain', label: 'Gợi ý hoạt động trong nhà thay thế khi có dự báo mưa' },
                    { key: 'budgetAlert', label: 'Cảnh báo và tối ưu nếu vượt quá ngân sách trung bình' },
                    { key: 'localPreferred', label: 'Ưu tiên các quán ăn địa phương có đánh giá tốt hơn chuỗi lớn' },
                    { key: 'restBlocks', label: 'Tự động chèn thêm khoảng thời gian nghỉ ngơi giữa ngày' },
                  ].map((item, idx, arr) => (
                    <label
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '6px 0',
                        minHeight: 46,
                        borderBottom: idx === arr.length - 1 ? 'none' : '1px dashed #EBD8B7'
                      }}
                    >
                      <span style={{ color: '#3A2F2A', paddingRight: 10 }}>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={aiToggles[item.key as keyof typeof aiToggles]}
                        onChange={() => handleAiToggle(item.key as keyof typeof aiToggles)}
                        style={{
                          width: 38,
                          height: 20,
                          appearance: 'none',
                          backgroundColor: aiToggles[item.key as keyof typeof aiToggles] ? '#B8F24A' : '#D8B98A',
                          border: '2px solid #111111',
                          borderRadius: 20,
                          position: 'relative',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'background-color 0.2s',
                          flexShrink: 0
                        }}
                        className="after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3.5 after:height-3.5 after:bg-white after:border-2 after:border-black after:rounded-full after:transition-transform"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Notification & privacy settings card */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 24,
                  padding: 20,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-4"
              >
                <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: '#111111' }}>
                  Thông báo & Quyền riêng tư
                </h4>

                <div className="space-y-1">
                  {[
                    { key: 'remindTrip', label: 'Nhắc nhở chuẩn bị hành trang trước chuyến đi (24h)' },
                    { key: 'weatherAlert', label: 'Cảnh báo thời tiết xấu tại điểm đến khi đang di chuyển' },
                    { key: 'optSuggestions', label: 'Gợi ý tối ưu chặng đường khi có thay đổi OSRM' },
                    { key: 'saveHistory', label: 'Lưu lịch sử hội thoại gợi ý của AI' },
                    { key: 'personalizedAI', label: 'Cho phép sử dụng hồ sơ sở thích để cá nhân hóa AI' },
                  ].map((item, idx, arr) => (
                    <label
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '6px 0',
                        minHeight: 46,
                        borderBottom: idx === arr.length - 1 ? 'none' : '1px dashed #EBD8B7'
                      }}
                    >
                      <span style={{ color: '#3A2F2A', paddingRight: 10 }}>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={privacyToggles[item.key as keyof typeof privacyToggles]}
                        onChange={() => handlePrivacyToggle(item.key as keyof typeof privacyToggles)}
                        style={{
                          width: 38,
                          height: 20,
                          appearance: 'none',
                          backgroundColor: privacyToggles[item.key as keyof typeof privacyToggles] ? '#20A7D8' : '#D8B98A',
                          border: '2px solid #111111',
                          borderRadius: 20,
                          position: 'relative',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'background-color 0.2s',
                          flexShrink: 0
                        }}
                        className="after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3.5 after:height-3.5 after:bg-white after:border-2 after:border-black after:rounded-full after:transition-transform"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Danger Zone panel */}
              <div
                style={{
                  backgroundColor: '#FFDDDB',
                  border: '3px solid #E6392E',
                  borderRadius: 24,
                  padding: 20,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-4"
              >
                <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: '#E6392E' }}>
                  Vùng nguy hiểm
                </h4>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm" onClick={() => setResetModalOpen(true)}>
                    Reset preferences
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setToastMessage('Đã xuất dữ liệu cá nhân dạng JSON! 💾')}>
                    Xuất dữ liệu JSON
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
                    Xóa tài khoản
                  </Button>
                </div>
              </div>

            </section>

          </div>
        )}
      </div>

      {/* Floating Save preferences warning bar */}
      {hasUnsavedChanges && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: '90%',
            maxWidth: 680,
            backgroundColor: '#FFFDF3',
            border: '3px solid #111111',
            borderRadius: 16,
            boxShadow: '6px 6px 0 #111111',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'between',
            fontFamily: "'Be Vietnam Pro', sans-serif"
          }}
          className="animate-slide-up flex-wrap gap-3"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 240 }}>
            <span className="material-symbols-outlined text-warning" style={{ fontSize: 22 }}>warning</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#111111' }}>
              Bạn có tùy chỉnh chưa được lưu lại.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant="ghost" size="sm" onClick={() => setResetModalOpen(true)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveChanges}>
              Lưu thay đổi
            </Button>
          </div>
        </div>
      )}

      {/* RESET PREFERENCES MODAL */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset sở thích mặc định?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setResetModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" size="sm" onClick={handleResetPreferences}>
              Reset mặc định
            </Button>
          </>
        }
      >
        <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }} className="space-y-3">
          <p style={{ fontSize: 13, color: '#111111', fontWeight: 700 }}>
            Bạn có chắc chắn muốn thiết lập lại toàn bộ sở thích du lịch mặc định không?
          </p>
          <p style={{ fontSize: 12, color: '#7A6A58', lineHeight: 1.5, fontWeight: 650 }}>
            Các lựa chọn hiện tại về phong cách, gu ăn uống, ngân sách và phương tiện của bạn sẽ trở lại trạng thái ban đầu của hệ thống.
          </p>
        </div>
      </Modal>

      {/* DELETE ACCOUNT MODAL */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Xóa tài khoản vĩnh viễn?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" size="sm" onClick={() => { setDeleteModalOpen(false); setToastMessage('Yêu cầu xóa tài khoản đã được tiếp nhận mock! ❌'); }}>
              Xóa tài khoản
            </Button>
          </>
        }
      >
        <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }} className="space-y-3">
          <p style={{ fontSize: 13, color: '#E6392E', fontWeight: 800 }}>
            CẢNH BÁO: Tác vụ này không thể hoàn tác!
          </p>
          <p style={{ fontSize: 12, color: '#7A6A58', lineHeight: 1.5, fontWeight: 650 }}>
            Toàn bộ lịch sử hành trình, danh sách địa điểm đã lưu và sở thích du lịch cá nhân của bạn sẽ bị xoá bỏ vĩnh viễn khỏi cơ sở dữ liệu.
          </p>
        </div>
      </Modal>

      {/* EDIT PROFILE MODAL */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Chỉnh sửa thông tin hồ sơ"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setProfileModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={saveProfileData}>
              Lưu thông tin
            </Button>
          </>
        }
      >
        <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }} className="space-y-4">
          <Input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            label="Họ và Tên"
            placeholder="Nhập tên hiển thị..."
          />
          <Input
            value={tempEmail}
            onChange={(e) => setTempEmail(e.target.value)}
            label="Địa chỉ Email"
            placeholder="Nhập email..."
          />
          <Input
            value={tempLocation}
            onChange={(e) => setTempLocation(e.target.value)}
            label="Khu vực sống"
            placeholder="Ví dụ: Nha Trang, Việt Nam..."
          />
        </div>
      </Modal>

      {/* AVATAR MOCK UPLOADER MODAL */}
      <Modal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        title="Thay đổi ảnh đại diện"
        footer={
          <Button variant="ghost" size="sm" onClick={() => setAvatarModalOpen(false)}>
            Đóng
          </Button>
        }
      >
        <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }} className="space-y-4 text-center">
          <p style={{ fontSize: 12, color: '#7A6A58', fontWeight: 650 }}>
            Chọn hình ảnh đại diện mới tải lên (Mock uploader).
          </p>
          <div
            style={{
              height: 120,
              border: '2px dashed #D8B98A',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: '#FFF6DE'
            }}
            onClick={() => { setAvatarModalOpen(false); setToastMessage('Tải ảnh đại diện thành công (Giả lập)! 📸'); }}
            className="hover:bg-yellow-soft transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#20A7D8' }}>upload_file</span>
            <span style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>Kéo thả file ảnh hoặc Click để chọn</span>
          </div>
        </div>
      </Modal>
    </AppContent>
  );
};
