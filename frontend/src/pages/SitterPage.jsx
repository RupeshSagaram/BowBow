// SitterPage.jsx — Public sitter profile page at /sitters/:id
//
// This page is public — no auth required to VIEW the profile. Anyone can read
// a sitter's info. However, the booking form only appears for signed-in users
// who are NOT viewing their own profile.
//
// Data fetching:
//   Sitter profile: local useState + useEffect (no hook; single-page use)
//   Owner's pets: fetched conditionally when the user is signed in (for booking form dropdown)
//
// Booking section logic:
//   !isLoaded                             → render nothing (avoid flash)
//   isSignedIn + isSelf                   → hide booking card (viewing own profile)
//   !isSignedIn                           → "Sign in to request a booking" link
//   isSignedIn + !sitterProfile.isAvailable → "Currently unavailable" message
//   isSignedIn + available + not self     → full booking request form
//
// Total price preview: rate × max(1, endDate - startDate in days) — updated live

import { useState, useEffect } from 'react';
import { useParams, Link }     from 'react-router-dom';
import { useAuth }             from '@clerk/clerk-react';
import { useDbUser }           from '../hooks/useDbUser';
import { useAvailability }     from '../hooks/useAvailability';
import AvailabilityCalendar    from '../components/AvailabilityCalendar';

// Maps service names to emoji icons shown on the profile
const SERVICE_ICONS = {
  'Boarding':       '🏠',
  'Day Care':       '☀️',
  'Dog Walking':    '🦮',
  'Drop-In Visits': '🔔',
  'House Sitting':  '🛋️',
};

// Today's date in YYYY-MM-DD format for date input min attribute
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Compute nights between two date strings; returns null if invalid or non-positive
function computeNights(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const diff = new Date(endDate) - new Date(startDate);
  if (diff <= 0) return null;
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

const EMPTY_FORM = { service: '', petId: '', startDate: '', endDate: '', message: '' };

// Returns true if [startStr, endStr] overlaps any range in the given array
function isRangeOverlapping(startStr, endStr, ranges) {
  if (!startStr || !endStr) return false;
  const start = new Date(startStr);
  const end   = new Date(endStr);
  return ranges.some((r) => start <= new Date(r.endDate) && end >= new Date(r.startDate));
}

export default function SitterPage() {
  const { id } = useParams();

  // Sitter profile state
  const [sitterProfile, setSitterProfile] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [notFound, setNotFound]           = useState(false);

  // Auth state (for booking form visibility)
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { dbUser } = useDbUser();

  // Sitter availability — fetched for the calendar and booking validation
  const { blockedRanges, bookedRanges } = useAvailability(id);

  // Owner's pets for the booking form dropdown
  const [pets, setPets] = useState([]);

  // Booking form state
  const [bookingForm,       setBookingForm]       = useState(EMPTY_FORM);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess,    setBookingSuccess]    = useState(false);
  const [bookingError,      setBookingError]      = useState(null);
  const [dateRangeError,    setDateRangeError]    = useState(null);

  // ── Fetch sitter profile ───────────────────────────────────────────────

  useEffect(() => {
    async function fetchSitter() {
      try {
        // Public endpoint — no Authorization header needed
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sitters/${id}`);

        if (response.status === 404) {
          setNotFound(true);
          return;
        }

        if (!response.ok) throw new Error('Failed to load sitter');

        const data = await response.json();
        setSitterProfile(data.sitterProfile);
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchSitter();
  }, [id]);

  // ── Fetch owner's pets for the booking dropdown ────────────────────────

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function fetchPets() {
      try {
        const token    = await getToken();
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        setPets(data.pets ?? []);
      } catch {
        // Non-critical — form still renders; just shows "Add a pet first" prompt
      }
    }

    fetchPets();
  }, [isLoaded, isSignedIn, getToken]);

  // ── Booking form handlers ──────────────────────────────────────────────

  function handleBookingChange(e) {
    const { name, value } = e.target;
    const updated = { ...bookingForm, [name]: value };
    setBookingForm(updated);

    // Check if the selected date range overlaps any blocked or booked period
    if (updated.startDate && updated.endDate) {
      const allRanges = [...blockedRanges, ...bookedRanges];
      if (isRangeOverlapping(updated.startDate, updated.endDate, allRanges)) {
        setDateRangeError('Those dates overlap an unavailable period. Please choose different dates.');
      } else {
        setDateRangeError(null);
      }
    } else {
      setDateRangeError(null);
    }
  }

  async function handleBookingSubmit(e) {
    e.preventDefault();
    setBookingError(null);

    const { service, petId, startDate, endDate, message } = bookingForm;

    if (!service)   return setBookingError('Please select a service.');
    if (!petId)     return setBookingError('Please select a pet.');
    if (!startDate) return setBookingError('Please choose a start date.');
    if (!endDate)   return setBookingError('Please choose an end date.');
    if (endDate <= startDate) return setBookingError('End date must be after start date.');

    setBookingSubmitting(true);

    try {
      const token    = await getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          sitterProfileId: sitterProfile.id,
          petId,
          service,
          startDate,
          endDate,
          message: message || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send booking request');
      }

      setBookingSuccess(true);
      setBookingForm(EMPTY_FORM);

      // Reset success message after 4 seconds
      setTimeout(() => setBookingSuccess(false), 4000);
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingSubmitting(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────

  if (notFound || !sitterProfile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Sitter not found</h1>
        <p className="text-gray-500 mb-6">
          This listing may have been removed or the link is incorrect.
        </p>
        <Link
          to="/search"
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Browse Sitters
        </Link>
      </div>
    );
  }

  const { user } = sitterProfile;
  const location = [sitterProfile.city, sitterProfile.state].filter(Boolean).join(', ');

  // Detect if the signed-in user is viewing their own profile
  const isSelf = isLoaded && isSignedIn && dbUser?.id === user.id;

  // Live total price preview
  const nights       = computeNights(bookingForm.startDate, bookingForm.endDate);
  const previewTotal = nights ? (sitterProfile.rate * nights).toFixed(2) : null;

  // ── Profile ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">

        {/* Avatar + name + badges */}
        <div className="flex items-start gap-5 mb-5">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.firstName}'s avatar`}
              className="w-20 h-20 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-3xl shrink-0">
              {user.firstName?.[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-800">
              {user.firstName} {user.lastName}
            </h1>

            {/* Availability + rate + rating badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  sitterProfile.isAvailable
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {sitterProfile.isAvailable ? 'Available' : 'Unavailable'}
              </span>
              <span className="text-sm font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                ₹{sitterProfile.rate}/night
              </span>
              {sitterProfile.avgRating != null && (
                <span className="text-sm font-semibold text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                  ★ {sitterProfile.avgRating} ({sitterProfile.reviews?.length ?? 0})
                </span>
              )}
            </div>

            {/* Location */}
            {location && (
              <p className="text-sm text-gray-500 mt-2">📍 {location}</p>
            )}

            {/* Years experience */}
            {sitterProfile.yearsExperience != null && (
              <p className="text-sm text-gray-500 mt-1">
                ⭐ {sitterProfile.yearsExperience}{' '}
                {sitterProfile.yearsExperience === 1 ? 'year' : 'years'} of experience
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-600 leading-relaxed">{user.bio}</p>
          </div>
        )}
      </div>

      {/* Services card */}
      {sitterProfile.services.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Services</h2>
          <div className="flex flex-wrap gap-2">
            {sitterProfile.services.map((service) => (
              <span
                key={service}
                className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-sm font-medium px-3 py-1.5 rounded-full border border-teal-200"
              >
                <span>{SERVICE_ICONS[service] ?? '🐾'}</span>
                {service}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Availability calendar (public) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Availability</h2>
        <AvailabilityCalendar
          blockedRanges={blockedRanges}
          bookedRanges={bookedRanges}
        />
      </div>

      {/* ── Reviews section (public) ── */}
      {sitterProfile.reviews?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Reviews ({sitterProfile.reviews.length})
          </h2>
          <div className="flex flex-col gap-5">
            {sitterProfile.reviews.map((review) => (
              <div key={review.id} className="flex items-start gap-3">
                {/* Author avatar */}
                {review.author.avatarUrl ? (
                  <img
                    src={review.author.avatarUrl}
                    alt={`${review.author.firstName}'s avatar`}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                    {review.author.firstName?.[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-800">
                      {review.author.firstName} {review.author.lastName}
                    </p>
                    <span className="text-yellow-500 text-sm">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  </div>
                  {review.text && (
                    <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Booking section ── */}

      {/* Signed-out: prompt to sign in */}
      {isLoaded && !isSignedIn && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <p className="text-gray-500 mb-4">Sign in to request a booking with this sitter.</p>
          <Link
            to="/sign-in"
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            Sign In to Book
          </Link>
        </div>
      )}

      {/* Signed-in + not own profile + sitter is unavailable */}
      {isLoaded && isSignedIn && !isSelf && !sitterProfile.isAvailable && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <p className="text-gray-500">This sitter is currently unavailable for new bookings.</p>
        </div>
      )}

      {/* Signed-in + not own profile + sitter is available: booking form */}
      {isLoaded && isSignedIn && !isSelf && sitterProfile.isAvailable && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Request a Booking</h2>

          {bookingSuccess ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">✓</p>
              <p className="font-semibold text-green-700">Booking request sent!</p>
              <p className="text-sm text-gray-500 mt-1">
                The sitter will confirm or decline your request.
              </p>
              <Link
                to="/bookings"
                className="inline-block mt-4 text-sm text-teal-600 hover:text-teal-700 underline underline-offset-2"
              >
                View my bookings →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">

              {/* Service */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service <span className="text-red-500">*</span>
                </label>
                <select
                  name="service"
                  value={bookingForm.service}
                  onChange={handleBookingChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">Select a service…</option>
                  {sitterProfile.services.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Pet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your pet <span className="text-red-500">*</span>
                </label>
                {pets.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    You have no pets yet.{' '}
                    <Link to="/pets" className="text-teal-600 underline underline-offset-2">
                      Add a pet first
                    </Link>
                  </p>
                ) : (
                  <select
                    name="petId"
                    value={bookingForm.petId}
                    onChange={handleBookingChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="">Select a pet…</option>
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={bookingForm.startDate}
                    onChange={handleBookingChange}
                    min={todayStr()}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={bookingForm.endDate}
                    onChange={handleBookingChange}
                    min={bookingForm.startDate || todayStr()}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  name="message"
                  value={bookingForm.message}
                  onChange={handleBookingChange}
                  rows={3}
                  placeholder="Any notes or special instructions for the sitter…"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                />
              </div>

              {/* Live price preview */}
              {previewTotal && (
                <p className="text-sm text-gray-600">
                  Estimated total:{' '}
                  <span className="font-semibold text-teal-700">
                    ₹{previewTotal}
                  </span>{' '}
                  for {nights} night{nights !== 1 ? 's' : ''}
                </p>
              )}

              {/* Date availability warning */}
              {dateRangeError && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  {dateRangeError}
                </p>
              )}

              {/* Server error */}
              {bookingError && (
                <p className="text-sm text-red-500">{bookingError}</p>
              )}

              <button
                type="submit"
                disabled={bookingSubmitting || pets.length === 0}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                {bookingSubmitting ? 'Sending…' : 'Request Booking'}
              </button>

            </form>
          )}
        </div>
      )}

    </div>
  );
}
