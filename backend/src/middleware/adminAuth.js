// adminAuth.js — Middleware that restricts a route to admin users only.
//
// How it works:
//   1. requireAuth() (from Clerk) ensures the request has a valid JWT.
//      If not, it automatically returns 401 before this middleware runs.
//   2. We then look up the user in our DB and check isAdmin === true.
//      If not, we return 403 Forbidden.
//
// Usage in route files:
//   const requireAdmin = require('../middleware/adminAuth');
//   router.get('/stats', requireAdmin, adminController.getStats);

const { requireAuth } = require('./auth');
const prisma = require('../utils/prismaClient');

// requireAdmin is an Express middleware array: Clerk check, then isAdmin check.
// Express processes them in order — if requireAuth() rejects, the DB check never runs.
const requireAdmin = [
  requireAuth(),

  async (req, res, next) => {
    try {
      const clerkId = req.auth.userId;
      const user = await prisma.user.findUnique({ where: { clerkId } });

      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Attach internal user id so controller can use it without another DB round-trip
      req.adminUser = user;
      next();
    } catch (err) {
      console.error('adminAuth error:', err);
      return res.status(500).json({ error: 'Server error during admin auth check' });
    }
  },
];

module.exports = requireAdmin;
