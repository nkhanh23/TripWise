import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { LocationSelector } from './LocationSelector';
import { AdminLayout } from "./AdminLayout";
import { getAccessToken, getAuthRoles } from "@/lib/api/auth-session";
import {
  searchStagingPlaces,
  getStagingPlaceDetail,
  approveAndPublishStagingPlace,
  rejectStagingPlace,
  markStagingPlaceDuplicate,
  runAutoModerationSimulation,
  executeAutoModeration,
  previewAutoModeration,
  explainAutoModeration,
  explainExclusiveAutoModeration,
  type SimulationResult,
  type ExecutionResult,
  type PreviewResult,
  type PreviewRecord,
  type ExplainReport,
  type ExplainExclusiveReport,
  type ExclusiveBucket,
  type SearchStagingParams
} from "@/lib/api/staging-client";
import { verifyPublishSafety, autoPublishEligible, type PublishVerificationReport, type AutoPublishResult } from "@/lib/api/staging-client";
import type {
  StagingPlaceResponse,
  StagingPlaceDetailResponse,
  DedupCandidateResponse,
  PageResponse
} from "@/lib/api/contracts";
import {
  ApiError,
  AuthSessionExpiredError
} from "@/lib/api/errors";
import styles from "./AdminStagingModerationPage.module.css";

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return msg.includes("abort") || msg.includes("network") || msg.includes("fetch") || msg.includes("load failed");
  }
  return false;
}

type FilterDraft = {
  importRunId: string;
  province: string;
  city: string;
  moderationStatus: string;
  dedupStatus: string;
  placeTypeDraft: string;
  keyword: string;
};

type ConfirmAction = "reject" | "duplicate" | "publish" | null;

const DEFAULT_FILTERS: FilterDraft = {
  importRunId: "17",
  province: "Khanh Hoa",
  city: "Nha Trang",
  moderationStatus: "PENDING_ADMIN_REVIEW",
  dedupStatus: "",
  placeTypeDraft: "",
  keyword: ""
};

const DEFAULT_PAGE_SIZE = 20;

function toRequestParams(
  filters: FilterDraft,
  page: number
): SearchStagingParams {
  return {
    importRunId: filters.importRunId ? Number(filters.importRunId) : undefined,
    province: filters.province || undefined,
    city: filters.city || undefined,
    moderationStatus: filters.moderationStatus || undefined,
    dedupStatus: filters.dedupStatus || undefined,
    placeTypeDraft: filters.placeTypeDraft || undefined,
    keyword: filters.keyword || undefined,
    sortBy: "id",
    sortDirection: "asc",
    page,
    size: DEFAULT_PAGE_SIZE
  };
}

function mapError(error: unknown): string {
  if (isAbortError(error)) {
    return "";
  }
  if (error instanceof AuthSessionExpiredError) {
    return "Admin session expired. Please log in again.";
  }
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

function formatUpdatedAt(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function formatCoord(value?: number) {
  if (value === undefined || value === null) return "--";
  return value.toFixed(5);
}

function moderationBadgeClass(status?: string) {
  switch (status) {
    case "PENDING_ADMIN_REVIEW":
      return styles.badgePendingReview;
    case "APPROVED_AS_NEW":
    case "APPROVED_AS_DUPLICATE":
      return styles.badgeApproved;
    case "REJECTED":
      return styles.badgeRejected;
    default:
      return styles.badgeNeutral;
  }
}

function dedupBadgeClass(status?: string) {
  switch (status) {
    case "NOT_CHECKED":
      return styles.badgeDedupNotChecked;
    case "NO_MATCH":
    case "CANDIDATE_FOUND":
      return styles.badgeDedupCandidate;
    case "MATCHED":
      return styles.badgeDedupMatched;
    case "SKIPPED":
      return styles.badgeDedupSkipped;
    case "RESOLVED":
      return styles.badgeDedupResolved;
    default:
      return styles.badgeNeutral;
  }
}

function canActOnRecord(staging: StagingPlaceResponse): boolean {
  return (
    staging.moderationStatus === "PENDING_ADMIN_REVIEW" &&
    staging.needsAdminReview === true
  );
}

export function AdminStagingModerationPage() {
  const [searchParams] = useSearchParams();

  const urlInitialFilters = useMemo<FilterDraft>(() => {
    const fromParams: Partial<FilterDraft> = {};
    const importRunId = searchParams.get("importRunId");
    const province = searchParams.get("province");
    const city = searchParams.get("city");
    const moderationStatus = searchParams.get("moderationStatus");
    if (importRunId) fromParams.importRunId = importRunId;
    if (province) fromParams.province = province;
    if (city) fromParams.city = city;
    if (moderationStatus) fromParams.moderationStatus = moderationStatus;
    return { ...DEFAULT_FILTERS, ...fromParams };
  }, [searchParams]);

  const accessToken = getAccessToken();
  const roles = getAuthRoles();
  const fetchIdRef = useRef(0);

  // list state
  const [draftFilters, setDraftFilters] =
    useState<FilterDraft>(urlInitialFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterDraft>(urlInitialFilters);
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<PageResponse<StagingPlaceResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // detail state
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StagingPlaceDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<{
    type: "success" | "error";
    message: string;
    detailsData?: {
      existingPublicType: "PLACE" | "HOTEL";
      existingPublicId: number;
      existingName: string;
      existingCity?: string;
      existingProvince?: string;
      existingSource: string;
      existingSourcePlaceId: string;
    };
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [selectedExistingPlaceId, setSelectedExistingPlaceId] = useState<number | null>(null);

  const [toastMessage, setToastMessage] = useState<React.ReactNode | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [expandedPreviewSections, setExpandedPreviewSections] = useState<Set<string>>(new Set());

  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [showExecutionConfirm, setShowExecutionConfirm] = useState(false);

  const [explainLoading, setExplainLoading] = useState(false);
  const [explainResult, setExplainResult] = useState<ExplainReport | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [expandedExplainSection, setExpandedExplainSection] = useState<string | null>(null);

  const [exclusiveExplainLoading, setExclusiveExplainLoading] = useState(false);
  const [exclusiveExplainResult, setExclusiveExplainResult] = useState<ExplainExclusiveReport | null>(null);
  const [exclusiveExplainError, setExclusiveExplainError] = useState<string | null>(null);
  const [expandedExclusiveBucket, setExpandedExclusiveBucket] = useState<string | null>(null);

  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<PublishVerificationReport | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [autoPublishLoading, setAutoPublishLoading] = useState(false);
  const [autoPublishResult, setAutoPublishResult] = useState<AutoPublishResult | null>(null);
  const [autoPublishError, setAutoPublishError] = useState<string | null>(null);
  const [showAutoPublishConfirm, setShowAutoPublishConfirm] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const requestParams = useMemo(
    () => toRequestParams(appliedFilters, page),
    [appliedFilters, page]
  );

  // --- data fetching ---

  useEffect(() => {
    let active = true;
    const thisFetchId = ++fetchIdRef.current;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const pageResponse = await searchStagingPlaces(requestParams);
        if (!active) return;
        if (thisFetchId !== fetchIdRef.current) return;

        setResults(pageResponse);
        setSelectedId((current) => {
          const exists = pageResponse.content.some(
            (item) => item.id === current
          );
          if (exists) return current;
          return pageResponse.content[0]?.id ?? null;
        });
      } catch (loadError) {
        if (!active) return;
        if (thisFetchId !== fetchIdRef.current) return;
        if (isAbortError(loadError)) return;
        setResults(null);
        setSelectedId(null);
        setError(mapError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [requestParams]);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }

    let active = true;

      async function loadDetail() {
        setDetailLoading(true);
        try {
          const detailResponse = await getStagingPlaceDetail(selectedId);
          if (active) setDetail(detailResponse);
        } catch (err) {
          if (active && !isAbortError(err)) setDetail(null);
        } finally {
          if (active) setDetailLoading(false);
        }
      }

    void loadDetail();

    return () => {
      active = false;
    };
  }, [selectedId]);

  // --- action handlers ---

  const refreshCurrentPage = useCallback(async () => {
    setActionStatus(null);
    try {
      const pageResponse = await searchStagingPlaces(requestParams);
      setResults(pageResponse);
      setDetail((currentDetail) => {
        const stillExists = pageResponse.content.some(
          (item) => item.id === currentDetail?.stagingPlace?.id
        );
        if (!stillExists) {
          setSelectedId(pageResponse.content[0]?.id ?? null);
        }
        return currentDetail;
      });
    } catch {
      // silently fail — user can manually re-search
    }
  }, [requestParams]);

  const refreshDetail = useCallback(async () => {
    if (selectedId === null) return;
    try {
      const detailResponse = await getStagingPlaceDetail(selectedId);
      setDetail(detailResponse);
    } catch {
      setDetail(null);
    }
  }, [selectedId]);

  async function handlePublish() {
    if (selectedId === null) return;
    setActionLoading(true);
    setActionStatus(null);
    try {
      const publicId = await approveAndPublishStagingPlace(selectedId);
      setToastMessage("✅ Place published successfully.");
      setConfirmAction(null);
      setSelectedCandidateId(null);
      setSelectedExistingPlaceId(null);
      await Promise.all([refreshDetail(), refreshCurrentPage()]);
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === "DUPLICATE_CANDIDATE_FOUND" && err.detailsData) {
        setActionStatus({
          type: "error",
          message: err.message,
          detailsData: err.detailsData
        });
        await refreshDetail();
      } else {
        setActionStatus({ type: "error", message: mapError(err) });
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (selectedId === null) return;
    setActionLoading(true);
    setActionStatus(null);
    try {
      await rejectStagingPlace(selectedId);
      setToastMessage("✅ Staging record rejected.");
      setConfirmAction(null);
      setSelectedCandidateId(null);
      setSelectedExistingPlaceId(null);
      await Promise.all([refreshDetail(), refreshCurrentPage()]);
    } catch (err) {
      setActionStatus({ type: "error", message: mapError(err) });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkDuplicate() {
    if (
      selectedId === null ||
      selectedExistingPlaceId === null
    ) {
      return;
    }
    setActionLoading(true);
    setActionStatus(null);
    try {
      await markStagingPlaceDuplicate(selectedId, {
        candidateId: selectedCandidateId,
        existingPlaceId: selectedExistingPlaceId
      });

      let linkedName = "";
      if (selectedCandidateId === null && detail?.existingPublicDuplicate) {
        linkedName = detail.existingPublicDuplicate.existingName;
      } else if (selectedCandidateId !== null && detail?.candidates) {
        const candidate = detail.candidates.find(c => c.id === selectedCandidateId);
        if (candidate) {
          linkedName = candidate.existingPlaceName || "";
        }
      }

      setToastMessage(
        <div style={{ textAlign: "left" }}>
          <div>✅ Staging record marked as duplicate.</div>
          <div style={{ fontSize: "0.8rem", fontWeight: "normal", marginTop: "2px", opacity: 0.9 }}>
            Linked to existing public place:
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
            {linkedName || "Place"} (#{selectedExistingPlaceId})
          </div>
        </div>
      );

      setConfirmAction(null);
      setSelectedCandidateId(null);
      setSelectedExistingPlaceId(null);
      await Promise.all([refreshDetail(), refreshCurrentPage()]);
    } catch (err) {
      setActionStatus({ type: "error", message: mapError(err) });
    } finally {
      setActionLoading(false);
    }
  }

  function openConfirm(action: ConfirmAction) {
    setActionStatus(null);
    if (action === "duplicate") {
      if (detail?.existingPublicDuplicate) {
        setSelectedCandidateId(null);
        setSelectedExistingPlaceId(detail.existingPublicDuplicate.existingPublicId);
      } else {
        const firstCandidate = detail?.candidates?.[0] ?? null;
        if (firstCandidate) {
          setSelectedCandidateId(firstCandidate.id);
          setSelectedExistingPlaceId(
            firstCandidate.existingPlaceId ?? null
          );
        } else {
          setSelectedCandidateId(null);
          setSelectedExistingPlaceId(null);
        }
      }
    }
    setConfirmAction(action);
  }

  function closeConfirm() {
    setConfirmAction(null);
    setSelectedCandidateId(null);
    setSelectedExistingPlaceId(null);
  }

  function selectCandidate(candidate: DedupCandidateResponse) {
    setSelectedCandidateId(candidate.id);
    setSelectedExistingPlaceId(candidate.existingPlaceId ?? null);
  }

  // --- guards ---

  if (!accessToken) {
    return <Navigate replace to="/admin/login" />;
  }

  if (roles.length > 0 && !roles.includes("ADMIN")) {
    return <Navigate replace to="/forbidden" />;
  }

  const selectedStaging = detail?.stagingPlace ?? null;
  const canAct =
    selectedStaging !== null && canActOnRecord(selectedStaging);
  const isPublishEnabled = useMemo(() => {
    if (!selectedStaging) return false;
    const isValidType = ["FOOD", "HOTEL", "ATTRACTION", "SERVICE"].includes(selectedStaging.placeTypeDraft || "");
    return (
      !selectedStaging.applied &&
      selectedStaging.moderationStatus !== "REJECTED" &&
      selectedStaging.dedupStatus !== "CONFIRMED_DUPLICATE" &&
      isValidType
    );
  }, [selectedStaging]);
  const totalElements = results?.totalElements ?? 0;
  const totalPages = results?.totalPages ?? 0;
  const currentPage = results?.page ?? page;

  // --- filter helpers ---

  function updateDraft<K extends keyof FilterDraft>(
    key: K,
    value: FilterDraft[K]
  ) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleSearch() {
    setPage(0);
    setAppliedFilters(draftFilters);
  }

  function handleReset() {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(0);
  }

  async function handleRunSimulation() {
    setSimulationLoading(true);
    setSimulationError(null);
    setSimulationResult(null);
    try {
      const res = await runAutoModerationSimulation(
        appliedFilters.province || "Khanh Hoa",
        appliedFilters.city || "Nha Trang"
      );
      setSimulationResult(res);
      setLastAnalyzedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      setSimulationError(mapError(e));
    } finally {
      setSimulationLoading(false);
    }
  }

  async function handlePreviewAutoModeration() {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewResult(null);
    setExpandedPreviewSections(new Set());
    try {
      const res = await previewAutoModeration(
        appliedFilters.province || "Khanh Hoa",
        appliedFilters.city || "Nha Trang"
      );
      setPreviewResult(res);
    } catch (e) {
      setPreviewError(mapError(e));
    } finally {
      setPreviewLoading(false);
    }
  }

  function togglePreviewSection(section: string) {
    setExpandedPreviewSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  async function handleExplainAutoModeration() {
    setExplainLoading(true);
    setExplainError(null);
    setExplainResult(null);
    setExpandedExplainSection(null);
    try {
      const res = await explainAutoModeration(
        appliedFilters.province || "Khanh Hoa",
        appliedFilters.city || "Nha Trang"
      );
      setExplainResult(res);
    } catch (e) {
      setExplainError(mapError(e));
    } finally {
      setExplainLoading(false);
    }
  }

  async function handleExclusiveExplainAutoModeration() {
    setExclusiveExplainLoading(true);
    setExclusiveExplainError(null);
    setExclusiveExplainResult(null);
    setExpandedExclusiveBucket(null);
    try {
      const res = await explainExclusiveAutoModeration(
        appliedFilters.province || "Khanh Hoa",
        appliedFilters.city || "Nha Trang"
      );
      setExclusiveExplainResult(res);
    } catch (e) {
      setExclusiveExplainError(mapError(e));
    } finally {
      setExclusiveExplainLoading(false);
    }
  }

  async function handleExecuteAutoModeration() {
    setShowExecutionConfirm(false);
    setExecutionLoading(true);
    setExecutionError(null);
    setExecutionResult(null);
    try {
      const res = await executeAutoModeration(
        appliedFilters.province || "Khanh Hoa",
        appliedFilters.city || "Nha Trang"
      );
      setExecutionResult(res);
      setToastMessage("Auto moderation completed");
      // Refresh all data after execution
      handleSearch();
    } catch (e) {
      setExecutionError(mapError(e));
    } finally {
      setExecutionLoading(false);
    }
  }

  async function handleVerifyPublish() {
    setVerificationLoading(true);
    setVerificationError(null);
    setVerificationResult(null);
    try {
      const res = await verifyPublishSafety(
        appliedFilters.province || "Khanh Hoa",
        appliedFilters.city || "Nha Trang"
      );
      setVerificationResult(res);
    } catch (e) {
      setVerificationError(mapError(e));
    } finally {
      setVerificationLoading(false);
    }
  }

  async function handleAutoPublish() {
    setShowAutoPublishConfirm(false);
    setAutoPublishLoading(true);
    setAutoPublishError(null);
    setAutoPublishResult(null);
    try {
      const res = await autoPublishEligible(
        appliedFilters.province || "Khanh Hoa",
        appliedFilters.city || "Nha Trang"
      );
      setAutoPublishResult(res);
      setAutoPublishResult(res);
      setToastMessage("Auto publish completed");
      handleSearch();
      setSimulationLoading(true);
      (async () => {
        try {
          const simRes = await runAutoModerationSimulation(
            appliedFilters.province || "Khanh Hoa",
            appliedFilters.city || "Nha Trang"
          );
          setSimulationResult(simRes);
          setLastAnalyzedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } catch (e) { /* silent - simulation refresh failure shouldn't block */ }
        finally { setSimulationLoading(false); }
      })();

    } catch (e) {
      setAutoPublishError(mapError(e));
    } finally {
      setAutoPublishLoading(false);
    }
  }

  const hasStrongCandidate = detail?.candidates?.some(c => c.matchConfidence === "HIGH" || c.matchConfidence === "MEDIUM");
  const hasDupCandidates = detail?.existingPublicDuplicate != null || (detail?.candidates?.length ?? 0) > 0;
  const hasExactDuplicate = !!detail?.existingPublicDuplicate;
  const showWarning = !hasExactDuplicate && (!detail?.candidates || detail.candidates.length === 0 || !hasStrongCandidate);

  return (
    <AdminLayout>
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
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
          <div>{toastMessage}</div>
        </div>
      )}
      <div className={styles.page}>
        {/* ---- execution confirm dialog overlay ---- */}
        {showExecutionConfirm && (
          <div className={styles.overlay}>
            <div className={styles.dialog}>
              <h3 className={styles.dialogTitle}>Execute Auto Moderation</h3>
              <p className={styles.dialogText}>
                This action will automatically execute the verified moderation rules.
              </p>
              <p className={styles.dialogText}>
                Only <strong>AUTO_APPROVE</strong>, <strong>AUTO_DUPLICATE</strong> and <strong>AUTO_REJECT</strong> records will be processed.
              </p>
              <p className={styles.dialogText}>
                Manual review records will be skipped.
              </p>
              <div className={styles.dialogActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setShowExecutionConfirm(false)}
                  disabled={executionLoading}
                >
                  Cancel
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={handleExecuteAutoModeration}
                  disabled={executionLoading}
                  style={{ backgroundColor: '#34d399' }}
                >
                  {executionLoading ? 'Executing...' : 'Confirm & Execute'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ---- Auto Publish confirm dialog overlay ---- */}
        {showAutoPublishConfirm && (
          <div className={styles.overlay}>
            <div className={styles.dialog}>
              <h3 className={styles.dialogTitle}>Run Auto Publish</h3>
              <p className={styles.dialogText}>
                This will publish ALL verified AUTO_APPROVE records in chunks of 100.
              </p>
              <p className={styles.dialogText}>
                Only records that pass all validation guards (no duplicates, valid coordinates, valid names, supported sources) will be published.
              </p>
              <p className={styles.dialogText}>
                <strong>This action writes to the public database.</strong> Run <em>Verify Publish Safety</em> first to preview the outcome.
              </p>
              <div className={styles.dialogActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setShowAutoPublishConfirm(false)}
                  disabled={autoPublishLoading}
                >
                  Cancel
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={handleAutoPublish}
                  disabled={autoPublishLoading}
                  style={{ backgroundColor: '#059669', color: '#fff' }}
                >
                  {autoPublishLoading ? 'Publishing...' : 'Confirm & Publish'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---- confirm dialog overlay ---- */}
        {confirmAction !== null && (
          <div className={styles.overlay}>
            <div className={styles.dialog}>
              {actionStatus && actionStatus.type === "error" && (
                <div
                  className={`${styles.actionStatus} ${styles.actionStatusError}`}
                  style={{ marginBottom: "16px", marginTop: "0" }}
                >
                  <div>{actionStatus.message}</div>
                  {actionStatus.detailsData && (
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(220, 38, 38, 0.12)", fontSize: "0.82rem", fontWeight: "normal", textAlign: "left", color: "#b91c1c" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Existing Public Record Details:</div>
                      <ul style={{ listStyleType: "none", paddingLeft: 0, margin: "0 0 8px 0" }}>
                        <li><strong>Type:</strong> {actionStatus.detailsData.existingPublicType}</li>
                        <li><strong>ID:</strong> {actionStatus.detailsData.existingPublicId}</li>
                        <li><strong>Name:</strong> {actionStatus.detailsData.existingName}</li>
                        {actionStatus.detailsData.existingCity && <li><strong>City:</strong> {actionStatus.detailsData.existingCity}</li>}
                        {actionStatus.detailsData.existingProvince && <li><strong>Province:</strong> {actionStatus.detailsData.existingProvince}</li>}
                        <li><strong>Source:</strong> {actionStatus.detailsData.existingSource}</li>
                        <li><strong>External ID:</strong> {actionStatus.detailsData.existingSourcePlaceId}</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {confirmAction === "publish" && (
                <>
                  <h3 className={styles.dialogTitle}>Publish to Explore</h3>
                  <p className={styles.dialogText}>
                    This will validate, deduplicate, and publish staging record <strong>#{selectedId}</strong> directly to the public database. It will be visible on Explore immediately. Continue?
                  </p>
                  <div className={styles.dialogActions}>
                    <button
                      type="button"
                      className={styles.dialogCancel}
                      onClick={closeConfirm}
                      disabled={actionLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.dialogConfirmApprove}
                      onClick={handlePublish}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Publishing..." : "Confirm Publish"}
                    </button>
                  </div>
                </>
              )}

              {confirmAction === "reject" && (
                <>
                  <h3 className={styles.dialogTitle}>Reject record</h3>
                  <p className={styles.dialogText}>
                    This will mark record <strong>#{selectedId}</strong> as{" "}
                    <strong>REJECTED</strong>. It will be removed from the
                    moderation queue and will not be applied to public DB.
                    Continue?
                  </p>
                  <div className={styles.dialogActions}>
                    <button
                      type="button"
                      className={styles.dialogCancel}
                      onClick={closeConfirm}
                      disabled={actionLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.dialogConfirmReject}
                      onClick={handleReject}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Rejecting..." : "Confirm Reject"}
                    </button>
                  </div>
                </>
              )}

              {confirmAction === "duplicate" && (
                <>
                  <h3 className={styles.dialogTitle}>Mark as duplicate</h3>
                  <p className={styles.dialogText}>
                    Select a dedup candidate to link this staging record to an
                    existing public place:
                  </p>

                  {showWarning && (
                    <div style={{
                      padding: "10px 12px",
                      background: "#fffbeb",
                      border: "1px solid #f59e0b",
                      borderRadius: "8px",
                      color: "#b45309",
                      fontSize: "0.82rem",
                      fontWeight: "bold",
                      marginBottom: "12px",
                      textAlign: "left"
                    }}>
                      ⚠️ No strong duplicate candidate found. Review carefully.
                    </div>
                  )}

                  {detail?.existingPublicDuplicate && (
                    <div style={{ marginBottom: "12px", textAlign: "left" }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: "bold", color: "#b91c1c", marginBottom: "6px" }}>
                        Exact Source Duplicate (Recommended):
                      </div>
                      <div
                        className={`${styles.candidateOption} ${
                          selectedCandidateId === null && selectedExistingPlaceId === detail.existingPublicDuplicate.existingPublicId
                            ? styles.candidateOptionSelected
                            : ""
                        }`.trim()}
                        onClick={() => {
                          setSelectedCandidateId(null);
                          setSelectedExistingPlaceId(detail.existingPublicDuplicate!.existingPublicId);
                        }}
                        style={{ border: "1.5px solid #fca5a5", background: "rgba(254, 242, 242, 0.6)" }}
                      >
                        <input
                          type="radio"
                          className={styles.candidateRadio}
                          checked={selectedCandidateId === null && selectedExistingPlaceId === detail.existingPublicDuplicate.existingPublicId}
                          onChange={() => {
                            setSelectedCandidateId(null);
                            setSelectedExistingPlaceId(detail.existingPublicDuplicate!.existingPublicId);
                          }}
                          name="duplicate-candidate"
                        />
                        <div className={styles.candidateInfo}>
                          <span className={styles.candidateInfoName} style={{ color: "#991b1b" }}>
                            {detail.existingPublicDuplicate.existingName} (Exact Match)
                          </span>
                          <span className={styles.candidateInfoDetail}>
                            Type: {detail.existingPublicDuplicate.existingPublicType} — ID: #{detail.existingPublicDuplicate.existingPublicId}
                          </span>
                          <span className={styles.candidateInfoDetail}>
                            Source: {detail.existingPublicDuplicate.existingSource} | External ID: {detail.existingPublicDuplicate.existingSourcePlaceId}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!detail?.existingPublicDuplicate && (!detail?.candidates ||
                    detail.candidates.length === 0) && (
                    <p className={styles.dialogText} style={{ color: "#b91c1c" }}>
                      No dedup candidates available for this record.
                    </p>
                  )}

                  {detail?.candidates && detail.candidates.length > 0 && (
                    <div className={styles.candidateSelect}>
                      {detail.candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className={`${styles.candidateOption} ${
                            selectedCandidateId === candidate.id
                              ? styles.candidateOptionSelected
                              : ""
                          }`.trim()}
                          onClick={() => selectCandidate(candidate)}
                        >
                          <input
                            type="radio"
                            className={styles.candidateRadio}
                            checked={selectedCandidateId === candidate.id}
                            onChange={() => selectCandidate(candidate)}
                            name="duplicate-candidate"
                          />
                          <div className={styles.candidateInfo}>
                            <span className={styles.candidateInfoName}>
                              {candidate.existingPlaceName ||
                                `Candidate #${candidate.id}`}
                            </span>
                            <span className={styles.candidateInfoDetail}>
                              {candidate.existingPlaceType || ""}
                              {candidate.existingPlaceCity
                                ? ` — ${candidate.existingPlaceCity}`
                                : ""}
                            </span>
                            <span className={styles.candidateInfoDetail}>
                              Match: {candidate.matchType || "--"} /{" "}
                              {candidate.matchConfidence || "--"} /{" "}
                              {candidate.distanceMeters !== undefined
                                ? `${candidate.distanceMeters.toFixed(0)}m`
                                : "?"}
                              {candidate.nameSimilarity !== undefined
                                ? ` / name ${(candidate.nameSimilarity * 100).toFixed(0)}%`
                                : ""}
                            </span>
                            {candidate.existingPlaceId && (
                              <span className={styles.candidateInfoDetail}>
                                Existing place ID: #{candidate.existingPlaceId}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={styles.dialogActions}>
                    <button
                      type="button"
                      className={styles.dialogCancel}
                      onClick={closeConfirm}
                      disabled={actionLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.dialogConfirmDuplicate}
                      onClick={handleMarkDuplicate}
                      disabled={
                        actionLoading ||
                        selectedExistingPlaceId === null
                      }
                    >
                      {actionLoading
                        ? "Marking..."
                        : "Confirm Duplicate"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ---- hero ---- */}
          <div>
            <h1 className={styles.title}>Auto Moderation Dashboard</h1>
            <p className={styles.subtitle}>
              {appliedFilters.city || appliedFilters.province || "Selected location"} &mdash; {loading ? "..." : totalElements.toLocaleString("vi-VN")} imported records &mdash; {simulationResult ? (simulationResult.totalStaging - simulationResult.adminReview).toLocaleString("vi-VN") + " auto-saved" : "Run Analyze to see stats"}
            </p>
          </div>

        {/* ---- Dashboard Cards ---- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', margin: '0 0 20px 0' }}>
          <div style={{ padding: '16px', backgroundColor: '#e0e7ff', border: '3px solid #111', borderRadius: '14px', boxShadow: '4px 4px 0 #111' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 4 }}>Pending Queue</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{loading ? "..." : totalElements.toLocaleString("vi-VN")}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#ecfdf5', border: '3px solid #111', borderRadius: '14px', boxShadow: '4px 4px 0 #111' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: 4 }}>Auto Publish</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{simulationResult?.autoApprove?.toLocaleString("vi-VN") ?? "--"}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#fef2f2', border: '3px solid #111', borderRadius: '14px', boxShadow: '4px 4px 0 #111' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', marginBottom: 4 }}>Needs Review</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{simulationResult?.adminReview?.toLocaleString("vi-VN") ?? "--"}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#fee2e2', border: '3px solid #111', borderRadius: '14px', boxShadow: '4px 4px 0 #111' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', marginBottom: 4 }}>Auto Reject</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{simulationResult?.autoReject?.toLocaleString("vi-VN") ?? "--"}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#fef3c7', border: '3px solid #111', borderRadius: '14px', boxShadow: '4px 4px 0 #111' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: 4 }}>Auto Duplicate</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{simulationResult?.autoDuplicate?.toLocaleString("vi-VN") ?? "--"}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#f0fdf4', border: '3px solid #111', borderRadius: '14px', boxShadow: '4px 4px 0 #111' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', marginBottom: 4 }}>Work Saved</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>
              {simulationResult && simulationResult.totalStaging > 0
                ? Math.round(((simulationResult.totalStaging - simulationResult.adminReview) / simulationResult.totalStaging) * 100) + "%"
                : "--"}
            </div>
          </div>
        </div>

        {lastAnalyzedAt && (
          <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280', marginBottom: 8, marginTop: -8 }}>
            Last analyzed: {lastAnalyzedAt}
          </div>
        )}
        {/* ---- Primary Actions ---- */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button type="button" className={styles.primaryButton}
            onClick={handleRunSimulation}
            disabled={loading || simulationLoading}
            style={{ backgroundColor: '#c084fc', color: '#111', border: '3px solid #111', boxShadow: '4px 4px 0 #111', fontSize: 15, padding: '14px 28px' }}>
            {simulationLoading ? 'Analyzing...' : 'Analyze Auto Moderation'}
          </button>
          <button type="button" className={styles.primaryButton}
            onClick={() => setShowAutoPublishConfirm(true)}
            disabled={loading || autoPublishLoading || !!(simulationResult && simulationResult.autoApprove === 0)}
            style={{ backgroundColor: '#059669', color: '#fff', border: '3px solid #111', boxShadow: '4px 4px 0 #111', fontSize: 15, padding: '14px 28px' }}>
            {autoPublishLoading ? 'Publishing...' : (simulationResult && simulationResult.autoApprove === 0) ? 'No eligible records' : 'Run Auto Publish'}
          </button>
        </div>

        {/* ---- Filters ---- */}
        <section className={`${styles.panel} ${styles.filtersPanel}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Filters</h2>
              <p className={styles.sectionText}>Máº·c Ä‘á»‹nh importRunId=17, Nha Trang, Khanh Hoa, PENDING_ADMIN_REVIEW.</p>
            </div>
          </div>

          <div className={styles.filterGrid}>
            <div className={styles.field}>
              <label htmlFor="staging-import-run-id" className={styles.label}>
                Import Run ID
              </label>
              <input
                id="staging-import-run-id"
                className={styles.input}
                value={draftFilters.importRunId}
                onChange={(e) => updateDraft("importRunId", e.target.value)}
                placeholder="17"
              />
            </div>
            <div className={`${styles.field} ${styles.fieldWide}`} style={{ gridColumn: "span 2" }}>
              <label className={styles.label}>Province & City</label>
              <LocationSelector
                province={draftFilters.province}
                city={draftFilters.city}
                onProvinceChange={(p) => updateDraft("province", p)}
                onCityChange={(c) => updateDraft("city", c)}
              />
            </div>

            <div className={styles.field}>
              <label
                htmlFor="staging-moderation-status"
                className={styles.label}
              >
                Moderation Status
              </label>
              <select
                id="staging-moderation-status"
                className={styles.select}
                value={draftFilters.moderationStatus}
                onChange={(e) =>
                  updateDraft("moderationStatus", e.target.value)
                }
              >
                <option value="">All</option>
                <option value="PENDING_ADMIN_REVIEW">
                  PENDING_ADMIN_REVIEW
                </option>
                <option value="APPROVED_AS_NEW">APPROVED_AS_NEW</option>
                <option value="APPROVED_AS_DUPLICATE">
                  APPROVED_AS_DUPLICATE
                </option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="staging-dedup-status" className={styles.label}>
                Dedup Status
              </label>
              <select
                id="staging-dedup-status"
                className={styles.select}
                value={draftFilters.dedupStatus}
                onChange={(e) => updateDraft("dedupStatus", e.target.value)}
              >
                <option value="">All</option>
                <option value="NOT_CHECKED">NOT_CHECKED</option>
                <option value="CANDIDATE_FOUND">CANDIDATE_FOUND</option>
                <option value="MATCHED">MATCHED</option>
                <option value="SKIPPED">SKIPPED</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="staging-place-type" className={styles.label}>
                Place Type Draft
              </label>
              <select
                id="staging-place-type"
                className={styles.select}
                value={draftFilters.placeTypeDraft}
                onChange={(e) =>
                  updateDraft("placeTypeDraft", e.target.value)
                }
              >
                <option value="">All</option>
                <option value="ATTRACTION">ATTRACTION</option>
                <option value="FOOD">FOOD</option>
                <option value="HOTEL">HOTEL</option>
                <option value="SERVICE">SERVICE</option>
              </select>
            </div>

            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label htmlFor="staging-keyword" className={styles.label}>
                Keyword
              </label>
              <input
                id="staging-keyword"
                className={styles.input}
                value={draftFilters.keyword}
                onChange={(e) => updateDraft("keyword", e.target.value)}
                placeholder="Thanh Sương, Chùa Long Sơn, Viện Hải Dương Học..."
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={handleReset} disabled={loading || simulationLoading}>Reset</button>
            <button type="button" className={styles.primaryButton} onClick={handleSearch} disabled={loading || simulationLoading}>Search</button>
          </div>
        </section>

        {/* ---- Advanced Tools ---- */}
        <div style={{ margin: '0 0 24px 0', border: '2.5px solid #9ca3af', borderRadius: '14px', overflow: 'hidden' }}>
          <div onClick={() => setShowDevTools(!showDevTools)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px',
              backgroundColor: '#f3f4f6', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: '#374151',
              borderBottom: showDevTools ? '2px solid #9ca3af' : 'none' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>code</span>
              Advanced Tools
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: 20, transition: 'transform 0.2s', transform: showDevTools ? 'rotate(180deg)' : 'none' }}>expand_more</span>
          </div>
          {showDevTools && (
            <div style={{ padding: '16px 20px', backgroundColor: '#fafafa' }}>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                Advanced debugging and analysis tools. All are read-only unless explicitly confirmed.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8, borderBottom: '1.5px solid #e5e7eb', paddingBottom: 4 }}>Execution</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setShowExecutionConfirm(true)} disabled={loading || executionLoading}
                    style={{ backgroundColor: '#34d399', color: '#111', border: '2px solid #111', boxShadow: '2px 2px 0 #111', fontSize: 12, padding: '6px 14px' }}>
                    {executionLoading ? 'Executing...' : 'Execute'}
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={handlePreviewAutoModeration} disabled={loading || previewLoading}
                    style={{ backgroundColor: '#93c5fd', color: '#111', border: '2px solid #111', boxShadow: '2px 2px 0 #111', fontSize: 12, padding: '6px 14px' }}>
                    {previewLoading ? 'Loading...' : 'Preview'}
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={handleVerifyPublish} disabled={loading || verificationLoading}
                    style={{ backgroundColor: '#60a5fa', color: '#111', border: '2px solid #111', boxShadow: '2px 2px 0 #111', fontSize: 12, padding: '6px 14px' }}>
                    {verificationLoading ? 'Verifying...' : 'Publish Verification'}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8, borderBottom: '1.5px solid #e5e7eb', paddingBottom: 4 }}>Analysis</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className={styles.secondaryButton} onClick={handleExplainAutoModeration} disabled={loading || explainLoading}
                    style={{ backgroundColor: '#f472b6', color: '#111', border: '2px solid #111', boxShadow: '2px 2px 0 #111', fontSize: 12, padding: '6px 14px' }}>
                    {explainLoading ? 'Loading...' : 'Explain'}
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={handleExclusiveExplainAutoModeration} disabled={loading || exclusiveExplainLoading}
                    style={{ backgroundColor: '#8b5cf6', color: '#111', border: '2px solid #111', boxShadow: '2px 2px 0 #111', fontSize: 12, padding: '6px 14px' }}>
                    {exclusiveExplainLoading ? 'Loading...' : 'Explain Exclusive'}
                  </button>
                </div>
              </div>

        {/* ---- Simulation Report ---- */}
        {simulationLoading && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#f3e8ff',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#111111'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, animation: 'spin 1.5s linear infinite' }}>sync</span>
            <span>Evaluating rules and simulating auto moderation on staging records...</span>
          </div>
        )}

        {simulationError && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#fee2e2',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#991b1b'
          }}>
            <div>Failed to run simulation: {simulationError}</div>
          </div>
        )}

        {/* ---- Execution Loading ---- */}
        {executionLoading && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#d1fae5',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#111111'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, animation: 'spin 1.5s linear infinite' }}>sync</span>
            <span>Executing auto moderation on staging records...</span>
          </div>
        )}

        {executionError && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#fee2e2',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#991b1b'
          }}>
            <div>Failed to execute auto moderation: {executionError}</div>
          </div>
        )}

        {executionResult && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '24px',
            backgroundColor: '#ffffff',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '5px 5px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            color: '#111111'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #111111', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 850, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#34d399' }}>playlist_add_check</span>
                Auto Moderation Execution Report
              </h3>
              <button
                onClick={() => setExecutionResult(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '14px',
                  textDecoration: 'underline'
                }}
              >
                Close Report
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: '#e0e7ff', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '4px' }}>Total Scanned</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{executionResult.totalScanned}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#ecfdf5', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>Published</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{executionResult.publishedAutomatically}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fef3c7', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: '4px' }}>Marked Duplicate</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{executionResult.markedDuplicate}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fee2e2', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', marginBottom: '4px' }}>Rejected</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{executionResult.rejected}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f3f4f6', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Skipped (Review)</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{executionResult.skippedForAdminReview}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fce7f3', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#db2777', textTransform: 'uppercase', marginBottom: '4px' }}>Failed</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{executionResult.failed}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#e0e7ff', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '4px' }}>Execution Time</div>
                <div style={{ fontSize: '24px', fontWeight: 900 }}>{executionResult.executionTimeMs} ms</div>
              </div>
            </div>

            {(() => {
              const failedRecords = executionResult.records.filter(r => r.executionStatus === 'FAILED');
              if (failedRecords.length === 0) return null;
              return (
                <div style={{ border: '2.5px solid #111111', borderRadius: '12px', backgroundColor: '#fafafa', padding: '16px', boxShadow: '3px 3px 0 #111111' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 850, color: '#db2777' }}>Failures ({failedRecords.length})</h4>
                  {failedRecords.map((rec, idx) => (
                    <div key={idx} style={{ marginBottom: idx < failedRecords.length - 1 ? '8px' : 0, padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', fontSize: '12px', border: '1px solid #fecaca' }}>
                      <div style={{ fontWeight: 700 }}>Staging ID #{rec.stagingId}: {rec.name || '--'}</div>
                      <div style={{ color: '#dc2626', marginTop: '2px' }}>{rec.failureReason || 'Unknown error'}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {simulationResult && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '24px',
            backgroundColor: '#ffffff',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '5px 5px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            color: '#111111'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #111111', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 850, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#a78bfa' }}>analytics</span>
                Auto Moderation Simulation: {simulationResult.city}, {simulationResult.province}
              </h3>
              <button 
                onClick={() => setSimulationResult(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '14px',
                  textDecoration: 'underline'
                }}
              >
                Close Report
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: '#e0e7ff', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '4px' }}>Total Staging</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{simulationResult.totalStaging}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#ecfdf5', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>Auto Approve</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{simulationResult.autoApprove}</div>
                <div style={{ fontSize: '11px', color: '#047857', marginTop: '4px' }}>
                  ({Math.round((simulationResult.autoApprove / (simulationResult.totalStaging || 1)) * 100)}% of total)
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fef3c7', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: '4px' }}>Auto Duplicate</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{simulationResult.autoDuplicate}</div>
                <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px' }}>
                  ({Math.round((simulationResult.autoDuplicate / (simulationResult.totalStaging || 1)) * 100)}% of total)
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fee2e2', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', marginBottom: '4px' }}>Auto Reject</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{simulationResult.autoReject}</div>
                <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>
                  ({Math.round((simulationResult.autoReject / (simulationResult.totalStaging || 1)) * 100)}% of total)
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f3f4f6', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '4px' }}>Needs Admin Review</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#ef4444' }}>{simulationResult.adminReview}</div>
                <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px', fontWeight: 700 }}>
                  Saved: {Math.round(((simulationResult.totalStaging - simulationResult.adminReview) / (simulationResult.totalStaging || 1)) * 100)}% of work!
                </div>
              </div>
            </div>

            <div style={{ border: '2.5px solid #111111', borderRadius: '12px', backgroundColor: '#fafafa', padding: '20px', boxShadow: '3px 3px 0 #111111' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 850, borderBottom: '2px solid #111111', paddingBottom: '6px' }}>Detailed Rule Breakdown</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                
                {/* AUTO_APPROVE breakdown */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#059669', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    Auto Approve
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {Object.entries(simulationResult.approveBreakdown).map(([key, val]) => (
                      <li key={key}><strong>{key}</strong>: {val} records</li>
                    ))}
                    {Object.keys(simulationResult.approveBreakdown).length === 0 && <span style={{ color: '#6b7280', fontStyle: 'italic' }}>None</span>}
                  </ul>
                </div>

                {/* AUTO_DUPLICATE breakdown */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#d97706', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>copy_all</span>
                    Auto Duplicate
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {Object.entries(simulationResult.duplicateBreakdown).map(([key, val]) => (
                      <li key={key}><strong>{key}</strong>: {val} records</li>
                    ))}
                    {Object.keys(simulationResult.duplicateBreakdown).length === 0 && <span style={{ color: '#6b7280', fontStyle: 'italic' }}>None</span>}
                  </ul>
                </div>

                {/* AUTO_REJECT breakdown */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#dc2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                    Auto Reject
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {Object.entries(simulationResult.rejectBreakdown).map(([key, val]) => (
                      <li key={key}><strong>{key}</strong>: {val} records</li>
                    ))}
                    {Object.keys(simulationResult.rejectBreakdown).length === 0 && <span style={{ color: '#6b7280', fontStyle: 'italic' }}>None</span>}
                  </ul>
                </div>

                {/* ADMIN_REVIEW breakdown */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#4b5563', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>assignment_ind</span>
                    Needs Admin Review
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {Object.entries(simulationResult.reviewBreakdown).map(([key, val]) => (
                      <li key={key}><strong>{key}</strong>: {val} records</li>
                    ))}
                    {Object.keys(simulationResult.reviewBreakdown).length === 0 && <span style={{ color: '#6b7280', fontStyle: 'italic' }}>None</span>}
                  </ul>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ---- Preview Report ---- */}
        {previewLoading && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#dbeafe',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#111111'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, animation: 'spin 1.5s linear infinite' }}>sync</span>
            <span>Loading auto moderation preview...</span>
          </div>
        )}

        {previewError && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#fee2e2',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#991b1b'
          }}>
            <div>Preview failed: {previewError}</div>
          </div>
        )}

        {previewResult && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '24px',
            backgroundColor: '#ffffff',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '5px 5px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            color: '#111111'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #111111', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 850, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#3b82f6' }}>preview</span>
                Auto Moderation Preview
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{previewResult.totalStaging} staging records</span>
                <button
                  onClick={() => setPreviewResult(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '14px',
                    textDecoration: 'underline'
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'AUTO_APPROVE', count: previewResult.autoApprove, color: '#059669', bg: '#ecfdf5', icon: 'check_circle' },
                { label: 'AUTO_DUPLICATE', count: previewResult.autoDuplicate, color: '#d97706', bg: '#fef3c7', icon: 'copy_all' },
                { label: 'AUTO_REJECT', count: previewResult.autoReject, color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
                { label: 'NEEDS_ADMIN_REVIEW', count: previewResult.adminReview, color: '#6b7280', bg: '#f3f4f6', icon: 'assignment_ind' },
              ].map(section => (
                <div
                  key={section.label}
                  onClick={() => togglePreviewSection(section.label)}
                  style={{
                    padding: '16px',
                    backgroundColor: section.bg,
                    border: `2.5px solid #111111`,
                    borderRadius: '12px',
                    boxShadow: '3px 3px 0 #111111',
                    cursor: 'pointer',
                    transition: 'transform 0.12s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: section.color }}>{section.icon}</span>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: section.color, textTransform: 'uppercase' }}>{section.label}</div>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, marginLeft: 'auto', transition: 'transform 0.2s', transform: expandedPreviewSections.has(section.label) ? 'rotate(180deg)' : 'none' }}>
                      expand_more
                    </span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 900 }}>{section.count}</div>
                </div>
              ))}
            </div>

            {['AUTO_APPROVE', 'AUTO_DUPLICATE', 'AUTO_REJECT', 'NEEDS_ADMIN_REVIEW'].map(sectionKey => {
              const filtered = previewResult.records.filter(r => r.decision === sectionKey);
              if (filtered.length === 0) return null;

              const sectionColors: Record<string, { color: string; bg: string }> = {
                AUTO_APPROVE: { color: '#059669', bg: '#f0fdf4' },
                AUTO_DUPLICATE: { color: '#d97706', bg: '#fffbeb' },
                AUTO_REJECT: { color: '#dc2626', bg: '#fef2f2' },
                NEEDS_ADMIN_REVIEW: { color: '#6b7280', bg: '#f9fafb' },
              };
              const sc = sectionColors[sectionKey] || { color: '#6b7280', bg: '#f9fafb' };

              return (
                <div
                  key={sectionKey}
                  style={{
                    border: '2.5px solid #111111',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    overflow: 'hidden',
                    boxShadow: '2px 2px 0 #111111'
                  }}
                >
                  <div
                    onClick={() => togglePreviewSection(sectionKey)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: sc.bg,
                      cursor: 'pointer',
                      borderBottom: expandedPreviewSections.has(sectionKey) ? '2px solid #111111' : 'none',
                      fontWeight: 800,
                      fontSize: '13px'
                    }}
                  >
                    <span style={{ color: sc.color }}>
                      {sectionKey === 'AUTO_APPROVE' && '✓ '}
                      {sectionKey === 'AUTO_DUPLICATE' && '⧉ '}
                      {sectionKey === 'AUTO_REJECT' && '✕ '}
                      {sectionKey === 'NEEDS_ADMIN_REVIEW' && '⚑ '}
                      {sectionKey} — {filtered.length} records
                    </span>
                    <span className="material-symbols-outlined" style={{
                      fontSize: 20,
                      transition: 'transform 0.2s',
                      transform: expandedPreviewSections.has(sectionKey) ? 'rotate(180deg)' : 'none'
                    }}>
                      expand_more
                    </span>
                  </div>
                  {expandedPreviewSections.has(sectionKey) && (
                    <div style={{ padding: '8px 16px 12px', backgroundColor: '#fafafa' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1.5px solid #e5e7eb' }}>
                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 750, color: '#374151' }}>Staging ID</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 750, color: '#374151' }}>Name</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 750, color: '#374151' }}>Decision</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 750, color: '#374151' }}>Sub Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(record => (
                            <tr key={record.stagingId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 700 }}>#{record.stagingId}</td>
                              <td style={{ padding: '6px 8px' }}>{record.name || '--'}</td>
                              <td style={{ padding: '6px 8px', color: sc.color, fontWeight: 600 }}>{record.decision}</td>
                              <td style={{ padding: '6px 8px', color: '#6b7280' }}>{record.subCategory || '--'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ---- Explain Report ---- */}
        {explainLoading && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#fce7f3',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#111111'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, animation: 'spin 1.5s linear infinite' }}>sync</span>
            <span>Diagnosing failure reasons for each record...</span>
          </div>
        )}

        {explainError && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#fee2e2',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#991b1b'
          }}>
            <div>Explain failed: {explainError}</div>
          </div>
        )}

        {explainResult && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '24px',
            backgroundColor: '#ffffff',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '5px 5px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            color: '#111111'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #111111', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 850, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#ec4899' }}>search_insights</span>
                Auto Moderation Explain: {explainResult.city}, {explainResult.province}
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{explainResult.totalStaging} total / {explainResult.totalNeedsAdminReview} needs review</span>
                <button
                  onClick={() => setExplainResult(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '14px',
                    textDecoration: 'underline'
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Overall stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: '#fce7f3', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#db2777', textTransform: 'uppercase', marginBottom: '4px' }}>Total Staging</div>
                <div style={{ fontSize: '32px', fontWeight: 900 }}>{explainResult.totalStaging}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fce7f3', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#db2777', textTransform: 'uppercase', marginBottom: '4px' }}>Needs Admin Review</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#be185d' }}>{explainResult.totalNeedsAdminReview}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fce7f3', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#db2777', textTransform: 'uppercase', marginBottom: '4px' }}>Failure Reasons</div>
                <div style={{ fontSize: '32px', fontWeight: 900 }}>{Object.keys(explainResult.failureBreakdown).length}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fce7f3', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#db2777', textTransform: 'uppercase', marginBottom: '4px' }}>Unique Combinations</div>
                <div style={{ fontSize: '32px', fontWeight: 900 }}>{Object.keys(explainResult.combinationBreakdown).length}</div>
              </div>
            </div>

            {/* Dashboard sections */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { key: 'failure', title: 'Failure Breakdown', icon: 'error_outline', color: '#dc2626', bg: '#fef2f2', data: explainResult.failureBreakdown },
                { key: 'combination', title: 'Combination Breakdown', icon: 'layers', color: '#7c3aed', bg: '#f5f3ff', data: explainResult.combinationBreakdown },
                { key: 'category', title: 'Category Breakdown', icon: 'category', color: '#0891b2', bg: '#ecfeff', data: explainResult.categoryBreakdown },
                { key: 'placeType', title: 'PlaceType Breakdown', icon: 'map', color: '#d97706', bg: '#fffbeb', data: explainResult.placeTypeBreakdown },
              ].map(section => {
                const entries = Object.entries(section.data);
                const isExpanded = expandedExplainSection === section.key;
                return (
                  <div key={section.key} style={{
                    border: '2.5px solid #111111',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '2px 2px 0 #111111'
                  }}>
                    <div
                      onClick={() => setExpandedExplainSection(isExpanded ? null : section.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: section.bg,
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '13px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: section.color }}>{section.icon}</span>
                        <span style={{ color: section.color }}>{section.title}</span>
                        <span style={{ color: '#6b7280', fontWeight: 600 }}>({entries.length} items)</span>
                      </div>
                      <span className="material-symbols-outlined" style={{
                        fontSize: 20,
                        transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(180deg)' : 'none'
                      }}>
                        expand_more
                      </span>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '12px 16px', backgroundColor: '#fafafa' }}>
                        {entries.length === 0 ? (
                          <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '12px' }}>No data</div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1.5px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 750, color: '#374151' }}>Name</th>
                                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 750, color: '#374151' }}>Count</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entries.map(([name, count]) => (
                                <tr key={name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '6px 8px' }}>{name}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Recommendations section */}
              {explainResult.recommendations.length > 0 && (
                <div style={{
                  border: '2.5px solid #111111',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '2px 2px 0 #111111'
                }}>
                  <div
                    onClick={() => setExpandedExplainSection(expandedExplainSection === 'recommendations' ? null : 'recommendations')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: '#f0fdf4',
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#059669' }}>lightbulb</span>
                      <span style={{ color: '#059669' }}>Recommendations</span>
                      <span style={{ color: '#6b7280', fontWeight: 600 }}>({explainResult.recommendations.length} items)</span>
                    </div>
                    <span className="material-symbols-outlined" style={{
                      fontSize: 20,
                      transition: 'transform 0.2s',
                      transform: expandedExplainSection === 'recommendations' ? 'rotate(180deg)' : 'none'
                    }}>
                      expand_more
                    </span>
                  </div>
                  {expandedExplainSection === 'recommendations' && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#fafafa' }}>
                      {explainResult.recommendations.map((rec, idx) => (
                        <div key={idx} style={{
                          padding: '12px',
                          marginBottom: idx < explainResult.recommendations.length - 1 ? '8px' : 0,
                          backgroundColor: '#f0fdf4',
                          border: '1.5px solid #bbf7d0',
                          borderRadius: '10px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ fontWeight: 800, fontSize: '13px', color: '#166534' }}>{rec.recommendation}</div>
                            <div style={{
                              padding: '2px 10px',
                              backgroundColor: '#166534',
                              color: '#fff',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 800
                            }}>
                              -{rec.expectedReduction} records
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>{rec.reason}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- Exclusive Explain Report ---- */}
        {exclusiveExplainLoading && (
          <div style={{
            margin: '0 0 24px 0', padding: '20px', backgroundColor: '#ede9fe',
            border: '3px solid #111111', borderRadius: '16px', boxShadow: '4px 4px 0 #111111',
            display: 'flex', alignItems: 'center', gap: '12px',
            fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 700, color: '#111111'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, animation: 'spin 1.5s linear infinite' }}>sync</span>
            <span>Classifying records into exclusive failure buckets...</span>
          </div>
        )}

        {exclusiveExplainError && (
          <div style={{
            margin: '0 0 24px 0', padding: '20px', backgroundColor: '#fee2e2',
            border: '3px solid #111111', borderRadius: '16px', boxShadow: '4px 4px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 700, color: '#991b1b'
          }}>
            <div>Exclusive Explain failed: {exclusiveExplainError}</div>
          </div>
        )}

        {exclusiveExplainResult && (
          <div style={{
            margin: '0 0 24px 0', padding: '24px', backgroundColor: '#ffffff',
            border: '3px solid #111111', borderRadius: '16px', boxShadow: '5px 5px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif", color: '#111111'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #111111', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 850, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#7c3aed' }}>donut_large</span>
                Exclusive Bucket Analysis: {exclusiveExplainResult.city}, {exclusiveExplainResult.province}
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{exclusiveExplainResult.totalStaging} records</span>
                <button onClick={() => setExclusiveExplainResult(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '14px', textDecoration: 'underline' }}
                >Close</button>
              </div>
            </div>

            {/* Bucket cards sorted by ROI */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {exclusiveExplainResult.buckets.map((bucket, idx) => {
                const isExpanded = expandedExclusiveBucket === bucket.name;
                return (
                  <div key={bucket.name} style={{
                    border: '2.5px solid #111111', borderRadius: '12px', overflow: 'hidden',
                    cursor: 'pointer'
                  }}>
                    <div onClick={() => setExpandedExclusiveBucket(isExpanded ? null : bucket.name)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', backgroundColor: idx < 3 ? '#f0fdf4' : '#fafafa',
                        borderBottom: isExpanded ? '2px solid #111111' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: idx === 0 ? '#059669' : idx === 1 ? '#d97706' : '#6b7280' }}>
                            {idx === 0 ? 'star' : idx === 1 ? 'trending_up' : 'list_alt'}
                          </span>
                          <span style={{ fontWeight: 850, fontSize: '13px', color: '#111111' }}>
                            #{idx + 1} — {bucket.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12px', color: '#374151' }}>
                          <span style={{ fontWeight: 800 }}>{bucket.recordCount} records ({bucket.percentage}%)</span>
                          <span style={{ color: '#6b7280' }}>|</span>
                          <span>Safety: {bucket.safetyStars}</span>
                          <span style={{ color: '#6b7280' }}>|</span>
                          <span>Difficulty: {bucket.difficultyStars}</span>
                          <span style={{ color: '#6b7280' }}>|</span>
                          <span>ROI: {bucket.roiScore}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800,
                          backgroundColor: idx === 0 ? '#059669' : idx === 1 ? '#d97706' : '#6b7280',
                          color: '#fff'
                        }}>
                          Priority {idx + 1}
                        </div>
                        <span className="material-symbols-outlined" style={{
                          fontSize: 20, transition: 'transform 0.2s',
                          transform: isExpanded ? 'rotate(180deg)' : 'none'
                        }}>
                          expand_more
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '14px 16px', backgroundColor: '#fafafa' }}>
                        <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                          <div><strong>Safety:</strong> {bucket.safetyLabel}</div>
                          <div><strong>Difficulty:</strong> {bucket.difficultyLabel}</div>
                          <div><strong>Sample records:</strong> {bucket.sampleStagingIds.map(id => `#${id}`).join(', ')}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recommendations */}
            {exclusiveExplainResult.recommendations.length > 0 && (
              <div style={{ marginTop: '16px', border: '2.5px solid #111111', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', fontWeight: 800, fontSize: '13px', color: '#059669', borderBottom: '2px solid #111111' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: '6px', verticalAlign: 'middle' }}>lightbulb</span>
                  Ranked Recommendations
                </div>
                <div style={{ padding: '12px 16px', backgroundColor: '#fafafa' }}>
                  {exclusiveExplainResult.recommendations.map((rec, idx) => (
                    <div key={idx} style={{
                      padding: '8px 0', fontSize: '12px', lineHeight: 1.5,
                      borderBottom: idx < exclusiveExplainResult.recommendations.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      <span style={{ fontWeight: 750 }}>{idx + 1}.</span> {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
		)}

        {/* ---- Verification Report ---- */}
        {verificationLoading && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#dbeafe',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#111111'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, animation: 'spin 1.5s linear infinite' }}>sync</span>
            <span>Verifying publish safety for all eligible records...</span>
          </div>
        )}

        {verificationError && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#fee2e2',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#991b1b'
          }}>
            <div>Verification failed: {verificationError}</div>
          </div>
        )}

        {verificationResult && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '24px',
            backgroundColor: '#ffffff',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '5px 5px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            color: '#111111'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #111111', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 850, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#60a5fa' }}>verified</span>
                Publish Verification: {verificationResult.city}, {verificationResult.province}
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{verificationResult.executionTimeMs}ms</span>
                <button onClick={() => setVerificationResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '14px', textDecoration: 'underline' }}>Close</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', backgroundColor: '#e0e7ff', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5' }}>ELIGIBLE</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{verificationResult.eligible}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#ecfdf5', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669' }}>PUBLISHABLE</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{verificationResult.publishable}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fef2f2', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626' }}>BLOCKED</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{verificationResult.blocked}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f0fdf4', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a' }}>SUCCESS RATE</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{verificationResult.successRatePct}%</div>
              </div>
            </div>

            {verificationResult.topBlockers && verificationResult.topBlockers.length > 0 && (
              <div style={{ border: '2.5px solid #111111', borderRadius: '12px', backgroundColor: '#fafafa', padding: '16px', boxShadow: '3px 3px 0 #111111' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 850 }}>Top Blockers</h4>
                {verificationResult.topBlockers.map((b: string, i: number) => (
                  <div key={i} style={{ padding: '6px 0', fontSize: '12px', borderBottom: i < verificationResult.topBlockers.length - 1 ? '1px solid #e5e7eb' : 'none' }}>{b}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- Auto Publish Result ---- */}
        {autoPublishLoading && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#d1fae5',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#111111'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, animation: 'spin 1.5s linear infinite' }}>sync</span>
            <span>Auto-publishing eligible records in chunks...</span>
          </div>
        )}

        {autoPublishError && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '20px',
            backgroundColor: '#fee2e2',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            color: '#991b1b'
          }}>
            <div>Auto publish failed: {autoPublishError}</div>
          </div>
        )}

        {autoPublishResult && (
          <div style={{
            margin: '0 0 24px 0',
            padding: '24px',
            backgroundColor: '#ffffff',
            border: '3px solid #111111',
            borderRadius: '16px',
            boxShadow: '5px 5px 0 #111111',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            color: '#111111'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #111111', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 850, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#059669' }}>rocket_launch</span>
                Auto Publish Result: {autoPublishResult.city}, {autoPublishResult.province}
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{autoPublishResult.executionTimeMs}ms</span>
                <button onClick={() => setAutoPublishResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '14px', textDecoration: 'underline' }}>Close</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '14px', backgroundColor: '#e0e7ff', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#4f46e5' }}>SCANNED</div>
                <div style={{ fontSize: '24px', fontWeight: 900 }}>{autoPublishResult.totalScanned}</div>
              </div>
              <div style={{ padding: '14px', backgroundColor: '#f0fdf4', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#16a34a' }}>ELIGIBLE</div>
                <div style={{ fontSize: '24px', fontWeight: 900 }}>{autoPublishResult.eligible}</div>
              </div>
              <div style={{ padding: '14px', backgroundColor: '#ecfdf5', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#059669' }}>PUBLISHED</div>
                <div style={{ fontSize: '24px', fontWeight: 900 }}>{autoPublishResult.published}</div>
              </div>
              <div style={{ padding: '14px', backgroundColor: '#fef2f2', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#dc2626' }}>FAILED</div>
                <div style={{ fontSize: '24px', fontWeight: 900 }}>{autoPublishResult.failed}</div>
              </div>
              <div style={{ padding: '14px', backgroundColor: '#f3f4f6', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#6b7280' }}>SKIPPED</div>
                <div style={{ fontSize: '24px', fontWeight: 900 }}>{autoPublishResult.skipped}</div>
              </div>
              <div style={{ padding: '14px', backgroundColor: '#ede9fe', border: '2.5px solid #111111', borderRadius: '12px', boxShadow: '3px 3px 0 #111111', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#7c3aed' }}>CHUNKS</div>
                <div style={{ fontSize: '24px', fontWeight: 900 }}>{autoPublishResult.totalChunks}</div>
              </div>
            </div>
          </div>
        )}
          </div>
        )}
      </div>

        {/* ---- list + detail grid ---- */}
        <div className={styles.contentGrid}>
          {/* ---- list table ---- */}
          <section className={`${styles.panel} ${styles.tablePanel}`}>
            <div
              className={styles.sectionHeader}
              style={{ padding: "24px 24px 0" }}
            >
              <div>
                <h2 className={styles.sectionTitle}>Staging Records</h2>
                <p className={styles.sectionText}>
                  Click a row to view detail including dedup candidates and
                  moderation actions.
                </p>
              </div>
            </div>

            {loading && (
              <div className={styles.loadingState}>
                Loading staging data...
              </div>
            )}
            {!loading && error && (
              <div className={styles.errorState}>{error}</div>
            )}
            {!loading &&
              !error &&
              results &&
              results.content.length === 0 && (
                <div className={styles.emptyState}>
                  No staging records match current filters.
                </div>
              )}

            {!loading &&
              !error &&
              results &&
              results.content.length > 0 && (
                <>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Source</th>
                          <th>Type Draft</th>
                          <th>Locality</th>
                          <th>Region</th>
                          <th>Moderation</th>
                          <th>Dedup</th>
                          <th>Review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.content.map((place) => {
                          const isActive = place.id === selectedId;

                          return (
                            <tr
                              key={place.id}
                              className={`${styles.tableRow} ${isActive ? styles.tableRowActive : ""}`.trim()}
                              onClick={() => setSelectedId(place.id)}
                            >
                              <td>
                                <span className={styles.subtle}>
                                  #{place.id}
                                </span>
                              </td>
                              <td>
                                <div className={styles.nameCell}>
                                  <span className={styles.nameValue}>
                                    {place.name}
                                  </span>
                                  <span className={styles.subtle}>
                                    {place.sourcePlaceId ||
                                      `run ${place.importRunId ?? "?"}`}
                                  </span>
                                </div>
                              </td>
                              <td>{place.source || "--"}</td>
                              <td>
                                <span
                                  className={`${styles.badge} ${styles.badgeNeutral}`}
                                >
                                  {place.placeTypeDraft || "--"}
                                </span>
                              </td>
                              <td>{place.locality || "--"}</td>
                              <td>{place.region || "--"}</td>
                              <td>
                                <span
                                  className={`${styles.badge} ${moderationBadgeClass(place.moderationStatus)}`}
                                >
                                  {place.moderationStatus || "--"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`${styles.badge} ${dedupBadgeClass(place.dedupStatus)}`}
                                >
                                  {place.dedupStatus || "--"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={
                                    place.needsAdminReview
                                      ? styles.flagTrue
                                      : styles.flagFalse
                                  }
                                >
                                  {place.needsAdminReview ? "YES" : "no"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.pagination}>
                    <div className={styles.paginationMeta}>
                      Page {currentPage + 1} / {Math.max(totalPages, 1)} &bull;{" "}
                      {totalElements.toLocaleString("vi-VN")} results
                    </div>

                    <div className={styles.paginationActions}>
                      <button
                        type="button"
                        className={styles.pagerButton}
                        onClick={() =>
                          setPage((current) => Math.max(current - 1, 0))
                        }
                        disabled={loading || currentPage <= 0}
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        className={styles.pagerButton}
                        onClick={() => setPage((current) => current + 1)}
                        disabled={
                          loading ||
                          totalPages === 0 ||
                          currentPage >= totalPages - 1
                        }
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
          </section>

          {/* ---- detail panel ---- */}
          <aside className={`${styles.panel} ${styles.detailPanel}`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Staging Detail</h2>
                <p className={styles.sectionText}>
                  Review staging record, categories, and dedup candidates.
                </p>
              </div>
            </div>

            {!selectedStaging && !detailLoading && (
              <p className={styles.emptyDetail}>
                Select a staging record from the table to view details.
              </p>
            )}

            {detailLoading && (
              <p className={styles.emptyDetail}>Loading detail...</p>
            )}

            {selectedStaging && !detailLoading && (
              <div className={styles.detailBlock}>
                <div className={styles.detailHeader}>
                  <h3 className={styles.detailTitle}>
                    {selectedStaging.name}
                  </h3>
                  <div className={styles.detailMeta}>
                    <span
                      className={`${styles.badge} ${moderationBadgeClass(selectedStaging.moderationStatus)}`}
                    >
                      {selectedStaging.moderationStatus || "--"}
                    </span>
                    <span
                      className={`${styles.badge} ${dedupBadgeClass(selectedStaging.dedupStatus)}`}
                    >
                      {selectedStaging.dedupStatus || "--"}
                    </span>
                    {selectedStaging.needsAdminReview && (
                      <span
                        className={`${styles.badge} ${styles.badgePendingReview}`}
                      >
                        NEEDS REVIEW
                      </span>
                    )}
                  </div>
                </div>

                {/* ---- action buttons (moved to top) ---- */}
                {selectedStaging && !selectedStaging.applied && selectedStaging.moderationStatus !== "REJECTED" && (
                  <div className={styles.topActionBar}>
                    {isPublishEnabled && (
                      <button type="button" className={styles.approveButton}
                        onClick={() => openConfirm("publish")}
                        disabled={actionLoading}
                        style={{ backgroundColor: "#047857" }}>
                        Publish to Explore
                      </button>
                    )}
                    {canAct && hasDupCandidates && (
                      <button type="button" className={styles.duplicateButton}
                        onClick={() => openConfirm("duplicate")}
                        disabled={actionLoading}>
                        Mark Duplicate
                      </button>
                    )}
                    {canAct && (
                      <button type="button" className={styles.rejectButton}
                        onClick={() => openConfirm("reject")}
                        disabled={actionLoading}>
                        Reject
                      </button>
                    )}
                  </div>
                )}
                
                {/* action status message (moved to top) */}
                {actionStatus && (
                  <div
                    className={`${styles.actionStatus} ${
                      actionStatus.type === "success"
                        ? styles.actionStatusSuccess
                        : styles.actionStatusError
                    }`.trim()}
                    style={{ marginBottom: "18px" }}
                  >
                    <div>{actionStatus.message}</div>
                    {actionStatus.type === "error" && actionStatus.detailsData && (
                      <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(220, 38, 38, 0.12)", fontSize: "0.82rem", fontWeight: "normal", textAlign: "left" }}>
                        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Existing Public Record Details:</div>
                        <ul style={{ listStyleType: "none", paddingLeft: 0, margin: "0 0 8px 0" }}>
                          <li><strong>Type:</strong> {actionStatus.detailsData.existingPublicType}</li>
                          <li><strong>ID:</strong> {actionStatus.detailsData.existingPublicId}</li>
                          <li><strong>Name:</strong> {actionStatus.detailsData.existingName}</li>
                          {actionStatus.detailsData.existingCity && <li><strong>City:</strong> {actionStatus.detailsData.existingCity}</li>}
                          {actionStatus.detailsData.existingProvince && <li><strong>Province:</strong> {actionStatus.detailsData.existingProvince}</li>}
                          <li><strong>Source:</strong> {actionStatus.detailsData.existingSource}</li>
                          <li><strong>External ID:</strong> {actionStatus.detailsData.existingSourcePlaceId}</li>
                        </ul>
                        <div style={{ fontStyle: "italic", marginTop: "4px", color: "#991b1b", fontWeight: "bold" }}>
                          This staging record appears to already exist in public data. Consider Mark Duplicate instead.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.detailList}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>ID</span>
                    <span className={styles.detailValue}>
                      #{selectedStaging.id}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Import Run</span>
                    <span className={styles.detailValue}>
                      {selectedStaging.importRunId ?? "--"}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Source</span>
                    <span className={styles.detailValue}>
                      {selectedStaging.source || "--"}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Source Place ID</span>
                    <span className={styles.detailValue}>
                      {selectedStaging.sourcePlaceId || "--"}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Place Type Draft</span>
                    <span className={styles.detailValue}>
                      {selectedStaging.placeTypeDraft || "--"}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Coordinates</span>
                    <span className={styles.detailValue}>
                      {formatCoord(selectedStaging.latitude)} /{" "}
                      {formatCoord(selectedStaging.longitude)}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Address</span>
                    <span className={styles.detailValue}>
                      {selectedStaging.address || "--"}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>
                      Locality / Region
                    </span>
                    <span className={styles.detailValue}>
                      {[selectedStaging.locality, selectedStaging.region]
                        .filter(Boolean)
                        .join(", ") || "--"}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>
                      Coordinate Status
                    </span>
                    <span className={styles.detailValue}>
                      {selectedStaging.coordinateStatus || "--"}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>
                      Validation Status
                    </span>
                    <span className={styles.detailValue}>
                      {selectedStaging.validationStatus || "--"}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Updated</span>
                    <span className={styles.detailValue}>
                      {formatUpdatedAt(selectedStaging.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* categories */}
                {detail?.categories && detail.categories.length > 0 && (
                  <div className={styles.detailSection}>
                    <h4 className={styles.detailSectionTitle}>Categories</h4>
                    {detail.categories.map((cat, idx) => (
                      <span key={idx} className={styles.categoryChip}>
                        {cat.categoryLabel ||
                          cat.sourceCategoryId ||
                          "--"}
                        {cat.isPrimary ? " (primary)" : ""}
                      </span>
                    ))}
                  </div>
                )}

                {/* existing public duplicate by source/external ID */}
                {detail?.existingPublicDuplicate && (
                  <div className={styles.detailSection} style={{ border: "1px dashed #b91c1c", background: "rgba(254, 242, 242, 0.4)", borderRadius: "12px", padding: "14px", marginBottom: "16px", textAlign: "left" }}>
                    <h4 className={styles.detailSectionTitle} style={{ color: "#b91c1c", marginBottom: "8px" }}>
                      Existing public record with same source/external ID
                    </h4>
                    <div className={styles.candidateCard} style={{ borderColor: "#fca5a5", padding: "10px", background: "#fff" }}>
                      <div className={styles.candidateName} style={{ color: "#991b1b", fontWeight: "bold" }}>
                        {detail.existingPublicDuplicate.existingName}
                      </div>
                      <div className={styles.candidateMeta} style={{ fontSize: "0.82rem", color: "#64748b" }}>
                        Type: {detail.existingPublicDuplicate.existingPublicType} | ID: #{detail.existingPublicDuplicate.existingPublicId}
                      </div>
                      {detail.existingPublicDuplicate.existingCity && (
                        <div className={styles.candidateMeta} style={{ fontSize: "0.82rem", color: "#64748b" }}>
                          City: {detail.existingPublicDuplicate.existingCity}
                          {detail.existingPublicDuplicate.existingProvince ? `, Province: ${detail.existingPublicDuplicate.existingProvince}` : ""}
                        </div>
                      )}
                      <div className={styles.candidateMeta} style={{ fontSize: "0.82rem", color: "#64748b" }}>
                        Source: {detail.existingPublicDuplicate.existingSource} | External ID: {detail.existingPublicDuplicate.existingSourcePlaceId}
                      </div>
                    </div>
                  </div>
                )}

                {/* dedup candidates */}
                {detail?.candidates && detail.candidates.length > 0 && (
                  <div className={styles.detailSection}>
                    <h4 className={styles.detailSectionTitle}>
                      Dedup Candidates
                    </h4>
                    {detail.candidates.map((candidate) => (
                      <div key={candidate.id} className={styles.candidateCard}>
                        <div className={styles.candidateName}>
                          {candidate.existingPlaceName ||
                            `Candidate #${candidate.id}`}
                        </div>
                        {candidate.existingPlaceCity && (
                          <div className={styles.candidateMeta}>
                            City: {candidate.existingPlaceCity}
                          </div>
                        )}
                        {candidate.matchedStagingPlaceId && (
                          <div className={styles.candidateMeta}>
                            Matched staging: #
                            {candidate.matchedStagingPlaceId}
                          </div>
                        )}
                        <div className={styles.candidateMeta}>
                          Match: {candidate.matchType || "--"} | Confidence:{" "}
                          {candidate.matchConfidence || "--"}
                        </div>
                        <div className={styles.candidateMeta}>
                          Distance:{" "}
                          {candidate.distanceMeters !== undefined
                            ? `${candidate.distanceMeters.toFixed(0)}m`
                            : "--"}{" "}
                          | Name sim:{" "}
                          {candidate.nameSimilarity !== undefined
                            ? `${(candidate.nameSimilarity * 100).toFixed(0)}%`
                            : "--"}{" "}
                          | Cat sim:{" "}
                          {candidate.categorySimilarity !== undefined
                            ? `${(candidate.categorySimilarity * 100).toFixed(0)}%`
                            : "--"}
                        </div>
                        <div className={styles.candidateMeta}>
                          Decision: {candidate.decision || "pending"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
