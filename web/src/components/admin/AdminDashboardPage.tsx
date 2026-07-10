import { Link, Navigate } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { getAccessToken, getAuthRoles } from "@/lib/api/auth-session";
import styles from "./AdminDashboardPage.module.css";

type QuickAction = {
  title: string;
  description: string;
  icon: string;
  href?: string;
  disabled?: boolean;
};

const stats = [
  {
    label: "Tổng địa điểm",
    value: "--",
    hint: "Sẽ nối API thống kê ở task sau",
    icon: "travel_explore",
  },
  {
    label: "Chờ kiểm duyệt",
    value: "--",
    hint: "Nguồn từ moderation queue",
    icon: "hourglass_top",
  },
  {
    label: "Đã duyệt",
    value: "--",
    hint: "AUTO_APPROVED hoặc VERIFIED",
    icon: "verified",
  },
  {
    label: "Bị từ chối",
    value: "--",
    hint: "Giữ chỗ cho reject overview",
    icon: "gpp_bad",
  },
] as const;

const quickActions: QuickAction[] = [
  {
    title: "Kiểm tra địa điểm",
    description: "Mở khu quản trị để rà soát dữ liệu địa điểm đã import và moderation.",
    icon: "search",
    href: "/admin/places-review",
  },
  {
    title: "Staging Moderation",
    description: "Duyệt staging PENDING_ADMIN_REVIEW records trước khi apply lên public DB (Batch 2B).",
    icon: "fact_check",
    href: "/admin/staging-moderation",
  },
  {
    title: "Quay về Explore",
    description: "Trở lại màn hình người dùng để so sánh public data với dữ liệu quản trị.",
    icon: "map",
    href: "/explore",
  },
] as const;

export function AdminDashboardPage() {
  const accessToken = getAccessToken();
  const roles = getAuthRoles();

  if (!accessToken) {
    return <Navigate replace to="/admin/login" />;
  }

  if (roles.length > 0 && !roles.includes("ADMIN")) {
    return <Navigate replace to="/forbidden" />;
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>TailAdmin-style shell</p>
            <h1 className={styles.title}>TripWise Admin</h1>
            <p className={styles.subtitle}>
              Quản trị dữ liệu du lịch cho hệ thống TripWise. Bản này chỉ dựng shell dashboard tối thiểu
              để mở đường cho các màn kiểm duyệt địa điểm ở task tiếp theo.
            </p>
          </div>

          <div className={styles.heroBadge}>
            <span className="material-symbols-outlined">shield_lock</span>
            <span>ADMIN session detected</span>
          </div>
        </section>

        <section className={styles.statsGrid} aria-label="Admin stats">
          {stats.map((stat) => (
            <article key={stat.label} className={styles.statCard}>
              <div className={styles.statHeader}>
                <p className={styles.statLabel}>{stat.label}</p>
                <span className={`material-symbols-outlined ${styles.statIcon}`}>{stat.icon}</span>
              </div>
              <p className={styles.statValue}>{stat.value}</p>
              <p className={styles.statHint}>{stat.hint}</p>
            </article>
          ))}
        </section>

        <section className={styles.contentGrid}>
          <article className={styles.panel}>
            <h2 className={styles.panelTitle}>Quick actions</h2>
            <p className={styles.panelText}>
              Các lối vào ưu tiên cho admin. Hiện tại mới dựng placeholder route/layout, chưa nối API quản trị.
            </p>

            <div className={styles.actionsGrid}>
              {quickActions.map((action) => {
                if (action.href) {
                  return (
                    <Link key={action.title} to={action.href} className={styles.actionLink}>
                      <span className={`material-symbols-outlined ${styles.actionIcon}`}>{action.icon}</span>
                      <div>
                        <h3 className={styles.actionTitle}>{action.title}</h3>
                        <p className={styles.actionText}>{action.description}</p>
                      </div>
                    </Link>
                  );
                }

                return (
                  <div key={action.title} className={styles.actionCard} aria-disabled={action.disabled ? "true" : undefined}>
                    <span className={`material-symbols-outlined ${styles.actionIcon}`}>{action.icon}</span>
                    <div>
                      <h3 className={styles.actionTitle}>{action.title}</h3>
                      <p className={styles.actionText}>{action.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <aside className={styles.panel}>
            <h2 className={styles.panelTitle}>Admin shell status</h2>
            <p className={styles.panelText}>
              Kiểm tra nhanh các phần đã sẵn sàng trước khi làm admin places review.
            </p>

            <div className={styles.metaList}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <span className="material-symbols-outlined">login</span>
                  Route dashboard
                </span>
                <span className={styles.metaValue}>/admin/dashboard</span>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <span className="material-symbols-outlined">key</span>
                  Session check
                </span>
                <span className={styles.metaValue}>{roles.includes("ADMIN") ? "ADMIN" : "Token only"}</span>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <span className="material-symbols-outlined">stack</span>
                  Layout mode
                </span>
                <span className={styles.metaValue}>Sidebar + topbar</span>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <span className="material-symbols-outlined">construction</span>
                  Review features
                </span>
                <span className={styles.metaValue}>Chưa bật</span>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </AdminLayout>
  );
}
