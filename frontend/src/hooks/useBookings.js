// useBookings.js — Fetches and manages bookings for the current user.
//
// Returns bookings in two separate lists:
//   ownerBookings  — bookings the user made as a pet owner
//   sitterBookings — booking requests received as a sitter (empty if user has no listing)
//
// Mutation functions update local state after a successful API call so the
// page refreshes without a full re-fetch.
//
// Same useCallback + useAuth pattern as usePets.js and useSitterProfile.js.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export function useBookings() {
  const { isSignedIn, isLoaded, getToken } = useAuth();

  const [ownerBookings,  setOwnerBookings]  = useState([]);
  const [sitterBookings, setSitterBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchBookings = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setLoading(true);
    setError(null);

    try {
      const token    = await getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load bookings');

      const data = await response.json();
      setOwnerBookings(data.ownerBookings);
      setSitterBookings(data.sitterBookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Create a booking (owner action) — adds the new booking to ownerBookings
  async function createBooking(payload) {
    const token    = await getToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to create booking');
    }

    const data = await response.json();
    setOwnerBookings((prev) => [data.booking, ...prev]);
    return data.booking;
  }

  // Update booking status — updates the booking in the relevant list
  async function updateBookingStatus(bookingId, status) {
    const token    = await getToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/${bookingId}`, {
      method:  'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to update booking');
    }

    const data = await response.json();
    const updated = data.booking;

    // Update whichever list contains this booking
    setOwnerBookings((prev) =>
      prev.map((b) => (b.id === updated.id ? { ...b, status: updated.status } : b))
    );
    setSitterBookings((prev) =>
      prev.map((b) => (b.id === updated.id ? { ...b, status: updated.status } : b))
    );

    return updated;
  }

  // Sitter calls this to confirm they received payment — attaches payment record to sitterBookings
  async function markAsPaid(bookingId) {
    const token    = await getToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ bookingId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to record payment');
    }

    const data = await response.json();
    setSitterBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, payment: data.payment } : b))
    );
    return data.payment;
  }

  // Owner calls this after paying — sends a chat message to the sitter with optional UTR
  async function sendPaymentMessage(bookingId, utrRef) {
    const content = utrRef
      ? `I've paid via UPI. Transaction ID: ${utrRef}`
      : `I've paid via UPI.`;

    const token    = await getToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/messages/${bookingId}`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ text: content }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to send payment message');
    }

    return (await response.json()).message;
  }

  // Create a review for a COMPLETED booking — attaches review to the booking in ownerBookings
  async function createReview(bookingId, rating, text) {
    const token    = await getToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reviews`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ bookingId, rating, text: text || undefined }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to submit review');
    }

    const data = await response.json();
    // Attach the new review to the matching booking so the form disappears
    setOwnerBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, review: data.review } : b))
    );
    return data.review;
  }

  return {
    ownerBookings,
    sitterBookings,
    loading,
    error,
    createBooking,
    updateBookingStatus,
    markAsPaid,
    sendPaymentMessage,
    createReview,
    refetch: fetchBookings,
  };
}
