// reviewsController.js — Handles creating and fetching reviews.
//
// createReview         POST /api/reviews           — owner submits a review for a completed booking
// getReviewsForSitter  GET  /api/reviews/sitter/:sitterProfileId — public; returns all reviews for a sitter
//
// Business rules:
//   - Only the booking owner can create a review
//   - Booking must have status COMPLETED
//   - One review per booking (@unique enforced at DB level; also checked here for a friendly error)
//   - Rating must be an integer 1–5

const prisma = require('../utils/prismaClient');

// Fields to include for the review author in public responses
const AUTHOR_FIELDS = {
  select: {
    id:        true,
    firstName: true,
    lastName:  true,
    avatarUrl: true,
  },
};

// ── Create Review ──────────────────────────────────────────────────────────

async function createReview(req, res) {
  try {
    const clerkId = req.auth.userId;

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { bookingId, rating, text } = req.body;

    if (!bookingId) return res.status(400).json({ error: 'bookingId is required' });
    if (rating == null) return res.status(400).json({ error: 'rating is required' });

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }

    // Fetch the booking and verify ownership
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.ownerId !== user.id) {
      return res.status(403).json({ error: 'Only the booking owner can leave a review' });
    }

    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Reviews can only be submitted for completed bookings' });
    }

    // Prevent duplicate reviews (also enforced by @unique in schema, but a friendly error is better)
    const existing = await prisma.review.findUnique({ where: { bookingId } });
    if (existing) {
      return res.status(409).json({ error: 'A review for this booking already exists' });
    }

    const review = await prisma.review.create({
      data: {
        bookingId,
        authorId:       user.id,
        sitterProfileId: booking.sitterProfileId,
        rating:         parsedRating,
        text:           text || null,
      },
      include: {
        author: AUTHOR_FIELDS,
      },
    });

    return res.status(201).json({ review });
  } catch (err) {
    console.error('createReview error:', err);
    return res.status(500).json({ error: 'Failed to create review' });
  }
}

// ── Get Reviews For Sitter ─────────────────────────────────────────────────

async function getReviewsForSitter(req, res) {
  try {
    const { sitterProfileId } = req.params;

    const reviews = await prisma.review.findMany({
      where:   { sitterProfileId },
      include: { author: AUTHOR_FIELDS },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ reviews });
  } catch (err) {
    console.error('getReviewsForSitter error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}

module.exports = { createReview, getReviewsForSitter };
