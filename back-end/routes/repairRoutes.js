const express = require('express');
const router = express.Router();
const {
  getRepairs,
  createRepair,
  updateRepair,
  deleteRepair
} = require('../controllers/repairController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin', 'staff'), getRepairs);
router.post('/', protect, authorize('admin', 'staff'), createRepair);
router.put('/:id', protect, authorize('admin', 'staff'), updateRepair);
router.delete('/:id', protect, authorize('admin'), deleteRepair);

module.exports = router;
