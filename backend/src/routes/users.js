// users.js — Maps URL paths to controller functions for user-related actions.
//
// All routes here are automatically prefixed with /api/users
// because of how they're registered in app.js:
//   app.use('/api/users', require('./routes/users'))
//
// requireAuth() guards both routes:
//   - If the request has a valid Clerk JWT → req.auth is set → handler runs
//   - If no token or invalid token → 401 Unauthorized is returned automatically

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const usersController = require('../controllers/usersController');

// POST /api/users/sync — called by frontend after sign-in to sync user to our DB
router.post('/sync', requireAuth(), usersController.sync);

// GET /api/users/me — returns the logged-in user's database record
router.get('/me', requireAuth(), usersController.getMe);

// PATCH /api/users/me — updates user-controlled fields (role, bio, hasCompletedOnboarding)
router.patch('/me', requireAuth(), usersController.updateMe);

module.exports = router;
