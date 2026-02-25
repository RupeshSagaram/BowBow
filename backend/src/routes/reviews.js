// reviews.js — Routes for the reviews resource.
// POST requires auth (only booking owners can write reviews).
// GET /sitter/:sitterProfileId is public — anyone can read a sitter's reviews.

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const reviewsController = require('../controllers/reviewsController');

router.post('/',                        requireAuth(), reviewsController.createReview);
router.get('/sitter/:sitterProfileId',               reviewsController.getReviewsForSitter);

module.exports = router;
