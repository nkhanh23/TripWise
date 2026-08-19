"use client";

import { startTransition, useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./TripResultPage.module.css";
import { Button, Card, EmptyState, ErrorBanner, Loading } from "@/components/ui";
import { KineticTitle, BounceCard, FilmGrainOverlay } from "@/components/motion";
import {
  ApiError,
  AuthSessionExpiredError,
  generateTrip,
  getTripDetail,
  type ItineraryDayResponse,
  type ItineraryItemResponse,
  type TripDetailResponse
} from "@/lib/api";
import { WeatherCard } from "../trip/WeatherCard";

const TripMapLibreMap = lazy(() =>
  import("./TripMapLibreMap").then((module) => ({ default: module.TripMapLibreMap }))
);

type TripResultPageProps = {
  tripId: string;
};

function formatDate(value?: string) {
  if (!value) {
    return "Chưa rõ";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatTimeSlot(item: ItineraryItemResponse) {
  if (item.startTime && item.endTime) {
    return `${item.startTime.slice(0, 5)} - ${item.endTime.slice(0, 5)}`;
  }

  if (item.startTime) {
    return item.startTime.slice(0, 5);
  }

  if (item.timeSlot) {
    const mapped: Record<string, string> = {
      MORNING: "Buổi sáng",
      NOON: "Buổi trưa",
      AFTERNOON: "Buổi chiều",
      EVENING: "Buổi tối"
    };

    return mapped[item.timeSlot] ?? item.timeSlot;
  }

  return "Linh hoạt";
}

function formatCurrency(value?: number) {
  if (value === undefined || value === null) {
    return "Đang tính";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

function formatMeters(value?: number) {
  if (!value) {
    return "Chưa có";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`;
  }

  return `${value} m`;
}

function formatDurationSeconds(value?: number) {
  if (!value) {
    return "Chưa có";
  }

  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} phút`;
}

function normalizeError(error: unknown) {
  if (error instanceof AuthSessionExpiredError) {
    return "Phiên đăng nhập đã hết hạn. Bạn hãy đăng nhập lại để xem hành trình.";
  }

  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "Hành trình này không tồn tại hoặc đã bị xóa.";
    }

    if (error.status === 403) {
      return "Bạn không có quyền xem hành trình này.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Không thể tải hành trình lúc này. Vui lòng thử lại sau.";
}

function computeEstimatedTotal(days: ItineraryDayResponse[]) {
  return days.reduce(
    (sum, day) =>
      sum +
      day.items.reduce((daySum, item) => daySum + (item.estimatedCost ?? 0), 0),
    0
  );
}

function parseWeatherSummary(summary?: string) {
  if (!summary) {
    return { condition: 'sunny', temperature: 28, rainChance: 10, warn: false };
  }
  
  let temperature = 28;
  const tempMatch = summary.match(/(\d+)\s*°C/);
  if (tempMatch) {
    temperature = parseInt(tempMatch[1], 10);
  } else {
    if (summary.includes("giong bao")) temperature = 24;
    else if (summary.includes("Mua lon")) temperature = 25;
    else if (summary.includes("Co kha nang mua")) temperature = 27;
    else temperature = 31;
  }
  
  let condition = 'sunny';
  let rainChance = 10;
  let warn = false;
  
  if (summary.includes("giong bao") || summary.includes("storm")) {
    condition = 'storm';
    rainChance = 95;
    warn = true;
  } else if (summary.includes("Mua lon") || summary.includes("heavy rain")) {
    condition = 'rainy';
    rainChance = 85;
    warn = true;
  } else if (summary.includes("Co kha nang mua") || summary.includes("mua") || summary.includes("rain")) {
    condition = 'rainy';
    rainChance = 45;
  } else if (summary.includes("nhiều mây") || summary.includes("mây") || summary.includes("cloud")) {
    condition = 'cloudy';
    rainChance = 25;
  }
  
  return { condition, temperature, rainChance, warn };
}

function renderWeatherIcon(weatherCode?: number) {
  if (weatherCode === undefined) {
    return <i className="material-symbols-outlined" style={{ fontSize: "16px", verticalAlign: "middle" }}>device_thermostat</i>;
  }
  
  let iconName = "device_thermostat";
  if (weatherCode === 0) {
    iconName = "wb_sunny";
  } else if ([1, 2, 3].includes(weatherCode)) {
    iconName = "cloud";
  } else if ([51, 53, 55, 61, 63, 65].includes(weatherCode)) {
    iconName = "rainy";
  } else if ([80, 81, 82].includes(weatherCode)) {
    iconName = "rainy_heavy";
  } else if ([95, 96, 99].includes(weatherCode)) {
    iconName = "thunderstorm";
  }
  
  return <i className="material-symbols-outlined" style={{ fontSize: "16px", verticalAlign: "middle" }}>{iconName}</i>;
}

export function TripResultPage({ tripId }: TripResultPageProps) {
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTrip() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await getTripDetail(tripId);
        if (!active) {
          return;
        }

        setTrip(response);
        const firstDay = response.itinerary.days[0];
        setActiveDay(firstDay?.dayNumber ?? null);
        setSelectedOrderIndex(firstDay?.items[0]?.orderIndex ?? null);
      } catch (error) {
        if (!active) {
          return;
        }

        setTrip(null);
        setErrorMessage(normalizeError(error));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadTrip();

    return () => {
      active = false;
    };
  }, [refreshKey, tripId]);

  const itineraryDays = useMemo(() => {
    const rawDays = trip?.itinerary.days ?? [];
    return rawDays.map((day) => {
      const seenOrderIndexes = new Set<number>();
      const uniqueItems = day.items.filter((item) => {
        if (item.orderIndex === undefined || item.orderIndex === null) {
          return true;
        }
        return !seenOrderIndexes.has(item.orderIndex) && seenOrderIndexes.add(item.orderIndex);
      });
      return {
        ...day,
        items: uniqueItems
      };
    });
  }, [trip]);
  const currentDay =
    itineraryDays.find((day) => day.dayNumber === activeDay) ?? itineraryDays[0] ?? null;
  const selectedItem =
    currentDay?.items.find((item) => item.orderIndex === selectedOrderIndex) ??
    currentDay?.items[0] ??
    null;

  const tripStats = useMemo(() => {
    if (!trip) {
      return null;
    }

    return {
      estimatedTotal: computeEstimatedTotal(itineraryDays),
      stopCount: itineraryDays.reduce((sum, day) => sum + day.items.length, 0),
      preferences: trip.preferences || "Theo brief AI và field planner",
      style: trip.travelStyle || "Chưa rõ"
    };
  }, [itineraryDays, trip]);

  function handleOpenPlanner() {
    startTransition(() => {
      navigate("/planner");
    });
  }

  function handleRetry() {
    setRefreshKey((value) => value + 1);
  }

  async function handleSaveTrip() {
    if (isSaving || !trip) {
      return;
    }

    const brief = trip.preferences?.trim();
    if (!brief) {
      console.warn("[TripResultPage] handleSaveTrip: trip.preferences is empty, cannot re-generate.");
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    try {
      // Trip đã được lưu trong DB sau khi generateTrip. Hàm này gọi lại với brief
      // gốc để tạo một phiên bản hành trình mới (POST /trips/generate lưu vào DB).
      await generateTrip({ request: brief });
      startTransition(() => {
        navigate("/dashboard");
      });
    } catch (error) {
      console.error("[TripResultPage] handleSaveTrip failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Không thể lưu hành trình. Vui lòng kiểm tra kết nối mạng và thử lại.";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Card className={styles.panelCard} elevated>
            <div className={styles.loadingWrap}>
              <Loading label="TripWise đang tải hành trình vừa tạo..." />
              <p className={styles.emptyInline}>
                Màn hình chi tiết chuyến đi hiển thị đầy đủ thông tin thời tiết, bản đồ định vị OSRM và hướng dẫn đường đi.
              </p>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  if (errorMessage || !trip) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div style={{ maxWidth: 620, width: "100%", margin: "40px auto" }}>
            <ErrorBanner
              title="Không tải được hành trình"
              message={errorMessage ?? "Không tìm thấy chuyến đi."}
              onRetry={handleRetry}
            />
            <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
              <Button onClick={handleOpenPlanner}>Về planner</Button>
              <Link className={styles.ghostLink} style={{ alignSelf: "center", textDecoration: "underline" }} to="/login">
                Đăng nhập lại
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <FilmGrainOverlay />

      {saveError ? (
        <div style={{ position: "sticky", top: 0, zIndex: 9000 }}>
          <ErrorBanner
            message={saveError}
            onRetry={() => setSaveError(null)}
            title="Lưu hành trình thất bại"
          />
        </div>
      ) : null}

      <div className={styles.shell}>
        <section className={styles.hero}>
          <BounceCard delay={100}>
            <Card className={styles.heroCard} elevated>
              <div className={styles.stickerRow}>
                <span className={styles.sticker}>TripWise Itinerary</span>
                <span className={styles.stickerAlt}>Giao diện trực quan</span>
              </div>

              <KineticTitle
                tag="h1"
                text={`${trip.destination} đã lên form thành lịch trình.`}
                size="section"
                variant="pop"
                shadowVariant="black"
                className={styles.headline}
              />
              <p className={styles.description}>
                Lịch trình chi tiết đã được tối ưu hóa. Bạn có thể theo dõi thời tiết, lộ trình trên bản đồ và thông tin di chuyển theo từng chặng.
              </p>

              <div className={styles.heroActions}>
                <Button onClick={handleOpenPlanner}>Tạo lại hành trình</Button>
                <Button
                  disabled={isSaving}
                  loading={isSaving}
                  onClick={handleSaveTrip}
                  variant="secondary"
                >
                  Lưu chuyến đi
                </Button>
                <Link className={styles.ghostLink} style={{ textDecoration: "underline" }} to="/planner">
                  Chỉnh sửa brief
                </Link>
              </div>

              <div className={styles.tripMeta}>
                <div className={styles.tripMetaItem}>
                  <span className={styles.tripMetaLabel}>Khởi hành</span>
                  <span className={styles.tripMetaValue}>{formatDate(trip.startDate)}</span>
                </div>
                <div className={styles.tripMetaItem}>
                  <span className={styles.tripMetaLabel}>Thời lượng</span>
                  <span className={styles.tripMetaValue}>
                    {trip.days ?? "?"} ngày / {trip.nights ?? "?"} đêm
                  </span>
                </div>
                <div className={styles.tripMetaItem}>
                  <span className={styles.tripMetaLabel}>Trạng thái</span>
                  <span className={styles.tripMetaValue}>{trip.status}</span>
                </div>
                <div className={styles.tripMetaItem}>
                  <span className={styles.tripMetaLabel}>Travel Style</span>
                  <span className={styles.tripMetaValue}>{trip.travelStyle || "Chưa rõ"}</span>
                </div>
              </div>
            </Card>
          </BounceCard>

          <BounceCard delay={200}>
            <Card className={styles.ticketCard} elevated>
              <div className={styles.ticketBody}>
                <div>
                  <div className={styles.sectionHint}>Trip Ticket</div>
                  <h2 className={styles.ticketTitle}>Trip #{trip.id}</h2>
                </div>

                <div className={styles.pillRow}>
                  <span className={styles.pill}>{trip.budget || "Chưa rõ ngân sách"}</span>
                  <span className={`${styles.pill} ${styles.pillMuted}`}>
                    {trip.interests?.join(", ") || "Sở thích chung"}
                  </span>
                </div>

                <p className={styles.ticketNote}>
                  Dữ liệu hành trình đã được lưu trữ an toàn trong tài khoản của bạn. Bạn có thể mở lại bất cứ lúc nào từ Dashboard hoặc danh sách Saved Trips.
                </p>

                <div className={styles.metaList}>
                  <div className={styles.metaRow}>
                    <span>Tạo lúc</span>
                    <span>{formatDateTime(trip.createdAt)}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span>Cập nhật</span>
                    <span>{formatDateTime(trip.updatedAt)}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span>Preferences</span>
                    <span>{trip.preferences || "Theo prompt và AI parsing"}</span>
                  </div>
                </div>
              </div>
            </Card>
          </BounceCard>
        </section>

        <section className={styles.layout}>
          <div className={styles.leftStack}>
            <BounceCard delay={300}>
              <Card className={styles.panelCard} elevated>
                <h2 className={styles.sectionTitle}>Tổng quan hành trình</h2>
                <p className={styles.sectionHint}>
                  Thông tin tóm tắt và các chỉ số ước tính chi phí, số điểm dừng của chuyến đi.
                </p>

                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Tổng điểm</span>
                    <span className={styles.statValue}>{tripStats?.stopCount ?? 0} điểm dừng</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Ước tính chi phí</span>
                    <span className={styles.statValue}>
                      {formatCurrency(tripStats?.estimatedTotal)}
                    </span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Travel Style</span>
                    <span className={styles.statValue}>{tripStats?.style}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Yêu cầu đặc biệt</span>
                    <span className={styles.statValue}>{tripStats?.preferences}</span>
                  </div>
                </div>
              </Card>
            </BounceCard>

            <BounceCard delay={400}>
              <Card className={styles.panelCard} elevated>
                <h2 className={styles.sectionTitle}>Lịch trình chi tiết</h2>
                <p className={styles.sectionHint}>
                  Chọn các ngày và xem điểm đến. Lịch trình được đồng bộ hóa với marker trên bản đồ.
                </p>

                <div className={styles.dayTabs}>
                  {itineraryDays.map((day) => (
                    <button
                      className={`${styles.dayTab} ${
                        currentDay?.dayNumber === day.dayNumber ? styles.dayTabActive : ""
                      }`}
                      key={day.dayNumber}
                      onClick={() => {
                        setActiveDay(day.dayNumber);
                        setSelectedOrderIndex(day.items[0]?.orderIndex ?? null);
                      }}
                      type="button"
                    >
                      Ngày {day.dayNumber}
                    </button>
                  ))}
                </div>

                {currentDay ? (
                  <>
                    <div className={styles.daySummary} style={{ flexWrap: "wrap", gap: "8px 6px" }}>
                      <span className={styles.pill}>{currentDay.dayTitle || `Ngày ${currentDay.dayNumber}`}</span>
                      <span className={`${styles.pill} ${styles.pillMuted}`}>
                        {formatMeters(currentDay.totalDistanceMeters)}
                      </span>
                      <span className={`${styles.pill} ${styles.pillMuted}`}>
                        {formatDurationSeconds(currentDay.totalDurationSeconds)}
                      </span>
                      {currentDay.weatherCode != null && (
                        <span className={`${styles.pill} ${styles.pillMuted}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          {renderWeatherIcon(currentDay.weatherCode)}
                          {currentDay.tempMin != null && currentDay.tempMax != null ? (
                            <span>Nhiệt độ: {currentDay.tempMin}°C - {currentDay.tempMax}°C</span>
                          ) : (
                            <span>Nhiệt độ: --°C</span>
                          )}
                        </span>
                      )}
                      {currentDay.rainProbability != null && (
                        <span className={`${styles.pill} ${styles.pillMuted}`}>
                          Khả năng mưa: {currentDay.rainProbability}%
                        </span>
                      )}
                    </div>
                    {currentDay.weatherSummary && (
                      <p className={styles.sectionHint} style={{ marginTop: "6px", marginBottom: "16px", fontStyle: "italic" }}>
                        💡 {currentDay.weatherSummary}
                      </p>
                    )}

                    <div className={styles.timeline}>
                      {currentDay.items.map((item) => (
                        <button
                          className={`${styles.timelineItem} ${
                            selectedItem?.orderIndex === item.orderIndex
                              ? styles.timelineItemActive
                              : ""
                          }`}
                          key={`${currentDay.dayNumber}-${item.orderIndex}`}
                          onClick={() => setSelectedOrderIndex(item.orderIndex)}
                          type="button"
                        >
                          <div className={styles.timelineHead}>
                            <span className={styles.timeChip}>{formatTimeSlot(item)}</span>
                            <span className={styles.timelineOrder}>Điểm dừng {item.orderIndex + 1}</span>
                          </div>

                          <h3 className={styles.timelineTitle}>
                            {item.place?.name || item.reason || "Điểm dừng hành trình"}
                          </h3>

                          <div className={styles.timelineMeta}>
                            <span className={styles.metaBadge}>
                              {item.place?.city || "Điểm đến"}
                            </span>
                            <span className={styles.metaBadge}>
                              {item.transportSuggestion?.mode ? `Di chuyển: ${item.transportSuggestion.mode}` : "Không di chuyển"}
                            </span>
                            <span className={styles.metaBadge}>
                              {formatCurrency(item.estimatedCost)}
                            </span>
                          </div>

                          <p className={styles.timelineBody}>
                            {item.aiDescription ||
                              item.reason ||
                              "Chi tiết hành trình được đề xuất."}
                          </p>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="Hành trình chưa có dữ liệu ngày để hiển thị."
                    message="Bạn hãy quay lại planner để tạo hành trình mới."
                    actions={
                      <>
                        <Button onClick={handleRetry}>Thử tải lại</Button>
                        <Button onClick={handleOpenPlanner} variant="secondary">
                          Về planner
                        </Button>
                      </>
                    }
                  />
                )}
              </Card>
            </BounceCard>
          </div>

          <div className={styles.rightStack}>
            <BounceCard delay={500}>
              <Card className={styles.mapCard} elevated>
                <div className={styles.mapPlaceholder}>
                  <div className={styles.mapPlaceholderTop}>
                    <div>
                      <div className={styles.sectionHint}>Bản đồ OSRM</div>
                      <h2 className={styles.mapTitle}>Tuyến đường di chuyển thực tế</h2>
                    </div>
                    <span className={styles.pill}>Bản đồ vệ tinh</span>
                  </div>

                  <p className={styles.mapBody}>
                    Định vị các điểm dừng của Ngày {currentDay?.dayNumber ?? 1} trên bản đồ OpenStreetMap cùng với tuyến đường di chuyển.
                  </p>

                  <div className={styles.mapGrid}>
                    <div className={styles.mapPanelItem}>
                      <span className={styles.mapPanelItemTitle}>Đang chọn</span>
                      <span className={styles.mapPanelItemValue}>
                        {selectedItem?.place?.name || "Chọn một điểm bên trái"}
                      </span>
                    </div>
                    <div className={styles.mapPanelItem}>
                      <span className={styles.mapPanelItemTitle}>Phương tiện</span>
                      <span className={styles.mapPanelItemValue}>
                        {selectedItem?.transportSuggestion?.mode || "Không có"}
                      </span>
                    </div>
                    <div className={styles.mapPanelItem}>
                      <span className={styles.mapPanelItemTitle}>Khoảng cách</span>
                      <span className={styles.mapPanelItemValue}>
                        {formatMeters(selectedItem?.distanceFromPreviousMeters)}
                      </span>
                    </div>
                  </div>

                  <Suspense
                    fallback={
                      <div className={styles.mapLoading}>
                        <Loading label="Đang khởi động bản đồ..." />
                      </div>
                    }
                  >
                    <TripMapLibreMap
                      activeDayData={currentDay ?? undefined}
                      selectedItemIndex={selectedItem?.orderIndex ?? null}
                    />
                  </Suspense>
                </div>
              </Card>
            </BounceCard>

            {currentDay && (currentDay.weatherCode != null || currentDay.weatherSummary) && (
              <BounceCard delay={550}>
                {(() => {
                  const hasStructured = currentDay.weatherCode != null &&
                                        currentDay.rainProbability != null &&
                                        currentDay.tempMin != null &&
                                        currentDay.tempMax != null;

                  let condition = 'sunny';
                  const code = currentDay.weatherCode ?? 0;
                  if ([95, 96, 99].includes(code)) {
                    condition = 'storm';
                  } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
                    condition = 'rainy';
                  } else if ([1, 2, 3].includes(code)) {
                    condition = 'cloudy';
                  }

                  const tempAverage = currentDay.tempMax != null && currentDay.tempMin != null
                    ? Math.round((currentDay.tempMax + currentDay.tempMin) / 2)
                    : 28;

                  const warn = condition === 'storm' || (condition === 'rainy' && (currentDay.rainProbability ?? 0) >= 80);

                  const weatherProps = hasStructured ? {
                    condition,
                    temperature: tempAverage,
                    rainChance: currentDay.rainProbability ?? 10,
                    warn
                  } : parseWeatherSummary(currentDay.weatherSummary);

                  return (
                    <WeatherCard
                       location={trip.destination}
                       {...weatherProps}
                    />
                  );
                })()}
              </BounceCard>
            )}

            <BounceCard delay={600}>
              <Card className={styles.panelCard} elevated>
                <div className={styles.selectedCard}>
                  <div>
                    <h2 className={styles.sectionTitle}>Chi tiết điểm đang chọn</h2>
                    <p className={styles.sectionHint}>
                      Mô tả chi tiết và các khuyến nghị ăn uống, di chuyển từ trí tuệ nhân tạo.
                    </p>
                  </div>

                  {selectedItem ? (
                    <>
                      <h3 className={styles.selectedTitle}>
                        {selectedItem.place?.name || selectedItem.reason || "Điểm dừng"}
                      </h3>
                      <p className={styles.selectedBody}>
                        {selectedItem.aiDescription ||
                          selectedItem.reason ||
                          "Không có mô tả bổ sung cho điểm dừng này."}
                      </p>

                      <div className={styles.smallGrid}>
                        <div className={styles.statCard}>
                          <span className={styles.statLabel}>Khung giờ</span>
                          <span className={styles.statValue}>{formatTimeSlot(selectedItem)}</span>
                        </div>
                        <div className={styles.statCard}>
                          <span className={styles.statLabel}>Dự kiến chi phí</span>
                          <span className={styles.statValue}>
                            {formatCurrency(selectedItem.estimatedCost)}
                          </span>
                        </div>
                      </div>

                      {selectedItem.transportSuggestion && (
                        <div className={styles.transportCard}>
                          <h3 className={styles.transportTitle}>
                            Phương án di chuyển: {selectedItem.transportSuggestion.mode || "Chưa rõ"}
                          </h3>
                          <p className={styles.transportBody}>
                            {selectedItem.transportSuggestion.reason ||
                              "Tuyến đường và chỉ dẫn chi tiết được hiển thị trên bản đồ."}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className={styles.emptyInline}>
                      Chọn một điểm dừng trong lịch trình bên trái để xem mô tả chi tiết.
                    </p>
                  )}
                </div>
              </Card>
            </BounceCard>

            <BounceCard delay={700}>
              <Card className={styles.panelCard} elevated>
                <h2 className={styles.sectionTitle}>Thông tin Metadata</h2>
                <p className={styles.sectionHint}>
                  Các thẻ sở thích và thời gian lưu giữ hành trình trên hệ thống.
                </p>

                <div className={styles.metaList}>
                  <div className={styles.metaRow}>
                    <span>Trạng thái</span>
                    <span>{trip.status}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span>Sở thích du lịch</span>
                    <span>{trip.interests?.join(", ") || "Chưa rõ"}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span>Ngày khởi tạo</span>
                    <span>{formatDateTime(trip.createdAt)}</span>
                  </div>
                </div>
              </Card>
            </BounceCard>
          </div>
        </section>
      </div>
    </main>
  );
}
