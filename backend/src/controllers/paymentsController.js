// paymentsController.js — Handles payment records for bookings paid via UPI.
//
// markAsPaid   POST /api/payments              — owner marks a confirmed booking as paid
// getPayment   GET  /api/payments/:bookingId   — owner or sitter checks payment status

const prisma = require('../utils/prismaClient');

// POST /api/payments
// Owner calls this after paying the sitter via UPI to record the payment.
async function markAsPaid(req, res) {
  try {
    const clerkId = req.auth.userId;
    const { bookingId, upiTransactionRef } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId },
      include: { payment: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.ownerId !== user.id) {
      return res.status(403).json({ error: 'Only the booking owner can mark payment' });
    }

    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({ error: 'Payment can only be recorded for CONFIRMED bookings' });
    }

    if (booking.payment) {
      return res.status(409).json({ error: 'Payment already recorded for this booking' });
    }

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount:           booking.totalPrice,
        status:           'PAID',
        upiTransactionRef: upiTransactionRef ? upiTransactionRef.trim() : null,
      },
    });

    return res.status(201).json({ payment });
  } catch (err) {
    console.error('markAsPaid error:', err);
    return res.status(500).json({ error: 'Failed to record payment' });
  }
}

// GET /api/payments/:bookingId
// Owner or sitter can check if the booking has been paid.
async function getPayment(req, res) {
  try {
    const clerkId   = req.auth.userId;
    const { bookingId } = req.params;

    const user = await prisma.user.findUnique({
      where:   { clerkId },
      include: { sitterProfile: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId },
      include: { payment: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isOwner  = booking.ownerId === user.id;
    const isSitter = user.sitterProfile?.id === booking.sitterProfileId;
    if (!isOwner && !isSitter) {
      return res.status(403).json({ error: 'Not part of this booking' });
    }

    return res.json({ payment: booking.payment ?? null });
  } catch (err) {
    console.error('getPayment error:', err);
    return res.status(500).json({ error: 'Failed to fetch payment' });
  }
}

module.exports = { markAsPaid, getPayment };
