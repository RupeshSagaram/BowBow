// sitters.js — Maps URL paths to controller functions for sitter listing actions.
//
// All routes here are automatically prefixed with /api/sitters
// because of how they're registered in app.js:
//   app.use('/api/sitters', require('./routes/sitters'))
//
// IMPORTANT: Route order matters in Express.
// The /me routes must be declared BEFORE /:id, otherwise Express would
// match "me" as an id parameter and call getSitter with id="me".
//
// Public routes (no auth required):
//   GET /api/sitters       — browse all available sitters (Feature 6 will add filtering)
//   GET /api/sitters/:id   — view a single sitter's public profile
//
// Auth-protected routes:
//   GET /api/sitters/me    — get the signed-in user's own listing
//   PUT /api/sitters/me    — create or update the signed-in user's listing

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const sittersController = require('../controllers/sittersController');

// GET /api/sitters — returns all available sitter listings (public)
router.get('/', sittersController.getAllSitters);

// GET /api/sitters/me — returns the signed-in user's own sitter profile
// Must be declared before /:id to prevent "me" being matched as an id
router.get('/me', requireAuth(), sittersController.getMyListing);

// PUT /api/sitters/me — creates or updates the signed-in user's sitter profile
router.put('/me', requireAuth(), sittersController.upsertMyListing);

// PUT /api/sitters/me/availability — replaces all blocked date ranges for the sitter
router.put('/me/availability', requireAuth(), sittersController.updateMyAvailability);

// POST /api/sitters/me/photos — add a home photo URL (uploaded to Cloudinary by the frontend)
router.post('/me/photos', requireAuth(), sittersController.addPhoto);

// DELETE /api/sitters/me/photos — remove a home photo URL
router.delete('/me/photos', requireAuth(), sittersController.removePhoto);

// GET /api/sitters/:id — returns a single sitter's public profile (public)
router.get('/:id', sittersController.getSitter);

// GET /api/sitters/:id/availability — returns blocked ranges + booked ranges (public)
router.get('/:id/availability', sittersController.getSitterAvailability);

module.exports = router;
