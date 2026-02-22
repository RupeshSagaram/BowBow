// auth.js — Exports Clerk's Express middleware for protecting routes.
//
// clerkMiddleware():
//   Register this ONCE on the Express app (in app.js), before all routes.
//   It runs on every incoming request, verifies any JWT it finds in the
//   Authorization header, and populates req.auth with the decoded payload.
//   It does NOT block requests — even public routes go through it.
//   It just doesn't set req.auth if there's no valid token.
//
// requireAuth():
//   Apply this to individual routes that must be logged in.
//   It checks that req.auth was populated by clerkMiddleware.
//   If not, it automatically responds with 401 Unauthorized — no extra code needed.
//
// The Clerk SDK reads CLERK_SECRET_KEY from your .env automatically.
// You never pass it manually — it just needs to be set in the environment.
//
// Usage in route files:
//   const { requireAuth } = require('../middleware/auth');
//   router.get('/me', requireAuth(), myController.getMe);

const { clerkMiddleware, requireAuth } = require('@clerk/express');

module.exports = { clerkMiddleware, requireAuth };
