const express = require('express');
const router = express.Router();
const {
  getMyBillings,
  getBillingByOrder,
  getBillingByInvoiceNumber,
  getAllBillings,
  updatePaymentStatus
} = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/mybilling', protect, getMyBillings);
router.get('/order/:orderId', protect, getBillingByOrder);
router.get('/invoice/:invoiceNumber', protect, getBillingByInvoiceNumber);
router.get('/', protect, authorize('admin', 'staff'), getAllBillings);
router.put('/:id/payment', protect, authorize('admin', 'staff'), updatePaymentStatus);

module.exports = router;


