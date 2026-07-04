"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "./AuthShell";
import styles from "./AuthPage.module.css";
import { KineticTitle } from "@/components/motion";
import { ApiError, register, type UserResponse } from "@/lib/api";

type FormErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
};

function validateEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function getPasswordStrength(password: string) {
  if (!password) {
    return { label: "Chưa nhập", color: "#7a6a58", progress: 0 };
  }

  if (password.length < 6) {
    return { label: "Quá ngắn", color: "#e6392e", progress: 25 };
  }

  let points = 0;
  if (/[A-Z]/.test(password)) points += 1;
  if (/[0-9]/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  if (points === 0) {
    return { label: "Yếu", color: "#f77f00", progress: 45 };
  }

  if (points === 1) {
    return { label: "Trung bình", color: "#ffd166", progress: 70 };
  }

  return { label: "Mạnh", color: "#7ec413", progress: 100 };
}

function buildFieldErrors(
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string,
  acceptTerms: boolean
): FormErrors {
  const nextErrors: FormErrors = {};

  if (!fullName.trim()) {
    nextErrors.fullName = "Vui lòng điền họ và tên.";
  }

  if (!email.trim()) {
    nextErrors.email = "Vui lòng nhập địa chỉ email.";
  } else if (!validateEmail(email)) {
    nextErrors.email = "Địa chỉ email không đúng định dạng.";
  }

  if (!password) {
    nextErrors.password = "Vui lòng nhập mật khẩu.";
  } else if (password.length < 6) {
    nextErrors.password = "Mật khẩu tối thiểu 6 ký tự.";
  }

  if (!confirmPassword) {
    nextErrors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
  } else if (password !== confirmPassword) {
    nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
  }

  if (!acceptTerms) {
    nextErrors.acceptTerms = "Bạn cần đồng ý với điều khoản trước khi tạo tài khoản.";
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

  return "Không thể tạo tài khoản lúc này. Vui lòng thử lại sau.";
}

export function SignUpPage() {
  const [fullName, setFullName] = useState("Nguyen Khanh");
  const [email, setEmail] = useState("khanh@example.com");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<UserResponse | null>(null);

  const strength = getPasswordStrength(password);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);

    const nextErrors = buildFieldErrors(
      fullName,
      email,
      password,
      confirmPassword,
      acceptTerms
    );

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const user = await register({ fullName, email, password });
      setCreatedUser(user);
    } catch (error) {
      setAuthError(mapApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      posterTag="New explorer"
      posterTitle="Tạo tài khoản để lưu hành trình riêng."
      posterBody="Tạo tài khoản TripWise để lưu trip, lưu điểm dừng chân và tiếp tục các flow planner ở những lần sau."
      ticketTitle="Explorer Passport"
    >
      <section className={styles.card}>
        {createdUser ? (
          <div className={styles.successCard}>
            <span aria-hidden="true" className={styles.successBadge}>
              GO
            </span>

            <div className={styles.successMeta}>
              <h2 className={styles.title}>Tài khoản đã sẵn sàng.</h2>
              <p className={styles.description}>
                Đăng ký thành công trên backend. Bạn có thể sang trang đăng nhập hoặc mở planner.
              </p>
            </div>

            <ul className={styles.successList}>
              <li>Họ tên: {createdUser.fullName}</li>
              <li>Email: {createdUser.email}</li>
              <li>Status: {createdUser.status}</li>
            </ul>

            <div className={styles.buttonStack}>
              <Link className={styles.primaryAction} href="/login">
                Sang trang đăng nhập
              </Link>
              <Link className={styles.secondaryAction} href="/planner">
                Mở planner
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.stack}>
            <div className={styles.header}>
              <span className={styles.eyebrow}>New explorer</span>
              <KineticTitle text="Tạo tài khoản mới" size="card" variant="pop" className={styles.title} />
              <p className={styles.description}>
                Lưu trip, lưu điểm dừng chân và chuẩn bị cho các flow planner tiếp theo.
              </p>
            </div>

            {authError ? (
              <div className={styles.errorCard} role="alert">
                <strong>Đăng ký chưa thành công</strong>
                <p>{authError}</p>
                <div className={styles.errorActions}>
                  <button
                    className={styles.textButton}
                    onClick={() => {
                      setAuthError(null);
                      setErrors({});
                    }}
                    type="button"
                  >
                    Kiểm tra lại
                  </button>
                  <Link className={styles.textLink} href="/login">
                    Đăng nhập nếu đã có tài khoản
                  </Link>
                </div>
              </div>
            ) : null}

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.fieldRow}>
                <span>Họ và tên</span>
                <span className={styles.inputShell}>
                  <i className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                    person
                  </i>
                  <input
                    autoComplete="name"
                    className={styles.input}
                    name="fullName"
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Nguyen Khanh"
                    value={fullName}
                  />
                </span>
                {errors.fullName ? (
                  <span className={styles.inlineError}>{errors.fullName}</span>
                ) : null}
              </label>

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
                {errors.email ? (
                  <span className={styles.inlineError}>{errors.email}</span>
                ) : null}
              </label>

              <label className={styles.fieldRow}>
                <span>Mật khẩu</span>
                <span className={styles.inputShell}>
                  <i className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                    lock
                  </i>
                  <input
                    autoComplete="new-password"
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

                <span className={styles.inputHint}>
                  Backend yêu cầu tối thiểu 6 ký tự.
                </span>

                {errors.password ? (
                  <span className={styles.inlineError}>{errors.password}</span>
                ) : null}

                {password ? (
                  <span className={styles.strengthMeter}>
                    <span className={styles.strengthBar}>
                      <span
                        className={styles.strengthFill}
                        style={{
                          backgroundColor: strength.color,
                          width: `${strength.progress}%`,
                        }}
                      />
                    </span>
                    <span
                      className={styles.strengthLabel}
                      style={{ color: strength.color }}
                    >
                      Độ mạnh mật khẩu: {strength.label}
                    </span>
                  </span>
                ) : null}
              </label>

              <label className={styles.fieldRow}>
                <span>Xác nhận mật khẩu</span>
                <span className={styles.inputShell}>
                  <i className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                    check
                  </i>
                  <input
                    autoComplete="new-password"
                    className={styles.input}
                    name="confirmPassword"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                  />
                </span>
                {errors.confirmPassword ? (
                  <span className={styles.inlineError}>{errors.confirmPassword}</span>
                ) : null}
              </label>

              <div className={styles.fieldRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    checked={acceptTerms}
                    className={styles.checkbox}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    Tôi đồng ý với luật sử dụng và chính sách bảo mật cho phiên demo này.
                  </span>
                </label>

                {errors.acceptTerms ? (
                  <span className={styles.inlineError}>{errors.acceptTerms}</span>
                ) : null}
              </div>

              <button className={styles.primaryAction} disabled={submitting} type="submit">
                {submitting ? "Đang tạo tài khoản..." : "Tạo tài khoản Explorer 🚀"}
              </button>
            </form>

            <div className={styles.supportCard}>
              <div className={styles.supportTitle}>Scope note</div>
              <p className={styles.supportBody}>
                Chưa có OAuth, confirm email hay forgot password nâng cao. Phase này dùng
                register/login page theo contract backend hiện tại.
              </p>
            </div>

            <p className={styles.footnote}>
              Đã có tài khoản?{" "}
              <Link className={styles.textLink} href="/login">
                Đăng nhập
              </Link>
            </p>
          </div>
        )}
      </section>
    </AuthShell>
  );
}