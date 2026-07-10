import { Outlet, Route, Routes, Navigate, useParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { ExplorePlacesPage } from "@/pages/ExplorePlacesPage";
import { FavoritesPlacesPage } from "@/pages/FavoritesPlacesPage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { LandingPage } from "@/pages/LandingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlanTripPage } from "@/pages/PlanTripPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { SavedTripsPage } from "@/pages/SavedTripsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { TripDetailPage } from "@/pages/TripDetailPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { AdminPlacesReviewPage } from "@/pages/AdminPlacesReviewPage";
import { AdminStagingModerationPage } from "@/pages/AdminStagingModerationPage";
import { AdminCityPipelinePage } from "@/pages/AdminCityPipelinePage";

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
        <Route path="/explore" element={<ExplorePlacesPage />} />
        <Route path="/favorites" element={<FavoritesPlacesPage />} />
        <Route path="/planner" element={<PlanTripPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/trips" element={<SavedTripsPage />} />
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/admin/places-review" element={<AdminPlacesReviewPage />} />
      <Route path="/admin/staging-moderation" element={<AdminStagingModerationPage />} />
      <Route path="/admin/place-pipelines" element={<AdminCityPipelinePage />} />
      <Route path="/trip/:id" element={<LegacyTripRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
