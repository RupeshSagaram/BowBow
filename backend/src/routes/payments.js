const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { markAsPaid, getPayment } = require('../controllers/paymentsController');

router.post('/',              requireAuth, markAsPaid);
router.get('/:bookingId',     requireAuth, getPayment);

module.exports = router;
