import Link from "next/link";
import { Button } from "@/components/ui";
import { KineticTitle, BounceCard, FilmGrainOverlay } from "@/components/motion";
import styles from "./page.module.css";

const quickPrompts = [
  "Nha Trang 3 ngày 2 đêm, thích biển và hải sản",
  "Đà Lạt 2 ngày cuối tuần, nhiều quán cafe chill",
  "Đà Nẵng 3 ngày, đi cùng gia đình và ưu tiên di chuyển gọn"
] as const;

const previewStops = [
  {
    time: "08:00",
    title: "Tháp Bà Ponagar",
    note: "Khởi động nhẹ, nhiều góc ảnh đẹp"
  },
  {
    time: "10:30",
    title: "Bãi biển Trần Phú",
    note: "Tắm biển và nghỉ giữa hành trình"
  },
  {
    time: "12:15",
    title: "Ăn hải sản bờ kè",
    note: "Gợi ý theo ngân sách vừa phải"
  },
  {
    time: "15:00",
    title: "Chợ Đầm",
    note: "Mua quà và kết thúc tuyến trong trung tâm"
  }
] as const;

const featureCards = [
  {
    badge: "Itinerary",
    title: "Lịch trình theo ngày dễ theo dõi",
    description:
      "Từng buổi sáng, trưa, chiều được sắp thứ tự rõ ràng để bạn nhìn lịch trình là biết nên đi đâu tiếp."
  },
  {
    badge: "Route",
    title: "Bản đồ và tuyến đường trực quan",
    description:
      "Điểm dừng, khoảng cách và hành trình được hiển thị cùng nhau để hạn chế vòng vèo và giảm thời gian di chuyển."
  },
  {
    badge: "Budget",
    title: "Gợi ý phù hợp ngân sách",
    description:
      "TripWise ưu tiên phương án thực tế, cân bằng giữa trải nghiệm, chi phí và nhịp độ chuyến đi."
  }
] as const;

const journeySteps = [
  {
    step: "01",
    title: "Nhập nhu cầu",
    description: "Mô tả điểm đến, số ngày, sở thích và ngân sách bằng ngôn ngữ tự nhiên."
  },
  {
    step: "02",
    title: "AI hiểu ngữ cảnh",
    description: "Hệ thống diễn giải ý định và chuẩn hóa thành đầu vào cho kế hoạch chuyến đi."
  },
  {
    step: "03",
    title: "Ghép lịch trình thực tế",
    description: "Các điểm dừng được sắp theo ngày, theo cụm di chuyển và mức ưu tiên phù hợp."
  },
  {
    step: "04",
    title: "Sẵn sàng lên đường",
    description: "Bạn nhận một itinerary có thể mở tiếp ở planner để chỉnh sửa và hoàn thiện."
  }
] as const;

const destinations = [
  {
    name: "Nha Trang",
    location: "Khánh Hòa",
    tags: ["biển", "hải sản", "3N2Đ"]
  },
  {
    name: "Đà Lạt",
    location: "Lâm Đồng",
    tags: ["cafe", "chill", "cuối tuần"]
  },
  {
    name: "Hội An",
    location: "Quảng Nam",
    tags: ["phố cổ", "ảnh đẹp", "ẩm thực"]
  }
] as const;

const showcaseDays = [
  {
    day: "Day 1",
    label: "Khởi hành",
    items: ["Check-in khách sạn", "Tháp Bà Ponagar", "Biển Trần Phú chiều muộn"]
  },
  {
    day: "Day 2",
    label: "Khám phá",
    items: ["Đảo gần bờ hoặc điểm ngắm biển", "Bữa trưa hải sản", "Cafe hoàng hôn"]
  },
  {
    day: "Day 3",
    label: "Kết thúc",
    items: ["Chợ Đầm", "Mua quà địa phương", "Ra sân bay hoặc ga tàu"]
  }
] as const;

export default function HomePage() {
  return (
    <main className={styles.page}>
      <FilmGrainOverlay />
      <header className={styles.header}>
        <div className={`${styles.headerInner} page-shell`}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark}>TW</span>
            <span className={`${styles.brandName} font-display`}>TripWise</span>
          </Link>

          <nav className={styles.nav}>
            <a href="#features">Tính năng</a>
            <a href="#how-it-works">Cách hoạt động</a>
            <a href="#destinations">Điểm đến</a>
          </nav>

          <div className={styles.headerActions}>
            <Link href="/login">
              <Button variant="ghost">Đăng nhập</Button>
            </Link>
            <Link href="/register">
              <Button>Đăng ký</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.heroSection}>
        <div className={`${styles.hero} page-shell`}>
          <div className={styles.heroCopy}>
            <div className={styles.badgeRow}>
              <span className={styles.badge}>AI Smart Travel Planner</span>
              <span className={styles.badgeAlt}>Mock React migrated to Next.js</span>
            </div>

            <div className={styles.headlineBlock}>
              <p className={styles.eyebrow}>Lập lịch trình nhanh, nhìn được đường đi ngay từ đầu</p>
              <KineticTitle
                tag="h1"
                text="AI lập itinerary. Bản đồ giữ nhịp chuyến đi. Bạn chỉ việc chọn ngày."
                size="hero"
                variant="pop"
                shadowVariant="black"
                className={`${styles.headline} font-display`}
              />
              <p className={styles.description}>
                TripWise biến một câu mô tả ngắn thành kế hoạch du lịch có cấu trúc:
                theo ngày, theo tuyến di chuyển và theo phong cách bạn muốn trải nghiệm.
              </p>
            </div>

            <div className={styles.promptCard}>
              <div className={styles.promptHeader}>
                <span className={styles.promptLabel}>Bạn muốn đi đâu du lịch?</span>
                <span className={styles.promptHint}>Planner thật sẽ xử lý ở phase form và API</span>
              </div>

              <div className={styles.promptBox}>
                Nha Trang 3 ngày 2 đêm, đi cùng bạn bè, thích biển, ăn hải sản, muốn lịch
                trình gọn và không chạy lòng vòng.
              </div>

              <div className={styles.quickPromptGroup}>
                <span className={styles.quickPromptLabel}>Gợi ý nhanh</span>
                <div className={styles.quickPromptList}>
                  {quickPrompts.map((prompt) => (
                    <span className={styles.quickPromptChip} key={prompt}>
                      {prompt}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.ctaRow}>
                <Link href="/planner">
                  <Button size="lg">Tạo lịch trình ngay</Button>
                </Link>
                <Link href="/trips">
                  <Button size="lg" variant="secondary">
                    Xem demo itinerary
                  </Button>
                </Link>
              </div>

              <div className={styles.promptMeta}>
                <span>AI đọc yêu cầu và chuyển thành planner flow ở các phase tiếp theo</span>
                <span>Frontend không gọi Gemini hay map provider trực tiếp tại landing page</span>
              </div>
            </div>
          </div>

          <div className={styles.previewPanel}>
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <div>
                  <p className={styles.previewEyebrow}>TripWise cockpit preview</p>
                  <h2 className={`${styles.previewTitle} font-display`}>Ngày 1 tại Nha Trang</h2>
                </div>
                <span className={styles.previewStamp}>3N2Đ</span>
              </div>

              <div className={styles.previewStats}>
                <span>12.4 km</span>
                <span>4 điểm dừng</span>
                <span>Budget vừa phải</span>
              </div>

              <div className={styles.previewGrid}>
                <div className={styles.timelinePanel}>
                  {previewStops.map((stop, index) => (
                    <article className={styles.stopCard} key={stop.title}>
                      <div className={styles.stopIndex}>{index + 1}</div>
                      <div className={styles.stopContent}>
                        <p className={styles.stopTime}>{stop.time}</p>
                        <h3 className={styles.stopTitle}>{stop.title}</h3>
                        <p className={styles.stopNote}>{stop.note}</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className={styles.mapPanel}>
                  <div className={styles.mapFrame}>
                    <div className={styles.gridPattern} />
                    <div className={styles.routeLine} />
                    <div className={`${styles.pin} ${styles.pinOne}`}>1</div>
                    <div className={`${styles.pin} ${styles.pinTwo}`}>2</div>
                    <div className={`${styles.pin} ${styles.pinThree}`}>3</div>
                    <div className={`${styles.pin} ${styles.pinFour}`}>4</div>
                    <span className={styles.mapLabel}>Map preview</span>
                  </div>
                  <p className={styles.mapNote}>
                    Hero preview giữ đúng tinh thần mock React: timeline bên trái, bản đồ
                    bên phải, ưu tiên đọc nhanh và thấy mạch di chuyển.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sectionWarm} id="features">
        <div className={`${styles.sectionInner} page-shell`}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionBadge}>Tính năng</span>
            <h2 className={`${styles.sectionTitle} font-display`}>
              Landing page này giữ nguyên tinh thần mock giao diện ban đầu
            </h2>
            <p className={styles.sectionDescription}>
              Tông poster retro, thẻ viền đậm, CTA rõ ràng và cấu trúc split-screen được
              chuyển sang Next.js để làm nền cho các màn thật tiếp theo.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {featureCards.map((feature, idx) => (
              <BounceCard key={feature.title} delay={idx * 150}>
                <article className={styles.featureCard}>
                  <span className={styles.featureBadge}>{feature.badge}</span>
                  <h3 className={`${styles.featureTitle} font-display`}>{feature.title}</h3>
                  <p className={styles.featureDescription}>{feature.description}</p>
                </article>
              </BounceCard>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionCanvas} id="how-it-works">
        <div className={`${styles.sectionInner} page-shell`}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionBadge}>Quy trình</span>
            <h2 className={`${styles.sectionTitle} font-display`}>
              Từ một đoạn mô tả ngắn đến itinerary có thể chỉnh tiếp
            </h2>
          </div>

          <div className={styles.stepsGrid}>
            {journeySteps.map((step, idx) => (
              <BounceCard key={step.step} delay={idx * 150}>
                <article className={styles.stepCard}>
                  <div className={`${styles.stepNumber} font-display`}>{step.step}</div>
                  <h3 className={`${styles.stepTitle} font-display`}>{step.title}</h3>
                  <p className={styles.stepDescription}>{step.description}</p>
                </article>
              </BounceCard>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionWarm} id="destinations">
        <div className={`${styles.sectionInner} page-shell`}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionBadge}>Điểm đến</span>
            <h2 className={`${styles.sectionTitle} font-display`}>
              Một vài chuyến đi khởi động nhanh theo đúng mood của mock
            </h2>
          </div>

          <div className={styles.destinationGrid}>
            {destinations.map((destination, idx) => (
              <BounceCard key={destination.name} delay={idx * 150}>
                <article className={styles.destinationCard}>
                  <div className={styles.destinationTop}>
                    <span className={styles.destinationSticker}>{destination.location}</span>
                    <span className={styles.destinationRating}>Phổ biến</span>
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
                </article>
              </BounceCard>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionCanvas}>
        <div className={`${styles.showcase} page-shell`}>
          <div className={styles.showcaseCopy}>
            <span className={styles.sectionBadge}>AI planning showcase</span>
            <h2 className={`${styles.sectionTitle} font-display`}>
              Mock cũ có phần giải thích AI, landing Next.js cũng giữ lại mạch kể chuyện đó
            </h2>
            <p className={styles.sectionDescription}>
              Mục tiêu ở phase này là giữ visual hierarchy và trải nghiệm đọc màn hình đầu:
              người dùng hiểu TripWise làm gì, planner nằm ở đâu và vì sao route preview quan trọng.
            </p>

            <div className={styles.reasoningList}>
              <span className={styles.reasoningChip}>Tối ưu di chuyển</span>
              <span className={styles.reasoningChip}>Ưu tiên sở thích</span>
              <span className={styles.reasoningChip}>Bám ngân sách</span>
              <span className={styles.reasoningChip}>Dễ mở rộng sang dashboard</span>
            </div>
          </div>

          <div className={styles.showcaseDays}>
            {showcaseDays.map((day) => (
              <article className={styles.dayCard} key={day.day}>
                <div className={styles.dayHeader}>
                  <span className={styles.dayBadge}>{day.day}</span>
                  <span className={styles.dayLabel}>{day.label}</span>
                </div>
                <ul className={styles.dayList}>
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
          <h2 className={`${styles.ctaTitle} font-display`}>
            Sẵn sàng biến câu mô tả của bạn thành một kế hoạch đi chơi rõ ràng?
          </h2>
          <p className={styles.ctaDescription}>
            Phase này chỉ migrate landing page sang Next.js, nên CTA sẽ dẫn bạn vào planner
            hiện có thay vì tạo thêm flow mới ngoài scope.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/planner">
              <Button size="lg" variant="danger">
                Bắt đầu lập kế hoạch
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Tạo tài khoản
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.footerInner} page-shell`}>
          <div>
            <p className={`${styles.footerBrand} font-display`}>TripWise</p>
            <p className={styles.footerCopy}>
              AI Smart Travel Planner với giao diện được chuyển từ mock React sang Next.js.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <Link href="/login">Đăng nhập</Link>
            <Link href="/register">Đăng ký</Link>
            <Link href="/planner">Planner</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
