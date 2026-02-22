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

module.exports = { sync, getMe };
