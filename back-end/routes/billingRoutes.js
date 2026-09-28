const express = require('express');
const router = express.Router();
const {
  getBillingByOrder,
  getBillingByInvoiceNumber,
  getAllBillings
} = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/order/:orderId', protect, getBillingByOrder);
router.get('/invoice/:invoiceNumber', protect, getBillingByInvoiceNumber);
router.get('/', protect, authorize('admin', 'staff'), getAllBillings);

module.exports = router;
