const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getLowStockAlerts
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/summary', protect, authorize('admin', 'staff'), getDashboardSummary);
router.get('/low-stock', protect, authorize('admin', 'staff'), getLowStockAlerts);

module.exports = router;
