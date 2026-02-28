// useMessages.js — Fetches and manages messages for a single booking thread.
//
// Receiving  — socket 'new_message' event (replaces 5-second polling)
// Sending    — REST POST /api/messages/:bookingId (unchanged)
// Initial load — REST GET /api/messages/:bookingId (runs once per bookingId change)
//
// Socket lifecycle per bookingId:
//   mount / bookingId change:
//     1. getToken() → connectSocket(token)
//     2. socket.emit('join_booking', bookingId, ack)
//     3. socket.on('new_message', handler)
//     4. socket.on('connect', handleReconnect)      — re-joins room after network drop
//     5. socket.on('connect_error', handleConnectError) — refreshes expired token
//   cleanup (bookingId change or unmount):
//     socket.emit('leave_booking', bookingId)
//     socket.off(...)  — removes only the handlers registered in this effect

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { connectSocket, getSocket } from '../lib/socket';

export function useMessages(bookingId) {
  const { getToken } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // Guard against stale async responses when the user switches conversations quickly.
  const activeBookingRef = useRef(bookingId);
  useEffect(() => { activeBookingRef.current = bookingId; }, [bookingId]);

  // ── Initial load (REST GET) ────────────────────────────────────────────────
  // Runs once when bookingId changes to populate history before the socket is ready.
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
      if (activeBookingRef.current === bookingId) setMessages(data.messages);
    } catch (err) {
      if (activeBookingRef.current === bookingId) setError(err.message);
    } finally {
      if (activeBookingRef.current === bookingId) setLoading(false);
    }
  }, [bookingId, getToken]);

  // ── Socket lifecycle ───────────────────────────────────────────────────────
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

    // Load history immediately; socket handles new messages going forward.
    fetchMessages();

    const socket = getSocket();
    let mounted  = true;

    async function setupSocket() {
      try {
        if (socket.connected) {
          // Socket is live — join the room immediately, no async needed.
          // Update auth token in the background for future reconnects.
          socket.emit('join_booking', bookingId, (ack) => {
            if (!mounted) return;
            if (ack?.error) {
              console.error('join_booking error:', ack.error);
              setError('Could not join message room: ' + ack.error);
            }
          });
          getToken().then((token) => { socket.auth = { token }; }).catch(() => {});
          return;
        }

        // Socket not connected yet — need the token to authenticate the connection.
        const token = await getToken();
        if (!mounted) return;
        connectSocket(token);
        // join_booking is buffered; handleReconnect also joins when connect fires.
        socket.emit('join_booking', bookingId, (ack) => {
          if (!mounted) return;
          if (ack?.error) {
            console.error('join_booking error:', ack.error);
            setError('Could not join message room: ' + ack.error);
          }
        });
      } catch (err) {
        console.error('setupSocket error:', err);
        if (mounted) setError('Could not connect to real-time messaging');
      }
    }

    setupSocket();

    // Deduplicate: sender's optimistic append + the socket broadcast = same id.
    // Checking by id prevents a duplicate bubble appearing for the sender.
    function handleNewMessage({ message }) {
      if (!mounted) return;
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
    }

    // socket.io drops all room memberships on disconnect.
    // Re-join after every reconnect so messages aren't missed.
    function handleReconnect() {
      if (!mounted) return;
      socket.emit('join_booking', bookingId, (ack) => {
        if (ack?.error) console.error('Re-join after reconnect failed:', ack.error);
      });
    }

    // When the server rejects the connection (e.g. expired Clerk token),
    // fetch a fresh token and reconnect.
    async function handleConnectError(err) {
      console.warn('Socket connect error:', err.message);
      if (!mounted) return;
      try {
        const freshToken = await getToken({ skipCache: true });
        if (mounted) connectSocket(freshToken);
      } catch (tokenErr) {
        console.error('Could not refresh token:', tokenErr);
      }
    }

    socket.on('new_message',   handleNewMessage);
    socket.on('connect',       handleReconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      mounted = false;
      // Only emit leave_booking when the socket is live. If the socket isn't connected
      // yet (e.g. React StrictMode cleanup fires before the connection is established),
      // skipping this prevents the buffered emit from flushing AFTER join_booking and
      // kicking the socket out of the room.
      if (socket.connected) {
        socket.emit('leave_booking', bookingId);
      }
      // Remove only the handlers registered in this effect — safe with a singleton.
      socket.off('new_message',   handleNewMessage);
      socket.off('connect',       handleReconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [bookingId, fetchMessages, getToken]);

  // ── Send (REST POST — unchanged) ───────────────────────────────────────────
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
    // Append the confirmed message, deduplicating against the socket broadcast.
    // The server emits 'new_message' and sends this REST response from the same DB
    // write, so either can arrive first. Guard both paths with the same id check.
    setMessages((prev) =>
      prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message],
    );
    return data.message;
  }

  return { messages, loading, error, sendMessage };
}
