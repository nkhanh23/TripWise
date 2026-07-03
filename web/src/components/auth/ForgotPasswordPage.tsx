"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { KineticTitle } from '@/components/motion/KineticTitle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

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
      {success ? (
        <Card>
          <div className="space-y-6 py-4">
            <div className="flex gap-4">
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: '2px solid #111111',
                  backgroundColor: '#B8F24A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 24, fontWeight: 'bold' }}>mail</span>
              </span>
              <div className="space-y-1.5 flex-1">
                <KineticTitle text="Kiểm tra email 📬" size="card" variant="pop" />
                <p style={{ fontSize: 13, color: '#7A6A58', fontWeight: 650, lineHeight: 1.5 }}>
                  Nếu địa chỉ email <strong>{email}</strong> đã đăng ký trên hệ thống, chúng tôi đã gửi thư hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến hoặc thư rác.
                </p>
              </div>
            </div>

            <div style={{ paddingTop: 4 }}>
              <Button variant="secondary" size="md" style={{ width: '100%' }} onClick={() => router.push('/login')}>
                Quay lại đăng nhập
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="space-y-5">
            {/* Header titles */}
            <div className="space-y-1.5">
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  backgroundColor: '#FFD166',
                  border: '1.5px solid #111111',
                  borderRadius: 6,
                  padding: '2px 8px',
                  textTransform: 'uppercase',
                  display: 'inline-block',
                  transform: 'skewX(-2deg)'
                }}
              >
                Reset Password
              </span>
              <KineticTitle text="Quên mật khẩu?" size="card" variant="pop" />
              <p style={{ fontSize: 12, color: '#7A6A58', fontWeight: 650, marginTop: 4 }}>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Địa chỉ Email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="khanh@example.com"
                required
              />

              <div style={{ paddingTop: 6 }} className="space-y-3">
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
        </Card>
      )}
    </AuthShell>
  );
};
