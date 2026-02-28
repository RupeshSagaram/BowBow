// socket/index.js — Socket.io setup for real-time messaging.
//
// initIO(httpServer)  — call once in server.js after creating the http server
// getIO()             — returns the io instance; safe to call from any module
//                       after initIO() has been called
//
// Auth flow:
//   1. Client passes its Clerk JWT in socket.handshake.auth.token
//   2. The auth middleware verifies the token with createClerkClient
//   3. On success, socket.data.clerkUserId is set for use in event handlers
//
// Room naming: 'booking:{bookingId}'
// Access control: before joining a room the server looks up the booking in
//   Postgres and confirms the caller is the owner or sitter.

'use strict';

const { Server }      = require('socket.io');
const { verifyToken } = require('@clerk/backend');
const prisma          = require('../utils/prismaClient');

// Module-level singleton — set once by initIO(), read by getIO()
let io = null;

// ── Exported: call once in server.js ────────────────────────────────────────
function initIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean),
      methods: ['GET', 'POST'],
    },
  });

  // Verify Clerk JWT on every connection attempt.
  // Rejects the connection immediately if the token is missing or invalid.
  // Uses verifyToken() from @clerk/backend directly — createClerkClient() does not
  // expose verifyToken as a method; it is a standalone module export only.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      socket.data.clerkUserId = payload.sub;
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message || err);
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const clerkUserId = socket.data.clerkUserId;

    // Client emits this when the user navigates to a booking thread.
    // Server verifies access before adding the socket to the room.
    socket.on('join_booking', async (bookingId, ack) => {
      try {
        const access = await resolveAccess(clerkUserId, bookingId);
        if (!access.allowed) {
          if (typeof ack === 'function') ack({ error: access.reason });
          return;
        }
        socket.join(`booking:${bookingId}`);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        console.error('join_booking error:', err);
        if (typeof ack === 'function') ack({ error: 'Server error' });
      }
    });

    // Client emits this when navigating away or switching conversations.
    socket.on('leave_booking', (bookingId) => {
      socket.leave(`booking:${bookingId}`);
    });
  });

  return io;
}

// ── Exported: call from any controller after initIO() has run ────────────────
function getIO() {
  if (!io) throw new Error('Socket.io not initialised. Call initIO() first.');
  return io;
}

// ── Internal helper ──────────────────────────────────────────────────────────
// Mirrors the resolveAccess logic in messagesController but returns a plain
// object instead of writing to res, so it can be used in the socket context.
async function resolveAccess(clerkUserId, bookingId) {
  const user = await prisma.user.findUnique({
    where:   { clerkId: clerkUserId },
    include: { sitterProfile: true },
  });
  if (!user) return { allowed: false, reason: 'User not found' };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { allowed: false, reason: 'Booking not found' };

  const isOwner  = booking.ownerId === user.id;
  const isSitter = user.sitterProfile &&
                   booking.sitterProfileId === user.sitterProfile.id;

  if (!isOwner && !isSitter) return { allowed: false, reason: 'Not part of this booking' };
  return { allowed: true };
}

module.exports = { initIO, getIO };
