// DashboardPage.jsx — The user's personal dashboard. Requires authentication.
//
// This page is the landing spot after sign-in (forceRedirectUrl="/dashboard" in SignInPage).
//
// Onboarding redirect logic:
//   useUserSync() syncs the Clerk user to our DB and returns { dbUser, syncing }.
//   While syncing is true we show a spinner — we don't know the user's state yet.
//   Once syncing is done:
//     hasCompletedOnboarding === false  →  redirect to /onboarding (first-time users)
//     hasCompletedOnboarding === true   →  render the dashboard normally
//
// Role badge:
//   Displays a colour-coded pill showing the user's role (Owner / Sitter / Both).
//
// Pets summary card:
//   Shows the count of pets the user has registered and a link to /pets.
//
// Sitter listing card (role-gated):
//   Only shown when the user's role is SITTER or BOTH.
//   Shows whether they have a listing set up and links to /my-listing.

import { useUser } from '@clerk/clerk-react';
import { useUserSync } from '../hooks/useUserSync';
import { usePets } from '../hooks/usePets';
import { useSitterProfile } from '../hooks/useSitterProfile';
import { useBookings } from '../hooks/useBookings';
import { Navigate, Link } from 'react-router-dom';

const ROLE_LABELS = {
  OWNER: 'Pet Owner',
  SITTER: 'Pet Sitter',
  BOTH: 'Pet Owner & Sitter',
};

// Tailwind classes for each role badge — colour-coded so they're easy to scan
const ROLE_COLORS = {
  OWNER: 'bg-blue-100 text-blue-700',
  SITTER: 'bg-teal-100 text-teal-700',
  BOTH: 'bg-purple-100 text-purple-700',
};

export default function DashboardPage() {
  const { user } = useUser();
  const { dbUser, syncing } = useUserSync();
  const { pets, loading: petsLoading } = usePets();
  const { sitterProfile, loading: sitterLoading } = useSitterProfile();
  const { ownerBookings, loading: bookingsLoading } = useBookings();

  const isSitter = dbUser?.role === 'SITTER' || dbUser?.role === 'BOTH';

  const activeBookingsCount = ownerBookings.filter(
    (b) => b.status === 'PENDING' || b.status === 'CONFIRMED'
  ).length;

  // Wait for the sync to finish before making any routing decisions.
  // Without this, dbUser is null and we'd incorrectly redirect to /onboarding.
  if (syncing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // First-time user: hasn't chosen a role yet → send to onboarding
  if (dbUser && !dbUser.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Welcome back, {user?.firstName}! 👋
      </h1>
      <p className="text-gray-500 mb-10">
        Your dashboard is taking shape — more features coming soon.
      </p>

      <div className="flex flex-col gap-4 max-w-sm">

        {/* User info card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt="Your avatar"
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl">
                {user?.firstName?.[0]}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-gray-500">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>

          {/* Role badge — shows the user's chosen role */}
          {dbUser?.role && (
            <span
              className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 ${ROLE_COLORS[dbUser.role]}`}
            >
              {ROLE_LABELS[dbUser.role]}
            </span>
          )}

          <div>
            <Link
              to="/profile"
              className="text-sm text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2"
            >
              Edit your profile
            </Link>
          </div>
        </div>

        {/* My Pets summary card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">My Pets</p>
            <span className="text-2xl">🐾</span>
          </div>
          {petsLoading ? (
            <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
          ) : (
            <p className="text-2xl font-bold text-gray-800 mb-3">
              {pets.length} {pets.length === 1 ? 'pet' : 'pets'}
            </p>
          )}
          <Link
            to="/pets"
            className="text-sm text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2"
          >
            {pets.length === 0 ? 'Add your first pet' : 'Manage my pets'}
          </Link>
        </div>

        {/* My Bookings summary card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">My Bookings</p>
            <span className="text-2xl">📅</span>
          </div>
          {bookingsLoading ? (
            <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
          ) : (
            <p className="text-2xl font-bold text-gray-800 mb-3">
              {activeBookingsCount} active
            </p>
          )}
          <Link
            to="/bookings"
            className="text-sm text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2"
          >
            View all bookings
          </Link>
        </div>

        {/* My Sitter Listing card — only shown to sitters */}
        {isSitter && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">My Sitter Listing</p>
              <span className="text-2xl">⭐</span>
            </div>
            {sitterLoading ? (
              <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
            ) : (
              <p className="text-2xl font-bold text-gray-800 mb-3">
                {sitterProfile ? `$${sitterProfile.rate}/night` : 'Not set up'}
              </p>
            )}
            <Link
              to="/my-listing"
              className="text-sm text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2"
            >
              {sitterProfile ? 'Edit your listing' : 'Set up your listing'}
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
