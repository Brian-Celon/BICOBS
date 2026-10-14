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
  isArchived: !!row.is_archived,
  is_archived: !!row.is_archived,
  isFeatured: row.is_featured,
  is_featured: row.is_featured,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// @desc    Get all products (supports category filter, search, availability)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const { category, search, availableOnly, includeArchived, archived } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    // Archive filtering:
    // - archived === 'true': only archived products
    // - archived === 'all' or includeArchived === 'true': both active and archived
    // - default: only active products (COALESCE(is_archived, false) = false AND COALESCE(is_available, true) = true)
    if (archived === 'true') {
      sql += ' AND COALESCE(is_archived, false) = true';
    } else if (archived === 'all' || includeArchived === 'true') {
      // return all products
    } else {
      sql += ' AND COALESCE(is_archived, false) = false AND COALESCE(is_available, true) = true';
    }

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
    const { includeArchived } = req.query;

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

    const row = result.rows[0];
    if (row.is_archived && includeArchived !== 'true') {
      return res.status(404).json({
        status: 'error',
        message: 'Product is archived and no longer available'
      });
    }

    res.status(200).json({
      status: 'success',
      data: formatProduct(row)
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

    if (!name || !category || price === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide product name, category, and price'
      });
    }

    // Guard against duplicate product names to prevent price adjustment conflicts
    const existingName = await db.query(
      'SELECT id, name, price, category FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1',
      [name]
    );
    if (existingName.rows.length > 0) {
      const match = existingName.rows[0];
      return res.status(409).json({
        status: 'error',
        message: `Product "${match.name}" already exists (ID: ${match.id}, Category: ${match.category}, Price: ₱${parseFloat(match.price).toLocaleString()}). Please edit the existing product or use a distinct name to prevent price conflicts.`
      });
    }

    if (sku && sku.trim() !== '') {
      const existingSku = await db.query(
        'SELECT id, name FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM($1)) LIMIT 1',
        [sku.trim()]
      );
      if (existingSku.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: `SKU "${sku.trim()}" is already assigned to "${existingSku.rows[0].name}" (ID: ${existingSku.rows[0].id}).`
        });
      }
    }

    const sql = `
      INSERT INTO products (name, description, category, price, stock_quantity, sku, image_url, is_available, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      name.trim(),
      description || '',
      category.toLowerCase(),
      parseFloat(price),
      parseInt(finalStock, 10),
      sku ? sku.trim() : null,
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

    // Guard against renaming to another existing product's name
    if (b.name !== undefined && b.name.trim() !== '') {
      const dupCheck = await db.query(
        'SELECT id, name, category, price FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND id != $2 LIMIT 1',
        [b.name.trim(), id]
      );
      if (dupCheck.rows.length > 0) {
        const match = dupCheck.rows[0];
        return res.status(409).json({
          status: 'error',
          message: `Another product already exists with the name "${match.name}" (ID: ${match.id}, Category: ${match.category}, Price: ₱${parseFloat(match.price).toLocaleString()}). Product names must be distinct to prevent price conflicts.`
        });
      }
    }

    // Guard against duplicate SKU on update
    if (b.sku !== undefined && b.sku.trim() !== '') {
      const skuCheck = await db.query(
        'SELECT id, name FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM($1)) AND id != $2 LIMIT 1',
        [b.sku.trim(), id]
      );
      if (skuCheck.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: `SKU "${b.sku.trim()}" is already used by "${skuCheck.rows[0].name}" (ID: ${skuCheck.rows[0].id}).`
        });
      }
    }

    const name = b.name !== undefined ? b.name.trim() : current.name;
    const description = b.description !== undefined ? b.description : current.description;
    const category = b.category !== undefined ? b.category.toLowerCase() : current.category;
    const price = b.price !== undefined ? parseFloat(b.price) : current.price;
    const stockQuantity = b.stockQuantity !== undefined ? parseInt(b.stockQuantity, 10) : (b.stock_quantity !== undefined ? parseInt(b.stock_quantity, 10) : current.stock_quantity);
    const sku = b.sku !== undefined ? b.sku.trim() : current.sku;
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

// @desc    Archive a product (hide from store catalog)
// @route   PUT /api/products/:id/archive
// @access  Private (Admin / Staff)
const archiveProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
    }

    const result = await db.query(
      `UPDATE products 
       SET is_archived = true, is_available = false, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *;`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Product archived successfully',
      data: formatProduct(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unarchive / Restore a product
// @route   PUT /api/products/:id/unarchive
// @access  Private (Admin / Staff)
const unarchiveProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
    }

    const result = await db.query(
      `UPDATE products 
       SET is_archived = false, is_available = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *;`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Product restored successfully',
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
    const result = await db.query(`
      SELECT c.id, c.name, c.slug, c.description, c.image_url,
             COALESCE(p.cnt, 0)::int as item_count,
             c.created_at, c.updated_at
      FROM categories c
      LEFT JOIN (
        SELECT category, COUNT(*) as cnt
        FROM products
        WHERE COALESCE(is_archived, false) = false
        GROUP BY category
      ) p ON LOWER(c.slug) = LOWER(p.category)
      ORDER BY c.id ASC;
    `);
    res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    One-time cleanup of legacy duplicate products from database
// @route   GET|POST /api/products/cleanup-duplicates
// @access  Public (Self-healing migration utility)
const cleanupDuplicates = async (req, res, next) => {
  try {
    const deletedRes = await db.query(`
      DELETE FROM products 
      WHERE sku IN (
        'TBS-BIC-CULTODYS-002',
        'TBS-SPA-HANDLEPO-051',
        'TBS-SPA-SAGMITAE-107',
        'TBS-SPA-MAXXISAR-121',
        'TBS-SPA-9SPEEDSU-136',
        'TBS-SPA-RYDERX2-012',
        'TBS-SPA-WEAPONCA-023',
        'TBS-SPA-HANDLEBA-060',
        'TBS-SPA-GENOVAJU-070',
        'TBS-ACC-SEERPOLY-084',
        'TBS-SPA-SPEEDONE-095'
      ) OR name = 'Cult Odyssey Hydro Brakes 27 5'
      RETURNING id, name, sku;
    `);

    await db.query(`
      UPDATE products SET name = 'Speedone Soldier BOOST Air Suspension Fork' WHERE sku = 'TBS-SPA-SPEEDONE-028';
      UPDATE products SET name = 'Speedone Soldier BOOST Hubs' WHERE sku = 'TBS-SPA-SPEEDONE-036';
      UPDATE products SET name = 'Ragusa R100 Sealed Bearing Hubs' WHERE sku = 'TBS-SPA-RAGUSAR1-040';
      UPDATE products SET name = 'Ragusa R-100 Bike Saddle' WHERE sku = 'TBS-SPA-RAGUSAR1-074';
      UPDATE products SET name = 'Speedone Pilot Sealed Pedals' WHERE sku = 'TBS-SPA-SPEEDONE-096';
      UPDATE products SET name = 'Speedone Pilot Alloy Rims' WHERE sku = 'TBS-SPA-SPEEDONE-113';

      UPDATE categories c
      SET item_count = sub.cnt
      FROM (SELECT category, COUNT(*) as cnt FROM products WHERE COALESCE(is_archived, false) = false GROUP BY category) sub
      WHERE c.slug = sub.category;
    `);

    const countRes = await db.query('SELECT COUNT(*) FROM products;');

    res.status(200).json({
      status: 'success',
      message: 'Database duplicate products cleaned successfully!',
      deletedCount: deletedRes.rows.length,
      deletedItems: deletedRes.rows,
      totalRemainingProducts: parseInt(countRes.rows[0].count, 10)
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
  archiveProduct,
  unarchiveProduct,
  deleteProduct,
  cleanupDuplicates
};


