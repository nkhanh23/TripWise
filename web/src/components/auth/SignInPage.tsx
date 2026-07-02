"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "./AuthShell";
import styles from "./AuthPage.module.css";
import { Button, Card, ErrorMessage, Input, Loading } from "@/components/ui";
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
    nextErrors.email = "Vui long nhap dia chi email.";
  } else if (!validateEmail(email)) {
    nextErrors.email = "Dia chi email khong dung dinh dang.";
  }

  if (!password) {
    nextErrors.password = "Vui long nhap mat khau.";
  } else if (password.length < 6) {
    nextErrors.password = "Mat khau phai co it nhat 6 ky tu.";
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

  return "Khong the dang nhap luc nay. Vui long thu lai sau.";
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
      posterTag="Welcome back"
      posterTitle="Dang nhap de tiep tuc hanh trinh."
      posterBody="Phase 12.4 chi dung hai auth page, nhung form nay da noi voi backend that va su dung session flow cua Phase 12.3."
      ticketTitle="Session boarding"
    >
      <Card className={styles.card} elevated>
        {signedInUser ? (
          <div className={styles.successCard}>
            <span aria-hidden="true" className={styles.successBadge}>
              OK
            </span>

            <div className={styles.successMeta}>
              <h2 className={styles.title}>Dang nhap thanh cong.</h2>
              <p className={styles.description}>
                Session da duoc luu cho trinh duyet hien tai. Minh cung da goi
                `/auth/me` de xac nhan token va interceptor dang hoat dong.
              </p>
            </div>

            <ul className={styles.successList}>
              <li>Ho ten: {signedInUser.fullName}</li>
              <li>Email: {signedInUser.email}</li>
              <li>Role: {signedInUser.role}</li>
            </ul>

            <div className={styles.buttonStack}>
              <Link className={styles.textLink} href="/">
                Ve trang preview
              </Link>
              <Button disabled={submitting} fullWidth onClick={handleLogout}>
                {submitting ? "Dang dang xuat..." : "Dang xuat khoi phien nay"}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.stack}>
            <div className={styles.header}>
              <span className={styles.eyebrow}>Welcome back</span>
              <h2 className={styles.title}>Dang nhap TripWise</h2>
              <p className={styles.description}>
                Tiep tuc cac chuyen di dang len ke hoach va giu session auth theo
                dung flow backend `/api/v1/auth`.
              </p>
            </div>

            {authError ? (
              <ErrorMessage
                title="Dang nhap chua thanh cong"
                message={authError}
              />
            ) : null}

            <form className={styles.form} onSubmit={handleSubmit}>
              <Input
                autoComplete="email"
                error={errors.email}
                label="Dia chi email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="khanh@example.com"
                value={email}
              />

              <div className={styles.passwordWrap}>
                <Input
                  autoComplete="current-password"
                  error={errors.password}
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

              <div className={styles.optionsRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    checked={rememberMe}
                    className={styles.checkbox}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Ghi nho phien dang nhap tren may nay</span>
                </label>

                <span className={styles.supportHint}>
                  Refresh token van duoc xoay vong o backend.
                </span>
              </div>

              <div className={styles.buttonStack}>
                <Button disabled={submitting || loadingProfile} fullWidth type="submit">
                  {submitting ? "Dang dang nhap..." : "Dang nhap vao TripWise"}
                </Button>
              </div>
            </form>

            {loadingProfile ? <Loading label="Dang xac nhan phien dang nhap..." /> : null}

            <div className={styles.divider}>Phase 12.4</div>

            <div className={styles.supportCard}>
              <div className={styles.supportTitle}>Scope note</div>
              <p className={styles.supportBody}>
                Page nay chi cover login email/password va session verify. OAuth,
                forgot password va protected dashboard se de phase sau.
              </p>
            </div>

            <p className={styles.footnote}>
              Chua co tai khoan?{" "}
              <Link className={styles.textLink} href="/register">
                Dang ky ngay
              </Link>
            </p>
          </div>
        )}
      </Card>
    </AuthShell>
  );
}
