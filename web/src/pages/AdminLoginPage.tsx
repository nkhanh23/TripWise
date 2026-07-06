import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { httpClient } from "@/lib/api/http-client";
import { setAuthSession } from "@/lib/api/auth-session";
import type { AuthTokens } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/errors";

type FormErrors = {
  email?: string;
  password?: string;
};

function buildErrors(email: string, password: string): FormErrors {
  const errs: FormErrors = {};
  if (!email.trim()) errs.email = "Email is required";
  else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Invalid email format";
  if (!password) errs.password = "Password is required";
  return errs;
}

function mapError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Login failed. Please try again.";
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthError(null);
    const fieldErrors = buildErrors(email, password);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      const tokens = await httpClient.post<AuthTokens>("/admin/login", { email, password });
      setAuthSession(tokens);
      navigate("/admin/dashboard");
    } catch (error) {
      setAuthError(mapError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#1C2434] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-[#1C2434]">TripWise Admin</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In to Admin Panel</h1>
            <p className="text-gray-500 text-sm">Enter your credentials to access the admin dashboard</p>
          </div>

          {authError && (
            <div className="mb-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm" role="alert">
              <strong className="block font-semibold mb-1">Login Failed</strong>
              <p>{authError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.email ? "border-red-400 bg-red-50" : "border-gray-300"} text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1C2434] focus:border-transparent transition text-sm`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className={`w-full px-4 py-2.5 pr-10 rounded-lg border ${errors.password ? "border-red-400 bg-red-50" : "border-gray-300"} text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1C2434] focus:border-transparent transition text-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#1C2434] text-white font-medium rounded-lg hover:bg-[#2A3348] focus:outline-none focus:ring-2 focus:ring-[#1C2434] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <Link to="/login" className="text-sm text-[#1C2434] hover:text-[#2A3348] font-medium">
              &larr; Back to User Login
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            &copy; 2026 TripWise. All rights reserved.
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-[#1C2434] items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">TripWise Admin Dashboard</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Manage places, users, trips, and system configuration from a single dashboard.
            Only authorized administrators have access to this panel.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">12k+</div>
              <div className="text-xs text-gray-400 mt-1">Places</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">5k+</div>
              <div className="text-xs text-gray-400 mt-1">Users</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">3k+</div>
              <div className="text-xs text-gray-400 mt-1">Trips</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
