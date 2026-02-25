// messages.js — Routes for the per-booking message thread.
// Both GET and POST require auth — only the booking owner and sitter can access.

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const messagesController = require('../controllers/messagesController');

router.get( '/:bookingId', requireAuth(), messagesController.getMessages);
router.post('/:bookingId', requireAuth(), messagesController.sendMessage);

module.exports = router;
