const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  createPosOrder,
  getPosOrders,
  getPosSummary
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Dedicated in-store POS Terminal routes (Counter Checkout)
router.post('/pos', createPosOrder);
router.get('/pos/summary', getPosSummary);
router.get('/pos', getPosOrders);

// Customer routes
router.post('/', protect, createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);

// Staff / Admin routes
router.get('/', protect, authorize('admin', 'staff'), getAllOrders);
router.put('/:id/status', protect, authorize('admin', 'staff'), updateOrderStatus);

module.exports = router;
