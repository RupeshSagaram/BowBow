// sittersController.js — Logic for sitter listing endpoints.
//
// A SitterProfile is a one-to-one extension of User for users who are sitters.
// It holds marketplace-specific data (rate, services, location, availability)
// that isn't needed for all users — only for those offering pet sitting.
//
// getMyListing()    — GET  /api/sitters/me    (auth required)
//   Returns the signed-in user's SitterProfile, or null if they haven't created one yet.
//
// upsertMyListing() — PUT  /api/sitters/me    (auth required)
//   Creates or updates the sitter profile. Uses prisma.upsert so it's safe to call
//   whether the record already exists or not. Validates that rate is a positive number.
//
// getSitter()       — GET  /api/sitters/:id   (public — no auth)
//   Returns a single sitter profile by its own id, with the user's name/avatar/bio.
//   Used by the public SitterPage.
//
// getAllSitters()   — GET  /api/sitters        (public — no auth)
//   Returns all available sitter listings with user data included.
//   Feature 6 (Search) will add filtering on top of this.

const prisma = require('../utils/prismaClient');

// Fields from User to include in public sitter responses
// id is included so the frontend can detect self-viewing on SitterPage
const PUBLIC_USER_FIELDS = {
  id:        true,
  firstName: true,
  lastName:  true,
  avatarUrl: true,
  bio:       true,
};

// GET /api/sitters/me
async function getMyListing(req, res) {
  const { userId } = req.auth; // Clerk ID

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // findUnique returns null if no SitterProfile exists — that's the expected state
    // for a sitter who hasn't set up their listing yet
    const sitterProfile = await prisma.sitterProfile.findUnique({
      where: { userId: user.id },
    });

    res.json({ sitterProfile }); // null is valid — frontend handles "not set up" state
  } catch (error) {
    console.error('Error fetching sitter listing:', error);
    res.status(500).json({ error: 'Failed to fetch sitter listing' });
  }
}

// PUT /api/sitters/me
async function upsertMyListing(req, res) {
  const { userId } = req.auth;

  const { rate, services, city, state, zipCode, isAvailable, yearsExperience } = req.body;

  // rate is required and must be a positive number
  if (rate === undefined || rate === null || rate === '') {
    return res.status(400).json({ error: 'rate is required' });
  }
  const parsedRate = parseFloat(rate);
  if (isNaN(parsedRate) || parsedRate < 0) {
    return res.status(400).json({ error: 'rate must be a non-negative number' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build the data object shared by both create and update
    const listingData = {
      rate:            parsedRate,
      services:        Array.isArray(services) ? services : [],
      city:            city    || null,
      state:           state   || null,
      zipCode:         zipCode || null,
      // isAvailable defaults to true — only override if explicitly sent
      isAvailable:     isAvailable !== undefined ? Boolean(isAvailable) : true,
      yearsExperience: yearsExperience != null && yearsExperience !== ''
                         ? parseInt(yearsExperience, 10)
                         : null,
    };

    // upsert: creates if it doesn't exist, updates if it does — safe to call either way
    const sitterProfile = await prisma.sitterProfile.upsert({
      where:  { userId: user.id },
      update: listingData,
      create: { userId: user.id, ...listingData },
    });

    res.json({ sitterProfile });
  } catch (error) {
    console.error('Error saving sitter listing:', error);
    res.status(500).json({ error: 'Failed to save sitter listing' });
  }
}

// GET /api/sitters/:id  (public)
async function getSitter(req, res) {
  const { id } = req.params;

  try {
    const sitterProfile = await prisma.sitterProfile.findUnique({
      where: { id },
      include: {
        user:    { select: PUBLIC_USER_FIELDS },
        reviews: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sitterProfile) {
      return res.status(404).json({ error: 'Sitter not found' });
    }

    // Compute average rating from the included reviews
    const avgRating = sitterProfile.reviews.length > 0
      ? Math.round(
          (sitterProfile.reviews.reduce((sum, r) => sum + r.rating, 0) / sitterProfile.reviews.length) * 10
        ) / 10
      : null;

    res.json({ sitterProfile: { ...sitterProfile, avgRating } });
  } catch (error) {
    console.error('Error fetching sitter:', error);
    res.status(500).json({ error: 'Failed to fetch sitter' });
  }
}

// GET /api/sitters  (public)
async function getAllSitters(req, res) {
  try {
    // Only return sitters who are currently available
    // Feature 6 (Search) will add location/service filtering on top of this
    const sitters = await prisma.sitterProfile.findMany({
      where: { isAvailable: true },
      include: {
        user:    { select: PUBLIC_USER_FIELDS },
        reviews: { select: { rating: true } }, // just ratings — avoid loading full review text for the list
      },
      orderBy: { createdAt: 'desc' },
    });

    // Attach avgRating and reviewCount to each sitter; strip out the raw ratings array
    const sittersWithRatings = sitters.map((s) => {
      const avgRating = s.reviews.length > 0
        ? Math.round(
            (s.reviews.reduce((sum, r) => sum + r.rating, 0) / s.reviews.length) * 10
          ) / 10
        : null;
      const { reviews, ...rest } = s;
      return { ...rest, avgRating, reviewCount: reviews.length };
    });

    res.json({ sitters: sittersWithRatings });
  } catch (error) {
    console.error('Error fetching sitters:', error);
    res.status(500).json({ error: 'Failed to fetch sitters' });
  }
}

module.exports = { getMyListing, upsertMyListing, getSitter, getAllSitters };
