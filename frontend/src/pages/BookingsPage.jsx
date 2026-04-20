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
// Actions for owners:
//   PENDING/CONFIRMED → [Cancel Request]
//   COMPLETED + no review → inline review form (star selector + optional text)
//   COMPLETED + reviewed  → shows the submitted review
//
// Actions for sitters:
//   PENDING   → [Confirm] [Decline]
//   CONFIRMED → [Mark as Complete]

import { useState } from 'react';
import { useBookings }    from '../hooks/useBookings';
import { useDbUser }      from '../hooks/useDbUser';
import { Link }           from 'react-router-dom';
import PaymentSection     from '../components/PaymentSection';

// Colour-coded status badges
const STATUS_STYLES = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100  text-green-700',
  CANCELLED: 'bg-gray-100   text-gray-500',
  COMPLETED: 'bg-blue-100   text-blue-700',
};

// Format a Date string as "Mon DD, YYYY"
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

// Render N filled stars + (5-N) empty stars as text
function StarDisplay({ rating }) {
  return (
    <span className="text-yellow-500 tracking-tight">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

// Interactive star selector — calls onChange(rating) when a star is clicked
function StarSelector({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`text-2xl transition-colors ${
            star <= display ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// Inline review form shown beneath a COMPLETED owner booking card
function ReviewForm({ bookingId, onSubmit }) {
  const [rating,      setRating]      = useState(0);
  const [text,        setText]        = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating) return setError('Please select a star rating.');
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(bookingId, rating, text);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-100 pt-4 mt-2">
      <p className="text-sm font-medium text-gray-700 mb-2">Leave a review</p>
      <StarSelector value={rating} onChange={setRating} />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Share your experience… (optional)"
        className="w-full mt-3 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-teal-400 resize-none"
      />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
      >
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}

// Inline review display shown when a review already exists on the booking
function ReviewDisplay({ review }) {
  return (
    <div className="border-t border-gray-100 pt-4 mt-2">
      <p className="text-sm font-medium text-gray-700 mb-1">Your review</p>
      <StarDisplay rating={review.rating} />
      {review.text && (
        <p className="text-sm text-gray-500 mt-1 italic">"{review.text}"</p>
      )}
    </div>
  );
}

// A single booking card with optional action buttons and review section
function BookingCard({ booking, actions, reviewSection }) {
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
        <p className="text-sm font-semibold text-teal-700">₹{booking.totalPrice} total</p>
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
              className={btn.className}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* Review section (form or display) */}
      {reviewSection}
    </div>
  );
}

export default function BookingsPage() {
  const { ownerBookings, sitterBookings, loading, error, updateBookingStatus, markAsPaid, createReview } = useBookings();
  const { dbUser, loading: userLoading } = useDbUser();
  const [actionError, setActionError] = useState(null);

  const isOwner  = dbUser?.role === 'OWNER'  || dbUser?.role === 'BOTH';
  const isSitter = dbUser?.role === 'SITTER' || dbUser?.role === 'BOTH';

  async function handleAction(bookingId, status) {
    setActionError(null);
    try {
      await updateBookingStatus(bookingId, status);
    } catch (err) {
      setActionError(err.message);
    }
  }

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
      {ownerBookings.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">My Booking Requests</h2>
          <div className="flex flex-col gap-4">
            {ownerBookings.map((booking) => {
              const sitterUser = booking.sitterProfile?.user;
              const label = sitterUser
                ? `Sitter: ${sitterUser.firstName} ${sitterUser.lastName}`
                : 'Sitter info unavailable';

              const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';

              // Payment section for CONFIRMED bookings (owner pays sitter via UPI)
              let paymentSection = null;
              if (booking.status === 'CONFIRMED') {
                paymentSection = (
                  <PaymentSection booking={booking} onMarkPaid={markAsPaid} />
                );
              }

              // Review section: show form or existing review for COMPLETED bookings
              let reviewSection = null;
              if (booking.status === 'COMPLETED') {
                reviewSection = booking.review
                  ? <ReviewDisplay review={booking.review} />
                  : <ReviewForm bookingId={booking.id} onSubmit={createReview} />;
              }

              return (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  reviewSection={<>{paymentSection}{reviewSection}</>}
                  actions={{
                    label,
                    buttons: canCancel
                      ? [
                          {
                            label:     'Cancel Request',
                            onClick:   () => handleAction(booking.id, 'CANCELLED'),
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

      {/* Action error banner */}
      {actionError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{actionError}</p>
        </div>
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

              const isPending   = booking.status === 'PENDING';
              const isConfirmed = booking.status === 'CONFIRMED';

              const buttons = [];
              if (isPending) {
                buttons.push(
                  {
                    label:     'Confirm',
                    onClick:   () => handleAction(booking.id, 'CONFIRMED'),
                    className: 'text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl transition-colors',
                  },
                  {
                    label:     'Decline',
                    onClick:   () => handleAction(booking.id, 'CANCELLED'),
                    className: 'text-sm font-medium text-gray-600 border border-gray-300 hover:border-gray-400 hover:text-gray-800 px-4 py-2 rounded-xl transition-colors',
                  }
                );
              } else if (isConfirmed) {
                buttons.push({
                  label:     'Mark as Complete',
                  onClick:   () => handleAction(booking.id, 'COMPLETED'),
                  className: 'text-sm font-medium text-blue-600 border border-blue-300 hover:border-blue-400 hover:text-blue-800 px-4 py-2 rounded-xl transition-colors',
                });
              }

              // Payment status for sitter's CONFIRMED bookings
              let sitterPaymentSection = null;
              if (isConfirmed) {
                sitterPaymentSection = (
                  <div className="border-t border-gray-100 pt-3 mt-2">
                    {booking.payment?.status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                        <span>✓</span> Payment Received
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">
                        Awaiting Payment
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  reviewSection={sitterPaymentSection}
                  actions={{ label, buttons }}
                />
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
