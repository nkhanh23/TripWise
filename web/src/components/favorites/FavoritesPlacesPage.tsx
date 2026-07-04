"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContent } from '@/components/layout/AppContent';
import { FilmGrainOverlay } from '@/components/motion/FilmGrainOverlay';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KineticTitle } from '@/components/motion/KineticTitle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { RetroImage } from '@/components/ui/RetroImage';
import { Modal } from '@/components/ui/Modal';
import dynamic from 'next/dynamic';

const ExploreLeafletMap = dynamic(
  () => import('../explore/ExploreLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFDF3" }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#7A6A58" }}>Đang tải...</span>
      </div>
    )
  }
);

interface SavedPlace {
  id: string;
  name: string;
  city: string;
  category: 'Biển' | 'Văn hóa' | 'Ăn uống' | 'Cafe' | 'Check-in' | 'Mua sắm' | 'Thiên nhiên';
  tags: string[];
  distance: string;
  duration: string;
  cost: number;
  costLabel: string;
  savedDate: string;
  addedToTrip: string | null;
  note: string;
  imageUrl: string;
  lat: number;
  lng: number;
  description?: string;
  bestTime?: string;
}

export const FavoritesPlacesPage: React.FC = () => {
  const router = useRouter();

  // Local interaction states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'distance' | 'cost' | 'category'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>('p-1'); // Default select first
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Modals / Overlay states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [addToTripMenuOpen, setAddToTripMenuOpen] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'default' | 'loading' | 'empty' | 'error'>('default');

  // Extra filter parameters state
  const [filterNhaTrang, setFilterNhaTrang] = useState(false);
  const [filterFree, setFilterFree] = useState(false);
  const [filterUnadded, setFilterUnadded] = useState(false);

  // Auto-hide toast
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Initial mock saved places
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([
    {
      id: 'p-1',
      name: 'Tháp Bà Ponagar',
      city: 'Nha Trang',
      category: 'Văn hóa',
      tags: ['culture', 'photo', 'history'],
      distance: '2.4 km',
      duration: '90 phút',
      cost: 30000,
      costLabel: '30.000 ₫',
      savedDate: 'Hôm nay',
      addedToTrip: 'Nha Trang 3N2Đ',
      note: 'Đi buổi sáng để đỡ nắng nóng và đông đúc.',
      imageUrl: 'https://images.unsplash.com/photo-1571871239612-4fb37937be1e?w=500&auto=format&fit=crop&q=60',
      lat: 12.2706,
      lng: 109.1947,
    },
    {
      id: 'p-2',
      name: 'Bãi biển Trần Phú',
      city: 'Nha Trang',
      category: 'Biển',
      tags: ['beach', 'chill', 'free'],
      distance: '800m',
      duration: '60 phút',
      cost: 0,
      costLabel: '0 ₫ (Miễn phí)',
      savedDate: 'Hôm qua',
      addedToTrip: 'Nha Trang 3N2Đ',
      note: 'Dạo bộ lúc chiều tà ngắm hoàng hôn rất mát mẻ.',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60',
      lat: 12.2415,
      lng: 109.1960,
    },
    {
      id: 'p-3',
      name: 'Chợ Đầm Nha Trang',
      city: 'Nha Trang',
      category: 'Mua sắm',
      tags: ['local', 'food', 'shopping'],
      distance: '1.8 km',
      duration: '75 phút',
      cost: 200000,
      costLabel: '200.000 ₫',
      savedDate: '2 ngày trước',
      addedToTrip: null,
      note: 'Thiên đường mua yến sào làm quà tặng gia đình.',
      imageUrl: 'https://images.unsplash.com/photo-1543083503-0c355535947c?w=500&auto=format&fit=crop&q=60',
      lat: 12.2520,
      lng: 109.1900,
    },
    {
      id: 'p-4',
      name: 'Danh thắng Hòn Chồng',
      city: 'Nha Trang',
      category: 'Check-in',
      tags: ['view', 'photo', 'nature'],
      distance: '4.1 km',
      duration: '80 phút',
      cost: 30000,
      costLabel: '30.000 ₫',
      savedDate: '3 ngày trước',
      addedToTrip: null,
      note: 'Chụp góc view hướng ra vịnh Nha Trang siêu thơ mộng.',
      imageUrl: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=500&auto=format&fit=crop&q=60',
      lat: 12.2730,
      lng: 109.2020,
    },
    {
      id: 'p-5',
      name: 'Viện Hải dương học Nha Trang',
      city: 'Nha Trang',
      category: 'Văn hóa',
      tags: ['indoor', 'family', 'culture'],
      distance: '5.2 km',
      duration: '90 phút',
      cost: 40000,
      costLabel: '40.000 ₫',
      savedDate: '5 ngày trước',
      addedToTrip: null,
      note: 'Có bể kính đường hầm đi bộ ngắm cá mập con.',
      imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&auto=format&fit=crop&q=60',
      lat: 12.2050,
      lng: 109.2150,
    },
    {
      id: 'p-6',
      name: 'Sailing Club Nha Trang',
      city: 'Nha Trang',
      category: 'Ăn uống',
      tags: ['food', 'beach', 'night'],
      distance: '1.2 km',
      duration: '90 phút',
      cost: 350000,
      costLabel: '350.000 ₫',
      savedDate: '1 tuần trước',
      addedToTrip: null,
      note: 'Có show múa lửa bãi biển cực kỳ ấn tượng sau 21:00.',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=60',
      lat: 12.2355,
      lng: 109.1965,
    },
    {
      id: 'p-7',
      name: 'Nhà thờ Núi Nha Trang',
      city: 'Nha Trang',
      category: 'Văn hóa',
      tags: ['architecture', 'photo'],
      distance: '2.0 km',
      duration: '45 phút',
      cost: 0,
      costLabel: '0 ₫ (Miễn phí)',
      savedDate: '1 tuần trước',
      addedToTrip: null,
      note: 'Phong cách Gothic cổ điển, nên mặc đồ kín đáo khi tham quan.',
      imageUrl: 'https://images.unsplash.com/photo-1548625361-155de6c7f54a?w=500&auto=format&fit=crop&q=60',
      lat: 12.2490,
      lng: 109.1870,
    },
    {
      id: 'p-8',
      name: 'Cafe ngắm biển Wave Lounge',
      city: 'Nha Trang',
      category: 'Cafe',
      tags: ['cafe', 'check-in', 'chill'],
      distance: '900m',
      duration: '60 phút',
      cost: 80000,
      costLabel: '80.000 ₫',
      savedDate: '2 tuần trước',
      addedToTrip: null,
      note: 'Không gian sát mép biển ngắm bình minh Nha Trang siêu đỉnh.',
      imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=60',
      lat: 12.2380,
      lng: 109.1965,
    },
  ]);

  const categories = ['Tất cả', 'Biển', 'Văn hóa', 'Ăn uống', 'Cafe', 'Check-in', 'Mua sắm', 'Thiên nhiên'];

  const handleCategorySelect = (cat: string) => {
    setActiveCategory(cat);
    setSelectedPlaceId(null);
  };

  const handlePlaceSelect = (id: string) => {
    setSelectedPlaceId(id);
  };

  // Handle Remove Favorite place interaction
  const handleRemoveToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const matchedPlace = savedPlaces.find((p) => p.id === id);
    if (matchedPlace) {
      setSelectedPlaceId(id);
      setRemoveModalOpen(true);
    }
  };

  const handleRemoveConfirm = () => {
    if (selectedPlaceId) {
      setSavedPlaces(savedPlaces.filter((p) => p.id !== selectedPlaceId));
      setToastMessage('Đã bỏ lưu địa điểm thành công! 💔');
      setRemoveModalOpen(false);
      setSelectedPlaceId(null);
    }
  };

  const handleAddPlaceToTrip = (placeName: string, tripName: string) => {
    setSavedPlaces(
      savedPlaces.map((p) => (p.name === placeName ? { ...p, addedToTrip: tripName } : p))
    );
    setToastMessage(`Đã liên kết "${placeName}" vào hành trình "${tripName}"! 📅`);
    setAddToTripMenuOpen(null);
  };

  // Filter logic calculations
  const filteredPlaces = savedPlaces.filter((p) => {
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;

    const matchesCategory = activeCategory === 'Tất cả' ? true : p.category === activeCategory;

    const matchesCollection = activeCollection
      ? p.tags.includes(activeCollection.toLowerCase()) ||
        p.category.toLowerCase() === activeCollection.toLowerCase()
      : true;

    const matchesCity = filterNhaTrang ? p.city === 'Nha Trang' : true;
    const matchesFree = filterFree ? p.cost === 0 : true;
    const matchesUnadded = filterUnadded ? p.addedToTrip === null : true;

    return matchesSearch && matchesCategory && matchesCollection && matchesCity && matchesFree && matchesUnadded;
  });

  // Sorting calculations
  const sortedPlaces = [...filteredPlaces].sort((a, b) => {
    if (sortBy === 'cost') {
      return a.cost - b.cost;
    }
    if (sortBy === 'distance') {
      return parseFloat(a.distance) - parseFloat(b.distance);
    }
    if (sortBy === 'category') {
      return a.category.localeCompare(b.category);
    }
    return 0; // default newest order
  });

  const activePlaceObj = savedPlaces.find((p) => p.id === selectedPlaceId);

  // Stats calculation
  const totalCount = savedPlaces.length;
  const nhaTrangCount = savedPlaces.filter((p) => p.city === 'Nha Trang').length;
  const foodCount = savedPlaces.filter((p) => p.category === 'Ăn uống').length;
  const unaddedCount = savedPlaces.filter((p) => p.addedToTrip === null).length;

  const handleMarkerClick = (markerId: string) => {
    setSelectedPlaceId(markerId);
  };

  // Build marker list for right mini map preview
  const mapMarkers = sortedPlaces.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    label: p.name,
    selected: selectedPlaceId === p.id,
    type: 'place' as const,
  }));

  return (
    <AppContent variant="wide" className="relative pb-24 md:pb-10 pt-4">
      <FilmGrainOverlay />

      {/* Floating Retro Toast notifications */}
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
          <div className="space-y-6">
            <Skeleton variant="card" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-4">
                <Skeleton variant="card" />
                <Skeleton variant="timeline" />
              </div>
              <div className="lg:col-span-4">
                <Skeleton variant="card" />
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {viewState === 'empty' && (
          <Card>
            <EmptyState 
              title="Bạn chưa lưu địa điểm nào"
              message="Khám phá các danh thắng nổi tiếng Nha Trang và bấm lưu để xây dựng bộ sưu tập yêu thích của mình!"
              actions={
                <Button onClick={() => router.push('/explore')}>
                  Đi khám phá ngay
                </Button>
              }
            />
          </Card>
        )}

        {/* ERROR STATE */}
        {viewState === 'error' && (
          <Card title="Đã có lỗi xảy ra">
            <ErrorBanner 
              message="Không thể kết nối đến hệ thống máy chủ. Không tải được danh sách địa điểm đã lưu."
              onRetry={() => setViewState('default')}
            />
          </Card>
        )}

        {/* DEFAULT VIEW STATE */}
        {viewState === 'default' && (
          <div className="grid grid-cols-12 gap-6 items-stretch">
            
            {/* 1. PAGE HERO SUMMARY - span 12 */}
            <div
              style={{
                backgroundColor: '#FFFDF3',
                border: '3px solid #111111',
                borderRadius: 24,
                padding: 24,
                boxShadow: '6px 6px 0 #111111',
                fontFamily: "'Be Vietnam Pro', sans-serif",
                position: 'relative'
              }}
              className="col-span-12 space-y-4"
            >
              <div 
                style={{
                  position: 'absolute',
                  top: -12,
                  right: 20,
                  backgroundColor: '#B8F24A',
                  border: '2px solid #111111',
                  borderRadius: 6,
                  padding: '2px 10px',
                  fontWeight: 900,
                  fontSize: 10,
                  textTransform: 'uppercase',
                  transform: 'skewX(-2deg)'
                }}
              >
                Travel Scrapbook
              </div>

              <div>
                <KineticTitle text="Địa điểm yêu thích 💙" size="section" variant="pop" />
                <p style={{ fontSize: 13, color: '#7A6A58', fontWeight: 650, marginTop: 4 }}>
                  Những toạ độ bạn muốn ghé thăm, ăn uống hay chụp ảnh tự sướng để dành thêm vào lịch trình sau.
                </p>
              </div>

              {/* Stats blocks stickers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div style={{ backgroundColor: '#FFF6DE', border: '2px solid #111111', borderRadius: 12, padding: 12, textAlign: 'center', boxShadow: '2px 2px 0 #111111' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Tổng địa điểm</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: '#20A7D8', marginTop: 4 }}>{totalCount}</div>
                </div>
                <div style={{ backgroundColor: '#FFF6DE', border: '2px solid #111111', borderRadius: 12, padding: 12, textAlign: 'center', boxShadow: '2px 2px 0 #111111' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Nha Trang</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: '#FFD166', marginTop: 4 }}>{nhaTrangCount}</div>
                </div>
                <div style={{ backgroundColor: '#FFF6DE', border: '2px solid #111111', borderRadius: 12, padding: 12, textAlign: 'center', boxShadow: '2px 2px 0 #111111' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Ăn uống</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: '#F77F00', marginTop: 4 }}>{foodCount}</div>
                </div>
                <div style={{ backgroundColor: '#FFF6DE', border: '2px solid #111111', borderRadius: 12, padding: 12, textAlign: 'center', boxShadow: '2px 2px 0 #111111' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase' }}>Chưa vào trip</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: '#B8F24A', marginTop: 4 }}>{unaddedCount}</div>
                </div>
              </div>
            </div>

            {/* 2. LEFT COLUMN (Toolbar + result list cards) - span 8 */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              
              {/* Search filter sort toolbar */}
              <div 
                style={{
                  backgroundColor: '#FFF6DE',
                  border: '2px solid #111111',
                  borderRadius: 16,
                  padding: 14,
                  boxShadow: '3px 3px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-4"
              >
                {/* Search and sort selectors */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                  <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm địa điểm đã lưu..."
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 36px',
                        backgroundColor: '#FFFDF3',
                        border: '2px solid #111111',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 750,
                        outline: 'none',
                      }}
                      className="focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, fontWeight: 800 }}>
                      <span style={{ color: '#7A6A58' }}>Sắp xếp:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        style={{
                          backgroundColor: '#FFFDF3',
                          border: '1.5px solid #111111',
                          borderRadius: 8,
                          padding: '4px 8px',
                          fontSize: 11,
                          fontWeight: 800,
                          outline: 'none',
                          cursor: 'pointer',
                          fontFamily: "'Be Vietnam Pro', sans-serif"
                        }}
                      >
                        <option value="newest">Mới lưu</option>
                        <option value="distance">Khoảng cách</option>
                        <option value="cost">Chi phí</option>
                        <option value="category">Category</option>
                      </select>
                    </div>

                    {/* View mode toggle */}
                    <div style={{ display: 'flex', border: '1.5px solid #111111', borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFFDF3' }}>
                      <button
                        onClick={() => setViewMode('grid')}
                        style={{ border: 'none', background: viewMode === 'grid' ? '#FFD166' : 'transparent', padding: '5px 8px', cursor: 'pointer', display: 'flex' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>grid_view</span>
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        style={{ border: 'none', background: viewMode === 'list' ? '#FFD166' : 'transparent', borderLeft: '1.5px solid #111111', padding: '5px 8px', cursor: 'pointer', display: 'flex' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>view_list</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Categories filtering row */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '5px 12px',
                        borderRadius: 9999,
                        border: '1.5px solid #111111',
                        backgroundColor: activeCategory === cat ? '#FFD166' : '#FFFDF3',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Extra Filter Toggles */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setFilterNhaTrang(!filterNhaTrang)}
                    style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 9999, border: '1.5px solid #111111', backgroundColor: filterNhaTrang ? '#FFD166' : '#FFFDF3', cursor: 'pointer' }}
                  >
                    📍 Nha Trang
                  </button>
                  <button
                    onClick={() => setFilterFree(!filterFree)}
                    style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 9999, border: '1.5px solid #111111', backgroundColor: filterFree ? '#FFD166' : '#FFFDF3', cursor: 'pointer' }}
                  >
                    🆓 Miễn phí
                  </button>
                  <button
                    onClick={() => setFilterUnadded(!filterUnadded)}
                    style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 9999, border: '1.5px solid #111111', backgroundColor: filterUnadded ? '#FFD166' : '#FFFDF3', cursor: 'pointer' }}
                  >
                    🗓️ Chưa thêm vào trip
                  </button>
                </div>
              </div>

              {/* No items matches empty filters label */}
              {sortedPlaces.length === 0 && (
                <Card>
                  <EmptyState 
                    title="Không tìm thấy địa điểm"
                    message="Không có địa điểm đã lưu nào khớp với bộ lọc tìm kiếm của bạn."
                    actions={
                      <Button onClick={() => { setSearchQuery(''); setActiveCategory('Tất cả'); setFilterFree(false); setFilterNhaTrang(false); setFilterUnadded(false); setActiveCollection(null); }}>
                        Xoá bộ lọc
                      </Button>
                    }
                  />
                </Card>
              )}

              {/* GRID CARDS VIEW */}
              {viewMode === 'grid' && sortedPlaces.length > 0 && (
                <div className="grid gap-6 pb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                  {sortedPlaces.map((place) => {
                    const isSelected = selectedPlaceId === place.id;
                    const isMenuOpen = addToTripMenuOpen === place.id;

                    return (
                      <div
                        key={place.id}
                        onClick={() => handlePlaceSelect(place.id)}
                        style={{
                          backgroundColor: '#FFFDF3',
                          border: isSelected ? '3px solid #20A7D8' : '2px solid #111111',
                          borderRadius: 20,
                          overflow: 'hidden',
                          boxShadow: isSelected ? '5px 5px 0 #20A7D8' : '4px 4px 0 #111111',
                          display: 'flex',
                          flexDirection: 'column',
                          fontFamily: "'Be Vietnam Pro', sans-serif",
                          position: 'relative'
                        }}
                        className="hover:scale-[1.01] transition-transform"
                      >
                        {/* Image banner */}
                        <div style={{ height: 110, position: 'relative', borderBottom: '2px solid #111111' }}>
                          <RetroImage src={place.imageUrl} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: 8, left: 8 }}>
                            <span style={{ fontSize: 9, fontWeight: 900, backgroundColor: '#FFD166', border: '1.5px solid #111111', borderRadius: 4, padding: '1px 6px' }}>
                              {place.category}
                            </span>
                          </div>
                          <div style={{ position: 'absolute', top: 8, right: 8 }}>
                            <button
                              onClick={(e) => handleRemoveToggle(place.id, e)}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                border: '1.5px solid #111111',
                                backgroundColor: '#FFFDF3',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#E6392E', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                            </button>
                          </div>
                        </div>

                        {/* Content details */}
                        <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div className="space-y-1.5">
                            <h3 style={{ fontSize: 14, fontWeight: 900, color: '#111111', margin: 0, lineHeight: 1.2 }}>
                              {place.name}
                            </h3>
                            <div style={{ fontSize: 10, color: '#7A6A58', fontWeight: 650 }}>
                              📍 {place.city} • ⏱ {place.distance} • 💰 {place.costLabel}
                            </div>
                            
                            {/* Trip linkage indicator */}
                            <div style={{ paddingTop: 8 }}>
                              {place.addedToTrip ? (
                                <Badge variant="success" size="sm">✓ {place.addedToTrip}</Badge>
                              ) : (
                                <Badge variant="neutral" size="sm">Chưa thêm vào trip</Badge>
                              )}
                            </div>
                          </div>

                          {/* Card bottom actions row */}
                          <div style={{ display: 'flex', gap: 6, paddingTop: 16, marginTop: 10, position: 'relative' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddToTripMenuOpen(isMenuOpen ? null : place.id);
                              }}
                              style={{
                                flex: 1.3,
                                backgroundColor: '#B8F24A',
                                border: '1.5px solid #111111',
                                borderRadius: 8,
                                padding: '4px 6px',
                                fontSize: 10,
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>add</span>
                              Add to trip
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlaceId(place.id);
                                setDetailModalOpen(true);
                              }}
                              style={{
                                flex: 1,
                                backgroundColor: '#FFF6DE',
                                border: '1.5px solid #111111',
                                borderRadius: 8,
                                padding: '4px 6px',
                                fontSize: 10,
                                fontWeight: 800,
                                cursor: 'pointer',
                                color: '#111111'
                              }}
                            >
                              Chi tiết
                            </button>

                            {/* Floating menu option Add To Trip */}
                            {isMenuOpen && (
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  left: 0,
                                  zIndex: 120,
                                  backgroundColor: '#FFFDF3',
                                  border: '2px solid #111111',
                                  borderRadius: 10,
                                  boxShadow: '3px 3px 0 #111111',
                                  padding: '4px 0',
                                  width: 140,
                                }}
                              >
                                {['Nha Trang 3N2Đ', 'Đà Lạt cuối tuần', '+ Tạo trip mới'].map((tripItem) => (
                                  <button
                                    key={tripItem}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddPlaceToTrip(place.name, tripItem);
                                    }}
                                    style={{
                                      width: '100%',
                                      textAlign: 'left',
                                      border: 'none',
                                      background: 'none',
                                      padding: '6px 12px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      fontFamily: "'Be Vietnam Pro', sans-serif"
                                    }}
                                    className="hover:bg-yellow-soft"
                                  >
                                    {tripItem}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* LIST ROWS VIEW */}
              {viewMode === 'list' && sortedPlaces.length > 0 && (
                <div className="space-y-3 pb-6">
                  {sortedPlaces.map((place) => {
                    const isSelected = selectedPlaceId === place.id;
                    const isMenuOpen = addToTripMenuOpen === place.id;

                    return (
                      <div
                        key={place.id}
                        onClick={() => handlePlaceSelect(place.id)}
                        style={{
                          backgroundColor: '#FFFDF3',
                          border: isSelected ? '2px solid #20A7D8' : '2px solid #111111',
                          borderRadius: 12,
                          padding: '10px 16px',
                          boxShadow: isSelected ? '3px 3px 0 #20A7D8' : '3px 3px 0 #111111',
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontFamily: "'Be Vietnam Pro', sans-serif",
                          position: 'relative',
                          gap: 12,
                        }}
                        className="hover:scale-[1.005] transition-transform flex-wrap sm:flex-nowrap"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 180 }}>
                          <span className="material-symbols-outlined text-outline" style={{ fontSize: 20 }}>pin_drop</span>
                          <div>
                            <h4 style={{ fontSize: 13, fontWeight: 900, color: '#111111', margin: 0 }}>{place.name}</h4>
                            <span style={{ fontSize: 10, color: '#7A6A58', fontWeight: 650 }}>
                              {place.city} • {place.distance}
                            </span>
                          </div>
                        </div>

                        <div style={{ minWidth: 90 }}>
                          <span style={{ fontSize: 9, fontWeight: 900, backgroundColor: '#FFD166', border: '1.5px solid #111111', borderRadius: 4, padding: '2px 8px' }}>
                            {place.category}
                          </span>
                        </div>

                        <div style={{ fontSize: 11, fontWeight: 800, color: '#E6392E', minWidth: 80 }}>
                          {place.costLabel}
                        </div>

                        <div style={{ minWidth: 120 }}>
                          {place.addedToTrip ? (
                            <Badge variant="success" size="sm">✓ {place.addedToTrip}</Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">Chưa thêm</Badge>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlaceId(place.id);
                              setDetailModalOpen(true);
                            }}
                            style={{ backgroundColor: '#FFFDF3', border: '1.5px solid #111111', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                          >
                            Xem
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddToTripMenuOpen(isMenuOpen ? null : place.id);
                            }}
                            style={{ backgroundColor: '#B8F24A', border: '1.5px solid #111111', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                          >
                            Add
                          </button>

                          <button
                            onClick={(e) => handleRemoveToggle(place.id, e)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#E6392E', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                          </button>

                          {/* Floating menu options for Add To Trip in list view */}
                          {isMenuOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '100%',
                                right: 0,
                                zIndex: 120,
                                backgroundColor: '#FFFDF3',
                                border: '2px solid #111111',
                                borderRadius: 10,
                                boxShadow: '3px 3px 0 #111111',
                                padding: '4px 0',
                                width: 140,
                              }}
                            >
                              {['Nha Trang 3N2Đ', 'Đà Lạt cuối tuần', '+ Tạo trip mới'].map((tripItem) => (
                                <button
                                  key={tripItem}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddPlaceToTrip(place.name, tripItem);
                                  }}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'none',
                                    padding: '6px 12px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: "'Be Vietnam Pro', sans-serif"
                                  }}
                                  className="hover:bg-yellow-soft"
                                >
                                  {tripItem}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* 3. RIGHT COLUMN (Place preview widget, mini map preview, Collections card) - span 4 */}
            <aside className="col-span-12 lg:col-span-4 space-y-6">
              
              {/* Place preview details widget */}
              {activePlaceObj && (
                <div
                  style={{
                    backgroundColor: '#FFFDF3',
                    border: '3px solid #111111',
                    borderRadius: 20,
                    boxShadow: '4px 4px 0 #111111',
                    overflow: 'hidden',
                    fontFamily: "'Be Vietnam Pro', sans-serif"
                  }}
                  className="animate-pop-in space-y-3"
                >
                  <div style={{ height: 140, borderBottom: '2.5px solid #111111' }}>
                    <RetroImage src={activePlaceObj.imageUrl} alt={activePlaceObj.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div style={{ padding: '0 16px 16px' }} className="space-y-3">
                    <div>
                      <span style={{ fontSize: 9, fontWeight: 900, backgroundColor: '#FFD166', border: '1.5px solid #111111', borderRadius: 4, padding: '1px 6px' }}>
                        {activePlaceObj.category}
                      </span>
                      <h3 style={{ fontSize: 16, fontWeight: 900, color: '#111111', marginTop: 6, marginBottom: 2 }}>
                        {activePlaceObj.name}
                      </h3>
                      <span style={{ fontSize: 11, color: '#7A6A58', fontWeight: 650 }}>
                        {activePlaceObj.city} • cách lộ trình {activePlaceObj.distance}
                      </span>
                    </div>

                    <div style={{ padding: 10, backgroundColor: '#FFF6DE', border: '1.5px solid #111111', borderRadius: 10 }} className="space-y-1.5">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: '#7A6A58' }}>⏱ Thời lượng</span>
                        <span>{activePlaceObj.duration}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: '#7A6A58' }}>💰 Chi phí</span>
                        <span>{activePlaceObj.costLabel}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: '#7A6A58' }}>🗓️ Trạng thái</span>
                        <span style={{ color: activePlaceObj.addedToTrip ? '#B8F24A' : '#7A6A58' }}>
                          {activePlaceObj.addedToTrip ? `Đã thêm (${activePlaceObj.addedToTrip})` : 'Chưa thêm'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: 11, fontWeight: 800, margin: '0 0 4px' }}>Ghi chú hành trình</h4>
                      <p style={{ fontSize: 11, color: '#3A2F2A', margin: 0, fontStyle: 'italic', backgroundColor: '#FFFDF3', padding: '6px 10px', border: '1px dashed #D8B98A', borderRadius: 8 }}>
                        &quot;{activePlaceObj.note}&quot;
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 6, paddingTop: 8 }}>
                      <Button variant="ghost" size="sm" style={{ flex: 1 }} onClick={(e) => handleRemoveToggle(activePlaceObj.id, e as any)}>
                        💔 Bỏ lưu
                      </Button>
                      <Button variant="primary" size="sm" style={{ flex: 1.5 }} onClick={() => setAddToTripMenuOpen(activePlaceObj.id)}>
                        Thêm vào trip
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Saved places mini map preview dashboard */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 20,
                  padding: 14,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-3"
              >
                <h4 style={{ fontSize: 13, fontWeight: 900, margin: 0 }}>Bản đồ địa điểm đã lưu</h4>
                <div style={{ height: 160, borderRadius: 12, overflow: 'hidden', border: '2px solid #111111' }}>
                  <ExploreLeafletMap
                    markers={mapMarkers}
                    onMarkerClick={handleMarkerClick}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="secondary" size="sm" style={{ width: '100%', minHeight: 30 }} onClick={() => router.push('/explore')}>
                    Mở Explore Map
                  </Button>
                </div>
              </div>

              {/* Quick collections tag card list */}
              <div
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '3px solid #111111',
                  borderRadius: 20,
                  padding: 16,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-3"
              >
                <h4 style={{ fontSize: 13, fontWeight: 900, margin: 0 }}>Bộ sưu tập gắn tag</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Nha Trang trip ideas', count: 5, bg: '#D6F1FB' },
                    { label: 'Food spots', count: 2, bg: '#FFE7C2' },
                    { label: 'Check-in đẹp', count: 3, bg: '#EDFCC8' },
                    { label: 'Miễn phí', count: 2, bg: '#FFF3C4' },
                  ].map((col) => (
                    <button
                      key={col.label}
                      onClick={() => {
                        const tagMap: Record<string, string> = {
                          'Nha Trang trip ideas': 'Nha Trang',
                          'Food spots': 'food',
                          'Check-in đẹp': 'photo',
                          'Miễn phí': 'free',
                        };
                        setActiveCollection(activeCollection === tagMap[col.label] ? null : tagMap[col.label]);
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: activeCollection && ['Nha Trang', 'food', 'photo', 'free'].includes(activeCollection) && activeCollection === col.label ? '#FFD166' : '#FFFDF3',
                        border: '1.5px solid #111111',
                        borderRadius: 8,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: "'Be Vietnam Pro', sans-serif"
                      }}
                      className="hover:translate-x-0.5 transition-transform"
                    >
                      <span style={{ fontSize: 11, fontWeight: 800 }}>{col.label}</span>
                      <span style={{ fontSize: 9, fontWeight: 900, backgroundColor: col.bg, border: '1px solid #111111', borderRadius: 4, padding: '1px 6px' }}>
                        {col.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </aside>

          </div>
        )}
      </div>

      {/* DETAIL MODAL POPUP DISPLAY */}
      {activePlaceObj && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title="Chi tiết địa danh yêu thích"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setDetailModalOpen(false)}>
                Đóng
              </Button>
              <Button variant="secondary" size="sm" onClick={(e) => handleRemoveToggle(activePlaceObj.id, e as any)}>
                💔 Bỏ lưu
              </Button>
              <Button variant="primary" size="sm" onClick={() => setAddToTripMenuOpen(activePlaceObj.id)}>
                Thêm vào trip
              </Button>
            </>
          }
        >
          <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }} className="space-y-4">
            
            {/* Postcard banner */}
            <div style={{ height: 160, borderRadius: 12, overflow: 'hidden', border: '2px solid #111111' }}>
              <RetroImage src={activePlaceObj.imageUrl} alt={activePlaceObj.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div>
              <span style={{ fontSize: 10, fontWeight: 900, backgroundColor: '#FFD166', border: '1.5px solid #111111', borderRadius: 6, padding: '2px 8px' }}>
                {activePlaceObj.category}
              </span>
              <h3 style={{ fontSize: 20, fontWeight: 900, marginTop: 8, marginBottom: 2 }}>{activePlaceObj.name}</h3>
              <span style={{ fontSize: 12, color: '#7A6A58', fontWeight: 650 }}>{activePlaceObj.city}</span>
            </div>

            <p style={{ fontSize: 13, color: '#3A2F2A', lineHeight: 1.5 }}>
              {activePlaceObj.description || 'Không có mô tả chi tiết cho địa danh này.'}
            </p>

            <div style={{ padding: 12, backgroundColor: '#FFF6DE', border: '1.5px solid #111111', borderRadius: 12 }} className="grid grid-cols-2 gap-2 text-xs font-bold">
              <div>📍 Khoảng cách: {activePlaceObj.distance}</div>
              <div>⏱ Thời lượng: {activePlaceObj.duration}</div>
              <div>💰 Chi phí: {activePlaceObj.costLabel}</div>
              <div>🌅 Thời gian tốt nhất: {activePlaceObj.bestTime || 'Cả ngày'}</div>
            </div>

            <div style={{ border: '1.5px dashed #D8B98A', borderRadius: 10, padding: 12, backgroundColor: '#FFFDF3' }}>
              <h4 style={{ fontSize: 11, fontWeight: 900, margin: '0 0 4px', textTransform: 'uppercase', color: '#7A6A58' }}>Ghi chú cá nhân</h4>
              <p style={{ fontSize: 12, margin: 0, fontStyle: 'italic' }}>
                &quot;{activePlaceObj.note}&quot;
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {activePlaceObj.tags.map(t => (
                <Badge key={t} variant="neutral">#{t}</Badge>
              ))}
            </div>

          </div>
        </Modal>
      )}

      {/* REMOVE FAVORITE CONFIRM MODAL */}
      <Modal
        isOpen={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        title="Bỏ lưu địa điểm này?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRemoveModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" size="sm" onClick={handleRemoveConfirm}>
              Bỏ lưu
            </Button>
          </>
        }
      >
        <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }} className="space-y-3">
          <p style={{ fontSize: 13, color: '#111111', fontWeight: 700 }}>
            Bạn có chắc muốn bỏ lưu địa điểm này không?
          </p>
          <p style={{ fontSize: 12, color: '#7A6A58', lineHeight: 1.5, fontWeight: 650 }}>
            Địa điểm sẽ bị gỡ bỏ khỏi album yêu thích cá nhân. Bạn vẫn có thể tìm kiếm lại địa danh này bất kỳ lúc nào tại màn hình Khám phá Bản đồ.
          </p>
        </div>
      </Modal>
    </AppContent>
  );
};
