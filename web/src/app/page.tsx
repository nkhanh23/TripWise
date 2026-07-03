import { Button, Card, ErrorMessage, Input, Loading } from "@/components/ui";
import Link from "next/link";
import styles from "./page.module.css";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "NEXT_PUBLIC_API_BASE_URL is not set";

const colorTokens = [
  ["Canvas", "#F7E7C6"],
  ["Surface", "#FFF6DE"],
  ["Panel", "#FFFDF3"],
  ["Ink", "#111111"],
  ["Brand", "#20A7D8"],
  ["Yellow", "#FFD166"],
  ["Lime", "#B8F24A"],
  ["Red", "#E6392E"]
] as const;

const previewStops = [
  ["08:00", "Thap Ba Ponagar"],
  ["10:30", "Bai bien Tran Phu"],
  ["12:00", "Hai san bo ke"],
  ["15:00", "Cho Dam"]
] as const;

export default function HomePage() {
  return (
    <main className={`${styles.main} page-shell`}>
      <section className={styles.hero}>
        <div className={styles.copyColumn}>
          <div className={styles.stickerRow}>
            <span className={styles.sticker}>Phase 12.2</span>
            <span className={styles.stickerAlt}>Next.js UI Foundation</span>
          </div>

          <div>
            <p className={styles.eyebrow}>TripWise Web Cockpit</p>
            <h1 className={`${styles.headline} text-comic-shadow`}>
              Nen mong giao dien da ve dung phong cach mock React.
            </h1>
          </div>

          <p className={styles.description}>
            Phase nay chi dung design system, typography, token va UI primitives.
            Khong lam auth, API client hay business page, nhung preview da duoc
            chinh theo mood poster, ticket va split-screen cua mock archive.
          </p>

          <Card
            elevated
            title="System checkpoint"
            description="Codebase van la Next.js, con visual direction bam mock archive tai web-archive-vite-ui."
          >
            <div className={styles.heroCardContent}>
              <Input
                label="Public API base URL"
                defaultValue={apiBaseUrl}
                hint="Frontend chi doc NEXT_PUBLIC_API_BASE_URL o browser."
                readOnly
              />

              <div className={styles.buttonRow}>
                <Link href="/planner">
                  <Button>Open Planner</Button>
                </Link>
                <Link href="/trips">
                  <Button variant="secondary">Saved Trips</Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/register">
                  <Button variant="danger">Register</Button>
                </Link>
              </div>
            </div>
          </Card>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>CSS strategy</div>
              <div className={styles.metaValue}>Tokens + Modules</div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Fonts</div>
              <div className={styles.metaValue}>Baloo 2 / Be Vietnam Pro</div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Preview shell</div>
              <div className={styles.metaValue}>Split-screen retro</div>
            </div>
          </div>
        </div>

        <Card
          elevated
          className={styles.previewCard}
          title="Preview cockpit"
          description="Poster map ben phai, itinerary ticket ben trai, dung de khoa visual direction truoc cac page nghiep vu."
        >
          <div className={styles.cockpitGrid}>
            <div className={styles.timelineCard}>
              <div className={styles.timelineHeader}>
                <span className={styles.ticketTag}>Day 1</span>
                <span className={styles.ticketMeta}>Nha Trang 3N2D</span>
              </div>

              <div className={styles.stopList}>
                {previewStops.map(([time, title], index) => (
                  <div className={styles.stopRow} key={title}>
                    <div className={styles.stopBadge}>{index + 1}</div>
                    <div className={styles.stopCopy}>
                      <div className={styles.stopTime}>{time}</div>
                      <div className={styles.stopTitle}>{title}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.timelineFooter}>
                <span className={styles.miniSticker}>4 stops</span>
                <span className={styles.miniSticker}>12.4 km</span>
                <span className={styles.miniSticker}>Budget vua phai</span>
              </div>
            </div>

            <div className={styles.mapCard}>
              <div className={styles.mapSurface}>
                <div className={styles.gridPattern} />
                <div className={styles.routeHalo} />
                <div className={styles.routeLine} />
                <div className={`${styles.pin} ${styles.pinOne}`}>1</div>
                <div className={`${styles.pin} ${styles.pinTwo}`}>2</div>
                <div className={`${styles.pin} ${styles.pinThree}`}>3</div>
                <div className={`${styles.pin} ${styles.pinFour}`}>4</div>
                <div className={styles.mapLabel}>Route preview / OSM shell later</div>
              </div>

              <div className={styles.mapFooter}>
                <div className={styles.mapNote}>
                  Layout nay chi la khung visual. Leaflet va route polyline that se
                  duoc lam o Phase 12.7-12.8.
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className={styles.foundationGrid}>
        <Card
          interactive
          title="Primitive preview"
          description="Input, button va states duoc dung theo vien den, bong do cung va palette retro."
        >
          <div className={styles.stack}>
            <Input
              label="Trip prompt"
              placeholder="Nha Trang 3 ngay 2 dem, thich bien, hai san..."
              hint="Preview nay chi dung de khoa style input va helper text."
            />
            <Input
              label="Validation example"
              placeholder="Missing required value"
              error="Ban can nhap du nhu cau chuyen di truoc khi tao lich trinh."
            />
          </div>
        </Card>

        <Card
          title="States and tokens"
          description="Loading, error va bang token duoc gom chung de review nhanh nen mong Phase 12.2."
        >
          <div className={styles.stack}>
            <Loading />
            <ErrorMessage message="TripWise chua lay duoc du lieu goi y luc nay. Ban co the thu lai sau khi ket noi backend." />
            <div className={styles.tokenList}>
              {colorTokens.map(([name, value]) => (
                <div className={styles.tokenItem} key={name}>
                  <span className={styles.swatch} style={{ background: value }} />
                  <span className={styles.tokenName}>{name}</span>
                  <span className={styles.tokenValue}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
