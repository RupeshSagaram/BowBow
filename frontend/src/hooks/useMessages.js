// useMessages.js — Fetches and manages messages for a single booking thread.
//
// Takes a bookingId. Polls GET /api/messages/:bookingId every 5 seconds so
// both parties see new messages without requiring WebSockets.
// Polling pauses when bookingId is null/undefined (no conversation selected).
//
// sendMessage(text) — POST /api/messages/:bookingId
//   Optimistically appends the new message to local state immediately so the
//   sender sees it right away, without waiting for the next poll.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';

const POLL_INTERVAL_MS = 5000;

export function useMessages(bookingId) {
  const { getToken } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // Track the most-recently-fetched bookingId so stale responses don't
  // overwrite state if the user switches conversations quickly.
  const activeBookingRef = useRef(bookingId);
  useEffect(() => { activeBookingRef.current = bookingId; }, [bookingId]);

  const fetchMessages = useCallback(async () => {
    if (!bookingId) return;

    try {
      const token    = await getToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/messages/${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();

      // Discard the response if the user has already switched to a different booking
      if (activeBookingRef.current === bookingId) {
        setMessages(data.messages);
      }
    } catch (err) {
      if (activeBookingRef.current === bookingId) {
        setError(err.message);
      }
    } finally {
      if (activeBookingRef.current === bookingId) {
        setLoading(false);
      }
    }
  }, [bookingId, getToken]);

  // Initial fetch + 5-second polling interval
  useEffect(() => {
    if (!bookingId) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    setMessages([]);
    setLoading(true);
    setError(null);

    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchMessages, bookingId]);

  async function sendMessage(text) {
    const token    = await getToken();
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/messages/${bookingId}`,
      {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to send message');
    }

    const data = await response.json();
    // Append optimistically — the next poll will reconcile if needed
    setMessages((prev) => [...prev, data.message]);
    return data.message;
  }

  return { messages, loading, error, sendMessage };
}
