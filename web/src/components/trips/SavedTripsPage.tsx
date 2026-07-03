"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./SavedTripsPage.module.css";
import { Button, Card, EmptyState, ErrorMessage, Loading } from "@/components/ui";
import { KineticTitle, BounceCard, FilmGrainOverlay } from "@/components/motion";
import {
  ApiError,
  AuthSessionExpiredError,
  deleteTrip,
  listTrips,
  type PageResponse,
  type TripResponse
} from "@/lib/api";

const PAGE_SIZE = 6;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nhap",
  GENERATED: "Da tao",
  PLANNED: "Sap toi",
  COMPLETED: "Hoan tat",
  CANCELLED: "Da huy"
};

const STATUS_FILTERS = [
  { key: "ALL", label: "Tat ca" },
  { key: "DRAFT", label: "Nhap" },
  { key: "GENERATED", label: "Da tao" },
  { key: "PLANNED", label: "Sap toi" },
  { key: "COMPLETED", label: "Hoan tat" }
] as const;

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

function formatDuration(trip: TripResponse) {
  if (trip.days && trip.nights !== undefined) {
    return `${trip.days} ngay / ${trip.nights} dem`;
  }

  if (trip.days) {
    return `${trip.days} ngay`;
  }

  if (trip.startDate) {
    return formatDate(trip.startDate);
  }

  return "Chua co lich";
}

function buildTripTitle(trip: TripResponse) {
  const base = trip.destination || "Trip chua dat ten";

  if (!trip.days) {
    return base;
  }

  return `${base} ${trip.days}N${trip.nights ?? Math.max(trip.days - 1, 0)}D`;
}

function normalizeError(error: unknown) {
  if (error instanceof AuthSessionExpiredError) {
    return "Phien dang nhap da het han. Ban hay dang nhap lai de xem cac trip da luu.";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "TripWise chua tai duoc thu vien trip luc nay.";
}

export function SavedTripsPage() {
  const router = useRouter();
  const [tripPage, setTripPage] = useState<PageResponse<TripResponse> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]["key"]>("ALL");

  useEffect(() => {
    let active = true;

    async function loadTrips() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await listTrips(currentPage, PAGE_SIZE);
        if (!active) {
          return;
        }

        setTripPage(response);
      } catch (error) {
        if (!active) {
          return;
        }

        setTripPage(null);
        setErrorMessage(normalizeError(error));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadTrips();

    return () => {
      active = false;
    };
  }, [currentPage, refreshKey]);

  const filteredTrips = useMemo(() => {
    const trips = tripPage?.content ?? [];

    if (statusFilter === "ALL") {
      return trips;
    }

    return trips.filter((trip) => trip.status === statusFilter);
  }, [statusFilter, tripPage]);

  const stats = useMemo(() => {
    const trips = tripPage?.content ?? [];
    const generatedCount = trips.filter((trip) => trip.status === "GENERATED").length;
    const completedCount = trips.filter((trip) => trip.status === "COMPLETED").length;

    return {
      total: tripPage?.totalElements ?? 0,
      generated: generatedCount,
      completed: completedCount
    };
  }, [tripPage]);

  async function handleDeleteTrip(trip: TripResponse) {
    if (
      !window.confirm(
        `Xoa trip "${buildTripTitle(trip)}"? Hanh dong nay se xoa luon itinerary da luu.`
      )
    ) {
      return;
    }

    setIsDeletingId(trip.id);
    setErrorMessage(null);

    try {
      await deleteTrip(trip.id);
      const shouldGoPreviousPage =
        (tripPage?.content.length ?? 0) === 1 && currentPage > 0;
      const nextPage = shouldGoPreviousPage ? currentPage - 1 : currentPage;
      const response = await listTrips(nextPage, PAGE_SIZE);
      setCurrentPage(nextPage);
      setTripPage(response);
    } catch (error) {
      setErrorMessage(normalizeError(error));
    } finally {
      setIsDeletingId(null);
    }
  }

  function handleOpenTrip(tripId: number) {
    startTransition(() => {
      router.push(`/trips/${tripId}`);
    });
  }

  function handleOpenPlanner() {
    startTransition(() => {
      router.push("/planner");
    });
  }

  function handleRetry() {
    setRefreshKey((value) => value + 1);
  }

  return (
    <main className={styles.page}>
      <FilmGrainOverlay />
      <div className={`${styles.shell} page-shell`}>
        <section className={styles.hero}>
          <BounceCard delay={100}>
          <Card className={styles.heroCard} elevated>
            <div className={styles.stickerRow}>
              <span className={styles.sticker}>Phase 12.9</span>
              <span className={styles.stickerAlt}>Saved Trips Page</span>
            </div>

            <KineticTitle
              tag="h1"
              text="Thu vien trip da luu cua ban, tach rieng khoi planner."
              size="section"
              variant="pop"
              shadowVariant="black"
              className={styles.headline}
            />
            <p className={styles.description}>
              Man nay dung contract `GET /api/v1/trips` va `DELETE /api/v1/trips/{'{id}'}`
              de quan ly danh sach itinerary da luu. Giao dien van bam mood dashboard
              cua mock React, nhung scope chi gom list, pagination, open detail va delete.
            </p>

            <div className={styles.heroActions}>
              <Button onClick={handleOpenPlanner}>Tao trip moi</Button>
              <Link className={styles.ghostLink} href="/login">
                Dang nhap lai
              </Link>
            </div>
          </Card>
          </BounceCard>

          <BounceCard delay={200}>
          <Card className={styles.ticketCard} elevated>
            <div className={styles.ticketLabel}>Library snapshot</div>
            <h2 className={styles.ticketTitle}>Saved trips</h2>

            <div className={styles.ticketStats}>
              <div className={styles.ticketStat}>
                <span className={styles.ticketStatLabel}>Tong da luu</span>
                <span className={styles.ticketStatValue}>{stats.total}</span>
              </div>
              <div className={styles.ticketStat}>
                <span className={styles.ticketStatLabel}>Da tao itinerary</span>
                <span className={styles.ticketStatValue}>{stats.generated}</span>
              </div>
              <div className={styles.ticketStat}>
                <span className={styles.ticketStatLabel}>Hoan tat</span>
                <span className={styles.ticketStatValue}>{stats.completed}</span>
              </div>
            </div>

            <p className={styles.ticketNote}>
              Backend hien tai chua co field `title` rieng, nen page nay dung
              display title tu destination + duration de giu scope frontend-only.
            </p>
          </Card>
          </BounceCard>
        </section>

        <section className={styles.toolbar}>
          <div className={styles.filterRow}>
            {STATUS_FILTERS.map((filter) => (
              <button
                className={`${styles.filterChip} ${
                  statusFilter === filter.key ? styles.filterChipActive : ""
                }`}
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className={styles.pageInfo}>
            <span>
              Trang {(tripPage?.page ?? currentPage) + 1}
              {tripPage?.totalPages ? ` / ${tripPage.totalPages}` : ""}
            </span>
            <span>{tripPage?.totalElements ?? 0} trip</span>
          </div>
        </section>

        {errorMessage ? (
          <ErrorMessage
            message={errorMessage}
            title="Khong tai duoc saved trips"
            actions={
              <>
                <Button onClick={handleRetry}>Thu lai</Button>
                <Button onClick={handleOpenPlanner} variant="secondary">
                  Mo planner
                </Button>
              </>
            }
          />
        ) : null}

        {isLoading ? (
          <Card className={styles.stateCard} elevated>
            <div className={styles.stateWrap}>
              <Loading label="TripWise dang tai thu vien trip da luu..." />
              <p className={styles.stateHint}>
                Danh sach se giu phan trang backend va hien lai bo loc khi du lieu san sang.
              </p>
            </div>
          </Card>
        ) : null}

        {!isLoading && !errorMessage && filteredTrips.length === 0 ? (
          <Card className={styles.stateCard} elevated>
            <EmptyState
              title="Chua co trip phu hop bo loc nay."
              message="Ban co the tao trip moi tu planner hoac doi lai tab de xem cac trip khac."
              actions={
                <>
                  <Button onClick={handleOpenPlanner}>Mo planner</Button>
                  <Button onClick={() => setStatusFilter("ALL")} variant="secondary">
                    Xem tat ca
                  </Button>
                </>
              }
            />
          </Card>
        ) : null}

        {!isLoading && !errorMessage && filteredTrips.length > 0 ? (
          <section className={styles.tripGrid}>
            {filteredTrips.map((trip, idx) => (
              <BounceCard key={trip.id} delay={300 + idx * 100}>
              <Card className={styles.tripCard} elevated interactive>
                <div className={styles.tripHeader}>
                  <div>
                    <div className={styles.tripEyebrow}>Trip #{trip.id}</div>
                    <h2 className={styles.tripTitle}>{buildTripTitle(trip)}</h2>
                  </div>
                  <span className={styles.tripStatus}>
                    {STATUS_LABELS[trip.status] ?? trip.status}
                  </span>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.metaPill}>{trip.destination || "Chua ro diem den"}</span>
                  <span className={styles.metaPill}>{formatDuration(trip)}</span>
                  <span className={styles.metaPill}>
                    Cap nhat {formatDateTime(trip.updatedAt)}
                  </span>
                </div>

                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Khoi hanh</span>
                    <span className={styles.infoValue}>{formatDate(trip.startDate)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Budget</span>
                    <span className={styles.infoValue}>{trip.budget || "Chua ro"}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Travel style</span>
                    <span className={styles.infoValue}>{trip.travelStyle || "Chua ro"}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Interests</span>
                    <span className={styles.infoValue}>
                      {trip.interests?.join(", ") || "Chua ro"}
                    </span>
                  </div>
                </div>

                <p className={styles.preferenceCopy}>
                  {trip.preferences || "Trip nay chua co preference note duoc hien thi."}
                </p>

                <div className={styles.cardActions}>
                  <Button onClick={() => handleOpenTrip(trip.id)}>Mo chi tiet</Button>
                  <Button
                    disabled={isDeletingId === trip.id}
                    onClick={() => void handleDeleteTrip(trip)}
                    variant="danger"
                  >
                    {isDeletingId === trip.id ? "Dang xoa..." : "Xoa"}
                  </Button>
                </div>
              </Card>
              </BounceCard>
            ))}
          </section>
        ) : null}

        <section className={styles.pagination}>
          <Button
            disabled={isLoading || currentPage === 0}
            onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
            variant="secondary"
          >
            Trang truoc
          </Button>

          <div className={styles.paginationDots}>
            {Array.from({ length: tripPage?.totalPages ?? 0 }, (_, index) => (
              <button
                aria-label={`Den trang ${index + 1}`}
                className={`${styles.pageDot} ${
                  index === (tripPage?.page ?? currentPage) ? styles.pageDotActive : ""
                }`}
                key={index}
                onClick={() => setCurrentPage(index)}
                type="button"
              >
                {index + 1}
              </button>
            ))}
          </div>

          <Button
            disabled={
              isLoading ||
              !tripPage ||
              currentPage >= Math.max(tripPage.totalPages - 1, 0)
            }
            onClick={() => setCurrentPage((page) => page + 1)}
            variant="secondary"
          >
            Trang sau
          </Button>
        </section>
      </div>
    </main>
  );
}
