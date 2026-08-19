import { Outlet, Route, Routes, Navigate, useParams } from "react-router-dom";
import React, { lazy, Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Loading } from "@/components/ui";

// Lightweight pages — keep static
import { DashboardPage } from "@/pages/DashboardPage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { LandingPage } from "@/pages/LandingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";

// Heavy pages — lazy load to split maplibre-gl (~800KB) + gsap (~200KB) + leaflet (~150KB) from main bundle
const PlanTripPage = lazy(() =>
  import("@/pages/PlanTripPage").then((m) => ({ default: m.PlanTripPage }))
);
const TripDetailPage = lazy(() =>
  import("@/pages/TripDetailPage").then((m) => ({ default: m.TripDetailPage }))
);
const ExplorePlacesPage = lazy(() =>
  import("@/pages/ExplorePlacesPage").then((m) => ({ default: m.ExplorePlacesPage }))
);
const SavedTripsPage = lazy(() =>
  import("@/pages/SavedTripsPage").then((m) => ({ default: m.SavedTripsPage }))
);
const FavoritesPlacesPage = lazy(() =>
  import("@/pages/FavoritesPlacesPage").then((m) => ({ default: m.FavoritesPlacesPage }))
);

// Admin pages — lazy load
const AdminDashboardPage = lazy(() =>
  import("@/pages/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminPlacesReviewPage = lazy(() =>
  import("@/pages/AdminPlacesReviewPage").then((m) => ({ default: m.AdminPlacesReviewPage }))
);
const AdminStagingModerationPage = lazy(() =>
  import("@/pages/AdminStagingModerationPage").then((m) => ({ default: m.AdminStagingModerationPage }))
);
const AdminCityPipelinePage = lazy(() =>
  import("@/pages/AdminCityPipelinePage").then((m) => ({ default: m.AdminCityPipelinePage }))
);

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFDF3]">
      <Loading label="Đang tải..." />
    </div>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LazyFallback />}>{children}</Suspense>;
}

function PublicLayout() {
  return (
    <div className="min-h-screen bg-surface w-full overflow-y-auto">
      <Outlet />
    </div>
  );
}

function ProtectedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function LegacyTripRedirect() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate replace to="/trips" />;
  }

  return <Navigate replace to={`/trips/${id}`} />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<SignInPage />} />
        <Route path="/register" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      <Route path="/dashboard" element={<DashboardPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/explore" element={<LazyPage><ExplorePlacesPage /></LazyPage>} />
        <Route path="/favorites" element={<LazyPage><FavoritesPlacesPage /></LazyPage>} />
        <Route path="/planner" element={<LazyPage><PlanTripPage /></LazyPage>} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/trips" element={<LazyPage><SavedTripsPage /></LazyPage>} />
        <Route path="/trips/:tripId" element={<LazyPage><TripDetailPage /></LazyPage>} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={<LazyPage><AdminDashboardPage /></LazyPage>} />
      <Route path="/admin/places-review" element={<LazyPage><AdminPlacesReviewPage /></LazyPage>} />
      <Route path="/admin/staging-moderation" element={<LazyPage><AdminStagingModerationPage /></LazyPage>} />
      <Route path="/admin/place-pipelines" element={<LazyPage><AdminCityPipelinePage /></LazyPage>} />
      <Route path="/trip/:id" element={<LegacyTripRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
