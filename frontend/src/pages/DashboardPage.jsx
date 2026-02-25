// DashboardPage.jsx — The user's personal dashboard. Requires authentication.
//
// Role-based sections:
//   Owner (OWNER or BOTH):
//     My Pets           — up to 4 pet mini-cards; "Manage" link to /pets
//     Active Bookings   — PENDING + CONFIRMED owner bookings sorted by start date
//     Past Stays        — COMPLETED owner bookings (max 3 shown)
//
//   Sitter (SITTER or BOTH):
//     My Listing        — rate, services count, availability status
//     Pending Requests  — PENDING sitter bookings (owner wants to book)
//     Upcoming Stays    — CONFIRMED sitter bookings sorted by start date
//
// Onboarding redirect:
//   useUserSync() syncs Clerk user to DB. While syncing → spinner.
//   hasCompletedOnboarding === false → redirect to /onboarding.

import { useUser } from '@clerk/clerk-react';
import { useUserSync }      from '../hooks/useUserSync';
import { usePets }          from '../hooks/usePets';
import { useSitterProfile } from '../hooks/useSitterProfile';
import { useBookings }      from '../hooks/useBookings';
import { Navigate, Link }   from 'react-router-dom';

// ── Constants ──────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  OWNER:  'Pet Owner',
  SITTER: 'Pet Sitter',
  BOTH:   'Pet Owner & Sitter',
};

const ROLE_COLORS = {
  OWNER:  'bg-blue-100 text-blue-700',
  SITTER: 'bg-teal-100 text-teal-700',
  BOTH:   'bg-purple-100 text-purple-700',
};

const STATUS_STYLES = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100  text-green-700',
  CANCELLED: 'bg-gray-100   text-gray-500',
  COMPLETED: 'bg-blue-100   text-blue-700',
};

const SPECIES_ICONS = {
  Dog:          '🐶',
  Cat:          '🐱',
  Bird:         '🐦',
  Rabbit:       '🐰',
  Fish:         '🐟',
  'Guinea Pig': '🐹',
  Hamster:      '🐹',
  Other:        '🐾',
};

// ── Helper utilities ────────────────────────────────────────────────────────

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  });
}

// ── Sub-components ──────────────────────────────────────────────────────────

// Section heading with an optional "View all →" link on the right
function SectionHeader({ title, linkTo, linkLabel }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
      {linkTo && (
        <Link
          to={linkTo}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          {linkLabel ?? 'View all'} →
        </Link>
      )}
    </div>
  );
}

// Compact pet card — species icon + name + species/breed subtitle
function PetMiniCard({ pet }) {
  const icon     = SPECIES_ICONS[pet.species] ?? '🐾';
  const subtitle = [pet.species, pet.breed].filter(Boolean).join(' · ');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <span className="text-3xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="font-semibold text-gray-800 truncate">{pet.name}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// Compact booking row — pet + service + counterpart name + date range + status badge
function BookingRow({ booking, counterpartLabel }) {
  const statusStyle = STATUS_STYLES[booking.status] ?? 'bg-gray-100 text-gray-500';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          🐾 {booking.pet.name}
          <span className="font-normal text-gray-500"> · {booking.service}</span>
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{counterpartLabel}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-400">
          {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle}`}>
          {booking.status}
        </span>
      </div>
    </div>
  );
}

// Inline spinner shown inside a section while its data is fetching
function SectionSpinner() {
  return (
    <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useUser();
  const { dbUser, syncing }                       = useUserSync();
  const { pets,          loading: petsLoading }   = usePets();
  const { sitterProfile, loading: sitterLoading } = useSitterProfile();
  const {
    ownerBookings,
    sitterBookings,
    loading: bookingsLoading,
  } = useBookings();

  const isOwner  = dbUser?.role === 'OWNER'  || dbUser?.role === 'BOTH';
  const isSitter = dbUser?.role === 'SITTER' || dbUser?.role === 'BOTH';

  // Owner-side derived lists
  const activeOwnerBookings = ownerBookings
    .filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const pastOwnerBookings = ownerBookings
    .filter((b) => b.status === 'COMPLETED')
    .slice(0, 3); // cap at 3 on dashboard

  // Sitter-side derived lists
  const pendingRequests = sitterBookings
    .filter((b) => b.status === 'PENDING')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const upcomingStays = sitterBookings
    .filter((b) => b.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // Wait for Clerk→DB sync before making routing decisions
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
    <div className="max-w-5xl mx-auto px-4 py-12">

      {/* ── Profile header ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-10 flex items-center gap-5">
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt="Your avatar"
            className="w-16 h-16 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-2xl shrink-0">
            {user?.firstName?.[0]}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 truncate">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
          {dbUser?.role && (
            <span
              className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mt-2 ${ROLE_COLORS[dbUser.role]}`}
            >
              {ROLE_LABELS[dbUser.role]}
            </span>
          )}
        </div>

        <Link
          to="/profile"
          className="shrink-0 text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          Edit profile →
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════
          OWNER SECTION
          ══════════════════════════════════════════════════════════ */}
      {isOwner && (
        <div className="mb-12 flex flex-col gap-10">

          {/* My Pets */}
          <section>
            <SectionHeader title="My Pets" linkTo="/pets" linkLabel="Manage" />

            {petsLoading ? (
              <SectionSpinner />
            ) : pets.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-400">
                <p className="text-3xl mb-2">🐾</p>
                <p className="text-sm font-medium text-gray-500">No pets yet</p>
                <Link
                  to="/pets"
                  className="mt-3 inline-block text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Add your first pet →
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {pets.slice(0, 4).map((pet) => (
                    <PetMiniCard key={pet.id} pet={pet} />
                  ))}
                </div>
                {pets.length > 4 && (
                  <p className="mt-2 text-sm">
                    <Link to="/pets" className="text-teal-600 hover:text-teal-700 font-medium">
                      +{pets.length - 4} more pets →
                    </Link>
                  </p>
                )}
              </>
            )}
          </section>

          {/* Active Bookings (PENDING + CONFIRMED) */}
          <section>
            <SectionHeader title="Active Bookings" linkTo="/bookings" linkLabel="View all" />

            {bookingsLoading ? (
              <SectionSpinner />
            ) : activeOwnerBookings.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-400">
                <p className="text-sm font-medium text-gray-500">No active bookings</p>
                <Link
                  to="/search"
                  className="mt-2 inline-block text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Find a sitter →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeOwnerBookings.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    counterpartLabel={
                      b.sitterProfile?.user
                        ? `Sitter: ${b.sitterProfile.user.firstName} ${b.sitterProfile.user.lastName}`
                        : 'Sitter info unavailable'
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* Past Stays (COMPLETED) — only shown when at least one exists */}
          {!bookingsLoading && pastOwnerBookings.length > 0 && (
            <section>
              <SectionHeader title="Past Stays" linkTo="/bookings" linkLabel="View all" />
              <div className="flex flex-col gap-2">
                {pastOwnerBookings.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    counterpartLabel={
                      b.sitterProfile?.user
                        ? `Sitter: ${b.sitterProfile.user.firstName} ${b.sitterProfile.user.lastName}`
                        : 'Sitter info unavailable'
                    }
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SITTER SECTION
          ══════════════════════════════════════════════════════════ */}
      {isSitter && (
        <div className="flex flex-col gap-10">

          {/* My Listing status card */}
          <section>
            <SectionHeader title="My Sitter Listing" linkTo="/my-listing" linkLabel="Edit listing" />

            {sitterLoading ? (
              <SectionSpinner />
            ) : sitterProfile ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                  ${sitterProfile.rate}/night
                </span>
                <span className="text-xs text-gray-500">
                  {sitterProfile.services.length}{' '}
                  {sitterProfile.services.length === 1 ? 'service' : 'services'}
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    sitterProfile.isAvailable
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {sitterProfile.isAvailable ? 'Available' : 'Unavailable'}
                </span>
                <Link
                  to="/my-listing"
                  className="ml-auto text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Edit listing →
                </Link>
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-400">
                <p className="text-sm font-medium text-gray-500">No listing set up yet</p>
                <Link
                  to="/my-listing"
                  className="mt-2 inline-block text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Create your listing →
                </Link>
              </div>
            )}
          </section>

          {/* Pending Requests */}
          <section>
            <SectionHeader title="Pending Requests" linkTo="/bookings" linkLabel="Manage" />

            {bookingsLoading ? (
              <SectionSpinner />
            ) : pendingRequests.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No pending requests right now.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pendingRequests.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    counterpartLabel={
                      b.owner
                        ? `From: ${b.owner.firstName} ${b.owner.lastName}`
                        : 'Owner info unavailable'
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Stays (CONFIRMED) */}
          <section>
            <SectionHeader title="Upcoming Stays" linkTo="/bookings" linkLabel="Manage" />

            {bookingsLoading ? (
              <SectionSpinner />
            ) : upcomingStays.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No upcoming stays.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingStays.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    counterpartLabel={
                      b.owner
                        ? `From: ${b.owner.firstName} ${b.owner.lastName}`
                        : 'Owner info unavailable'
                    }
                  />
                ))}
              </div>
            )}
          </section>

        </div>
      )}

    </div>
  );
}
