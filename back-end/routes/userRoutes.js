const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin', 'staff'), getAllUsers);
router.post('/', protect, authorize('admin'), createUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
