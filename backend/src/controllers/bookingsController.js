// bookingsController.js — Handles booking creation and management.
//
// createBooking  POST /api/bookings        — owner sends a booking request
// getMyBookings  GET  /api/bookings        — returns bookings for the caller as owner AND as sitter
// updateBookingStatus PATCH /api/bookings/:id — sitter confirms/cancels; owner cancels
//
// Ownership rules:
//   createBooking: caller must own the pet being booked
//   updateBookingStatus: caller must be the owner or the sitter on the booking

const prisma = require('../utils/prismaClient');

// Fields to select when including sitter's user data in a booking response
const SITTER_USER_FIELDS = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
  },
};

// Fields to select when including owner's user data in a booking response
const OWNER_FIELDS = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
  },
};

// ── Create Booking ─────────────────────────────────────────────────────────

async function createBooking(req, res) {
  try {
    const clerkId = req.auth.userId;

    // Look up our internal user record
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { sitterProfile: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { sitterProfileId, petId, service, startDate, endDate, message } = req.body;

    // Validate required fields
    if (!sitterProfileId || !petId || !service || !startDate || !endDate) {
      return res.status(400).json({ error: 'sitterProfileId, petId, service, startDate, and endDate are required' });
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    if (end <= start) {
      return res.status(400).json({ error: 'endDate must be after startDate' });
    }

    // Verify the pet belongs to this user
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    if (pet.userId !== user.id) {
      return res.status(403).json({ error: 'You can only book with your own pets' });
    }

    // Verify the sitter exists and is available
    const sitterProfile = await prisma.sitterProfile.findUnique({
      where: { id: sitterProfileId },
    });
    if (!sitterProfile) return res.status(404).json({ error: 'Sitter not found' });
    if (!sitterProfile.isAvailable) {
      return res.status(400).json({ error: 'This sitter is currently unavailable' });
    }

    // Prevent self-booking
    if (sitterProfile.userId === user.id) {
      return res.status(400).json({ error: 'You cannot book yourself' });
    }

    // Validate the selected service is one the sitter offers
    if (!sitterProfile.services.includes(service)) {
      return res.status(400).json({ error: 'Sitter does not offer that service' });
    }

    // Check for manual availability blocks overlapping the requested dates
    const blocked = await prisma.availabilityBlock.findFirst({
      where: {
        sitterProfileId,
        startDate: { lte: end },
        endDate:   { gte: start },
      },
    });
    if (blocked) {
      return res.status(409).json({ error: 'Sitter is not available on those dates' });
    }

    // Check for existing active bookings overlapping the requested dates
    const conflict = await prisma.booking.findFirst({
      where: {
        sitterProfileId,
        status:    { in: ['PENDING', 'CONFIRMED'] },
        startDate: { lte: end },
        endDate:   { gte: start },
      },
    });
    if (conflict) {
      return res.status(409).json({ error: 'Those dates are already booked' });
    }

    // Compute total price: rate × number of nights (minimum 1)
    const nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    const totalPrice = sitterProfile.rate * nights;

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        ownerId:         user.id,
        sitterProfileId: sitterProfile.id,
        petId:           pet.id,
        service,
        startDate:  start,
        endDate:    end,
        totalPrice,
        message:    message || null,
        status:     'PENDING',
      },
      include: {
        pet: true,
        sitterProfile: { include: { user: SITTER_USER_FIELDS } },
      },
    });

    return res.status(201).json({ booking });
  } catch (err) {
    console.error('createBooking error:', err);
    return res.status(500).json({ error: 'Failed to create booking' });
  }
}

// ── Get My Bookings ────────────────────────────────────────────────────────

async function getMyBookings(req, res) {
  try {
    const clerkId = req.auth.userId;

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { sitterProfile: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Bookings where this user is the pet owner (include review if one exists)
    const ownerBookings = await prisma.booking.findMany({
      where:   { ownerId: user.id },
      include: {
        pet:          true,
        sitterProfile: { include: { user: SITTER_USER_FIELDS } },
        review:        true,
        payment:       true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Bookings received as a sitter (only if the user has a listing)
    let sitterBookings = [];
    if (user.sitterProfile) {
      sitterBookings = await prisma.booking.findMany({
        where:   { sitterProfileId: user.sitterProfile.id },
        include: {
          pet:     true,
          owner:   OWNER_FIELDS,
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return res.json({ ownerBookings, sitterBookings });
  } catch (err) {
    console.error('getMyBookings error:', err);
    return res.status(500).json({ error: 'Failed to fetch bookings' });
  }
}

// ── Update Booking Status ──────────────────────────────────────────────────

async function updateBookingStatus(req, res) {
  try {
    const clerkId   = req.auth.userId;
    const bookingId = req.params.id;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'status is required' });

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { sitterProfile: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Determine the caller's role in this booking
    const isOwner  = booking.ownerId === user.id;
    const isSitter = user.sitterProfile?.id === booking.sitterProfileId;

    if (!isOwner && !isSitter) {
      return res.status(403).json({ error: 'You are not part of this booking' });
    }

    // Validate allowed status transitions
    const current = booking.status;

    if (isSitter && !isOwner) {
      // Sitter can: confirm or cancel a PENDING booking, or mark a CONFIRMED booking as COMPLETED
      if (status === 'COMPLETED') {
        if (current !== 'CONFIRMED') {
          return res.status(400).json({ error: 'Can only mark a CONFIRMED booking as complete' });
        }
      } else {
        if (current !== 'PENDING') {
          return res.status(400).json({ error: `Sitter can only act on PENDING bookings (current: ${current})` });
        }
        if (status !== 'CONFIRMED' && status !== 'CANCELLED') {
          return res.status(400).json({ error: 'Sitter can only set status to CONFIRMED or CANCELLED' });
        }
      }
    } else if (isOwner && !isSitter) {
      // Owner can cancel a PENDING or CONFIRMED booking
      if (status !== 'CANCELLED') {
        return res.status(400).json({ error: 'Owner can only cancel a booking' });
      }
      if (current !== 'PENDING' && current !== 'CONFIRMED') {
        return res.status(400).json({ error: `Cannot cancel a booking with status ${current}` });
      }
    } else {
      // Edge case: user is both owner and sitter (should be blocked at create time, but just in case)
      return res.status(400).json({ error: 'Cannot act on your own booking' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data:  { status },
    });

    return res.json({ booking: updated });
  } catch (err) {
    console.error('updateBookingStatus error:', err);
    return res.status(500).json({ error: 'Failed to update booking' });
  }
}

module.exports = { createBooking, getMyBookings, updateBookingStatus };
