"use client";

import Link from "next/link";
import { useState } from "react";
import { BounceCard, FilmGrainOverlay, KineticTitle } from "@/components/motion";
import styles from "./page.module.css";

const quickSuggestions = [
  "Nha Trang 3N2Đ, thích biển",
  "Đà Lạt 2 ngày, cafe chill",
  "Đà Nẵng cuối tuần, hải sản",
] as const;

const previewStops = [
  { time: "08:00", title: "Tháp Bà Ponagar", location: "Vĩnh Phước, Nha Trang", index: 1, active: false },
  { time: "10:30", title: "Bãi biển Nha Trang", location: "Trần Phú, Nha Trang", index: 2, active: true },
  { time: "12:00", title: "Ăn hải sản", location: "Phạm Văn Đồng, Nha Trang", index: 3, active: false },
  { time: "15:00", title: "Chợ Đầm", location: "Vạn Thạnh, Nha Trang", index: 4, active: false },
] as const;

const features = [
  {
    icon: "itinerary",
    badge: "Thời gian",
    title: "Itinerary theo ngày",
    description: "Lịch trình rõ ràng theo buổi, dễ chỉnh và dễ theo dõi.",
    tone: "cyan",
  },
  {
    icon: "route",
    badge: "Bản đồ",
    title: "Bản đồ + route",
    description: "Marker, tuyến đường và thời gian di chuyển hiển thị trực quan.",
    tone: "lime",
  },
  {
    icon: "weather",
    badge: "Thời tiết",
    title: "Weather-aware",
    description: "Gợi ý đổi hoạt động nếu thời tiết không thuận lợi.",
    tone: "red",
  },
  {
    icon: "budget",
    badge: "Ngân sách",
    title: "Budget-friendly",
    description: "Ước tính chi phí và cảnh báo khi vượt ngân sách.",
    tone: "yellow",
  },
  {
    icon: "save",
    badge: "Tích hợp",
    title: "Save & reuse",
    description: "Lưu trip, mở lại, chỉnh sửa hoặc tái dùng cho lần sau.",
    tone: "orange",
  },
] as const;

const journeySteps = [
  {
    step: "01",
    title: "Nhập nhu cầu",
    description: "Gõ tự nhiên như đang nhắn cho một người bạn.",
  },
  {
    step: "02",
    title: "AI hiểu sở thích",
    description: "TripWise phân tích ngày đi, ngân sách, phong cách và món ăn bạn thích.",
  },
  {
    step: "03",
    title: "Chọn địa điểm thật",
    description: "Hệ thống ưu tiên địa điểm có thể đưa vào lịch trình thực tế.",
  },
  {
    step: "04",
    title: "Vẽ route trên bản đồ",
    description: "Route và thời gian di chuyển được hiển thị trực quan.",
  },
] as const;

const destinations = [
  {
    name: "Nha Trang",
    location: "Khánh Hòa",
    tags: ["bien", "hai san", "check-in"],
    rating: "4.8",
  },
  {
    name: "Da Lat",
    location: "Lâm Đồng",
    tags: ["cafe", "chill", "săn mây"],
    rating: "4.7",
  },
  {
    name: "Da Nang",
    location: "Miền Trung",
    tags: ["bien", "food", "weekend"],
    rating: "4.8",
  },
  {
    name: "Hoi An",
    location: "Quảng Nam",
    tags: ["phố cổ", "văn hóa", "ảnh đẹp"],
    rating: "4.6",
  },
  {
    name: "Phu Quoc",
    location: "Kiên Giang",
    tags: ["đảo", "resort", "hoàng hôn"],
    rating: "4.9",
  },
  {
    name: "Ha Noi",
    location: "Thủ đô",
    tags: ["văn hóa", "phố cổ", "ẩm thực"],
    rating: "4.7",
  },
] as const;

const showcaseDays = [
  {
    day: "Day 1",
    label: "Khởi hành",
    items: ["Check-in khách sạn", "Tháp Bà Ponagar", "Bãi biển Trần Phú"],
  },
  {
    day: "Day 2",
    label: "Khám phá",
    items: ["Tour du ngoạn đảo Nha Trang", "Thưởng thức hải sản", "Cafe biển Sunset chill"],
  },
  {
    day: "Day 3",
    label: "Mua sắm & về",
    items: ["Chợ Đầm", "Mua đặc sản", "Check-out rời Nha Trang"],
  },
] as const;

export default function HomePage() {
  const [prompt, setPrompt] = useState("");

  return (
    <main className={styles.page}>
      <FilmGrainOverlay />

      <header className={styles.header}>
        <div className={`${styles.headerInner} page-shell`}>
          <Link className={styles.brand} href="/" aria-label="TripWise home">
            <i className={`material-symbols-outlined ${styles.logoIcon}`} aria-hidden="true">
              explore
            </i>
            <span className={`${styles.brandName} font-display`}>TripWise</span>
          </Link>

          <nav className={styles.nav} aria-label="Primary navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#destinations">Destinations</a>
          </nav>

          <div className={styles.headerActions}>
            <Link className={`${styles.headerButton} ${styles.headerButtonGhost}`} href="/login">
              Sign In
            </Link>
            <Link className={`${styles.headerButton} ${styles.headerButtonPrimary}`} href="/register">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.heroSection}>
        <div className={`${styles.hero} page-shell`}>
          <div className={styles.heroCopy}>
            <span className={styles.heroBadge}>AI-Powered Travel Planner</span>

            <KineticTitle
              text="AI lập lịch trình. Bản đồ dẫn đường. Bạn chỉ việc đi."
              size="hero"
              variant="pop"
              tag="h1"
              highlightWords={["AI", "Bản", "đồ"]}
              className={styles.heroTitle}
            />

            <p className={styles.heroDescription}>
              Nhập điểm đến, thời gian, ngân sách và sở thích. TripWise tạo lịch trình chi tiết
              theo từng ngày, gợi ý địa điểm thật, kèm tuyến đường di chuyển trực quan.
            </p>

            <div className={styles.promptCard}>
              <label className={styles.promptLabel} htmlFor="landing-prompt">
                Bạn muốn đi đâu du lịch?
              </label>
              <textarea
                id="landing-prompt"
                className={styles.promptInput}
                placeholder="Ví dụ: Nha Trang 3 ngày 2 đêm, đi cùng bạn bè, thích biển, hải sản, đi tiết kiệm..."
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
              />

              <div className={styles.suggestionRow}>
                <span className={styles.suggestionLabel}>Gợi ý nhanh:</span>
                <div className={styles.suggestionList}>
                  {quickSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      className={styles.suggestionChip}
                      type="button"
                      onClick={() => setPrompt(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.promptActions}>
                <Link className={`${styles.ctaButton} ${styles.ctaPrimary}`} href="/planner">
                  Tạo lịch trình ngay
                </Link>
                <a className={`${styles.ctaButton} ${styles.ctaSecondary}`} href="#demo">
                  Xem preview
                </a>
              </div>

              <div className={styles.promptMeta}>
                <span>AI tạo lịch trình trong 10-20 giây</span>
                <span>Dùng địa điểm thật + route trực quan</span>
              </div>
            </div>
          </div>

          <div className={styles.previewPanel} id="demo">
            <BounceCard>
              <div className={styles.previewCard}>
                <div className={styles.previewHeader}>
                  <p className={styles.previewEyebrow}>TripWise Cockpit Live Preview</p>
                  <p className={styles.previewSubtitle}>Lộ trình di chuyển ngày 1</p>
                </div>

                <div className={styles.previewBody}>
                  <div className={styles.previewStats}>
                    <span>12.4 km</span>
                    <span>4 stops</span>
                    <span>3N2Đ</span>
                    <span>Budget vừa phải</span>
                  </div>

                  <div className={styles.previewGrid}>
                    <div className={styles.timelinePanel}>
                      {previewStops.map((stop) => (
                        <article
                          className={`${styles.stopCard} ${stop.active ? styles.stopCardActive : ""}`}
                          key={stop.title}
                        >
                          <span className={styles.stopIndex}>{stop.index}</span>
                          <div className={styles.stopContent}>
                            <h3>{stop.title}</h3>
                            <span className={styles.stopTime}>{stop.time}</span>
                            <p>{stop.location}</p>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className={styles.mapPanel}>
                      <div className={styles.mapCanvas}>
                        <div className={styles.mapRiver} />
                        <div className={styles.mapRoadOne} />
                        <div className={styles.mapRoadTwo} />
                        <svg className={styles.routeSvg} viewBox="0 0 340 260" aria-hidden="true">
                          <path
                            className={styles.routeOutline}
                            d="M72 190 C105 138 138 160 160 112 C188 50 238 72 272 34"
                          />
                          <path
                            className={styles.routeHalo}
                            d="M72 190 C105 138 138 160 160 112 C188 50 238 72 272 34"
                          />
                          <path
                            className={styles.routeLine}
                            d="M72 190 C105 138 138 160 160 112 C188 50 238 72 272 34"
                          />
                        </svg>
                        <span className={`${styles.mapPin} ${styles.mapPinOne}`}>1</span>
                        <span className={`${styles.mapPin} ${styles.mapPinTwo}`}>2</span>
                        <span className={`${styles.mapPin} ${styles.mapPinThree}`}>3</span>
                        <span className={`${styles.mapPin} ${styles.mapPinFour}`}>4</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BounceCard>
          </div>
        </div>
      </section>

      <section className={styles.sectionWarm} id="features">
          <div className={`${styles.sectionInner} page-shell`}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionBadge}>TÍNH NĂNG</span>
            <h2 className={`${styles.sectionTitle} font-display`}>TripWise giúp chuyến đi bớt rối hơn</h2>
            <p className={styles.sectionDescription}>
              Không còn phải mở 10 tab để tự ghép lịch trình, bản đồ, thời tiết và chi
              phí.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {features.map((feature, index) => (
              <BounceCard key={feature.title} delay={index * 80}>
                <article className={styles.featureCard} data-tone={feature.tone}>
                  <span className={styles.featurePill}>{feature.badge}</span>
                  <i
                    className={styles.featureIcon}
                    data-icon={feature.icon}
                    aria-hidden="true"
                  />
                  <h3 className={`${styles.featureTitle} font-display`}>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              </BounceCard>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionCanvas} id="how-it-works">
        <div className={`${styles.sectionInner} page-shell`}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionBadge}>QUY TRÌNH</span>
            <h2 className={`${styles.sectionTitle} font-display`}>Cách TripWise hoạt động</h2>
            <p className={styles.sectionDescription}>
              Lên lịch trình sâu mà không cần tự ghép route và thời gian.
            </p>
          </div>

          <div className={styles.stepsGrid}>
            {journeySteps.map((step, index) => (
              <BounceCard key={step.step} delay={index * 100}>
                <article className={styles.stepCard}>
                  <span className={`${styles.stepNumber} font-display`}>{step.step}</span>
                  <h3 className={`${styles.stepTitle} font-display`}>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              </BounceCard>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionWarm} id="destinations">
        <div className={`${styles.sectionInner} page-shell`}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionBadge}>KHÁM PHÁ</span>
            <h2 className={`${styles.sectionTitle} font-display`}>Điểm đến phổ biến</h2>
            <p className={styles.sectionDescription}>
              Khởi động nhanh với các điểm đến quen thuộc cho lịch trình ngắn ngày.
            </p>
          </div>

          <div className={styles.destinationGrid}>
            {destinations.map((destination, index) => (
              <BounceCard key={destination.name} delay={index * 70}>
                <article className={styles.destinationCard}>
                  <div className={styles.destinationArt}>
                    <span className={styles.destinationStamp}>TripWise</span>
                    <span className={styles.destinationScene}>{destination.name.slice(0, 1)}</span>
                  </div>
                  <div className={styles.destinationBody}>
                    <div className={styles.destinationMeta}>
                      <span>{destination.location}</span>
                      <strong>{destination.rating}</strong>
                    </div>
                    <h3 className={`${styles.destinationName} font-display`}>{destination.name}</h3>
                    <div className={styles.destinationTags}>
                      {destination.tags.map((tag) => (
                        <span className={styles.destinationTag} key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Link className={styles.destinationLink} href="/planner">
                      Tạo trip
                    </Link>
                  </div>
                </article>
              </BounceCard>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionCanvas}>
        <div className={`${styles.showcase} page-shell`}>
          <div className={styles.showcaseCopy}>
            <span className={styles.sectionBadge}>THÔNG MINH</span>
            <h2 className={`${styles.sectionTitle} font-display`}>AI thấu hiểu sở thích của bạn</h2>
            <p className={styles.sectionDescription}>
              Không chỉ tạo địa điểm ngẫu nhiên, AI sắp xếp theo mạch thời gian và phong cách du
              lịch thực tế.
            </p>
            <div className={styles.reasoningList}>
              <span>Tối ưu di chuyển</span>
              <span>Phù hợp budget</span>
              <span>Ưu tiên biển buổi sáng</span>
              <span>Ăn hải sản buổi tối</span>
            </div>
          </div>

          <div className={styles.showcasePanel}>
            {showcaseDays.map((day) => (
              <article className={styles.dayCard} key={day.day}>
                <div className={styles.dayHeader}>
                  <span className={styles.dayBadge}>{day.day}</span>
                  <strong>{day.label}</strong>
                </div>
                <ul>
                  {day.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={`${styles.ctaCard} page-shell`}>
          <span className={styles.ctaBadge}>Adventure is calling</span>
          <h2 className={`${styles.ctaTitle} font-display`}>Sẵn sàng cho chuyến đi tiếp theo?</h2>
          <p>Nhập một câu mô tả. TripWise biến nó thành lịch trình có thể đi ngay.</p>
          <div className={styles.ctaActions}>
            <Link className={`${styles.ctaButton} ${styles.ctaDanger}`} href="/planner">
              Bắt đầu lập kế hoạch
            </Link>
            <Link className={`${styles.ctaButton} ${styles.ctaSecondary}`} href="/login">
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.footerInner} page-shell`}>
          <div className={styles.footerBrandBlock}>
            <span className={`${styles.footerBrand} font-display`}>TripWise</span>
            <p>AI Smart Travel Planner với phong cách retro cartoon travel.</p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/login">Sign In</Link>
            <Link href="/register">Get Started</Link>
            <Link href="/planner">Planner</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
