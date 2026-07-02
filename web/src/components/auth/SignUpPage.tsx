"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "./AuthShell";
import styles from "./AuthPage.module.css";
import { Button, Card, ErrorMessage, Input } from "@/components/ui";
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
    return { label: "Chua nhap", color: "var(--color-muted)", progress: 0 };
  }

  if (password.length < 6) {
    return { label: "Qua ngan", color: "var(--color-red)", progress: 25 };
  }

  let points = 0;
  if (/[A-Z]/.test(password)) points += 1;
  if (/[0-9]/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  if (points === 0) {
    return { label: "Yeu", color: "#f77f00", progress: 45 };
  }

  if (points === 1) {
    return { label: "Trung binh", color: "var(--color-yellow)", progress: 70 };
  }

  return { label: "Manh", color: "var(--color-lime)", progress: 100 };
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
    nextErrors.fullName = "Vui long dien ho va ten.";
  }

  if (!email.trim()) {
    nextErrors.email = "Vui long nhap dia chi email.";
  } else if (!validateEmail(email)) {
    nextErrors.email = "Dia chi email khong dung dinh dang.";
  }

  if (!password) {
    nextErrors.password = "Vui long nhap mat khau.";
  } else if (password.length < 6) {
    nextErrors.password = "Mat khau toi thieu 6 ky tu.";
  }

  if (!confirmPassword) {
    nextErrors.confirmPassword = "Vui long xac nhan mat khau.";
  } else if (password !== confirmPassword) {
    nextErrors.confirmPassword = "Mat khau xac nhan khong khop.";
  }

  if (!acceptTerms) {
    nextErrors.acceptTerms = "Ban can dong y voi dieu khoan truoc khi tao tai khoan.";
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

  return "Khong the tao tai khoan luc nay. Vui long thu lai sau.";
}

export function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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
      posterTitle="Tao tai khoan de luu hanh trinh rieng."
      posterBody="Visual duoc giu gan mock React goc, con implementation thi dung Next.js App Router va auth contract backend that."
      ticketTitle="Explorer passport"
    >
      <Card className={styles.card} elevated>
        {createdUser ? (
          <div className={styles.successCard}>
            <span aria-hidden="true" className={styles.successBadge}>
              GO
            </span>

            <div className={styles.successMeta}>
              <h2 className={styles.title}>Tai khoan da san sang.</h2>
              <p className={styles.description}>
                Dang ky thanh cong tren backend. Phase nay chua auto-login de
                giu scope gon, nhung ban co the vao trang dang nhap ngay.
              </p>
            </div>

            <ul className={styles.successList}>
              <li>Ho ten: {createdUser.fullName}</li>
              <li>Email: {createdUser.email}</li>
              <li>Status: {createdUser.status}</li>
            </ul>

            <div className={styles.buttonStack}>
              <Link className={styles.textLink} href="/login">
                Sang trang dang nhap
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.stack}>
            <div className={styles.header}>
              <span className={styles.eyebrow}>New explorer</span>
              <h2 className={styles.title}>Tao tai khoan moi</h2>
              <p className={styles.description}>
                Luu trip, luu diem dung chan va chuan bi cho cac flow planner o
                Phase 12.5 tro di.
              </p>
            </div>

            {authError ? (
              <ErrorMessage
                title="Dang ky chua thanh cong"
                message={authError}
              />
            ) : null}

            <form className={styles.form} onSubmit={handleSubmit}>
              <Input
                autoComplete="name"
                error={errors.fullName}
                label="Ho va ten"
                name="fullName"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nguyen Khanh"
                value={fullName}
              />

              <Input
                autoComplete="email"
                error={errors.email}
                label="Dia chi email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="khanh@example.com"
                value={email}
              />

              <div className={styles.fieldRow}>
                <div className={styles.passwordWrap}>
                  <Input
                    autoComplete="new-password"
                    error={errors.password}
                    hint="Backend yeu cau toi thieu 6 ky tu."
                    label="Mat khau"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhap mat khau..."
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    className={styles.toggleButton}
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? "An" : "Hien"}
                  </button>
                </div>

                {password ? (
                  <div className={styles.strengthMeter}>
                    <div className={styles.strengthBar}>
                      <div
                        className={styles.strengthFill}
                        style={{
                          backgroundColor: strength.color,
                          width: `${strength.progress}%`
                        }}
                      />
                    </div>
                    <span
                      className={styles.strengthLabel}
                      style={{ color: strength.color }}
                    >
                      Do manh mat khau: {strength.label}
                    </span>
                  </div>
                ) : null}
              </div>

              <Input
                autoComplete="new-password"
                error={errors.confirmPassword}
                label="Xac nhan mat khau"
                name="confirmPassword"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Nhap lai mat khau..."
                type="password"
                value={confirmPassword}
              />

              <div className={styles.fieldRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    checked={acceptTerms}
                    className={styles.checkbox}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    Toi dong y voi luat su dung va chinh sach bao mat cho phien
                    demo nay.
                  </span>
                </label>

                {errors.acceptTerms ? (
                  <span className={styles.inlineError}>{errors.acceptTerms}</span>
                ) : null}
              </div>

              <div className={styles.buttonStack}>
                <Button disabled={submitting} fullWidth type="submit">
                  {submitting ? "Dang tao tai khoan..." : "Tao tai khoan Explorer"}
                </Button>
              </div>
            </form>

            <div className={styles.supportCard}>
              <div className={styles.supportTitle}>Scope note</div>
              <p className={styles.supportBody}>
                Chua co OAuth, confirm email hay forgot password. Phase nay chi
                dung register/login page bang contract backend hien tai.
              </p>
            </div>

            <p className={styles.footnote}>
              Da co tai khoan?{" "}
              <Link className={styles.textLink} href="/login">
                Dang nhap
              </Link>
            </p>
          </div>
        )}
      </Card>
    </AuthShell>
  );
}
