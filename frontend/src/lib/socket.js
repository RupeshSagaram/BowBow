// socket.js — Singleton socket.io-client instance.
//
// One shared connection for the entire app — prevents multiple TCP handshakes
// when the user navigates between pages.
//
// autoConnect: false — the socket is NOT connected on import. connectSocket(token)
// must be called explicitly, after the user is authenticated and a fresh Clerk
// token is available. This avoids a race condition where the socket tries to
// authenticate before Clerk has loaded.

import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,
});

/**
 * Connect the socket with a Clerk JWT (if not already connected).
 * Always updates socket.auth so future reconnects (after a network drop)
 * use the latest token.
 *
 * @param {string} token — Clerk JWT from useAuth().getToken()
 */
export function connectSocket(token) {
  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
  // If already connected: no action needed.
  // setupSocket() in useMessages emits join_booking immediately on the live
  // socket, and handleReconnect re-joins if there's ever a real network drop.
}

/**
 * Disconnect the socket (e.g. on sign-out).
 */
export function disconnectSocket() {
  socket.disconnect();
}

/**
 * Returns the raw socket instance so hooks can call socket.on/off/emit.
 */
export function getSocket() {
  return socket;
}
