// App.jsx — The route map of the entire website.
//
// Protected routes (require sign-in):
//   /dashboard   — user's home after login; redirects to /onboarding for new users
//   /onboarding  — first-time role selection; only reached from dashboard redirect
//   /profile     — view and edit role + bio
//   /pets        — manage pet profiles (add, edit, delete)
//   /my-listing  — sitter-only: create or edit the sitter's public listing
//   /bookings    — view and manage booking requests (as owner and/or sitter)
//
// Public routes (no sign-in needed):
//   /sitters/:id — public sitter profile page, viewable by anyone

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import ProfilePage from './pages/ProfilePage';
import PetsPage from './pages/PetsPage';
import SitterSetupPage from './pages/SitterSetupPage';
import SitterPage from './pages/SitterPage';
import BookingsPage from './pages/BookingsPage';
import MessagesPage from './pages/MessagesPage';
import PaymentsPage from './pages/PaymentsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import AdminReviewsPage from './pages/AdminReviewsPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Public routes — anyone can visit */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/sitters/:id" element={<SitterPage />} />

          {/* Clerk auth pages — /* wildcard required for Clerk's internal sub-routes */}
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />

          {/* Protected routes — must be signed in */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pets"
            element={
              <ProtectedRoute>
                <PetsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-listing"
            element={
              <ProtectedRoute>
                <SitterSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <PaymentsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes — require isAdmin === true in DB */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <AdminRoute>
                <AdminBookingsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <AdminRoute>
                <AdminReviewsPage />
              </AdminRoute>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
