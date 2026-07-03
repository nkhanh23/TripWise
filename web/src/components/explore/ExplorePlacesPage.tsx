"use client";
import React, { useState, useEffect } from 'react';
import { AppContent } from '@/components/layout/AppContent';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KineticTitle } from '@/components/motion/KineticTitle';
import { FilmGrainOverlay } from '@/components/motion/FilmGrainOverlay';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { RetroImage } from '@/components/ui/RetroImage';
import { MapPanel } from '@/components/map/MapPanel';
import { searchPlaces } from '@/lib/api';

interface PlaceData {
  id: string;
  name: string;
  category: 'Biển' | 'Văn hóa' | 'Ăn uống' | 'Cafe' | 'Check-in' | 'Mua sắm' | 'Thiên nhiên';
  tags: string[];
  distance: string;
  duration: string;
  cost: string;
  lat: number;
  lng: number;
  description: string;
  bestTime: string;
  markerType: 'accommodation' | 'place' | 'origin';
  imageUrl: string;
}

export const ExplorePlacesPage: React.FC = () => {
  // Page states
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>('p-1'); // Default select first
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('Nha Trang');
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>(['p-2', 'p-7']);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [addToTripMenuOpen, setAddToTripMenuOpen] = useState<string | null>(null); // holds place.id when menu open
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'default' | 'loading' | 'empty' | 'error'>('default');
  
  // Extra toggle parameters
  const [filterNearMe, setFilterNearMe] = useState(false);
  const [filterFree, setFilterFree] = useState(false);

  // Auto hide toast
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  const [places, setPlaces] = useState<PlaceData[]>([]);

  useEffect(() => {
    const fetchPlaces = async () => {
      setViewState('loading');
      try {
        const response = await searchPlaces({ size: 50 });
        if (response && response.content) {
          const apiPlaces: PlaceData[] = response.content.map(p => ({
            id: p.id.toString(),
            name: p.name,
            category: (p.categoryName || 'Khác') as any,
            tags: p.tags || [],
            distance: p.distanceMeters ? `${p.distanceMeters}m` : '0m',
            duration: p.durationMinutes ? `${p.durationMinutes} phút` : '30 phút',
            cost: p.estimatedCost ? `${p.estimatedCost.toLocaleString('vi-VN')} ₫` : '0 ₫',
            lat: p.latitude || 12.2415,
            lng: p.longitude || 109.1960,
            description: p.description || '',
            bestTime: 'Cả ngày',
            markerType: 'place',
            imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60', // random default
          }));
          setPlaces(apiPlaces);
          setViewState(apiPlaces.length === 0 ? 'empty' : 'default');
        } else {
          setViewState('error');
        }
      } catch (error) {
        console.error("Failed to fetch places:", error);
        setViewState('error');
      }
    };
    fetchPlaces();
  }, []);

  // Categories list
  const categories = ['Tất cả', 'Biển', 'Văn hóa', 'Ăn uống', 'Cafe', 'Check-in', 'Mua sắm', 'Thiên nhiên'];

  // Filter list logic
  const filteredPlaces = places.filter((place) => {
    // 1. Search Query filter
    const matchesSearch = searchQuery
      ? place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;

    // 2. Category filter
    const matchesCategory = activeCategory === 'Tất cả' ? true : place.category === activeCategory;

    // 3. Extra parameter filters
    const matchesNearMe = filterNearMe ? parseFloat(place.distance) < 2 : true;
    const matchesFree = filterFree ? place.cost === '0 ₫' : true;

    return matchesSearch && matchesCategory && matchesNearMe && matchesFree;
  });

  const handleCategorySelect = (cat: string) => {
    setActiveCategory(cat);
    setSelectedPlaceId(null);
  };

  const handlePlaceSelect = (id: string) => {
    setSelectedPlaceId(id);
    const place = places.find((p) => p.id === id);
    if (place) {
      setDetailDrawerOpen(false); // keep drawer closed until clicked details
    }
  };

  const handleSaveToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedPlaceIds.includes(id)) {
      setSavedPlaceIds(savedPlaceIds.filter((p) => p !== id));
      setToastMessage('Đã bỏ lưu địa điểm này 💔');
    } else {
      setSavedPlaceIds([...savedPlaceIds, id]);
      setToastMessage('Đã thêm vào danh sách yêu thích! ❤️');
    }
  };

  const handleAddPlaceToTrip = (placeName: string, tripName: string) => {
    setToastMessage(`Đã thêm "${placeName}" vào hành trình "${tripName}"! 📅`);
    setAddToTripMenuOpen(null);
  };

  const handleMarkerClick = (markerId: string) => {
    setSelectedPlaceId(markerId);
    setDetailDrawerOpen(false);
  };

  // Build marker list for Map based on filtered results
  const mapMarkers = filteredPlaces.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    label: p.name,
    selected: selectedPlaceId === p.id,
    type: p.markerType,
  }));

  const activePlaceObj = places.find((p) => p.id === selectedPlaceId);

  return (
    <AppContent variant="map" className="relative pb-24 md:pb-10 pt-4">
      <FilmGrainOverlay />

      {/* Toast popup */}
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

      {/* Main split-screen panel container */}
      <div className="w-full h-full flex flex-col">
        
        {/* Toggle States Dev Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, overflowX: 'auto', paddingBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#7A6A58', alignSelf: 'center', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
             Dev simulator:
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] overflow-hidden">
            <div className="lg:col-span-5 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <Skeleton variant="card" />
              <Skeleton variant="text" />
            </div>
            <div className="lg:col-span-7 h-full">
              <div style={{ height: '100%', backgroundColor: '#F3C99B', borderRadius: 24, border: '3px solid #111111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined animate-spin text-5xl text-brand">pending</span>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {viewState === 'empty' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] overflow-hidden">
            <div className="lg:col-span-5 flex flex-col justify-center">
              <Card>
                <EmptyState 
                  title="Không tìm thấy địa điểm" 
                  message="Không tìm thấy địa danh nào khớp với bộ lọc hiện tại của bạn. Vui lòng xoá bớt từ khoá."
                  actions={
                    <Button onClick={() => { setSearchQuery(''); setActiveCategory('Tất cả'); setFilterFree(false); setFilterNearMe(false); }}>
                      Xoá bộ lọc
                    </Button>
                  }
                />
              </Card>
            </div>
            <div className="lg:col-span-7 h-full">
              <MapPanel height="100%" />
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {viewState === 'error' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] overflow-hidden">
            <div className="lg:col-span-5 flex flex-col justify-center">
              <Card title="Đã có lỗi xảy ra">
                <ErrorBanner 
                  message="Không thể tải được danh sách địa điểm du lịch từ hệ thống cơ sở dữ liệu."
                  onRetry={() => setViewState('default')}
                />
              </Card>
            </div>
            <div className="lg:col-span-7 h-full">
              <MapPanel height="100%" />
            </div>
          </div>
        )}

        {/* DEFAULT DISPLAY STATE */}
        {viewState === 'default' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-[calc(100vh-180px)] overflow-hidden pb-4 md:pb-0">
            
            {/* LEFT EXPLORE PANEL: span 5 (Search, Category chip grid, list result cards) */}
            <aside className="lg:col-span-5 flex flex-col h-full overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              
              {/* Explorer Header */}
              <div 
                style={{
                  backgroundColor: '#FFFDF3',
                  border: '2.5px solid #111111',
                  borderRadius: 20,
                  padding: 16,
                  boxShadow: '4px 4px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-2"
              >
                <div className="flex justify-between items-center">
                  <KineticTitle text="Khám phá địa điểm 🧭" size="card" variant="pop" />
                  <Badge variant="sticker">Explore Map</Badge>
                </div>
                <p style={{ fontSize: 12, color: '#7A6A58', fontWeight: 650 }}>
                  Tìm địa danh ăn uống, vui chơi yêu thích để thêm vào hành trình đi.
                </p>
              </div>

              {/* Search ticket input & extra parameter toggles */}
              <div 
                style={{
                  backgroundColor: '#FFF6DE',
                  border: '2px solid #111111',
                  borderRadius: 16,
                  padding: 12,
                  boxShadow: '3px 3px 0 #111111',
                  fontFamily: "'Be Vietnam Pro', sans-serif"
                }}
                className="space-y-3"
              >
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm địa điểm, bãi biển, quán ăn..."
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 42px',
                      backgroundColor: '#FFFDF3',
                      border: '2px solid #111111',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 700,
                      outline: 'none',
                    }}
                    className="focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: 12, top: '1/2', transform: 'translateY(-50%)', border: 'none', background: 'none', fontWeight: 900, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Extra switches filters */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setFilterNearMe(!filterNearMe)}
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 9999,
                      border: '1.5px solid #111111',
                      backgroundColor: filterNearMe ? '#FFD166' : '#FFFDF3',
                      cursor: 'pointer',
                    }}
                  >
                    📍 Gần tôi (&lt; 2km)
                  </button>

                  <button
                    onClick={() => setFilterFree(!filterFree)}
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 9999,
                      border: '1.5px solid #111111',
                      backgroundColor: filterFree ? '#FFD166' : '#FFFDF3',
                      cursor: 'pointer',
                    }}
                  >
                    🆓 Miễn phí
                  </button>
                </div>
              </div>

              {/* Category chip selector row */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6 }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '6px 12px',
                      borderRadius: 9999,
                      border: '2px solid #111111',
                      backgroundColor: activeCategory === cat ? '#FFD166' : '#FFFDF3',
                      boxShadow: activeCategory === cat ? '2px 2px 0 #111111' : 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontFamily: "'Be Vietnam Pro', sans-serif",
                    }}
                    className="hover:scale-[1.03] transition-transform"
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Filter result status label */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#7A6A58' }}>
                  Tìm thấy {filteredPlaces.length} địa điểm
                </span>
                {(activeCategory !== 'Tất cả' || searchQuery || filterFree || filterNearMe) && (
                  <button
                    onClick={() => { setActiveCategory('Tất cả'); setSearchQuery(''); setFilterNearMe(false); setFilterFree(false); }}
                    style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 900, color: '#E6392E', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Xoá bộ lọc
                  </button>
                )}
              </div>

              {/* List result cards */}
              <div className="space-y-4 flex-1 pr-1 pb-6">
                {filteredPlaces.map((place) => {
                  const isSelected = selectedPlaceId === place.id;
                  const isSaved = savedPlaceIds.includes(place.id);
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
                        height: 140,
                        cursor: 'pointer',
                        position: 'relative',
                        fontFamily: "'Be Vietnam Pro', sans-serif",
                      }}
                      className="hover:scale-[1.01] transition-transform"
                    >
                      {/* Photo Thumbnail */}
                      <div style={{ width: '35%', height: '100%', borderRight: '2px solid #111111', overflow: 'hidden' }}>
                        <RetroImage 
                          src={place.imageUrl} 
                          alt={place.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>

                      {/* Info Panel content */}
                      <div style={{ width: '65%', padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 style={{ fontWeight: 850, fontSize: 14, color: '#111111', margin: 0, lineHeight: 1.2 }}>
                              {place.name}
                            </h3>
                            {/* Favorite Saved Heart Button */}
                            <button
                              type="button"
                              onClick={(e) => handleSaveToggle(place.id, e)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                              }}
                            >
                              <span 
                                className="material-symbols-outlined" 
                                style={{ 
                                  fontSize: 18, 
                                  color: isSaved ? '#E6392E' : '#7A6A58',
                                  fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0"
                                }}
                              >
                                favorite
                              </span>
                            </button>
                          </div>

                          <div style={{ fontSize: 10, color: '#7A6A58', fontWeight: 700, marginTop: 4 }}>
                            🏷️ {place.category} • 📍 {place.distance}
                          </div>

                          {/* Tags row */}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                            {place.tags.map((tag) => (
                              <span 
                                key={tag} 
                                style={{
                                  fontSize: 8,
                                  fontWeight: 800,
                                  backgroundColor: '#FFF6DE',
                                  border: '1px solid #111111',
                                  borderRadius: 4,
                                  padding: '1px 5px',
                                  textTransform: 'uppercase'
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Cards Action Buttons */}
                        <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddToTripMenuOpen(isMenuOpen ? null : place.id);
                            }}
                            style={{
                              backgroundColor: '#B8F24A',
                              border: '1.5px solid #111111',
                              borderRadius: 8,
                              padding: '4px 8px',
                              fontSize: 10,
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>add</span>
                            Thêm vào trip
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlaceId(place.id);
                              setDetailDrawerOpen(true);
                            }}
                            style={{
                              backgroundColor: '#FFF6DE',
                              border: '1.5px solid #111111',
                              borderRadius: 8,
                              padding: '4px 8px',
                              fontSize: 10,
                              fontWeight: 900,
                              cursor: 'pointer',
                              color: '#111111'
                            }}
                          >
                            Chi tiết
                          </button>

                          {/* Floating menu options for Add To Trip */}
                          {isMenuOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 6px)',
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

            </aside>

            {/* RIGHT PANEL: span 7 (Map viewport dashboard cockpit) */}
            <main className="lg:col-span-7 h-[calc(100vh-210px)] lg:h-full relative">
              <div className="w-full h-full rounded-[24px] overflow-hidden border-[3px] border-[#111111] shadow-comic-lg relative">
                
                {/* Map drawing mockup */}
                <MapPanel
                  markers={mapMarkers}
                  showRoute={false} // Independent exploration map, no route line overlay
                  height="100%"
                  onMarkerClick={handleMarkerClick}
                />

                {/* Filter Summary Pill overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 90,
                    backgroundColor: '#B8F24A',
                    border: '2px solid #111111',
                    borderRadius: 9999,
                    padding: '4px 12px',
                    boxShadow: '2px 2px 0 #111111',
                    fontSize: 11,
                    fontWeight: 800,
                    fontFamily: "'Be Vietnam Pro', sans-serif"
                  }}
                >
                  ⚓ {filteredPlaces.length} places • Nha Trang
                </div>

                {/* Place Popup speech bubble */}
                {selectedPlaceId && activePlaceObj && !detailDrawerOpen && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: '28%', 
                      left: '50%', 
                      transform: 'translateX(-50%)',
                      zIndex: 100,
                      width: 290,
                      backgroundColor: '#FFFDF3',
                      border: '2.5px solid #111111',
                      borderRadius: 16,
                      padding: 14,
                      boxShadow: '4px 4px 0 #111111',
                      fontFamily: "'Be Vietnam Pro', sans-serif",
                    }}
                    className="animate-pop-in"
                  >
                    {/* speech bubble pointing arrow */}
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: -8,
                        left: '50%',
                        transform: 'translateX(-50%) rotate(45deg)',
                        width: 14,
                        height: 14,
                        backgroundColor: '#FFFDF3',
                        borderRight: '2.5px solid #111111',
                        borderBottom: '2.5px solid #111111',
                      }}
                    />

                    <div className="flex justify-between items-start">
                      <h4 style={{ fontWeight: 850, fontSize: 14, color: '#111111', margin: 0 }}>
                        {activePlaceObj.name}
                      </h4>
                      <button 
                        onClick={() => setSelectedPlaceId(null)}
                        style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 900, cursor: 'pointer', color: '#7A6A58' }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ fontSize: 10, color: '#7A6A58', margin: '4px 0 8px', fontWeight: 700 }}>
                      🏖️ {activePlaceObj.category} • ⏱ {activePlaceObj.duration} • 💰 {activePlaceObj.cost}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button
                        onClick={() => {
                          const isSaved = savedPlaceIds.includes(activePlaceObj.id);
                          if (isSaved) {
                            setSavedPlaceIds(savedPlaceIds.filter(id => id !== activePlaceObj.id));
                          } else {
                            setSavedPlaceIds([...savedPlaceIds, activePlaceObj.id]);
                          }
                        }}
                        style={{
                          backgroundColor: '#FFF6DE',
                          border: '1.5px solid #111111',
                          borderRadius: 8,
                          padding: '5px',
                          fontSize: 10,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 3,
                          flex: 1,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: savedPlaceIds.includes(activePlaceObj.id) ? '#E6392E' : '#7A6A58' }}>favorite</span>
                        Lưu
                      </button>

                      <button 
                        onClick={() => setAddToTripMenuOpen(activePlaceObj.id)}
                        style={{ flex: 1.2, backgroundColor: '#B8F24A', border: '1.5px solid #111111', borderRadius: 8, padding: '5px', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                      >
                        Thêm vào trip
                      </button>

                      <button 
                        onClick={() => setDetailDrawerOpen(true)}
                        style={{ flex: 1, backgroundColor: '#20A7D8', color: '#FFFDF3', border: '1.5px solid #111111', borderRadius: 8, padding: '5px', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                )}

                {/* Compass & Map Navigation controls overlay */}
                <div 
                  style={{ 
                    position: 'absolute', 
                    bottom: 16, 
                    left: 16, 
                    zIndex: 90,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  {['add', 'remove', 'my_location', 'zoom_out_map'].map((ico, idx) => (
                    <button
                      key={idx}
                      onClick={() => setToastMessage('Đã điều chỉnh thu phóng bản đồ! 🗺️')}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: '2px solid #111111',
                        backgroundColor: '#FFFDF3',
                        boxShadow: '2px 2px 0 #111111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      className="hover:scale-105 active:scale-95"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{ico}</span>
                    </button>
                  ))}
                </div>

                {/* 8. PLACE DETAIL DRAWER: Absolute floating drawer card inside the map panel */}
                {detailDrawerOpen && activePlaceObj && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      bottom: 16,
                      width: 'calc(100% - 32px)',
                      maxWidth: 360,
                      backgroundColor: '#FFFDF3',
                      border: '3px solid #111111',
                      borderRadius: 20,
                      boxShadow: '6px 6px 0 #111111',
                      zIndex: 200,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      fontFamily: "'Be Vietnam Pro', sans-serif"
                    }}
                    className="animate-pop-in"
                  >
                    {/* Drawer Photo Header */}
                    <div style={{ height: 160, position: 'relative', borderBottom: '2px solid #111111' }}>
                      <RetroImage 
                        src={activePlaceObj.imageUrl} 
                        alt={activePlaceObj.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      <button
                        onClick={() => setDetailDrawerOpen(false)}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          border: '2px solid #111111',
                          backgroundColor: '#FFFDF3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Drawer Content */}
                    <div style={{ flex: 1, padding: 18, overflowY: 'auto' }} className="space-y-4 custom-scrollbar">
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 900, backgroundColor: '#FFD166', border: '1.5px solid #111111', borderRadius: 6, padding: '2px 8px' }}>
                          {activePlaceObj.category}
                        </span>
                        <h3 style={{ fontSize: 20, fontWeight: 900, marginTop: 8, marginBottom: 4, lineHeight: 1.2 }}>
                          {activePlaceObj.name}
                        </h3>
                        <p style={{ fontSize: 12, color: '#7A6A58', fontWeight: 650 }}>
                          Nha Trang, Khánh Hoà
                        </p>
                      </div>

                      <div style={{ padding: 12, backgroundColor: '#FFF6DE', border: '1.5px solid #111111', borderRadius: 12 }} className="space-y-2">
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                          <span style={{ color: '#7A6A58' }}>📍 Khoảng cách</span>
                          <span>{activePlaceObj.distance}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                          <span style={{ color: '#7A6A58' }}>⏱ Thời gian ước tính</span>
                          <span>{activePlaceObj.duration}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                          <span style={{ color: '#7A6A58' }}>💰 Giá vé dự kiến</span>
                          <span style={{ color: '#E6392E' }}>{activePlaceObj.cost}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                          <span style={{ color: '#7A6A58' }}>🌅 Thời gian lý tưởng</span>
                          <span>{activePlaceObj.bestTime}</span>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Giới thiệu địa danh</h4>
                        <p style={{ fontSize: 12, color: '#3A2F2A', lineHeight: 1.5, textAlign: 'justify' }}>
                          {activePlaceObj.description}
                        </p>
                      </div>

                      {/* Tags row */}
                      <div className="flex gap-1.5 flex-wrap">
                        {activePlaceObj.tags.map((tag) => (
                          <Badge key={tag} variant="neutral">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Drawer Footer Actions */}
                    <div style={{ padding: 16, borderTop: '2px solid #EBD8B7', backgroundColor: '#FFF6DE', display: 'flex', gap: 8 }}>
                      <Button 
                        variant="secondary" 
                        size="md" 
                        style={{ flex: 1 }}
                        onClick={(e) => handleSaveToggle(activePlaceObj.id, e as any)}
                      >
                        {savedPlaceIds.includes(activePlaceObj.id) ? '❤️ Đã lưu' : '🤍 Lưu'}
                      </Button>
                      <Button 
                        variant="primary" 
                        size="md" 
                        style={{ flex: 1.3 }}
                        onClick={() => setAddToTripMenuOpen(activePlaceObj.id)}
                      >
                        Thêm vào trip
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            </main>

          </div>
        )}

      </div>
    </AppContent>
  );
};
