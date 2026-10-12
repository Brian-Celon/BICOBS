const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  cleanupDuplicates
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getProducts);
router.get('/cleanup-duplicates', cleanupDuplicates);
router.post('/cleanup-duplicates', cleanupDuplicates);
router.get('/categories', getCategories);
router.get('/:id', getProductById);

// Protected routes (Admin / Staff)
router.post('/', protect, authorize('admin', 'staff'), createProduct);
router.put('/:id', protect, authorize('admin', 'staff'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
