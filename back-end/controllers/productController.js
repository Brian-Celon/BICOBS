const Product = require('../models/Product');

// @desc    Get all products (supports category filter & search)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const { category, search, availableOnly } = req.query;
    let query = {};

    if (category) {
      query.category = category.toLowerCase();
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (availableOnly === 'true') {
      query.isAvailable = true;
      query.stockQuantity = { $gt: 0 };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product details by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Admin / Staff)
const createProduct = async (req, res, next) => {
  try {
    const { name, description, category, price, stockQuantity, sku, imageUrl } = req.body;

    if (!name || !category || price === undefined || stockQuantity === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide product name, category, price, and stock quantity'
      });
    }

    const product = await Product.create({
      name,
      description: description || '',
      category,
      price,
      stockQuantity,
      sku: sku || undefined,
      imageUrl: imageUrl || undefined
    });

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product details / inventory stock
// @route   PUT /api/products/:id
// @access  Private (Admin / Staff)
const updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Merge updates and save to trigger pre-save middleware (auto update availability)
    Object.assign(product, req.body);
    await product.save();

    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    await product.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
