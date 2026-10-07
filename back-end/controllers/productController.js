const db = require('../config/db');

// Helper to format database row into API product object (supports both camelCase and snake_case)
const formatProduct = (row) => ({
  _id: row.id.toString(),
  id: row.id,
  name: row.name,
  description: row.description || '',
  category: row.category,
  price: parseFloat(row.price),
  stockQuantity: row.stock_quantity,
  stock_quantity: row.stock_quantity,
  sku: row.sku || '',
  imageUrl: row.image_url || '',
  image_url: row.image_url || '',
  isAvailable: row.is_available,
  is_available: row.is_available,
  isFeatured: row.is_featured,
  is_featured: row.is_featured,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// Helper to auto-generate standard Taurus SKU code if omitted
const generateBackendSKU = (category, productName) => {
  const cat = (category || '').toLowerCase().trim();
  let dept = 'GEN';
  if (['bicycles', 'built_bikes', 'mountain_bikes', 'road_bikes', 'gravel_bikes', 'bmx_urban', 'folding_commuter'].includes(cat)) {
    dept = 'BIC';
  } else if (['frame', 'frames', 'fork', 'handle_bar', 'stem', 'chain', 'upgrade_kit', 'gears', 'pedals', 'brakes', 'components', 'drivetrain'].includes(cat)) {
    dept = 'SPA';
  } else if (['tires', 'rims', 'rims_tires', 'hubs', 'wheelset'].includes(cat)) {
    dept = 'WHL';
  } else if (['saddle', 'handlebars_saddles', 'handle_grip', 'accessories', 'grips'].includes(cat)) {
    dept = 'ACC';
  } else if (['apparel', 'shoes', 'clothing', 'helmet'].includes(cat)) {
    dept = 'APP';
  }

  let nameCode = 'PRD';
  if (productName && typeof productName === 'string') {
    const cleaned = productName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length >= 3) {
      nameCode = cleaned.substring(0, Math.min(cleaned.length, 6));
    } else if (cleaned.length > 0) {
      nameCode = cleaned.padEnd(3, 'X');
    }
  }

  const rand = Math.floor(100 + Math.random() * 900);
  return `TBS-${dept}-${nameCode}-${rand}`;
};

// @desc    Get all products (supports category filter, search, availability)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const { category, search, availableOnly } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      const catLower = category.toLowerCase().trim();
      if (catLower === 'built_bikes' || catLower === 'bikes' || catLower === 'bicycles') {
        sql += ` AND LOWER(category) IN ('mountain_bikes', 'road_bikes', 'gravel_bikes', 'built_bikes')`;
      } else {
        const aliasMap = {
          'mtb': 'mountain_bikes',
          'mountain': 'mountain_bikes',
          'mountain_bike': 'mountain_bikes',
          'road': 'road_bikes',
          'road_bike': 'road_bikes',
          'gravel': 'gravel_bikes',
          'gravel_bike': 'gravel_bikes',
          'frames': 'frame',
          'forks': 'fork',
          'handlebars': 'handle_bar',
          'handlebar': 'handle_bar',
          'stems': 'stem',
          'chains': 'chain',
          'upgrade_kits': 'upgrade_kit',
          'gears': 'upgrade_kit',
          'saddles': 'saddle',
          'grips': 'handle_grip',
          'handle_grips': 'handle_grip'
        };
        params.push(aliasMap[catLower] || catLower);
        sql += ` AND LOWER(category) = $${params.length}`;
      }
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      sql += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    if (availableOnly === 'true') {
      sql += ` AND is_available = true AND stock_quantity > 0`;
    }

    sql += ' ORDER BY id ASC';

    const result = await db.query(sql, params);
    const formatted = result.rows.map(formatProduct);

    res.status(200).json({
      status: 'success',
      count: formatted.length,
      data: formatted
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
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid product ID'
      });
    }

    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: formatProduct(result.rows[0])
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
    const {
      name,
      description,
      category,
      price,
      stockQuantity,
      stock_quantity,
      sku,
      imageUrl,
      image_url,
      isAvailable,
      is_available,
      isFeatured,
      is_featured
    } = req.body;

    const finalStock = stockQuantity !== undefined ? stockQuantity : (stock_quantity !== undefined ? stock_quantity : 0);
    const finalImage = imageUrl || image_url || '';
    const finalAvailable = isAvailable !== undefined ? isAvailable : (is_available !== undefined ? is_available : true);
    const finalFeatured = isFeatured !== undefined ? isFeatured : (is_featured !== undefined ? is_featured : false);
    const finalSku = (sku && typeof sku === 'string' && sku.trim().length > 0) ? sku.trim() : generateBackendSKU(category, name);

    if (!name || !category || price === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide product name, category, and price'
      });
    }

    const sql = `
      INSERT INTO products (name, description, category, price, stock_quantity, sku, image_url, is_available, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      name,
      description || '',
      category.toLowerCase(),
      parseFloat(price),
      parseInt(finalStock, 10),
      finalSku,
      finalImage,
      finalAvailable,
      finalFeatured
    ];

    const result = await db.query(sql, values);

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: formatProduct(result.rows[0])
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
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
    }

    const existing = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    const current = existing.rows[0];
    const b = req.body;

    const name = b.name !== undefined ? b.name : current.name;
    const description = b.description !== undefined ? b.description : current.description;
    const category = b.category !== undefined ? b.category.toLowerCase() : current.category;
    const price = b.price !== undefined ? parseFloat(b.price) : current.price;
    const stockQuantity = b.stockQuantity !== undefined ? parseInt(b.stockQuantity, 10) : (b.stock_quantity !== undefined ? parseInt(b.stock_quantity, 10) : current.stock_quantity);
    const sku = b.sku !== undefined ? b.sku : current.sku;
    const imageUrl = b.imageUrl !== undefined ? b.imageUrl : (b.image_url !== undefined ? b.image_url : current.image_url);
    const isAvailable = b.isAvailable !== undefined ? b.isAvailable : (b.is_available !== undefined ? b.is_available : (stockQuantity > 0));
    const isFeatured = b.isFeatured !== undefined ? b.isFeatured : (b.is_featured !== undefined ? b.is_featured : current.is_featured);

    const updateSql = `
      UPDATE products
      SET name = $1, description = $2, category = $3, price = $4, stock_quantity = $5,
          sku = $6, image_url = $7, is_available = $8, is_featured = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `;

    const result = await db.query(updateSql, [
      name, description, category, price, stockQuantity, sku, imageUrl, isAvailable, isFeatured, id
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      data: formatProduct(result.rows[0])
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
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
    }

    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id;', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all product categories
// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY id ASC');
    res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct
};

