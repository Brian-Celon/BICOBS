const express = require('express');
const router = express.Router();
const { getCategories } = require('../controllers/productController');

// Public route to get all categories
router.get('/', getCategories);

module.exports = router;
