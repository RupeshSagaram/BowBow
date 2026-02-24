// BookingsPage.jsx — Protected page at /bookings.
//
// Shows the current user's bookings in two role-based sections:
//   "My Booking Requests" — shown to OWNER and BOTH; bookings they made as a pet owner
//   "Incoming Requests"   — shown to SITTER and BOTH; bookings they received as a sitter
//
// Status badge colors:
//   PENDING   → yellow
//   CONFIRMED → green
//   CANCELLED → gray
//   COMPLETED → blue
//
// Actions:
//   Owner on PENDING: [Cancel Request]
//   Sitter on PENDING: [Confirm] [Decline]
//   Other statuses: no action buttons

import { useBookings } from '../hooks/useBookings';
import { useDbUser }   from '../hooks/useDbUser';
import { Link }        from 'react-router-dom';

// Colour-coded status badges
const STATUS_STYLES = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100  text-green-700',
  CANCELLED: 'bg-gray-100   text-gray-500',
  COMPLETED: 'bg-blue-100   text-blue-700',
};

// Format a Date object as "Mon DD, YYYY"
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

// A single booking card row, with optional action buttons
function BookingCard({ booking, actions }) {
  const statusStyle = STATUS_STYLES[booking.status] ?? 'bg-gray-100 text-gray-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">

      {/* Top row: pet + service + dates */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-gray-800">
            🐾 {booking.pet.name}
            {booking.pet.species && (
              <span className="font-normal text-gray-500"> ({booking.pet.species})</span>
            )}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {booking.service} · {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
          </p>
        </div>

        {/* Status badge */}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle}`}>
          {booking.status}
        </span>
      </div>

      {/* Second row: sitter or owner info + price */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-sm text-gray-500">{actions.label}</p>
        <p className="text-sm font-semibold text-teal-700">${booking.totalPrice} total</p>
      </div>

      {/* Optional message */}
      {booking.message && (
        <p className="text-xs text-gray-400 italic mb-3">"{booking.message}"</p>
      )}

      {/* Action buttons */}
      {actions.buttons && actions.buttons.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {actions.buttons.map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              disabled={btn.disabled}
              className={btn.className}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const { ownerBookings, sitterBookings, loading, error, updateBookingStatus } = useBookings();
  const { dbUser, loading: userLoading } = useDbUser();

  const isOwner  = dbUser?.role === 'OWNER'  || dbUser?.role === 'BOTH';
  const isSitter = dbUser?.role === 'SITTER' || dbUser?.role === 'BOTH';

  if (loading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-sm">Failed to load bookings. Please refresh the page.</p>
      </div>
    );
  }

  const totalBookings = ownerBookings.length + sitterBookings.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Bookings</h1>
        <p className="text-gray-500 mt-1">Manage your booking requests in one place.</p>
      </div>

      {/* Empty state — no bookings at all */}
      {totalBookings === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-lg font-medium text-gray-500">No bookings yet</p>
          <p className="text-sm mt-1 mb-6">Book a sitter to get started.</p>
          <Link
            to="/search"
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            Find a Sitter
          </Link>
        </div>
      )}

      {/* ── Owner section ── */}
      {isOwner && ownerBookings.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">My Booking Requests</h2>
          <div className="flex flex-col gap-4">
            {ownerBookings.map((booking) => {
              const sitterUser = booking.sitterProfile?.user;
              const label = sitterUser
                ? `Sitter: ${sitterUser.firstName} ${sitterUser.lastName}`
                : 'Sitter info unavailable';

              const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';

              return (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  actions={{
                    label,
                    buttons: canCancel
                      ? [
                          {
                            label:     'Cancel Request',
                            onClick:   () => updateBookingStatus(booking.id, 'CANCELLED'),
                            className: 'text-sm font-medium text-gray-600 border border-gray-300 hover:border-gray-400 hover:text-gray-800 px-4 py-2 rounded-xl transition-colors',
                          },
                        ]
                      : [],
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── Sitter section ── */}
      {isSitter && sitterBookings.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Incoming Booking Requests</h2>
          <div className="flex flex-col gap-4">
            {sitterBookings.map((booking) => {
              const ownerUser = booking.owner;
              const label = ownerUser
                ? `From: ${ownerUser.firstName} ${ownerUser.lastName}`
                : 'Owner info unavailable';

              const isPending = booking.status === 'PENDING';

              return (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  actions={{
                    label,
                    buttons: isPending
                      ? [
                          {
                            label:     'Confirm',
                            onClick:   () => updateBookingStatus(booking.id, 'CONFIRMED'),
                            className: 'text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl transition-colors',
                          },
                          {
                            label:     'Decline',
                            onClick:   () => updateBookingStatus(booking.id, 'CANCELLED'),
                            className: 'text-sm font-medium text-gray-600 border border-gray-300 hover:border-gray-400 hover:text-gray-800 px-4 py-2 rounded-xl transition-colors',
                          },
                        ]
                      : [],
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
