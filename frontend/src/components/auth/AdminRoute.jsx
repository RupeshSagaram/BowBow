// AdminRoute.jsx — Guards pages that require the user to be an admin (isAdmin === true).
//
// Flow:
//   1. Wait for Clerk to load (isLoaded)
//   2. If not signed in, redirect to /sign-in
//   3. Wait for dbUser to load from our DB
//   4. If dbUser.isAdmin is false, redirect to / (home)
//   5. Otherwise render children

import { useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { useDbUser } from '../../hooks/useDbUser';

export default function AdminRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { dbUser, loading } = useDbUser();

  // Clerk still initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  // DB user still loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Signed in but not an admin
  if (!dbUser?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
