import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { LocationSelector } from "./LocationSelector";
import { getAccessToken, getAuthRoles } from "@/lib/api/auth-session";
import { createPipelineRun, listPipelineRuns, getPipelineRun } from "@/lib/api/pipeline-client";
import type { CityPipelineRunRequest, CityPipelineRunResponse } from "@/lib/api/contracts";
import { ApiError, AuthSessionExpiredError } from "@/lib/api/errors";
import styles from "./AdminCityPipelinePage.module.css";

type FormState = CityPipelineRunRequest;

const DEFAULT_FORM: FormState = {
  source: "FOURSQUARE_OS_PLACES",
  province: "Khanh Hoa",
  city: "Nha Trang",
  inputPath: undefined,
  importRunId: undefined,
  releaseDate: undefined,
  bbox: undefined,
  limit: undefined,
  step: "all",
  dryRun: false,
  confirmWriteStaging: true,
};

const SOURCES = [
  { value: "FOURSQUARE_OS_PLACES" as const, label: "Foursquare OS Places" },
  { value: "OSM_GEOFABRIK" as const, label: "OSM Geofabrik" },
];

const STEPS = [
  { value: "all" as const, label: "Full Pipeline (Recommended)", help: "Imports data, detects duplicates, runs moderation and generates reports." },
  { value: "import" as const, label: "Import Data", help: "Only imports source data into the staging database." },
  { value: "dedup" as const, label: "Find Duplicates", help: "Detects duplicate records without importing new data." },
  { value: "moderation" as const, label: "Analyze & Classify", help: "Re-runs moderation rules without importing data again." },
  { value: "report" as const, label: "Generate Report", help: "Only refreshes statistics from existing data." },
];

export function AdminCityPipelinePage() {
  const accessToken = getAccessToken();
  const roles = getAuthRoles();

  if (!accessToken) return <Navigate replace to="/admin/login" />;
  if (roles.length > 0 && !roles.includes("ADMIN")) return <Navigate replace to="/forbidden" />;

  return (
    <AdminLayout>
      <AdminCityPipelineContent />
    </AdminLayout>
  );
}

function AdminCityPipelineContent() {
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<CityPipelineRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [recentRuns, setRecentRuns] = useState<CityPipelineRunResponse[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const loadRecentRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      const resp = await listPipelineRuns(0, 10);
      setRecentRuns(resp.content ?? []);
    } catch {
      // silent
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentRuns();
  }, [loadRecentRuns]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setRunning(true);
    setError(null);
    setRunResult(null);

    try {
      const result = await createPipelineRun(form);
      setRunResult(result);
      loadRecentRuns();
    } catch (err) {
      if (err instanceof AuthSessionExpiredError) {
        window.location.href = "/admin/login";
        return;
      }
      if (err instanceof ApiError) {
        setError(err.apiError?.message || err.message || "Pipeline run failed");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Place Pipeline</h1>
          <p className={styles.subtitle}>
            Import, deduplicate, and moderate source data into the staging queue.
            Does NOT publish to public places.
          </p>
        </div>
        <Link to="/admin/staging-moderation" className={styles.linkBtn}>
          <span className="material-symbols-outlined">fact_check</span>
          Go to Staging Moderation
        </Link>
      </div>

      <div className={styles.grid}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Pipeline Configuration</h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>Source</label>
            <select
              className={styles.select}
              value={form.source}
              onChange={(e) => updateField("source", e.target.value as FormState["source"])}
              disabled={running}
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Province & City</label>
            <LocationSelector
              province={form.province}
              city={form.city}
              onProvinceChange={(p) => updateField("province", p)}
              onCityChange={(c) => updateField("city", c)}
              disabled={running}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Pipeline Mode</label>
            <select
              className={styles.select}
              value={form.step}
              onChange={(e) => updateField("step", e.target.value as FormState["step"])}
              disabled={running}
            >
              {STEPS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
              {STEPS.find((s) => s.value === form.step)?.help || ""}
            </p>
          </div>

          {/* ---- Advanced Options ---- */}
          <div style={{ marginTop: 16, border: "2px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
            <div
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", backgroundColor: "#f9fafb", cursor: "pointer",
                fontWeight: 700, fontSize: 13, color: "#6b7280",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>tune</span>
                Advanced Options
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: 18, transition: "transform 0.2s", transform: showAdvanced ? "rotate(180deg)" : "none" }}>
                expand_more
              </span>
            </div>
            {showAdvanced && (
              <div style={{ padding: "14px 16px", backgroundColor: "#fafafa", borderTop: "1px solid #e5e7eb" }}>
                <div className={styles.row}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Limit</label>
                    <input className={styles.input} type="number" min={1}
                      value={form.limit ?? ""}
                      onChange={(e) => updateField("limit", e.target.value ? Number(e.target.value) : undefined)}
                      disabled={running} placeholder="Max records" />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Import Run ID</label>
                    <input className={styles.input} type="number"
                      value={form.importRunId ?? ""}
                      onChange={(e) => updateField("importRunId", e.target.value ? Number(e.target.value) : undefined)}
                      disabled={running} placeholder="Optional" />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Input Path</label>
                  <input className={styles.input} type="text"
                    value={form.inputPath ?? ""}
                    onChange={(e) => updateField("inputPath", e.target.value || undefined)}
                    disabled={running} placeholder="Optional: path to JSONL input file" />
                </div>
                <div className={styles.row}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Release Date</label>
                    <input className={styles.input} type="text"
                      value={form.releaseDate ?? ""}
                      onChange={(e) => updateField("releaseDate", e.target.value || undefined)}
                      disabled={running} placeholder="YYYY-MM-DD" />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>BBox</label>
                    <input className={styles.input} type="text"
                      value={form.bbox ?? ""}
                      onChange={(e) => updateField("bbox", e.target.value || undefined)}
                      disabled={running} placeholder="minLat,minLng,maxLat,maxLng" />
                  </div>
                </div>
                <div className={styles.checkboxRow}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={form.dryRun}
                      onChange={(e) => updateField("dryRun", e.target.checked)}
                      disabled={running} className={styles.checkbox} />
                    <span>Dry Run (read-only, no DB writes)</span>
                  </label>
                </div>
                <div className={styles.checkboxRow}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={form.confirmWriteStaging}
                      onChange={(e) => updateField("confirmWriteStaging", e.target.checked)}
                      disabled={running} className={styles.checkbox} />
                    <span>Confirm write to staging tables</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <button
            className={styles.runBtn}
            onClick={handleSubmit}
            disabled={running || !form.province || !form.city}
            style={{ marginTop: 16 }}
          >
            {running ? (
              <>
                <span className={styles.spinner} />
                Running Pipeline...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">play_arrow</span>
                Run Pipeline
              </>
            )}
          </button>

          {error && (
            <div className={styles.errorBox}>
              <span className="material-symbols-outlined">error</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Run Result</h2>

          {runResult ? (
            <div className={styles.resultCard}>
              <div className={styles.statusBadge} data-status={runResult.status.toLowerCase()}>
                {runResult.status}
              </div>
              <dl className={styles.detailList}>
                <div className={styles.detailRow}>
                  <dt>Run ID</dt>
                  <dd>{runResult.id}</dd>
                </div>
                <div className={styles.detailRow}>
                  <dt>Source</dt>
                  <dd>{runResult.source}</dd>
                </div>
                <div className={styles.detailRow}>
                  <dt>Province / City</dt>
                  <dd>{runResult.province} / {runResult.city}</dd>
                </div>
                <div className={styles.detailRow}>
                  <dt>Step</dt>
                  <dd>{runResult.step}</dd>
                </div>
                {runResult.importRunId != null && (
                  <div className={styles.detailRow}>
                    <dt>Import Run ID</dt>
                    <dd>{runResult.importRunId}</dd>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <dt>Started</dt>
                  <dd>{runResult.startedAt ? new Date(runResult.startedAt).toLocaleString() : "-"}</dd>
                </div>
                <div className={styles.detailRow}>
                  <dt>Finished</dt>
                  <dd>{runResult.finishedAt ? new Date(runResult.finishedAt).toLocaleString() : "-"}</dd>
                </div>
              </dl>

              {runResult.summaryText && (
                <div className={styles.summaryBox}>
                  <h3 className={styles.summaryTitle}>Summary</h3>
                  <pre className={styles.summaryPre}>{runResult.summaryText}</pre>
                </div>
              )}

              {runResult.adminQueueUrl && (
                <Link to={runResult.adminQueueUrl} className={styles.linkBtn} style={{ marginTop: 12 }}>
                  <span className="material-symbols-outlined">fact_check</span>
                  Open in Staging Moderation
                </Link>
              )}

              {runResult.errorMessage && (
                <div className={styles.errorBox}>
                  <span className="material-symbols-outlined">error</span>
                  <span>{runResult.errorMessage}</span>
                </div>
              )}
            </div>
          ) : (
            <p className={styles.emptyText}>
              No run executed yet. Configure the pipeline and click &quot;Run Pipeline&quot;.
            </p>
          )}
        </div>
      </div>

      <div className={styles.recentSection}>
        <h2 className={styles.panelTitle}>Recent Runs</h2>
        {runsLoading ? (
          <p className={styles.emptyText}>Loading...</p>
        ) : recentRuns.length === 0 ? (
          <p className={styles.emptyText}>No recent pipeline runs.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Source</th>
                  <th>Province / City</th>
                  <th>Step</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{run.id}</td>
                    <td>{run.source}</td>
                    <td>{run.province} / {run.city}</td>
                    <td>{run.step}</td>
                    <td>
                      <span className={styles.statusBadge} data-status={run.status.toLowerCase()}>
                        {run.status}
                      </span>
                    </td>
                    <td>{run.startedAt ? new Date(run.startedAt).toLocaleString() : "-"}</td>
                    <td>
                      <Link
                        to={run.adminQueueUrl || "#"}
                        className={styles.tableAction}
                        onClick={async (e) => {
                          if (!run.adminQueueUrl) {
                            e.preventDefault();
                            const detail = await getPipelineRun(run.id);
                            setRunResult(detail);
                          }
                        }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}