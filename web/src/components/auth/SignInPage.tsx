"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "./AuthShell";
import styles from "./AuthPage.module.css";
import { KineticTitle } from "@/components/motion";
import { ApiError, getCurrentUser, login, logout, type UserResponse } from "@/lib/api";

type FormErrors = {
  email?: string;
  password?: string;
};

function validateEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function buildFieldErrors(email: string, password: string): FormErrors {
  const nextErrors: FormErrors = {};

  if (!email.trim()) {
    nextErrors.email = "Vui lòng nhập địa chỉ email.";
  } else if (!validateEmail(email)) {
    nextErrors.email = "Địa chỉ email không đúng định dạng.";
  }

  if (!password) {
    nextErrors.password = "Vui lòng nhập mật khẩu.";
  } else if (password.length < 6) {
    nextErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
  }

  return nextErrors;
}

function mapApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Không thể đăng nhập lúc này. Vui lòng thử lại sau.";
}

export function SignInPage() {
  const [email, setEmail] = useState("khanh@example.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signedInUser, setSignedInUser] = useState<UserResponse | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);

    const nextErrors = buildFieldErrors(email, password);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      await login({ email, password });
      setLoadingProfile(true);
      const user = await getCurrentUser();
      setSignedInUser(user);
    } catch (error) {
      setAuthError(mapApiError(error));
    } finally {
      setSubmitting(false);
      setLoadingProfile(false);
    }
  }

  async function handleLogout() {
    setSubmitting(true);

    try {
      await logout();
      setSignedInUser(null);
      setPassword("");
      setAuthError(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      posterTag="AI Smart Travel Planner"
      posterTitle="Lên lịch trình thông minh hơn, vui hơn."
      posterBody="Đăng nhập để tiếp tục các chuyến đi đang lên kế hoạch, lưu địa điểm yêu thích và mở lại itinerary đã tạo."
      ticketTitle="Nha Trang Summer"
    >
      <section className={styles.card}>
        {signedInUser ? (
          <div className={styles.successCard}>
            <span aria-hidden="true" className={styles.successBadge}>
              <i className={`material-symbols-outlined ${styles.successBadgeIcon}`}>check</i>
            </span>

            <div className={styles.successMeta}>
              <h2 className={styles.title}>Đăng nhập thành công.</h2>
              <p className={styles.description}>
                Phiên đăng nhập đã được lưu cho trình duyệt hiện tại. Bạn có thể mở planner
                hoặc xem lại các chuyến đi đã lưu.
              </p>
            </div>

            <ul className={styles.successList}>
              <li>Họ tên: {signedInUser.fullName}</li>
              <li>Email: {signedInUser.email}</li>
              <li>Role: {signedInUser.role}</li>
            </ul>

            <div className={styles.buttonStack}>
              <Link className={styles.primaryAction} href="/planner">
                Sang planner
              </Link>
              <Link className={styles.secondaryAction} href="/trips">
                Xem chuyến đi đã lưu
              </Link>
              <button
                className={styles.secondaryAction}
                disabled={submitting}
                onClick={handleLogout}
                type="button"
              >
                {submitting ? "Đang đăng xuất..." : "Đăng xuất khỏi phiên này"}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.stack}>
            <div className={styles.header}>
              <span className={styles.eyebrow}>Welcome back</span>
              <KineticTitle text="Đăng nhập TripWise" size="card" variant="pop" className={styles.title} />
              <p className={styles.description}>Tiếp tục chuyến đi đang lên kế hoạch của bạn.</p>
            </div>

            {authError ? (
              <div className={styles.errorCard} role="alert">
                <strong>Đăng nhập chưa thành công</strong>
                <p>{authError}</p>
                <button
                  className={styles.textButton}
                  onClick={() => {
                    setAuthError(null);
                    setErrors({});
                  }}
                  type="button"
                >
                  Thử lại
                </button>
              </div>
            ) : null}

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.fieldRow}>
                <span>Địa chỉ Email</span>
                <span className={styles.inputShell}>
                  <i className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                    mail
                  </i>
                  <input
                    autoComplete="email"
                    className={styles.input}
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="khanh@example.com"
                    type="email"
                    value={email}
                  />
                </span>
                {errors.email ? <span className={styles.inlineError}>{errors.email}</span> : null}
              </label>

              <label className={styles.fieldRow}>
                <span>Mật khẩu</span>
                <span className={styles.inputShell}>
                  <i className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                    lock
                  </i>
                  <input
                    autoComplete="current-password"
                    className={styles.input}
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu..."
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    <i
                      className={`material-symbols-outlined ${styles.passwordToggleIcon}`}
                      aria-hidden="true"
                    >
                      {showPassword ? "visibility_off" : "visibility"}
                    </i>
                  </button>
                </span>
                {errors.password ? <span className={styles.inlineError}>{errors.password}</span> : null}
              </label>

              <div className={styles.optionsRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    checked={rememberMe}
                    className={styles.checkbox}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>

                <Link className={styles.textLink} href="/forgot-password">
                  Quên mật khẩu?
                </Link>
              </div>

              <button
                className={styles.primaryAction}
                disabled={submitting || loadingProfile}
                type="submit"
              >
                {submitting || loadingProfile ? "Đang đăng nhập..." : "Đăng nhập vào TripWise"}
              </button>
            </form>

            {loadingProfile ? (
              <div className={styles.loadingLine}>Đang xác nhận phiên đăng nhập...</div>
            ) : null}

            <div className={styles.divider}>Hoặc tiếp tục bằng</div>

            <button className={styles.googleButton} type="button">
              <i className={`material-symbols-outlined ${styles.googleIcon}`} aria-hidden="true">
                account_circle
              </i>
              <span>Tiếp tục với Google</span>
            </button>

            <p className={styles.footnote}>
              Chưa có tài khoản?{" "}
              <Link className={styles.textLink} href="/register">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        )}
      </section>
    </AuthShell>
  );
}
