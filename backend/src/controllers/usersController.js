// usersController.js — Logic for user-related endpoints.
//
// sync():
//   Called by the frontend right after a user signs in.
//   It takes the Clerk user's data and "upserts" a record in our PostgreSQL database.
//   "Upsert" = update if the record already exists, insert if it doesn't.
//   This means it's safe to call every time the user logs in — no duplicates.
//
// getMe():
//   Returns the logged-in user's record from OUR database.
//   Future features (pets, bookings) will add relations to this user record.
//
// updateMe():
//   Called by the Onboarding and Profile pages to save user-controlled data.
//   Only updates fields we manage (role, bio, hasCompletedOnboarding).
//   firstName/lastName/avatarUrl are Clerk-managed and NOT updatable here.

const prisma = require('../utils/prismaClient');

// POST /api/users/sync
async function sync(req, res) {
  // req.auth is populated by Clerk's clerkMiddleware() and contains the verified JWT.
  // req.auth.userId is the Clerk user ID from the token.
  const { userId } = req.auth;

  const { clerkId, email, firstName, lastName, avatarUrl } = req.body;

  // Security check: the token must belong to the same person being synced.
  // This prevents user A from calling sync with user B's data.
  if (userId !== clerkId) {
    return res.status(403).json({ error: 'Forbidden: token does not match clerkId' });
  }

  try {
    const user = await prisma.user.upsert({
      where: { clerkId },       // find the row with this clerkId
      update: {                  // if found: update these fields
        email,
        firstName,
        lastName,
        avatarUrl: avatarUrl || null,
      },
      create: {                  // if not found: create a new row
        clerkId,
        email,
        firstName,
        lastName,
        avatarUrl: avatarUrl || null,
        // role defaults to OWNER as defined in the Prisma schema
      },
    });

    res.json({ user });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
}

// GET /api/users/me
async function getMe(req, res) {
  const { userId } = req.auth;

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found — have you synced yet?' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

// PATCH /api/users/me
async function updateMe(req, res) {
  const { userId } = req.auth;

  // Only allow updating fields the user controls in our DB.
  // We build the update object from only the fields that were actually sent
  // so this endpoint supports partial updates — callers don't have to send everything.
  const { role, bio, hasCompletedOnboarding } = req.body;

  const updateData = {};
  if (role !== undefined) updateData.role = role;
  if (bio !== undefined) updateData.bio = bio;
  if (hasCompletedOnboarding !== undefined) {
    updateData.hasCompletedOnboarding = hasCompletedOnboarding;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }

  const VALID_ROLES = ['OWNER', 'SITTER', 'BOTH'];
  if (updateData.role !== undefined && !VALID_ROLES.includes(updateData.role)) {
    return res.status(400).json({ error: 'Invalid role value' });
  }

  try {
    const user = await prisma.user.update({
      where: { clerkId: userId },
      data: updateData,
    });
    res.json({ user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

module.exports = { sync, getMe, updateMe };
