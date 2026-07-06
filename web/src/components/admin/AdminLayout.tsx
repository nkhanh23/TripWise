import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import styles from "./AdminLayout.module.css";

type AdminLayoutProps = {
  children: ReactNode;
};

const adminNavItems = [
  {
    label: "Dashboard",
    icon: "dashboard",
    to: "/admin/dashboard",
    disabled: false,
  },
  {
    label: "Places Review",
    icon: "travel_explore",
    to: "/admin/places-review",
    disabled: false,
  },
  {
    label: "Import Data",
    icon: "cloud_upload",
    to: "/admin/import-data",
    disabled: true,
  },
  {
    label: "Settings",
    icon: "settings",
    to: "/admin/settings",
    disabled: true,
  },
] as const;

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={`material-symbols-outlined ${styles.brandMark}`}>shield_person</span>
          <div>
            <h1 className={styles.brandTitle}>TripWise Admin</h1>
            <p className={styles.brandSubtitle}>Bảng điều khiển quản trị</p>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Admin navigation">
          <p className={styles.navLabel}>Navigation</p>
          {adminNavItems.map((item) => {
            if (item.disabled) {
              return (
                <span key={item.label} className={styles.navItemDisabled} aria-disabled="true">
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ""}`.trim()
                }
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <p className={styles.footerTitle}>Admin scope</p>
          <p className={styles.footerText}>
            Shell này chỉ mở dashboard quản trị tối thiểu. Các màn review/place import sẽ nối ở task sau.
          </p>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h2 className={styles.topbarTitle}>TripWise Admin</h2>
            <p className={styles.topbarSubtitle}>Quản trị dữ liệu du lịch</p>
          </div>

          <div className={styles.statusPill}>
            <span className={styles.statusDot} />
            <span>Local admin session</span>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
