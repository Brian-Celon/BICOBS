const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  verifyOrderPayment,
  declineOrderPayment
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customer routes
router.post('/', protect, createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);

// Staff / Admin routes
router.get('/', protect, authorize('admin', 'staff'), getAllOrders);
router.put('/:id/status', protect, authorize('admin', 'staff'), updateOrderStatus);
router.put('/:id/verify-payment', protect, authorize('admin', 'staff'), verifyOrderPayment);
router.put('/:id/decline-payment', protect, authorize('admin', 'staff'), declineOrderPayment);

module.exports = router;
