"use client";

import { startTransition, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./TripPlannerPage.module.css";
import { AppContent } from "@/components/layout/AppContent";
import { Button, Card, ErrorMessage, Loading, Badge } from "@/components/ui";
import { KineticTitle, BounceCard, FilmGrainOverlay } from "@/components/motion";
import {
  ApiError,
  AuthSessionExpiredError,
  generateTrip
} from "@/lib/api";

type BudgetLevel = "Tiet kiem" | "Vua phai" | "Thoai mai";
type TransportMode = "Di bo" | "Xe may" | "O to" | "Xe dap";

type SuggestionFlags = {
  density: boolean;
  outdoor: boolean;
  seafood: boolean;
};

type PreviewDay = 1 | 2 | 3;

const TRAVEL_STYLES = [
  "Chill",
  "Foodie",
  "Check-in",
  "Nature",
  "Culture",
  "Adventure nhe"
] as const;

const FOOD_PREFERENCES = [
  "Hai san",
  "An vat",
  "Cafe",
  "Mon dia phuong",
  "An chay",
  "It cay"
] as const;

const BUDGET_OPTIONS: Array<{
  key: BudgetLevel;
  description: string;
}> = [
  { key: "Tiet kiem", description: "Uu tien quan binh dan, di chuyen gon." },
  { key: "Vua phai", description: "Can bang giua trai nghiem va chi phi." },
  { key: "Thoai mai", description: "Uu tien diem dep, an uong thoang tay hon." }
];

const TRANSPORT_OPTIONS: TransportMode[] = ["Di bo", "Xe may", "O to", "Xe dap"];

const EXAMPLE_PROMPTS = [
  "Nha Trang 3 ngay 2 dem, thich bien va hai san.",
  "Da Lat 2 ngay, muon chill cafe va canh dep.",
  "Da Nang cuoi tuan, uu tien food trip gon gon."
] as const;

const GENERATION_STEPS = [
  "Dang phan tich yeu cau tu prompt va cac field form.",
  "Dang doi chieu voi dia diem that trong he thong.",
  "Dang sap lich theo ngay va tinh profile di chuyen.",
  "Dang tao goi y mo ta ngan truoc khi sang result page."
] as const;

function formatDateForDisplay(value: string) {
  if (!value) {
    return "Chưa chọn";
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

function countTripDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
}

function normalizeApiError(error: unknown) {
  if (error instanceof AuthSessionExpiredError) {
    return "Phiên đăng nhập đã hết hạn. Bạn hãy đăng nhập lại trước khi tạo trip.";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "TripWise chưa thể tạo lịch trình lúc này. Vui lòng thử lại sau.";
}

function formatPromptFromForm(input: {
  destination: string;
  startDate: string;
  endDate: string;
  budget: BudgetLevel;
  travelStyles: string[];
  travelers: number;
  transport: TransportMode;
  foodPreferences: string[];
  prompt: string;
  suggestionFlags: SuggestionFlags;
}) {
  const dayCount = countTripDays(input.startDate, input.endDate);
  const nightCount = dayCount ? Math.max(dayCount - 1, 0) : null;
  const suggestionNotes = [
    input.suggestionFlags.density ? "giu mat do moi ngay thoang hon" : null,
    input.suggestionFlags.outdoor ? "uu tien diem ngoai troi vao buoi sang" : null,
    input.suggestionFlags.seafood ? "chen them mot bua hai san buoi toi" : null
  ].filter(Boolean);

  const promptParts = [
    `Toi muon di ${input.destination}.`,
    dayCount ? `Lich trinh ${dayCount} ngay${nightCount !== null ? ` ${nightCount} dem` : ""}.` : null,
    `Di cung ${input.travelers} nguoi.`,
    `Ngan sach ${input.budget.toLowerCase()}.`,
    input.travelStyles.length > 0
      ? `Phong cach uu tien: ${input.travelStyles.join(", ")}.`
      : null,
    `Phuong tien chinh: ${input.transport.toLowerCase()}.`,
    input.foodPreferences.length > 0
      ? `An uong uu tien: ${input.foodPreferences.join(", ")}.`
      : null,
    suggestionNotes.length > 0 ? `Toi muon ${suggestionNotes.join(", ")}.` : null,
    input.prompt.trim() ? `Mo ta tu nhien: ${input.prompt.trim()}` : null,
    input.startDate && input.endDate
      ? `Ngay di du kien tu ${formatDateForDisplay(input.startDate)} den ${formatDateForDisplay(input.endDate)}.`
      : null
  ].filter(Boolean);

  return promptParts.join(" ");
}

export function TripPlannerPage() {
  const router = useRouter();
  const [destination, setDestination] = useState("Nha Trang");
  const [startDate, setStartDate] = useState("2026-08-12");
  const [endDate, setEndDate] = useState("2026-08-14");
  const [budget, setBudget] = useState<BudgetLevel>("Vua phai");
  const [travelStyles, setTravelStyles] = useState<string[]>([
    "Chill",
    "Foodie",
    "Check-in"
  ]);
  const [travelers, setTravelers] = useState(2);
  const [transport, setTransport] = useState<TransportMode>("Xe may");
  const [foodPreferences, setFoodPreferences] = useState<string[]>([
    "Hai san",
    "Cafe",
    "Mon dia phuong"
  ]);
  const [prompt, setPrompt] = useState(
    "Nha Trang 3 ngay 2 dem, di cung ban be, thich bien, hai san, check-in dep, ngan sach vua phai."
  );
  const [suggestionFlags, setSuggestionFlags] = useState<SuggestionFlags>({
    density: true,
    outdoor: true,
    seafood: true
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDays = countTripDays(startDate, endDate);
  const canSubmit = Boolean(destination.trim()) && Boolean(prompt.trim());

  const generatedRequest = useMemo(
    () =>
      formatPromptFromForm({
        destination,
        startDate,
        endDate,
        budget,
        travelStyles,
        travelers,
        transport,
        foodPreferences,
        prompt,
        suggestionFlags
      }),
    [
      budget,
      destination,
      endDate,
      foodPreferences,
      prompt,
      startDate,
      suggestionFlags,
      transport,
      travelStyles,
      travelers
    ]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setSubmitError(null);

    if (!destination.trim()) {
      setValidationError("Bạn cần nhập điểm đến trước khi tạo trip.");
      return;
    }

    if (!totalDays || totalDays < 1) {
      setValidationError("Khoảng ngày không hợp lệ.");
      return;
    }

    if (totalDays > 3) {
      setValidationError("MVP hiện chỉ hỗ trợ tối đa 3 ngày.");
      return;
    }

    if (!prompt.trim()) {
      setValidationError("Bạn cần mô tả ngắn gọn nhu cầu chuyến đi.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await generateTrip({ request: generatedRequest });
      startTransition(() => {
        router.push(`/trips/${response.id}`);
      });
    } catch (error) {
      setSubmitError(normalizeApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleValue(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  }

  function resetForm() {
    setDestination("");
    setStartDate("2026-08-12");
    setEndDate("2026-08-14");
    setBudget("Vua phai");
    setTravelStyles([]);
    setTravelers(1);
    setTransport("Xe may");
    setFoodPreferences([]);
    setPrompt("");
    setValidationError(null);
    setSubmitError(null);
  }

  return (
    <AppContent variant="standard" className={`${styles.page} px-0 pt-0 sm:px-0 lg:px-0`}>
      <FilmGrainOverlay />
      
      <div className={styles.shell}>
        
        {/* HERO HEADER */}
        <section className={styles.hero}>
          <BounceCard delay={100}>
            <Card className={styles.heroCard} elevated>
              <div className={styles.heroStack}>
                <div className={styles.stickerRow}>
                  <span className={styles.sticker}>✦ AI Travel Machine</span>
                </div>
                <KineticTitle
                  tag="h1"
                  text="Lập lịch trình bằng AI ✨"
                  size="section"
                  variant="pop"
                  shadowVariant="black"
                  className={styles.headline}
                />
                <p className={styles.description}>
                  Điền vài thông tin hoặc mô tả bằng một câu tự nhiên. TripWise AI sẽ thiết kế trọn gói bưu thiếp và tuyến đường di chuyển trong 10 giây.
                </p>
              </div>
            </Card>
          </BounceCard>
        </section>

        {/* LEFT COLUMN: FORM */}
        <div className={styles.leftCol}>
          <BounceCard delay={200}>
            <div className={styles.formCard}>
              <div className={styles.formTitleBar}>
                <h3 className={styles.formTitle}>Thông tin chuyến đi</h3>
                <p className={styles.formSubtitle}>Cài đặt tham số lịch trình</p>
              </div>

              <form className={styles.formBody} onSubmit={handleSubmit}>
                
                {/* 1. Destination */}
                <div className={styles.formSection}>
                  <label className={styles.formLabel} htmlFor="destinationInput">Bạn muốn đi đâu?</label>
                  <div className={styles.inputWrapper}>
                    <i className={`material-symbols-outlined ${styles.inputIcon}`}>explore</i>
                    <input
                      id="destinationInput"
                      type="text"
                      className={styles.textInput}
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Ví dụ: Nha Trang"
                    />
                  </div>
                </div>

                {/* 2. Date Range */}
                <div className={styles.formSection}>
                  <label className={styles.formLabel}>Bạn đi khi nào?</label>
                  <div className={styles.gridTwo}>
                    <div className={styles.inputWrapper}>
                      <i className={`material-symbols-outlined ${styles.inputIcon}`}>calendar_month</i>
                      <input
                        type="date"
                        className={styles.textInput}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <i className={`material-symbols-outlined ${styles.inputIcon}`}>calendar_month</i>
                      <input
                        type="date"
                        className={styles.textInput}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.dateWarningRow}>
                    {totalDays !== null && (
                      <Badge variant="sticker" size="sm">{totalDays} ngày {Math.max(0, totalDays - 1)} đêm</Badge>
                    )}
                    <span className={styles.dateWarningText}>
                      ⚠️ MVP hỗ trợ lịch trình tối đa 3 ngày.
                    </span>
                  </div>
                </div>

                {/* 3. Budget */}
                <div className={styles.formSection}>
                  <label className={styles.formLabel}>Ngân sách</label>
                  <div className={styles.segmentedControl}>
                    {BUDGET_OPTIONS.map((option) => {
                      const isActive = budget === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setBudget(option.key)}
                          className={`${styles.segmentBtn} ${isActive ? styles.segmentBtnActive : ''}`}
                        >
                          {option.key === "Tiet kiem" ? "Tiết kiệm" : option.key === "Vua phai" ? "Vừa phải" : "Thoải mái"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Travel Styles */}
                <div className={styles.formSection}>
                  <label className={styles.formLabel}>Phong cách du lịch</label>
                  <div className={styles.chipsContainer}>
                    {TRAVEL_STYLES.map((style) => {
                      const active = travelStyles.includes(style);
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setTravelStyles((current) => toggleValue(current, style))}
                          className={`${styles.chipBtn} ${active ? styles.chipBtnStyleActive : ''}`}
                        >
                          {style === "Chill" ? "Chill" : style === "Foodie" ? "Foodie" : style === "Check-in" ? "Check-in" : style === "Nature" ? "Nature" : style === "Culture" ? "Culture" : "Adventure nhẹ"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5 & 6. Travelers & Transport */}
                <div className={styles.gridTwo}>
                  <div className={styles.formSection}>
                    <label className={styles.formLabel}>Số người đi</label>
                    <div className={styles.stepperContainer}>
                      <button
                        type="button"
                        onClick={() => setTravelers((prev) => Math.max(1, prev - 1))}
                        className={styles.stepperBtn}
                      >
                        -
                      </button>
                      <span className={styles.stepperValue}>{travelers}</span>
                      <button
                        type="button"
                        onClick={() => setTravelers((prev) => prev + 1)}
                        className={styles.stepperBtn}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <label className={styles.formLabel}>Phương tiện chính</label>
                    <div className={styles.chipsContainer}>
                      {TRANSPORT_OPTIONS.map((mode) => {
                        const active = transport === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setTransport(mode)}
                            className={`${styles.chipBtn} ${active ? styles.chipBtnTransportActive : ''}`}
                          >
                            {mode === "Di bo" ? "Đi bộ" : mode === "Xe may" ? "Xe máy" : mode === "O to" ? "Ô tô" : "Xe đạp"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 7. Food Preferences */}
                <div className={styles.formSection}>
                  <label className={styles.formLabel}>Bạn thích ăn gì?</label>
                  <div className={styles.chipsContainer}>
                    {FOOD_PREFERENCES.map((food) => {
                      const active = foodPreferences.includes(food);
                      return (
                        <button
                          key={food}
                          type="button"
                          onClick={() => setFoodPreferences((current) => toggleValue(current, food))}
                          className={`${styles.chipBtn} ${active ? styles.chipBtnFoodActive : ''}`}
                        >
                          {food === "Hai san" ? "Hải sản" : food === "An vat" ? "Ăn vặt" : food === "Cafe" ? "Cafe" : food === "Mon dia phuong" ? "Món địa phương" : food === "An chay" ? "Ăn chay" : "Ít cay"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 8. Text Description */}
                <div className={styles.formSection}>
                  <label className={styles.formLabel} htmlFor="naturalPromptInput">Mô tả chuyến đi bằng lời của bạn</label>
                  <textarea
                    id="naturalPromptInput"
                    className={styles.textarea}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ví dụ: Nha Trang 3 ngày 2 đêm, thích biển, ăn hải sản tối, nghỉ dưỡng..."
                    rows={3}
                  />
                  <div className={styles.templateContainer}>
                    <span className={styles.templateLabel}>Mẫu nhanh:</span>
                    {EXAMPLE_PROMPTS.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setPrompt(ex)}
                        className={styles.templateBtn}
                      >
                        {ex.includes("Nha Trang") ? "Nha Trang 3N2Đ" : ex.includes("Da Lat") ? "Đà Lạt 2 ngày" : "Đà Nẵng cuối tuần"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages & Actions */}
                {validationError && (
                  <div className={styles.formWarning}>
                    {validationError}
                  </div>
                )}
                {submitError && (
                  <div className={styles.formWarning}>
                    {submitError}
                  </div>
                )}

                <div className={styles.formActions}>
                  <Button variant="primary" type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? "Đang tạo..." : "Tạo lịch trình ⚡"}
                  </Button>
                  <Button variant="secondary" type="button" onClick={() => router.push('/dashboard')}>
                    Lưu nháp
                  </Button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className={styles.deleteBtn}
                  >
                    Xoá form
                  </button>
                </div>
              </form>
            </div>
          </BounceCard>
        </div>

        {/* RIGHT COLUMN: HUD INSIGHTS */}
        <div className={styles.rightCol}>
          
          {/* AI UNDERSTANDING */}
          <BounceCard delay={300}>
            <Card variant="speech" title="AI đã hiểu">
              {destination.trim() ? (
                <div className={styles.summaryTable}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>📍 Điểm đến:</span>
                    <span className={styles.summaryVal}>{destination}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>📅 Thời gian:</span>
                    <span className={styles.summaryVal}>
                      {totalDays ? `${totalDays} ngày ${Math.max(0, totalDays - 1)} đêm` : ""} ({formatDateForDisplay(startDate)} – {formatDateForDisplay(endDate)})
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>👥 Người đi:</span>
                    <span className={styles.summaryVal}>{travelers} người</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>💰 Ngân sách:</span>
                    <span className={styles.summaryVal}>
                      {budget === "Tiet kiem" ? "Tiết kiệm" : budget === "Vua phai" ? "Vừa phải" : "Thoải mái"}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>🎨 Phong cách:</span>
                    <span className={styles.summaryVal}>
                      {travelStyles.length > 0 ? travelStyles.join(", ") : "Chưa chọn"}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>🛵 Phương tiện:</span>
                    <span className={styles.summaryVal}>
                      {transport === "Di bo" ? "Đi bộ" : transport === "Xe may" ? "Xe máy" : transport === "O to" ? "Ô tô" : "Xe đạp"}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>🦀 Ăn uống:</span>
                    <span className={styles.summaryVal}>
                      {foodPreferences.length > 0 ? foodPreferences.join(", ") : "Chưa chọn"}
                    </span>
                  </div>
                  <div className={styles.summaryFooter}>
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById("destinationInput")?.focus();
                      }}
                      className={styles.summaryFooterBtn}
                    >
                      Chỉnh lại thông tin
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  Nhập prompt hoặc điền form để AI tóm tắt yêu cầu của bạn.
                </div>
              )}
            </Card>
          </BounceCard>

          {/* SUGGESTIONS OR LOADING PROGRESS */}
          {isSubmitting ? (
            <BounceCard delay={400}>
              <Card title="Đang tạo lịch trình...">
                <div className={styles.progressSection}>
                  <div className={styles.statusList}>
                    {GENERATION_STEPS.map((step, index) => (
                      <div className={styles.statusStep} key={step}>
                        <span
                          className={`${styles.statusDot} ${
                            index === 0 ? styles.statusDotPending : styles.statusDotActive
                          }`}
                        />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: "55%" }} />
                  </div>
                </div>
              </Card>
            </BounceCard>
          ) : (
            <section className={styles.formSection} style={{ gap: '12px' }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: '#111111', margin: '0 0 4px' }}>
                Gợi ý của TripWise AI
              </h3>
              
              <div className={styles.suggestionsList}>
                {/* Suggestion 1 */}
                <div className={styles.suggestionCard}>
                  <div className={styles.sugHeader}>
                    <span className={styles.sugTitle}>🗺️ Giảm mật độ lịch trình</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSuggestionFlags((current) => ({
                          ...current,
                          density: !current.density,
                        }))
                      }
                      className={`${styles.sugBtn} ${suggestionFlags.density ? styles.sugBtnActive : ''}`}
                    >
                      {suggestionFlags.density ? 'Đã áp dụng ✓' : 'Áp dụng'}
                    </button>
                  </div>
                  <p className={styles.sugDesc}>
                    Với phong cách chill, nên giữ 3–4 điểm mỗi ngày để không quá mệt mỏi khi di chuyển.
                  </p>
                </div>

                {/* Suggestion 2 */}
                <div className={styles.suggestionCard}>
                  <div className={styles.sugHeader}>
                    <span className={styles.sugTitle}>☀️ Ưu tiên biển buổi sáng</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSuggestionFlags((current) => ({
                          ...current,
                          outdoor: !current.outdoor,
                        }))
                      }
                      className={`${styles.sugBtn} ${suggestionFlags.outdoor ? styles.sugBtnActive : ''}`}
                    >
                      {suggestionFlags.outdoor ? 'Đã áp dụng ✓' : 'Áp dụng'}
                    </button>
                  </div>
                  <p className={styles.sugDesc}>
                    Biển Nha Trang nắng đẹp hơn, nước trong và ít đông hơn vào đầu ngày.
                  </p>
                </div>

                {/* Suggestion 3 */}
                <div className={styles.suggestionCard}>
                  <div className={styles.sugHeader}>
                    <span className={styles.sugTitle}>🦀 Thêm bữa hải sản buổi tối</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSuggestionFlags((current) => ({
                          ...current,
                          seafood: !current.seafood,
                        }))
                      }
                      className={`${styles.sugBtn} ${suggestionFlags.seafood ? styles.sugBtnActive : ''}`}
                    >
                      {suggestionFlags.seafood ? 'Đã áp dụng ✓' : 'Áp dụng'}
                    </button>
                  </div>
                  <p className={styles.sugDesc}>
                    Các quán dọc bờ kè Phạm Văn Đồng có hải sản tươi rói ngon nhất vào buổi tối.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </AppContent>
  );
}
