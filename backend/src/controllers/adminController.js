// adminController.js — Admin-only endpoints for the platform admin panel.
//
// All routes are protected by the requireAdmin middleware (see middleware/adminAuth.js).
// req.adminUser is already set by that middleware — no need to re-fetch the caller.
//
// Endpoints:
//   getStats       GET  /api/admin/stats                — platform-wide counts and revenue
//   getUsers       GET  /api/admin/users                — all users
//   banUser        PATCH /api/admin/users/:id/ban       — ban a user (hides sitter listing)
//   unbanUser      PATCH /api/admin/users/:id/unban     — unban a user
//   getAllBookings  GET  /api/admin/bookings             — all bookings across all users
//   cancelBooking  PATCH /api/admin/bookings/:id/cancel — force-cancel a booking
//   getAllReviews   GET  /api/admin/reviews              — all reviews
//   deleteReview   DELETE /api/admin/reviews/:id        — hard-delete a review

const prisma = require('../utils/prismaClient');

// ── Stats ────────────────────────────────────────────────────────────────────

async function getStats(req, res) {
  try {
    const [
      totalUsers,
      activeSitters,
      totalReviews,
      bookingCounts,
      revenueResult,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.sitterProfile.count({ where: { isAvailable: true } }),
      prisma.review.count(),
      // Count bookings grouped by status
      prisma.booking.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      // Sum totalPrice of COMPLETED bookings only
      prisma.booking.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),
    ]);

    // Turn groupBy array into a flat object: { PENDING: n, CONFIRMED: n, ... }
    const bookingsByStatus = {};
    for (const row of bookingCounts) {
      bookingsByStatus[row.status] = row._count.id;
    }

    return res.json({
      totalUsers,
      activeSitters,
      totalReviews,
      bookingsByStatus,
      totalRevenue: revenueResult._sum.totalPrice ?? 0,
    });
  } catch (err) {
    console.error('admin getStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────

async function getUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isAdmin: true,
        isBanned: true,
        createdAt: true,
        avatarUrl: true,
        sitterProfile: {
          select: { id: true, isAvailable: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ users });
  } catch (err) {
    console.error('admin getUsers error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function banUser(req, res) {
  try {
    const targetId = req.params.id;

    // Prevent self-ban
    if (targetId === req.adminUser.id) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }

    // Cannot ban other admins
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.isAdmin) return res.status(400).json({ error: 'Cannot ban another admin' });

    // Ban user and hide their sitter listing in one transaction
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: targetId },
        data: { isBanned: true },
      });

      if (target.sitterProfile) {
        await tx.sitterProfile.update({
          where: { userId: targetId },
          data: { isAvailable: false },
        });
      }

      return user;
    });

    return res.json({ user: updated });
  } catch (err) {
    console.error('admin banUser error:', err);
    return res.status(500).json({ error: 'Failed to ban user' });
  }
}

async function unbanUser(req, res) {
  try {
    const targetId = req.params.id;

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { isBanned: false },
    });

    return res.json({ user: updated });
  } catch (err) {
    console.error('admin unbanUser error:', err);
    return res.status(500).json({ error: 'Failed to unban user' });
  }
}

// ── Bookings ──────────────────────────────────────────────────────────────────

async function getAllBookings(req, res) {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        pet: { select: { id: true, name: true, species: true } },
        sitterProfile: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ bookings });
  } catch (err) {
    console.error('admin getAllBookings error:', err);
    return res.status(500).json({ error: 'Failed to fetch bookings' });
  }
}

async function cancelBooking(req, res) {
  try {
    const bookingId = req.params.id;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return res.status(400).json({ error: `Cannot cancel a ${booking.status} booking` });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    return res.json({ booking: updated });
  } catch (err) {
    console.error('admin cancelBooking error:', err);
    return res.status(500).json({ error: 'Failed to cancel booking' });
  }
}

// ── Reviews ───────────────────────────────────────────────────────────────────

async function getAllReviews(req, res) {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        sitterProfile: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ reviews });
  } catch (err) {
    console.error('admin getAllReviews error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}

async function deleteReview(req, res) {
  try {
    const reviewId = req.params.id;

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await prisma.review.delete({ where: { id: reviewId } });

    return res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('admin deleteReview error:', err);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
}

module.exports = {
  getStats,
  getUsers,
  banUser,
  unbanUser,
  getAllBookings,
  cancelBooking,
  getAllReviews,
  deleteReview,
};
