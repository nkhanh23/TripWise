"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { KineticTitle } from '@/components/motion/KineticTitle';

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
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
          {toastMessage}
        </div>
      )}

      {success ? (
        <Card>
          <div className="space-y-6 py-4 text-center">
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
              <span className="material-symbols-outlined" style={{ fontSize: 32, fontWeight: 'bold' }}>lock_open</span>
            </div>

            <div className="space-y-2">
              <KineticTitle text="Đặt lại mật khẩu thành công! 🔓" size="card" variant="pop" className="justify-center" />
              <p style={{ fontSize: 13, color: '#7A6A58', fontWeight: 650 }}>
                Mật khẩu của bạn đã được cập nhật thành công. Giờ đây bạn có thể đăng nhập lại vào hệ thống bằng mật khẩu mới này.
              </p>
            </div>

            <div style={{ paddingTop: 4 }}>
              <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={() => router.push('/login')}>
                Đăng nhập ngay
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
              <KineticTitle text="Đặt lại mật khẩu" size="card" variant="pop" />
              <p style={{ fontSize: 12, color: '#7A6A58', fontWeight: 650, marginTop: 4 }}>
                Vui lòng điền mật khẩu mới có tính bảo mật cao của bạn.
              </p>
            </div>

            {/* Reset Form list elements */}
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <div style={{ position: 'relative' }}>
                  <Input
                    label="Mật khẩu mới"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    error={errors.newPassword}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 36,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#7A6A58'
                    }}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div style={{ marginTop: 6 }} className="space-y-1">
                    <div style={{ display: 'flex', gap: 4, height: 6, backgroundColor: '#FFF6DE', border: '1.5px solid #111111', borderRadius: 4, overflow: 'hidden', padding: 1 }}>
                      <div
                        style={{
                          width: `${strength.progress}%`,
                          height: '100%',
                          backgroundColor: strength.color,
                          borderRadius: 2,
                          transition: 'width 0.2s ease'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 800, color: strength.color }}>
                      Độ mạnh mật khẩu: {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <Input
                label="Xác nhận mật khẩu mới"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                error={errors.confirmPassword}
                required
              />

              {/* Submit Buttons */}
              <div style={{ paddingTop: 6 }} className="space-y-3">
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
        </Card>
      )}
    </AuthShell>
  );
};
