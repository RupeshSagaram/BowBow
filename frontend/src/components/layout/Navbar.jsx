// Navbar.jsx — Top navigation bar, now auth-aware.
//
// useAuth() gives us { isSignedIn, isLoaded }
//   isLoaded  → false for ~1 second while Clerk checks for a stored session
//   isSignedIn → true once Clerk confirms an active session
//
// We only render the auth section after isLoaded is true.
// This prevents a "flash" where Sign In / Sign Up buttons briefly appear
// even though the user is already logged in.
//
// UserButton — Clerk's prebuilt avatar component.
//   Clicking it opens a dropdown with "Manage Account" and "Sign Out".
//   afterSignOutUrl="/" sends the user to the homepage after signing out.

import { Link, NavLink } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';

export default function Navbar() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-teal-600 tracking-tight">
          🐾 BowBow
        </Link>

        {/* Navigation links */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink
            to="/search"
            className={({ isActive }) =>
              isActive
                ? 'text-teal-600 font-semibold'
                : 'text-gray-600 hover:text-teal-600 transition-colors'
            }
          >
            Find a Sitter
          </NavLink>
          {isSignedIn && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive
                  ? 'text-teal-600 font-semibold'
                  : 'text-gray-600 hover:text-teal-600 transition-colors'
              }
            >
              Dashboard
            </NavLink>
          )}
          {isSignedIn && (
            <NavLink
              to="/bookings"
              className={({ isActive }) =>
                isActive
                  ? 'text-teal-600 font-semibold'
                  : 'text-gray-600 hover:text-teal-600 transition-colors'
              }
            >
              Bookings
            </NavLink>
          )}
          {isSignedIn && (
            <NavLink
              to="/messages"
              className={({ isActive }) =>
                isActive
                  ? 'text-teal-600 font-semibold'
                  : 'text-gray-600 hover:text-teal-600 transition-colors'
              }
            >
              Messages
            </NavLink>
          )}
          {isSignedIn && (
            <NavLink
              to="/pets"
              className={({ isActive }) =>
                isActive
                  ? 'text-teal-600 font-semibold'
                  : 'text-gray-600 hover:text-teal-600 transition-colors'
              }
            >
              My Pets
            </NavLink>
          )}
          {isSignedIn && (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                isActive
                  ? 'text-teal-600 font-semibold'
                  : 'text-gray-600 hover:text-teal-600 transition-colors'
              }
            >
              Profile
            </NavLink>
          )}
        </div>

        {/* Auth area — changes based on sign-in state */}
        <div className="flex items-center gap-3 min-w-30 justify-end">
          {/* Don't render until Clerk has loaded — prevents flickering */}
          {isLoaded && (
            isSignedIn ? (
              // Signed in: show Clerk's avatar button (opens dropdown with sign out)
              // afterSignOutUrl is configured on ClerkProvider in main.jsx
              <UserButton />
            ) : (
              // Not signed in: show Sign In link + Sign Up button
              <>
                <Link
                  to="/sign-in"
                  className="text-gray-600 hover:text-teal-600 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )
          )}
        </div>

      </div>
    </nav>
  );
}
