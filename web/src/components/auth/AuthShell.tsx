"use client";

import Link from "next/link";
import type { PropsWithChildren } from "react";
import styles from "./AuthShell.module.css";
import { KineticTitle, FilmGrainOverlay } from "@/components/motion";

type AuthShellProps = PropsWithChildren<{
  posterTag: string;
  posterTitle: string;
  posterBody: string;
  ticketTitle: string;
}>;

const posterFeatures = [
  "AI rut gon prompt thanh ke hoach ro rang theo ngay.",
  "Route va thoi gian di chuyen duoc tinh tu backend that.",
  "Moi phien dang nhap dung chung mot auth flow cho web app.",
  "Mock React goc duoc giu nguyen lam visual reference."
];

const ticketStats = [
  { label: "Mode", value: "Auth" },
  { label: "Stack", value: "Next.js" },
  { label: "API", value: "/api/v1" }
];

export function AuthShell({
  children,
  posterTag,
  posterTitle,
  posterBody,
  ticketTitle
}: AuthShellProps) {
  return (
    <main className={styles.shell}>
      <FilmGrainOverlay />
      <div className={styles.frame}>
        <header className={styles.header}>
          <Link className={styles.brandLink} href="/">
            <span aria-hidden="true" className={styles.brandMark}>
              TW
            </span>
            <span>TripWise</span>
          </Link>

          <div className={styles.headerActions}>
            <Link className={styles.headerLink} href="/">
              Ve trang preview
            </Link>
          </div>
        </header>

        <section className={styles.content}>
          <div className={styles.formColumn}>{children}</div>

          <aside className={styles.poster}>
            <div className={styles.stamp}>Boarding Pass</div>

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
              <p className={styles.posterBody}>{posterBody}</p>

              <ul className={styles.featureList}>
                {posterFeatures.map((feature, index) => (
                  <li className={styles.featureItem} key={feature}>
                    <span aria-hidden="true" className={styles.featureBadge}>
                      {index + 1}
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.ticket}>
              <div className={styles.ticketLabel}>Ticket snapshot</div>
              <div className={styles.ticketTitle}>{ticketTitle}</div>

              <div className={styles.ticketStats}>
                {ticketStats.map((item) => (
                  <div key={item.label}>
                    <div className={styles.ticketLabel}>{item.label}</div>
                    <span className={styles.ticketStatValue}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <footer className={styles.footer}>
          <span>TripWise auth pages giu mood retro cartoon tu mock archive, nhung chay tren Next.js App Router.</span>
          <nav className={styles.footerNav}>
            <Link className={styles.footerLink} href="/login">
              Login
            </Link>
            <Link className={styles.footerLink} href="/register">
              Register
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
