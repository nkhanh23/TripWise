"use client";

import { startTransition, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./TripPlannerPage.module.css";
import { Button, Card, ErrorMessage, Loading } from "@/components/ui";
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

const PREVIEW_ITINERARY: Record<
  PreviewDay,
  Array<{ time: string; title: string; description: string }>
> = {
  1: [
    {
      time: "08:00",
      title: "Tran Phu Beach",
      description: "Mo dau bang buoi sang ngoai troi, de chup hinh va di dao."
    },
    {
      time: "11:30",
      title: "Bua trua hai san",
      description: "Can giua budget vua phai va mon dia phuong de tiep nang luong."
    },
    {
      time: "15:00",
      title: "Thap Ba Ponagar",
      description: "Them mot diem van hoa de itinerary khong bi mot mau."
    }
  ],
  2: [
    {
      time: "07:30",
      title: "Dao - bien buoi sang",
      description: "Khoang thoi gian mat me nhat cho style chill va nature."
    },
    {
      time: "13:30",
      title: "Cafe truoc buoi chieu",
      description: "Block nghi nhe de mat do ngay thu hai khong qua day."
    },
    {
      time: "18:30",
      title: "Hai san buoi toi",
      description: "Foodie block duoc uu tien neu ban chon nhom hai san."
    }
  ],
  3: [
    {
      time: "08:30",
      title: "Cho Dam / mua qua",
      description: "Block nhe cho ngay cuoi, phu hop truoc luc roi thanh pho."
    },
    {
      time: "11:00",
      title: "Bua trua ket chuyen",
      description: "Giu lich thong thoang de de check-out va di chuyen."
    }
  ]
};

const GENERATION_STEPS = [
  "Dang phan tich yeu cau tu prompt va cac field form.",
  "Dang doi chieu voi dia diem that trong he thong.",
  "Dang sap lich theo ngay va tinh profile di chuyen.",
  "Dang tao goi y mo ta ngan truoc khi sang result page."
] as const;

function formatDateForDisplay(value: string) {
  if (!value) {
    return "Chua chon";
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
    return "Phien dang nhap da het han. Ban hay dang nhap lai truoc khi tao trip.";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "TripWise chua the tao lich trinh luc nay. Vui long thu lai sau.";
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
  const [previewDay, setPreviewDay] = useState<PreviewDay>(1);
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
      setValidationError("Ban can nhap diem den truoc khi tao trip.");
      return;
    }

    if (!totalDays || totalDays < 1) {
      setValidationError("Khoang ngay khong hop le.");
      return;
    }

    if (totalDays > 3) {
      setValidationError("MVP hien chi ho tro toi da 3 ngay.");
      return;
    }

    if (!prompt.trim()) {
      setValidationError("Ban can mo ta ngan gon nhu cau chuyen di.");
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

  const previewItems = PREVIEW_ITINERARY[previewDay];

  return (
    <main className={styles.page}>
      <FilmGrainOverlay />
      <div className={styles.shell}>
        <section className={styles.hero}>
          <BounceCard delay={100}>
            <Card className={styles.heroCard} elevated>
              <div className={styles.heroStack}>
              <div className={styles.stickerRow}>
                <span className={styles.sticker}>Phase 12.5</span>
                <span className={styles.stickerAlt}>Trip Request Form</span>
              </div>

              <div>
                <KineticTitle
                  tag="h1"
                  text="Nhap trip brief, de TripWise lo phan con lai."
                  size="section"
                  variant="pop"
                  shadowVariant="black"
                  className={styles.headline}
                />
              </div>

              <p className={styles.description}>
                Man nay tap trung vao form nhap yeu cau chuyen di theo dung spec
                planner. UI van bam mood mock React archive, con request thi duoc
                gom thanh mot prompt de goi backend hien tai.
              </p>

              <div className={styles.microStats}>
                <div className={styles.microStat}>
                  <div className={styles.microLabel}>Mode</div>
                  <div className={styles.microValue}>Planner form</div>
                </div>
                <div className={styles.microStat}>
                  <div className={styles.microLabel}>Auth</div>
                  <div className={styles.microValue}>Dang nhap bat buoc</div>
                </div>
                  <div className={styles.microStat}>
                    <div className={styles.microLabel}>Result</div>
                    <div className={styles.microValue}>Trang rieng /trips/:id</div>
                  </div>
              </div>
            </div>
          </Card>
          </BounceCard>

          <BounceCard delay={200}>
          <Card className={styles.ticket} elevated>
            <div className={styles.ticketBody}>
              <div>
                <div className={styles.ticketLabel}>Ticket snapshot</div>
                <h2 className={styles.ticketTitle}>Planner cockpit</h2>
              </div>

              <div className={styles.ticketMeta}>
                <div className={styles.ticketMetaRow}>
                  <span className={styles.ticketLabel}>Destination</span>
                  <span>{destination || "Chua nhap"}</span>
                </div>
                <div className={styles.ticketMetaRow}>
                  <span className={styles.ticketLabel}>Duration</span>
                  <span>
                    {totalDays ? `${totalDays} ngay ${Math.max(totalDays - 1, 0)} dem` : "Can chon ngay"}
                  </span>
                </div>
                <div className={styles.ticketMetaRow}>
                  <span className={styles.ticketLabel}>Travelers</span>
                  <span>{travelers} nguoi</span>
                </div>
                <div className={styles.ticketMetaRow}>
                  <span className={styles.ticketLabel}>Transport</span>
                  <span>{transport}</span>
                </div>
              </div>

              <p className={styles.snapshotNote}>
                Sau khi generate xong, TripWise se dua ban sang result page rieng
                de xem timeline day du.
              </p>
            </div>
          </Card>
          </BounceCard>
        </section>

        <section className={styles.contentGrid}>
          <BounceCard delay={300}>
          <Card
            className={styles.formCard}
            elevated
            title="Thong tin chuyen di"
            description="Nhap cac rang buoc quan trong. Backend hien tai nhan mot request string, nen form nay se hop nhat thanh brief tu nhien truoc khi submit."
          >
            <form className={styles.form} onSubmit={handleSubmit}>
              <section className={styles.section}>
                <div className={styles.sectionTitleRow}>
                  <h3 className={styles.sectionTitle}>1. Diem den va thoi gian</h3>
                  <span className={styles.sectionHint}>MVP toi da 3 ngay</span>
                </div>

                <div className={styles.gridTwo}>
                  <label className={styles.label}>
                    <span>Diem den</span>
                    <input
                      className={styles.inputLike}
                      onChange={(event) => setDestination(event.target.value)}
                      placeholder="Vi du: Nha Trang"
                      value={destination}
                    />
                  </label>

                  <label className={styles.label}>
                    <span>So nguoi di</span>
                    <div className={styles.stepper}>
                      <button
                        className={styles.stepperButton}
                        onClick={() => setTravelers((current) => Math.max(1, current - 1))}
                        type="button"
                      >
                        -
                      </button>
                      <span className={styles.stepperValue}>{travelers}</span>
                      <button
                        className={styles.stepperButton}
                        onClick={() => setTravelers((current) => Math.min(10, current + 1))}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </label>
                </div>

                <div className={styles.gridTwo}>
                  <label className={styles.label}>
                    <span>Ngay bat dau</span>
                    <input
                      className={styles.inputLike}
                      onChange={(event) => setStartDate(event.target.value)}
                      type="date"
                      value={startDate}
                    />
                  </label>

                  <label className={styles.label}>
                    <span>Ngay ket thuc</span>
                    <input
                      className={styles.inputLike}
                      onChange={(event) => setEndDate(event.target.value)}
                      type="date"
                      value={endDate}
                    />
                  </label>
                </div>

                <div className={styles.warning}>
                  TripWise hien dang dung flow MVP 1-3 ngay. Neu ban chon qua 3
                  ngay, form se chan submit thay vi tu dong doan nghia.
                </div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionTitleRow}>
                  <h3 className={styles.sectionTitle}>2. Ngan sach va phong cach</h3>
                  <span className={styles.sectionHint}>Dung de dieu chinh scoring va mat do itinerary</span>
                </div>

                <div className={styles.budgetRow}>
                  {BUDGET_OPTIONS.map((option) => (
                    <button
                      className={`${styles.budgetButton} ${budget === option.key ? styles.budgetActive : ""}`}
                      key={option.key}
                      onClick={() => setBudget(option.key)}
                      type="button"
                    >
                      <span className={styles.budgetName}>{option.key}</span>
                      <span className={styles.budgetBody}>{option.description}</span>
                    </button>
                  ))}
                </div>

                <div className={styles.chipRow}>
                  {TRAVEL_STYLES.map((style) => {
                    const active = travelStyles.includes(style);

                    return (
                      <button
                        className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                        key={style}
                        onClick={() => setTravelStyles((current) => toggleValue(current, style))}
                        type="button"
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionTitleRow}>
                  <h3 className={styles.sectionTitle}>3. Di chuyen va an uong</h3>
                  <span className={styles.sectionHint}>O phase nay chua co route map, nhung profile van duoc dua vao brief</span>
                </div>

                <div className={styles.gridTwo}>
                  <label className={styles.label}>
                    <span>Phuong tien chinh</span>
                    <select
                      className={styles.selectLike}
                      onChange={(event) => setTransport(event.target.value as TransportMode)}
                      value={transport}
                    >
                      {TRANSPORT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className={styles.label}>
                    <span>So thich an uong</span>
                    <div className={styles.chipRow}>
                      {FOOD_PREFERENCES.map((food) => {
                        const active = foodPreferences.includes(food);

                        return (
                          <button
                            className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                            key={food}
                            onClick={() =>
                              setFoodPreferences((current) => toggleValue(current, food))
                            }
                            type="button"
                          >
                            {food}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {transport === "Di bo" ? (
                  <div className={styles.warning}>
                    Neu lich trinh co diem xa nhau, profile di bo co the lam thoi
                    gian di chuyen tang manh. Day la canh bao UX theo spec, chua
                    phai route verify that.
                  </div>
                ) : null}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionTitleRow}>
                  <h3 className={styles.sectionTitle}>4. Prompt tu nhien</h3>
                  <span className={styles.sectionHint}>Backend hien tai nhan field `request`, nen textarea nay la phan quan trong nhat</span>
                </div>

                <label className={styles.label}>
                  <span>Mo ta chuyen di bang loi cua ban</span>
                  <textarea
                    className={styles.textareaLike}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Vi du: Nha Trang 3 ngay 2 dem, thich bien, hai san, check-in dep, ngan sach vua phai..."
                    value={prompt}
                  />
                </label>

                <div className={styles.chipRow}>
                  {EXAMPLE_PROMPTS.map((example) => (
                    <button
                      className={styles.outlineButton}
                      key={example}
                      onClick={() => setPrompt(example)}
                      type="button"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionTitleRow}>
                  <h3 className={styles.sectionTitle}>5. AI suggestion hooks</h3>
                  <span className={styles.sectionHint}>Chi ap dung vao brief string, khong co business logic phia client</span>
                </div>

                <div className={styles.chipRow}>
                  {[
                    ["density", "Giu lich thoang hon"],
                    ["outdoor", "Uu tien ngoai troi buoi sang"],
                    ["seafood", "Them bua hai san buoi toi"]
                  ].map(([key, label]) => {
                    const flagKey = key as keyof SuggestionFlags;
                    const active = suggestionFlags[flagKey];

                    return (
                      <button
                        className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                        key={key}
                        onClick={() =>
                          setSuggestionFlags((current) => ({
                            ...current,
                            [flagKey]: !current[flagKey]
                          }))
                        }
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {validationError ? (
                <ErrorMessage
                  message={validationError}
                  title="Form chua san sang de gui"
                  actions={
                    <Button
                      fullWidth={false}
                      onClick={() => setValidationError(null)}
                      variant="secondary"
                    >
                      Dong nhac nho
                    </Button>
                  }
                />
              ) : null}

              {submitError ? (
                <ErrorMessage
                  message={submitError}
                  title="Khong the tao lich trinh"
                  actions={
                    <>
                      <Button
                        fullWidth={false}
                        onClick={() => setSubmitError(null)}
                        variant="secondary"
                      >
                        Kiem tra lai brief
                      </Button>
                      <Link className={styles.outlineButton} href="/login">
                        Dang nhap lai
                      </Link>
                    </>
                  }
                />
              ) : null}

              <div className={styles.actions}>
                <Button disabled={!canSubmit || isSubmitting} type="submit">
                  {isSubmitting ? "Dang tao va mo result..." : "Tao lich trinh"}
                </Button>
                <Button
                  fullWidth={false}
                  onClick={resetForm}
                  type="button"
                  variant="secondary"
                >
                  Xoa form
                </Button>
                <Link className={styles.outlineButton} href="/login">
                  Dang nhap / doi session
                </Link>
                <span className={styles.ghostButton}>Result page se mo sau khi generate thanh cong</span>
              </div>
            </form>
          </Card>
          </BounceCard>

          <div className={styles.sideStack}>
            <BounceCard delay={400}>
            <Card
              className={styles.sideCard}
              title="AI da hieu"
              description="Tom tat cac field dang co tren form truoc khi goi backend."
            >
              <div className={styles.summaryList}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryKey}>Destination</span>
                  <span className={styles.summaryValue}>{destination || "Chua nhap"}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryKey}>Time window</span>
                  <span className={styles.summaryValue}>
                    {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryKey}>Styles</span>
                  <span className={styles.summaryValue}>
                    {travelStyles.length > 0 ? travelStyles.join(", ") : "Chua chon"}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryKey}>Generated request</span>
                  <span className={styles.summaryValue}>{generatedRequest}</span>
                </div>
              </div>
            </Card>
            </BounceCard>

            <BounceCard delay={500}>
            <Card
              className={styles.sideCard}
              title="Goi y cua TripWise AI"
              description="Nhung de xuat nay chi thay doi cach minh tao request string."
            >
              <div className={styles.suggestionList}>
                <div className={styles.suggestionItem}>
                  <div className={styles.suggestionTitle}>
                    <span>Giam mat do moi ngay</span>
                    <button
                      className={`${styles.miniButton} ${
                        suggestionFlags.density ? styles.miniButtonActive : ""
                      }`}
                      onClick={() =>
                        setSuggestionFlags((current) => ({
                          ...current,
                          density: !current.density
                        }))
                      }
                      type="button"
                    >
                      {suggestionFlags.density ? "Da ap dung" : "Ap dung"}
                    </button>
                  </div>
                  <p className={styles.suggestionBody}>
                    Phu hop khi ban chon Chill, giup request huong toi 3-4 diem
                    moi ngay thay vi nhieu block sat nhau.
                  </p>
                </div>

                <div className={styles.suggestionItem}>
                  <div className={styles.suggestionTitle}>
                    <span>Uu tien diem ngoai troi buoi sang</span>
                    <button
                      className={`${styles.miniButton} ${
                        suggestionFlags.outdoor ? styles.miniButtonActive : ""
                      }`}
                      onClick={() =>
                        setSuggestionFlags((current) => ({
                          ...current,
                          outdoor: !current.outdoor
                        }))
                      }
                      type="button"
                    >
                      {suggestionFlags.outdoor ? "Da ap dung" : "Ap dung"}
                    </button>
                  </div>
                  <p className={styles.suggestionBody}>
                    Dung cho cac diem bien, dao, check-in ngoai troi trong khung
                    sang som.
                  </p>
                </div>

                <div className={styles.suggestionItem}>
                  <div className={styles.suggestionTitle}>
                    <span>Them block hai san buoi toi</span>
                    <button
                      className={`${styles.miniButton} ${
                        suggestionFlags.seafood ? styles.miniButtonActive : ""
                      }`}
                      onClick={() =>
                        setSuggestionFlags((current) => ({
                          ...current,
                          seafood: !current.seafood
                        }))
                      }
                      type="button"
                    >
                      {suggestionFlags.seafood ? "Da ap dung" : "Ap dung"}
                    </button>
                  </div>
                  <p className={styles.suggestionBody}>
                    Chi co tac dung dieu chinh brief neu ban muon uu tien nhom
                    foodie va hai san dia phuong.
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className={styles.sideCard}
              title="Preview itinerary"
              description="Preview nay la shell tham chieu tu mock, chua phai man result thuc te."
            >
              <div className={styles.dayTabs}>
                {[1, 2, 3].map((day) => (
                  <button
                    className={`${styles.dayTab} ${previewDay === day ? styles.dayTabActive : ""}`}
                    key={day}
                    onClick={() => setPreviewDay(day as PreviewDay)}
                    type="button"
                  >
                    Day {day}
                  </button>
                ))}
              </div>

              <div className={styles.previewList}>
                {previewItems.map((item) => (
                  <div className={styles.previewItem} key={`${previewDay}-${item.time}-${item.title}`}>
                    <span className={styles.previewTime}>{item.time}</span>
                    <span className={styles.previewTitle}>{item.title}</span>
                    <p className={styles.previewBody}>{item.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              className={styles.sideCard}
              title="Generate status"
              description="Khi submit that, planner se handoff sang man itinerary result cua Phase 12.6."
            >
              {isSubmitting ? (
                <div className={styles.statusCard}>
                  <Loading label="TripWise dang tao draft itinerary..." />

                  <div className={styles.statusSteps}>
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
              ) : (
                <p className={styles.emptyState}>
                  Chua co request generate nao dang chay. Sau khi dang nhap va
                  submit form, TripWise se mo sang result page cua trip vua tao.
                </p>
              )}
            </Card>
            </BounceCard>
          </div>
        </section>
      </div>
    </main>
  );
}
