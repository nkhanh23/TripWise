"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, EmptyState, ErrorMessage, Loading, Badge, ErrorBanner } from '@/components/ui';
import { KineticTitle, BounceCard, FilmGrainOverlay } from '@/components/motion';
import { AppLayout } from '@/components/layout/AppLayout';
import styles from './page.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'upcoming' | 'completed'>('all');
  const [showDemoStates, setShowDemoStates] = useState(false);

  const stats = [
    { label: 'Chuyến đi đã lưu', value: '3 trips', icon: 'bookmark' },
    { label: 'Đang lên kế hoạch', value: '1 draft', icon: 'edit_calendar' },
    { label: 'Địa điểm yêu thích', value: '6 places', icon: 'favorite' },
    { label: 'Điểm đến gần nhất', value: 'Nha Trang', icon: 'explore' },
  ];

  const recentTrips = [
    {
      id: 'nhatrang-3n2d',
      title: 'Nha Trang 3 ngày 2 đêm',
      status: 'draft' as const,
      statusLabel: 'Nháp',
      date: '12/08 – 14/08',
      cost: '3.500.000 ₫',
      distance: '24.5 km',
      stops: '4 stops',
      updated: 'Hôm nay',
      bgClass: styles.bgGradientDraft,
    },
    {
      id: 'dalat-weekend',
      title: 'Đà Lạt cuối tuần',
      status: 'upcoming' as const,
      statusLabel: 'Đã lên kế hoạch',
      date: '20/08 – 21/08',
      cost: '2.800.000 ₫',
      distance: '18.2 km',
      stops: '5 stops',
      updated: '2 ngày trước',
      bgClass: styles.bgGradientUpcoming,
    },
    {
      id: 'danang-food',
      title: 'Đà Nẵng food trip',
      status: 'completed' as const,
      statusLabel: 'Hoàn tất',
      date: '01/07 – 03/07',
      cost: '4.200.000 ₫',
      distance: '31.8 km',
      stops: '8 stops',
      updated: '1 tuần trước',
      bgClass: styles.bgGradientCompleted,
    },
    {
      id: 'hoian-chill',
      title: 'Hội An chill',
      status: 'draft' as const,
      statusLabel: 'Đã lưu',
      date: 'Chưa chọn ngày',
      cost: 'Chưa tính',
      distance: '—',
      stops: '0 stops',
      updated: '3 tuần trước',
      bgClass: styles.bgGradientSaved,
    },
  ];

  const filteredTrips = recentTrips.filter((t) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'draft') return t.status === 'draft' && t.statusLabel === 'Nháp';
    if (activeTab === 'upcoming') return t.status === 'upcoming';
    if (activeTab === 'completed') return t.status === 'completed';
    return true;
  });

  const savedDestinations = [
    { name: 'Tháp Bà Ponagar', city: 'Nha Trang', tag: 'Văn hoá', icon: 'museum' },
    { name: 'Bãi biển Trần Phú', city: 'Nha Trang', tag: 'Bờ biển', icon: 'beach_access' },
    { name: 'Chợ Đầm Nha Trang', city: 'Nha Trang', tag: 'Mua sắm', icon: 'shopping_bag' },
    { name: 'Quán cafe view biển', city: 'Nha Trang', tag: 'Check-in', icon: 'local_cafe' },
  ];

  const aiSuggestions = [
    {
      title: 'Trip Nha Trang có khả năng mưa ngày 2 🌧️',
      desc: 'Bạn có thể chuyển hoạt động ngoài trời sang buổi sáng và thêm một điểm trong nhà vào buổi chiều.',
      cta: 'Áp dụng',
      badge: 'Thời tiết',
    },
    {
      title: 'Bạn thường chọn trip dài 2–3 ngày 📅',
      desc: 'Có muốn đặt khoảng thời gian 3 ngày 2 đêm làm mặc định cho lần tạo trip tiếp theo?',
      cta: 'Đặt mặc định',
      badge: 'Tuỳ chọn',
    },
    {
      title: 'Budget đang hơi sát giới hạn 💰',
      desc: 'Giảm 1 điểm cafe cao cấp hoặc đổi sang xe máy có thể tiết kiệm khoảng 200.000 ₫.',
      cta: 'Xem chi tiết',
      badge: 'Ngân sách',
    },
  ];

  return (
    <AppLayout>
      <div className={styles.dashboardPage}>
        <FilmGrainOverlay />
        <div className={styles.container}>
          <div className={styles.grid}>
            
            {/* LEFT COLUMN */}
            <div className={styles.leftCol}>
              
              {/* GREETING & STATS */}
              <section className={styles.statsSection}>
                <div className={styles.greetingHeader}>
                  <KineticTitle text="Chào Khánh! 👋" size="section" variant="pop" className={styles.greetingTitle} />
                  <p className={styles.greetingSub}>Hôm nay bạn muốn lên lịch cho chuyến đi nào?</p>
                </div>

                <div className={styles.statsGrid}>
                  {stats.map((s, idx) => (
                    <div key={idx} className={styles.statCard}>
                      <div className={styles.statIconWrapper}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{s.icon}</span>
                      </div>
                      <div>
                        <div className={styles.statLabel}>{s.label}</div>
                        <div className={styles.statValue}>{s.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* CONTINUE PLANNING */}
              <BounceCard>
                <Card
                  variant="poster"
                  posterColor="#FFD166"
                  title="Đang lên kế hoạch dở"
                  subtitle="Chuyến đi Nha Trang 3 ngày 2 đêm"
                >
                  <div className={styles.continueContent}>
                    <div className={styles.continueBadges}>
                      <Badge variant="neutral" size="sm">Nháp</Badge>
                      <Badge variant="success" size="sm" icon="check_circle">Đã có 70% lịch trình</Badge>
                      <Badge variant="warn" size="sm" icon="payments">Budget vừa phải</Badge>
                    </div>

                    <div className={styles.progressWrap}>
                      <div className={styles.progressBar} style={{ width: '70%' }}></div>
                    </div>

                    <p className={styles.continueNote}>
                      📍 Đã chọn ngày (12/08 – 14/08), ngân sách, sở thích di chuyển. <strong>Còn thiếu thông tin khách sạn/nơi lưu trú ngày 2.</strong>
                    </p>

                    <div className={styles.continueDetails}>
                      <div>📅 12/08 – 14/08</div>
                      <div>👥 2 Travelers</div>
                      <div>🏖️ Biển, check-in</div>
                      <div>💰 3.500.000 ₫</div>
                    </div>

                    <div className={styles.continueActions}>
                      <Button variant="primary" size="sm" onClick={() => router.push('/planner')}>Tiếp tục thiết lập ⚡</Button>
                      <Button variant="secondary" size="sm" onClick={() => router.push('/planner')}>Tạo lại bằng AI</Button>
                      <button className={styles.btnDelete}>Xoá bản nháp</button>
                    </div>
                  </div>
                </Card>
              </BounceCard>

              {/* TRIP LIST */}
              <section className={styles.tripListSection}>
                <div className={styles.tripListHeader}>
                  <h3 className={styles.sectionTitle}>Chuyến đi của bạn</h3>
                  
                  <div className={styles.filterChips}>
                    {(['all', 'draft', 'upcoming', 'completed'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={activeTab === tab ? styles.chipActive : styles.chipInactive}
                      >
                        {tab === 'all' ? 'Tất cả' : tab === 'draft' ? 'Nháp' : tab === 'upcoming' ? 'Sắp tới' : 'Hoàn tất'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.tripList}>
                  {filteredTrips.map((trip, idx) => (
                    <BounceCard key={trip.id} delay={idx * 100}>
                      <div
                        className={styles.tripRow}
                        onClick={() => router.push(`/trips/${trip.id}`)}
                      >
                      <div className={styles.tripRowLeft}>
                        <div className={`${styles.tripIconBox} ${trip.bgClass}`}>
                          <span className="material-symbols-outlined">
                            {trip.status === 'completed' ? 'celebration' : 'explore'}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className={styles.tripTitle}>{trip.title}</h4>
                          <div className={styles.tripMeta}>
                            <span>📅 {trip.date}</span>
                            <span>📍 {trip.stops}</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.tripRowRight}>
                        <div className={styles.tripStats}>
                          <span className={styles.costStat}>💰 {trip.cost}</span>
                          {trip.distance !== '—' && <span className={styles.distStat}>🚗 {trip.distance}</span>}
                        </div>
                          <span className={`${styles.statusBadge} ${styles['status_' + trip.status]}`}>
                            {trip.statusLabel}
                          </span>
                        </div>
                      </div>
                    </BounceCard>
                  ))}
                </div>
              </section>

              <div className={styles.demoToggle}>
                <Button variant="ghost" onClick={() => setShowDemoStates(!showDemoStates)}>
                  {showDemoStates ? 'Ẩn trạng thái demo' : 'Hiển thị Skeletons / Empty / Error States'}
                </Button>
              </div>

              {showDemoStates && (
                <div className={styles.demoStates}>
                  <div className={styles.demoCol}>
                    <h4>Loading state</h4>
                    <Loading label="Đang tải dữ liệu..." />
                  </div>
                  <div className={styles.demoCol}>
                    <h4>Error Banner</h4>
                    <ErrorMessage message="Không thể tải lịch trình chuyến đi của bạn. Thử lại sau." />
                    <h4 style={{ marginTop: 16 }}>Empty State</h4>
                    <EmptyState title="Không có chuyến đi nháp" message="Bạn đã hoàn tất tất cả lịch trình cũ." />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className={styles.rightCol}>
              
              {/* QUICK ACTIONS */}
              <section className={styles.quickActionsSection}>
                <h3 className={styles.sectionTitle}>Thao tác nhanh</h3>
                
                <div className={styles.quickActionsGrid}>
                  {[
                    { label: 'Tạo trip mới', icon: 'magic_button', desc: 'Bắt đầu với AI', bg: styles.actionYellow, action: () => router.push('/planner') },
                    { label: 'Tìm địa điểm', icon: 'travel_explore', desc: 'Khám phá nơi hay', bg: styles.actionWhite, action: () => router.push('/explore') },
                    { label: 'Trips đã lưu', icon: 'bookmark', desc: 'Mở thư viện', bg: styles.actionWhite, action: () => router.push('/trips') },
                    { label: 'Sở thích', icon: 'settings_accessibility', desc: 'Cập nhật gu đi chơi', bg: styles.actionWhite, action: () => router.push('/settings') },
                  ].map((act, idx) => (
                    <button key={idx} onClick={act.action} className={`${styles.actionBtn} ${act.bg}`}>
                      <span className="material-symbols-outlined">{act.icon}</span>
                      <span className={styles.actionLabel}>{act.label}</span>
                      <span className={styles.actionDesc}>{act.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* TRAVEL WEATHER */}
              <section className={styles.weatherSection}>
                <h3 className={styles.sectionTitle}>Thời tiết du lịch</h3>
                <div className={styles.weatherList}>
                  <div className={styles.weatherCard}>
                    <div>
                      <span className={styles.weatherDay}>HÔM NAY</span>
                      <h4 className={styles.weatherCity}>Nha Trang</h4>
                      <p className={styles.weatherDesc}>Nắng nhẹ • Mưa 20%</p>
                    </div>
                    <span className={styles.weatherTemp}>29°C ☀️</span>
                  </div>

                  <div className={styles.weatherCard}>
                    <div>
                      <span className={styles.weatherDay}>NGÀY MAI</span>
                      <h4 className={styles.weatherCity}>Nha Trang</h4>
                      <p className={styles.weatherDesc}>Nhiều mây • Mưa 35%</p>
                    </div>
                    <span className={styles.weatherTempGray}>28°C ☁️</span>
                  </div>

                  <div className={styles.weatherCardAlert}>
                    <div>
                      <span className={styles.weatherAlertBadge}>Cần đổi lịch</span>
                      <h4 className={styles.weatherCity}>Trip Nha Trang</h4>
                      <p className={styles.weatherAlertDesc}>Nguy cơ mưa ngày 2</p>
                    </div>
                    <span className={styles.weatherTempAlert}>27°C ⛈️</span>
                  </div>
                  
                  <div className={styles.weatherTip}>💡 TripWise có thể gợi ý đổi hoạt động nếu trời mưa.</div>
                </div>
              </section>

              {/* SAVED DESTINATIONS */}
              <section className={styles.savedDestSection}>
                <div className={styles.savedDestHeader}>
                  <h3 className={styles.sectionTitle}>Địa điểm đã lưu</h3>
                  <button onClick={() => router.push('/explore')} className={styles.linkBtn}>Xem tất cả</button>
                </div>

                <div className={styles.savedDestList}>
                  {savedDestinations.map((place, idx) => (
                    <div key={idx} className={styles.savedDestRow}>
                      <div className={styles.savedDestInfo}>
                        <span className="material-symbols-outlined">{place.icon}</span>
                        <div>
                          <div className={styles.savedDestName}>{place.name}</div>
                          <div className={styles.savedDestTag}>{place.city} • {place.tag}</div>
                        </div>
                      </div>
                      <button onClick={() => router.push('/planner')} className={styles.btnAdd}>Add</button>
                    </div>
                  ))}
                </div>
              </section>

              {/* AI SUGGESTIONS */}
              <section className={styles.aiSugSection}>
                <h3 className={styles.sectionTitle}>Gợi ý từ TripWise AI</h3>

                <div className={styles.aiSugList}>
                  {aiSuggestions.map((sug, idx) => (
                    <Card key={idx} variant="speech">
                      <div style={{ fontFamily: "var(--font-body)", display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-between' }}>
                          <Badge variant="sticker" size="sm">{sug.badge} AI</Badge>
                        </div>
                        <h4 className={styles.aiSugTitle}>{sug.title}</h4>
                        <p className={styles.aiSugDesc}>{sug.desc}</p>
                        <div className={styles.aiSugFooter}>
                          <button className={styles.aiSugBtn}>{sug.cta}</button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
