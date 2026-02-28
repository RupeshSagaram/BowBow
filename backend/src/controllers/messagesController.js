// messagesController.js — Logic for the per-booking message thread.
//
// Each booking has one message thread shared between the pet owner and the sitter.
// Both parties can read and send messages; no one else can access the thread.
//
// getMessages()  — GET  /api/messages/:bookingId  (auth required)
//   Returns all messages for the booking, ordered oldest→newest.
//   Includes sender name + avatar so the frontend can render each bubble.
//
// sendMessage()  — POST /api/messages/:bookingId  (auth required)
//   Creates a new message in the thread. body: { text }
//   Returns the created message with sender data attached.

const prisma    = require('../utils/prismaClient');
const { getIO } = require('../socket');

// Sender fields to include in every message response
const SENDER_FIELDS = {
  select: {
    id:        true,
    firstName: true,
    lastName:  true,
    avatarUrl: true,
  },
};

// Helper — verifies the calling user is the owner or the sitter for this booking.
// Returns { user, booking } on success, throws on auth failure.
async function resolveAccess(clerkId, bookingId, res) {
  const user = await prisma.user.findUnique({
    where:   { clerkId },
    include: { sitterProfile: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return null;
  }

  const isOwner  = booking.ownerId === user.id;
  const isSitter = user.sitterProfile && booking.sitterProfileId === user.sitterProfile.id;

  if (!isOwner && !isSitter) {
    res.status(403).json({ error: 'You are not part of this booking' });
    return null;
  }

  return { user, booking };
}

// GET /api/messages/:bookingId
async function getMessages(req, res) {
  const { bookingId } = req.params;
  const { userId: clerkId } = req.auth;

  try {
    const access = await resolveAccess(clerkId, bookingId, res);
    if (!access) return;

    const messages = await prisma.message.findMany({
      where:   { bookingId },
      include: { sender: SENDER_FIELDS },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ messages });
  } catch (error) {
    console.error('getMessages error:', error);
    res.status(500).json({ error: 'Failed to load messages' });
  }
}

// POST /api/messages/:bookingId
async function sendMessage(req, res) {
  const { bookingId } = req.params;
  const { text }      = req.body;
  const { userId: clerkId } = req.auth;

  if (!text?.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  try {
    const access = await resolveAccess(clerkId, bookingId, res);
    if (!access) return;

    const message = await prisma.message.create({
      data:    { bookingId, senderId: access.user.id, text: text.trim() },
      include: { sender: SENDER_FIELDS },
    });

    // Broadcast to all sockets in this booking's room.
    // The sender's own socket receives it too; the frontend deduplicates by id.
    getIO().to(`booking:${bookingId}`).emit('new_message', { message });

    res.status(201).json({ message });
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

module.exports = { getMessages, sendMessage };
