// admin.js — Routes for the admin panel API.
// All routes are protected by requireAdmin (Clerk auth + isAdmin DB check).

const router        = require('express').Router();
const requireAdmin  = require('../middleware/adminAuth');
const adminCtrl     = require('../controllers/adminController');

router.get('/stats',                    requireAdmin, adminCtrl.getStats);

router.get('/users',                    requireAdmin, adminCtrl.getUsers);
router.patch('/users/:id/ban',          requireAdmin, adminCtrl.banUser);
router.patch('/users/:id/unban',        requireAdmin, adminCtrl.unbanUser);

router.get('/bookings',                 requireAdmin, adminCtrl.getAllBookings);
router.patch('/bookings/:id/cancel',    requireAdmin, adminCtrl.cancelBooking);

router.get('/reviews',                  requireAdmin, adminCtrl.getAllReviews);
router.delete('/reviews/:id',           requireAdmin, adminCtrl.deleteReview);

module.exports = router;
