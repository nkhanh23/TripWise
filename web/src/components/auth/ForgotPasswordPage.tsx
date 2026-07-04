"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { KineticTitle } from '@/components/motion/KineticTitle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import styles from './AuthPage.module.css';

export const ForgotPasswordPage: React.FC = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Vui lòng điền địa chỉ email của bạn.');
      return;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Địa chỉ email không đúng định dạng.');
      return;
    }

    setLoading(true);

    // Mock network request
    setTimeout(() => {
      setLoading(false);
      // Mock potential rate limiting for test purpose: if email is "limit@example.com", trigger rate limit mock
      if (email === 'limit@example.com') {
        setError('Bạn đã gửi quá nhiều yêu cầu khôi phục. Vui lòng thử lại sau.');
      } else {
        setSuccess(true);
      }
    }, 1000);
  };

  return (
    <AuthShell
      posterTag="Recovery"
      posterTitle="Khôi phục mật khẩu tài khoản"
      posterBody="Hệ thống sẽ gửi email hướng dẫn đặt lại mật khẩu cho tài khoản của bạn."
      ticketTitle="Password recovery"
    >
      <section className={styles.card}>
        {success ? (
          <div className={styles.successCard}>
            <div style={{ display: 'flex', gap: 16 }}>
              <span
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  border: '3px solid #111111',
                  backgroundColor: '#B8F24A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '3px 3px 0 #111111'
                }}
              >
                <i className="material-symbols-outlined" style={{ fontSize: 24, fontWeight: 'bold' }} aria-hidden="true">mail</i>
              </span>
              <div className="space-y-1.5 flex-1 animate-pop-in">
                <KineticTitle text="Kiểm tra email 📬" size="card" variant="pop" />
                <p className={styles.description}>
                  Nếu địa chỉ email <strong>{email}</strong> đã đăng ký trên hệ thống, chúng tôi đã gửi thư hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến hoặc thư rác.
                </p>
              </div>
            </div>

            <div style={{ paddingTop: 10 }}>
              <Button variant="secondary" size="md" style={{ width: '100%' }} onClick={() => router.push('/login')}>
                Quay lại đăng nhập
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.stack}>
            {/* Header titles */}
            <div className={styles.header}>
              <span className={styles.eyebrow}>Reset Password</span>
              <KineticTitle text="Quên mật khẩu?" size="card" variant="pop" className={styles.title} />
              <p className={styles.description}>
                Nhập email của bạn và TripWise sẽ gửi đường dẫn khôi phục mật khẩu.
              </p>
            </div>

            {/* Error alerts */}
            {error && (
              <ErrorBanner
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            {/* Email form */}
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.fieldRow}>
                <span>Địa chỉ Email của bạn</span>
                <span className={styles.inputShell}>
                  <i className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                    mail
                  </i>
                  <input
                    autoComplete="email"
                    className={styles.input}
                    name="email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="khanh@example.com"
                    type="email"
                    value={email}
                  />
                </span>
              </label>

              <div style={{ paddingTop: 6 }} className={styles.form}>
                <Button
                  variant="primary"
                  size="lg"
                  style={{ width: '100%' }}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Đang gửi...' : 'Gửi đường dẫn khôi phục ✉️'}
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
