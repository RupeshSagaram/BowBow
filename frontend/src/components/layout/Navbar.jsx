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
//
// Mobile menu: hamburger button (md:hidden) toggles a full-width dropdown
// with the same links. Clicking any link closes the menu.

import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';

// Shared active/inactive class logic for NavLinks
const navClass = ({ isActive }) =>
  isActive
    ? 'text-teal-600 font-semibold'
    : 'text-gray-600 hover:text-teal-600 transition-colors';

export default function Navbar() {
  const { isSignedIn, isLoaded } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-teal-600 tracking-tight" onClick={closeMenu}>
          🐾 BowBow
        </Link>

        {/* Desktop navigation links */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/search" className={navClass}>Find a Sitter</NavLink>
          {isSignedIn && <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>}
          {isSignedIn && <NavLink to="/bookings"  className={navClass}>Bookings</NavLink>}
          {isSignedIn && <NavLink to="/messages"  className={navClass}>Messages</NavLink>}
          {isSignedIn && <NavLink to="/pets"      className={navClass}>My Pets</NavLink>}
          {isSignedIn && <NavLink to="/profile"   className={navClass}>Profile</NavLink>}
        </div>

        {/* Right side: auth area + hamburger */}
        <div className="flex items-center gap-3">
          {/* Auth buttons/avatar — don't render until Clerk has loaded */}
          {isLoaded && (
            isSignedIn ? (
              <UserButton />
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="hidden sm:block text-gray-600 hover:text-teal-600 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Sign Up
                </Link>
              </>
            )
          )}

          {/* Hamburger button — only on mobile */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-teal-600 hover:bg-gray-50 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
          <NavLink to="/search"    className={navClass} onClick={closeMenu}>Find a Sitter</NavLink>
          {isSignedIn && <NavLink to="/dashboard" className={navClass} onClick={closeMenu}>Dashboard</NavLink>}
          {isSignedIn && <NavLink to="/bookings"  className={navClass} onClick={closeMenu}>Bookings</NavLink>}
          {isSignedIn && <NavLink to="/messages"  className={navClass} onClick={closeMenu}>Messages</NavLink>}
          {isSignedIn && <NavLink to="/pets"      className={navClass} onClick={closeMenu}>My Pets</NavLink>}
          {isSignedIn && <NavLink to="/profile"   className={navClass} onClick={closeMenu}>Profile</NavLink>}
          {isLoaded && !isSignedIn && (
            <Link
              to="/sign-in"
              className="text-gray-600 hover:text-teal-600 font-medium transition-colors"
              onClick={closeMenu}
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
