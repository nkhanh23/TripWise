"use client";

import Link from "next/link";
import type { PropsWithChildren } from "react";
import styles from "./AuthShell.module.css";
import { FilmGrainOverlay, KineticTitle } from "@/components/motion";


type AuthShellProps = PropsWithChildren<{
  posterTag: string;
  posterTitle: string;
  posterBody: string;
  ticketTitle: string;
}>;

const posterFeatures = [
  {
    icon: "auto_awesome",
    text: "AI tạo itinerary chi tiết theo từng ngày.",
  },
  {
    icon: "map",
    text: "Lộ trình hiển thị trực quan, thực tế trên bản đồ.",
  },
  {
    icon: "favorite",
    text: "Lưu trữ thư viện chuyến đi và địa điểm yêu thích.",
  },
  {
    icon: "sunny",
    text: "Đề xuất tối ưu theo thời tiết, ngân sách và sở thích.",
  },
];

export function AuthShell({
  children,
  posterTag,
  posterTitle,
  posterBody,
  ticketTitle,
}: AuthShellProps) {
  return (
    <main className={styles.shell}>
      <FilmGrainOverlay />

      <div className={styles.frame}>
        <header className={styles.header}>
          <Link className={styles.brandLink} href="/">
            <i aria-hidden="true" className={`material-symbols-outlined ${styles.brandMark}`}>
              explore
            </i>
            <span>TripWise</span>
          </Link>

          <div className={styles.headerActions}>
            <Link className={styles.headerLink} href="/">
              Về trang chủ
            </Link>
            <Link className={styles.demoButton} href="/planner">
              Tạo trip demo
            </Link>
          </div>
        </header>

        <section className={styles.content}>
          <div className={styles.formColumn}>{children}</div>

          <aside className={styles.poster}>
            <div className={styles.stamp}>
              Boarding
              <br />
              Pass
            </div>

            <div className={styles.posterTop}>
              <div className={styles.posterTag}>{posterTag}</div>

              <KineticTitle
                tag="h1"
                text={posterTitle}
                size="section"
                variant="pop"
                shadowVariant="black"
                className={styles.posterTitle}
              />

              <div className={styles.compassBadge} aria-hidden="true">
                <i className={`material-symbols-outlined ${styles.compassIcon}`}>explore</i>
              </div>

              <p className={styles.posterBody}>{posterBody}</p>

              <ul className={styles.featureList}>
                {posterFeatures.map((feature) => (
                  <li className={styles.featureItem} key={feature.text}>
                    <i aria-hidden="true" className={`material-symbols-outlined ${styles.featureBadge}`}>
                      {feature.icon}
                    </i>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.ticket}>
              <div>
                <div className={styles.ticketLabel}>Ticket ID</div>
                <div className={styles.ticketTitle}>{ticketTitle}</div>
              </div>

              <div className={styles.ticketStats}>
                <div>
                  <span className={styles.ticketLabel}>Dur</span>
                  <strong className={styles.ticketStatBlue}>3N2Đ</strong>
                </div>
                <div>
                  <span className={styles.ticketLabel}>Stops</span>
                  <strong className={styles.ticketStatRed}>7 stops</strong>
                </div>
                <div>
                  <span className={styles.ticketLabel}>Dist</span>
                  <strong className={styles.ticketStatLime}>24.5 km</strong>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <footer className={styles.footer}>
          <span>© 2026 TripWise. Phong cách retro cartoon.</span>

          <nav className={styles.footerNav}>
            <Link className={styles.footerLink} href="/terms">
              Điều khoản
            </Link>
            <Link className={styles.footerLink} href="/privacy">
              Bảo mật
            </Link>
            <Link className={styles.footerLink} href="/contact">
              Liên hệ
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
