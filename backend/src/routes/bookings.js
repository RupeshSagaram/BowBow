// bookings.js — Routes for the bookings resource.
// All routes require authentication — bookings are always user-specific.

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const bookingsController = require('../controllers/bookingsController');

router.post('/',     requireAuth(), bookingsController.createBooking);
router.get('/',      requireAuth(), bookingsController.getMyBookings);
router.patch('/:id', requireAuth(), bookingsController.updateBookingStatus);

module.exports = router;
