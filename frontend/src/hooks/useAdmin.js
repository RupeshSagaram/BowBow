// useAdmin.js — Fetches and mutates admin data for the admin panel.
//
// Exposes separate fetch functions (not auto-fetched on mount) so each admin
// page can load its own data independently without coupling them together.
//
// Pattern matches useBookings.js: getToken() from useAuth(), manual fetch calls,
// optimistic local-state updates after mutations.

import { useAuth } from '@clerk/clerk-react';

const API = import.meta.env.VITE_API_URL;

export function useAdmin() {
  const { getToken } = useAuth();

  async function authHeaders() {
    const token = await getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async function fetchStats() {
    const res = await fetch(`${API}/api/admin/stats`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  }

  async function fetchUsers() {
    const res = await fetch(`${API}/api/admin/users`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  }

  async function fetchBookings() {
    const res = await fetch(`${API}/api/admin/bookings`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch bookings');
    return res.json();
  }

  async function fetchReviews() {
    const res = await fetch(`${API}/api/admin/reviews`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  }

  // ── Mutations ───────────────────────────────────────────────────────────────

  async function banUser(userId) {
    const res = await fetch(`${API}/api/admin/users/${userId}/ban`, {
      method: 'PATCH',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to ban user');
    }
    return res.json();
  }

  async function unbanUser(userId) {
    const res = await fetch(`${API}/api/admin/users/${userId}/unban`, {
      method: 'PATCH',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to unban user');
    }
    return res.json();
  }

  async function cancelBooking(bookingId) {
    const res = await fetch(`${API}/api/admin/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to cancel booking');
    }
    return res.json();
  }

  async function deleteReview(reviewId) {
    const res = await fetch(`${API}/api/admin/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to delete review');
    }
    return res.json();
  }

  return {
    fetchStats,
    fetchUsers,
    fetchBookings,
    fetchReviews,
    banUser,
    unbanUser,
    cancelBooking,
    deleteReview,
  };
}
