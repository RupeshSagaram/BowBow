// ProtectedRoute.jsx — Guards pages that require the user to be signed in.
//
// How it works:
//   useAuth() gives us { isSignedIn, isLoaded }
//   isLoaded  → false while Clerk is still reading the stored session (< 1 second)
//   isSignedIn → true if there's an active Clerk session, false otherwise
//
// While loading: show a spinner (avoids flashing the wrong page for a split second)
// Not signed in: redirect to /sign-in (the user never sees the protected content)
// Signed in: render whatever page was requested (the `children` prop)
//
// Usage in App.jsx:
//   <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

import { useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth();

  // Still initializing — show a centered spinner
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No active session — redirect to sign-in
  // `replace` means the /dashboard URL is replaced in history, so the back button works correctly
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  // Authenticated — render the protected page
  return children;
}
