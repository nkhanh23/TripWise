"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import styles from "./TripResultPage.module.css";
import { Button, Card, ErrorMessage, Loading } from "@/components/ui";
import {
  ApiError,
  AuthSessionExpiredError,
  getTripDetail,
  type ItineraryDayResponse,
  type ItineraryItemResponse,
  type TripDetailResponse
} from "@/lib/api";

const TripLeafletMap = dynamic(
  () => import("./TripLeafletMap").then((module) => module.TripLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className={styles.mapLoading}>
        <Loading label="Dang khoi dong Leaflet map..." />
      </div>
    )
  }
);

type TripResultPageProps = {
  tripId: string;
};

function formatDate(value?: string) {
  if (!value) {
    return "Chua ro";
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
    return "Chua cap nhat";
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
      MORNING: "Buoi sang",
      NOON: "Buoi trua",
      AFTERNOON: "Buoi chieu",
      EVENING: "Buoi toi"
    };

    return mapped[item.timeSlot] ?? item.timeSlot;
  }

  return "Linh hoat";
}

function formatCurrency(value?: number) {
  if (value === undefined || value === null) {
    return "Dang tinh";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

function formatMeters(value?: number) {
  if (!value) {
    return "Chua co";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`;
  }

  return `${value} m`;
}

function formatDurationSeconds(value?: number) {
  if (!value) {
    return "Chua co";
  }

  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} phut`;
}

function normalizeError(error: unknown) {
  if (error instanceof AuthSessionExpiredError) {
    return "Phien dang nhap da het han. Ban hay dang nhap lai de xem itinerary.";
  }

  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "Trip nay khong ton tai hoac da bi xoa.";
    }

    if (error.status === 403) {
      return "Ban khong co quyen xem trip nay.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Khong the tai itinerary luc nay. Vui long thu lai sau.";
}

function computeEstimatedTotal(days: ItineraryDayResponse[]) {
  return days.reduce(
    (sum, day) =>
      sum +
      day.items.reduce((daySum, item) => daySum + (item.estimatedCost ?? 0), 0),
    0
  );
}

export function TripResultPage({ tripId }: TripResultPageProps) {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number | null>(null);

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
  }, [tripId]);

  const itineraryDays = useMemo(() => trip?.itinerary.days ?? [], [trip]);
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
      preferences: trip.preferences || "Theo brief AI va field planner",
      style: trip.travelStyle || "Chua ro"
    };
  }, [itineraryDays, trip]);

  function handleOpenPlanner() {
    startTransition(() => {
      router.push("/planner");
    });
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Card className={styles.panelCard} elevated>
            <div className={styles.loadingWrap}>
              <Loading label="TripWise dang tai itinerary vua tao..." />
              <p className={styles.emptyInline}>
                Man result nay dung contract `GET /api/v1/trips/{'{id}'}` va se la
                nen cho map integration o Phase 12.7.
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
          <Card className={styles.panelCard} elevated>
            <div className={styles.emptyWrap}>
              <ErrorMessage
                title="Khong tai duoc itinerary"
                message={errorMessage ?? "Khong tim thay trip."}
              />
              <div className={styles.heroActions}>
                <Button onClick={() => window.location.reload()}>Thu lai</Button>
                <Button onClick={handleOpenPlanner} variant="secondary">
                  Ve planner
                </Button>
                <Link className={styles.ghostLink} href="/login">
                  Dang nhap lai
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <Card className={styles.heroCard} elevated>
            <div className={styles.stickerRow}>
              <span className={styles.sticker}>Phase 12.6</span>
              <span className={styles.stickerAlt}>Itinerary Result Page</span>
            </div>

            <h1 className={styles.headline}>{trip.destination} da len form thanh itinerary roi.</h1>
            <p className={styles.description}>
              Man nay tach rieng khoi planner de hien thi full trip detail, day tabs
              va timeline item dung theo mock React ban dau. Map panel se duoc noi
              that o Phase 12.7, nen minh giu mot khung placeholder co chu dich.
            </p>

            <div className={styles.heroActions}>
              <Button onClick={handleOpenPlanner}>Tao lai itinerary</Button>
              <Link className={styles.ghostLink} href="/planner">
                Chinh brief
              </Link>
            </div>

            <div className={styles.tripMeta}>
              <div className={styles.tripMetaItem}>
                <span className={styles.tripMetaLabel}>Khoi hanh</span>
                <span className={styles.tripMetaValue}>{formatDate(trip.startDate)}</span>
              </div>
              <div className={styles.tripMetaItem}>
                <span className={styles.tripMetaLabel}>Thoi luong</span>
                <span className={styles.tripMetaValue}>
                  {trip.days ?? "?"} ngay / {trip.nights ?? "?"} dem
                </span>
              </div>
              <div className={styles.tripMetaItem}>
                <span className={styles.tripMetaLabel}>Trang thai</span>
                <span className={styles.tripMetaValue}>{trip.status}</span>
              </div>
              <div className={styles.tripMetaItem}>
                <span className={styles.tripMetaLabel}>Style</span>
                <span className={styles.tripMetaValue}>{trip.travelStyle || "Chua ro"}</span>
              </div>
            </div>
          </Card>

          <Card className={styles.ticketCard} elevated>
            <div className={styles.ticketBody}>
              <div>
                <div className={styles.sectionHint}>Trip ticket</div>
                <h2 className={styles.ticketTitle}>Trip #{trip.id}</h2>
              </div>

              <div className={styles.pillRow}>
                <span className={styles.pill}>{trip.budget || "Budget chua ro"}</span>
                <span className={`${styles.pill} ${styles.pillMuted}`}>
                  {trip.interests?.join(", ") || "Interests dang trong metadata"}
                </span>
              </div>

              <p className={styles.ticketNote}>
                Ban result nay dung du lieu luu that tu backend, khong phai preview
                tam thoi o planner nua. Day la diem ban cho map, route polyline va
                directions mode cua phase tiep theo.
              </p>

              <div className={styles.metaList}>
                <div className={styles.metaRow}>
                  <span>Tao luc</span>
                  <span>{formatDateTime(trip.createdAt)}</span>
                </div>
                <div className={styles.metaRow}>
                  <span>Cap nhat</span>
                  <span>{formatDateTime(trip.updatedAt)}</span>
                </div>
                <div className={styles.metaRow}>
                  <span>Preferences</span>
                  <span>{trip.preferences || "Theo prompt va AI parsing"}</span>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className={styles.layout}>
          <div className={styles.leftStack}>
            <Card className={styles.panelCard} elevated>
              <h2 className={styles.sectionTitle}>Trip header</h2>
              <p className={styles.sectionHint}>
                Trip summary va stats duoc tach ra de dung dung hierarchy cua mock
                `TripDetailPage`, nhung chua noi map o phase nay.
              </p>

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Tong diem</span>
                  <span className={styles.statValue}>{tripStats?.stopCount ?? 0} blocks</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Uoc tinh</span>
                  <span className={styles.statValue}>
                    {formatCurrency(tripStats?.estimatedTotal)}
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Travel style</span>
                  <span className={styles.statValue}>{tripStats?.style}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Preference</span>
                  <span className={styles.statValue}>{tripStats?.preferences}</span>
                </div>
              </div>
            </Card>

            <Card className={styles.panelCard} elevated>
              <h2 className={styles.sectionTitle}>Timeline theo ngay</h2>
              <p className={styles.sectionHint}>
                Day tabs va itinerary items da la version result that. Tu day sang
                12.7 minh se gan selection nay voi marker va route segment.
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
                    Day {day.dayNumber}
                  </button>
                ))}
              </div>

              {currentDay ? (
                <>
                  <div className={styles.daySummary}>
                    <span className={styles.pill}>{currentDay.dayTitle || `Ngay ${currentDay.dayNumber}`}</span>
                    <span className={`${styles.pill} ${styles.pillMuted}`}>
                      {currentDay.weatherSummary || "Weather se hien ro hon khi phase weather polish"}
                    </span>
                    <span className={`${styles.pill} ${styles.pillMuted}`}>
                      {formatMeters(currentDay.totalDistanceMeters)}
                    </span>
                    <span className={`${styles.pill} ${styles.pillMuted}`}>
                      {formatDurationSeconds(currentDay.totalDurationSeconds)}
                    </span>
                  </div>

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
                          <span className={styles.timelineOrder}>Stop {item.orderIndex + 1}</span>
                        </div>

                        <h3 className={styles.timelineTitle}>
                          {item.place?.name || item.reason || "Itinerary block"}
                        </h3>

                        <div className={styles.timelineMeta}>
                          <span className={styles.metaBadge}>
                            {item.place?.city || "TripWise stop"}
                          </span>
                          <span className={styles.metaBadge}>
                            {item.transportSuggestion?.mode || "Route step sau"}
                          </span>
                          <span className={styles.metaBadge}>
                            {formatCurrency(item.estimatedCost)}
                          </span>
                        </div>

                        <p className={styles.timelineBody}>
                          {item.aiDescription ||
                            item.reason ||
                            "Backend da tra itinerary item, nhung block nay chua co mo ta AI dai."}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className={styles.emptyInline}>
                  Trip nay chua co itinerary day/item de render.
                </p>
              )}
            </Card>
          </div>

          <div className={styles.rightStack}>
            <Card className={styles.mapCard} elevated>
              <div className={styles.mapPlaceholder}>
                <div className={styles.mapPlaceholderTop}>
                  <div>
                    <div className={styles.sectionHint}>Map panel placeholder</div>
                    <h2 className={styles.mapTitle}>Panel phai da san sang cho 12.7</h2>
                  </div>
                  <span className={styles.pill}>Leaflet tiep theo</span>
                </div>

                <p className={styles.mapBody}>
                  12.6 chi dung result page va timeline that. Mình giu khung map
                  theo dung split layout web spec, nhung khong nap Leaflet, marker
                  hay polyline truoc phase map integration.
                </p>

                <div className={styles.mapGrid}>
                  <div className={styles.mapPanelItem}>
                    <span className={styles.mapPanelItemTitle}>Selected stop</span>
                    <span className={styles.mapPanelItemValue}>
                      {selectedItem?.place?.name || "Chon 1 item ben trai"}
                    </span>
                  </div>
                  <div className={styles.mapPanelItem}>
                    <span className={styles.mapPanelItemTitle}>Transport hint</span>
                    <span className={styles.mapPanelItemValue}>
                      {selectedItem?.transportSuggestion?.mode || "Chua co"}
                    </span>
                  </div>
                  <div className={styles.mapPanelItem}>
                    <span className={styles.mapPanelItemTitle}>Move from previous</span>
                    <span className={styles.mapPanelItemValue}>
                      {formatMeters(selectedItem?.distanceFromPreviousMeters)}
                    </span>
                  </div>
                </div>

                <TripLeafletMap
                  activeDay={currentDay?.dayNumber ?? null}
                  days={itineraryDays}
                  selectedOrderIndex={selectedItem?.orderIndex ?? null}
                  selectedStopTitle={selectedItem?.place?.name}
                />
              </div>
            </Card>

            <Card className={styles.panelCard} elevated>
              <div className={styles.selectedCard}>
                <div>
                  <h2 className={styles.sectionTitle}>Chi tiet block dang chon</h2>
                  <p className={styles.sectionHint}>
                    Day la phan AI explanation va movement hint cho item duoc chon.
                  </p>
                </div>

                {selectedItem ? (
                  <>
                    <h3 className={styles.selectedTitle}>
                      {selectedItem.place?.name || selectedItem.reason || "Itinerary block"}
                    </h3>
                    <p className={styles.selectedBody}>
                      {selectedItem.aiDescription ||
                        selectedItem.reason ||
                        "Khong co mo ta bo sung cho block nay."}
                    </p>

                    <div className={styles.smallGrid}>
                      <div className={styles.statCard}>
                        <span className={styles.statLabel}>Khung gio</span>
                        <span className={styles.statValue}>{formatTimeSlot(selectedItem)}</span>
                      </div>
                      <div className={styles.statCard}>
                        <span className={styles.statLabel}>Chi phi</span>
                        <span className={styles.statValue}>
                          {formatCurrency(selectedItem.estimatedCost)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.transportCard}>
                      <h3 className={styles.transportTitle}>
                        {selectedItem.transportSuggestion?.mode || "Transport suggestion chua co"}
                      </h3>
                      <p className={styles.transportBody}>
                        {selectedItem.transportSuggestion?.reason ||
                          "Khi sang 12.7, block nay se noi voi route instruction va marker focus."}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className={styles.emptyInline}>
                    Chon mot itinerary item ben trai de xem chi tiet block.
                  </p>
                )}
              </div>
            </Card>

            <Card className={styles.panelCard} elevated>
              <h2 className={styles.sectionTitle}>Backend metadata</h2>
              <p className={styles.sectionHint}>
                Giu metadata trong result page de de verify flow generate truoc khi
                noi map va route.
              </p>

              <div className={styles.metaList}>
                <div className={styles.metaRow}>
                  <span>Status</span>
                  <span>{trip.status}</span>
                </div>
                <div className={styles.metaRow}>
                  <span>AI metadata</span>
                  <span>{trip.aiMetadata ? "Da co" : "Chua co"}</span>
                </div>
                <div className={styles.metaRow}>
                  <span>Interests</span>
                  <span>{trip.interests?.join(", ") || "Chua ro"}</span>
                </div>
                <div className={styles.metaRow}>
                  <span>Created</span>
                  <span>{formatDateTime(trip.createdAt)}</span>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
