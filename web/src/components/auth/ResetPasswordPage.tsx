"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { KineticTitle } from '@/components/motion/KineticTitle';
import styles from './AuthPage.module.css';

export const ResetPasswordPage: React.FC = () => {
  const router = useRouter();

  // Local Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Calculate password strength dynamically
  const getPasswordStrength = () => {
    if (!newPassword) return { label: 'Chưa nhập', color: '#7A6A58', progress: 0 };
    if (newPassword.length < 6) return { label: 'Quá ngắn', color: '#E6392E', progress: 20 };
    
    let points = 0;
    if (/[A-Z]/.test(newPassword)) points++;
    if (/[0-9]/.test(newPassword)) points++;
    if (/[^A-Za-z0-9]/.test(newPassword)) points++;

    if (points === 0) return { label: 'Yếu', color: '#F77F00', progress: 40 };
    if (points === 1) return { label: 'Trung bình', color: '#FFD166', progress: 70 };
    return { label: 'Mạnh 🔥', color: '#B8F24A', progress: 100 };
  };

  const strength = getPasswordStrength();

  // Validation
  const validateForm = () => {
    const nextErrors: typeof errors = {};

    if (!newPassword) {
      nextErrors.newPassword = 'Vui lòng nhập mật khẩu mới.';
    } else if (newPassword.length < 6) {
      nextErrors.newPassword = 'Mật khẩu tối thiểu 6 ký tự.';
    }

    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    // Mock network request delays
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setToastMessage('Đã cập nhật mật khẩu mới! 🔑');
    }, 1000);
  };

  return (
    <AuthShell
      posterTag="Reset"
      posterTitle="Tạo mật khẩu mới của bạn"
      posterBody="Vui lòng thiết lập mật khẩu mới có tính bảo mật cao và dễ nhớ."
      ticketTitle="Password reset"
    >
      {/* Toast notifications */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            backgroundColor: '#B8F24A',
            border: '2.5px solid #111111',
            borderRadius: 14,
            boxShadow: '4px 4px 0 #111111',
            padding: '10px 20px',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: 13,
            fontWeight: 800,
            color: '#111111',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
          className="animate-pop-in"
        >
          <i className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">check_circle</i>
          {toastMessage}
        </div>
      )}

      <section className={styles.card}>
        {success ? (
          <div className={styles.successCard}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: '2.5px solid #111111',
                backgroundColor: '#B8F24A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: '3px 3px 0 #111111'
              }}
            >
              <i className="material-symbols-outlined" style={{ fontSize: 32, fontWeight: 'bold' }} aria-hidden="true">lock_open</i>
            </div>

            <div className="space-y-2 text-center animate-pop-in">
              <KineticTitle text="Đặt lại mật khẩu thành công! 🔓" size="card" variant="pop" className="justify-center" />
              <p className={styles.description}>
                Mật khẩu của bạn đã được cập nhật thành công. Giờ đây bạn có thể đăng nhập lại vào hệ thống bằng mật khẩu mới này.
              </p>
            </div>

            <div style={{ paddingTop: 10 }}>
              <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={() => router.push('/login')}>
                Đăng nhập ngay
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.stack}>
            {/* Header titles */}
            <div className={styles.header}>
              <span className={styles.eyebrow}>Reset Password</span>
              <KineticTitle text="Đặt lại mật khẩu" size="card" variant="pop" className={styles.title} />
              <p className={styles.description}>
                Vui lòng điền mật khẩu mới có tính bảo mật cao của bạn.
              </p>
            </div>

            {/* Reset Form list elements */}
            <form onSubmit={handleResetPassword} className={styles.form}>
              <label className={styles.fieldRow}>
                <span>Mật khẩu mới</span>
                <span className={styles.inputShell}>
                  <i className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                    lock
                  </i>
                  <input
                    autoComplete="new-password"
                    className={styles.input}
                    name="newPassword"
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
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

                {/* Password Strength Meter */}
                {newPassword && (
                  <div style={{ marginTop: 6 }} className={styles.strengthMeter}>
                    <div className={styles.strengthBar}>
                      <div
                        className={styles.strengthFill}
                        style={{
                          width: `${strength.progress}%`,
                          backgroundColor: strength.color,
                        }}
                      />
                    </div>
                    <span className={styles.strengthLabel} style={{ color: strength.color }}>
                      Độ mạnh mật khẩu: {strength.label}
                    </span>
                  </div>
                )}
                {errors.newPassword ? (
                  <span className={styles.inlineError}>{errors.newPassword}</span>
                ) : null}
              </label>

              <label className={styles.fieldRow}>
                <span>Xác nhận mật khẩu mới</span>
                <span className={styles.inputShell}>
                  <i className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                    lock
                  </i>
                  <input
                    autoComplete="new-password"
                    className={styles.input}
                    name="confirmPassword"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    value={confirmPassword}
                  />
                </span>
                {errors.confirmPassword ? (
                  <span className={styles.inlineError}>{errors.confirmPassword}</span>
                ) : null}
              </label>

              {/* Submit Buttons */}
              <div style={{ paddingTop: 6 }} className={styles.form}>
                <Button
                  variant="primary"
                  size="lg"
                  style={{ width: '100%' }}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu 🔑'}
                </Button>

                <Button
                  variant="ghost"
                  size="md"
                  style={{ width: '100%' }}
                  type="button"
                  onClick={() => router.push('/login')}
                >
                  Quay lại đăng nhập
                </Button>
              </div>
            </form>
          </div>
        )}
      </section>
    </AuthShell>
  );
};
