// App.jsx — The route map of the entire website.
//
// Two important changes from Feature 1:
//
// 1. /sign-in/* and /sign-up/* use the /* wildcard.
//    Clerk renders sub-routes internally (e.g. /sign-in/factor-one for the
//    verification step). React Router needs the wildcard to allow those through.
//    Without it, Clerk's multi-step flows break and you see a blank page.
//
// 2. /dashboard is wrapped in <ProtectedRoute>.
//    ProtectedRoute checks if the user is signed in. If not, it redirects to /sign-in.
//    Every future page that requires login gets this same wrapper.

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Public routes — anyone can visit */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />

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
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
