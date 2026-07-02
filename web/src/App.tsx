import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { SideNavBar } from './components/SideNavBar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlanTripPage } from './pages/PlanTripPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { SavedTripsPage } from './pages/SavedTripsPage';
import { ExplorePlacesPage } from './pages/ExplorePlacesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { AdminPlacesPage } from './pages/AdminPlacesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ComponentLibraryPage } from './pages/ComponentLibraryPage';

// Layout wrapping sidebar dashboard navigation cockpit
const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex text-on-surface w-full h-screen">
      {/* Sidebar */}
      <SideNavBar />

      {/* Main Content Area */}
      <main className="flex-1 ml-20 p-container-padding overflow-y-auto bg-surface relative z-10 h-full">
        <Outlet />
      </main>
    </div>
  );
};

// Layout for public outer landing, registration and login pages
const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-surface w-full overflow-y-auto">
      <Outlet />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<SignInPage />} />
          <Route path="/register" element={<SignUpPage />} />
          <Route path="/component-library" element={<ComponentLibraryPage />} />
        </Route>

        {/* Dashboard Pages */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/planner" element={<PlanTripPage />} />
          <Route path="/trip/:id" element={<TripDetailPage />} />
          <Route path="/saved-trips" element={<SavedTripsPage />} />
          <Route path="/explore" element={<ExplorePlacesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin/places" element={<AdminPlacesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
