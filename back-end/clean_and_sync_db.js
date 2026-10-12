const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function cleanAndSyncDatabase() {
  const productsPath = path.join(__dirname, 'data/products.json');
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

  console.log(`[CleanSync] Preparing to synchronize ${products.length} products to database...`);

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Temporarily neutralize old SKUs to avoid unique constraint collisions during re-alignment
    console.log('[CleanSync] Clearing transient SKU collisions...');
    await client.query("UPDATE products SET sku = 'TEMP-' || id || '-' || floor(random()*10000);");

    // 2. Upsert all 150 authentic products with their exact IDs 1..150
    console.log('[CleanSync] Upserting 150 authentic products...');
    const upsertSql = `
      INSERT INTO products (
        id, name, description, category, price, stock_quantity, sku, image_url, is_available, is_featured, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        price = EXCLUDED.price,
        stock_quantity = EXCLUDED.stock_quantity,
        sku = EXCLUDED.sku,
        image_url = EXCLUDED.image_url,
        is_available = EXCLUDED.is_available,
        is_featured = EXCLUDED.is_featured,
        updated_at = CURRENT_TIMESTAMP;
    `;

    for (const p of products) {
      await client.query(upsertSql, [
        p.id,
        p.name,
        p.description || '',
        p.category,
        p.price,
        p.stockQuantity || 15,
        p.sku,
        p.imageUrl,
        p.isAvailable !== false,
        p.isFeatured === true
      ]);
    }

    // 3. Relink existing order_items to accurate canonical IDs now that all 150 IDs exist
    console.log('[CleanSync] Updating order_items references...');
    await client.query(`
      UPDATE order_items 
      SET product_id = 1 
      WHERE product_name ILIKE '%pinewood climber%';
    `);
    await client.query(`
      UPDATE order_items 
      SET product_id = 2 
      WHERE product_name ILIKE '%cult odyssey%';
    `);
    await client.query(`
      UPDATE order_items 
      SET product_id = 3 
      WHERE product_name ILIKE '%toseek%';
    `);

    // 4. Remove any rogue products with ID > 150 if any
    const delRes = await client.query('DELETE FROM products WHERE id > 150;');
    if (delRes.rowCount > 0) {
      console.log(`[CleanSync] Removed ${delRes.rowCount} extraneous products with ID > 150.`);
    }

    // 5. Reset the sequence so future inserts start cleanly after 150
    await client.query("SELECT setval('products_id_seq', 150, true);");

    // 6. Update categories table item_count
    console.log('[CleanSync] Updating category item counts...');
    await client.query(`
      UPDATE categories c
      SET item_count = sub.cnt
      FROM (SELECT category, COUNT(*) as cnt FROM products GROUP BY category) sub
      WHERE c.slug = sub.category;
    `);

    // Update built_bikes item_count to total complete bikes (MTB + Road + Gravel)
    await client.query(`
      UPDATE categories
      SET item_count = (
        SELECT COUNT(*) 
        FROM products 
        WHERE category IN ('built_bikes', 'mountain_bikes', 'road_bikes', 'gravel_bikes')
      )
      WHERE slug = 'built_bikes';
    `);

    await client.query('COMMIT');
    console.log('[CleanSync] Successfully committed transaction!');

    // 7. Verification checks
    const prodCount = await client.query('SELECT count(*) FROM products;');
    console.log(`[Verification] Total products in DB: ${prodCount.rows[0].count}`);

    const sampleBikes = await client.query(`
      SELECT id, name, category, price, sku FROM products WHERE id <= 5 ORDER BY id ASC;
    `);
    console.log('[Verification] First 5 products in DB:');
    sampleBikes.rows.forEach(r => {
      console.log(`  #${r.id}: ${r.name} | Cat: ${r.category} | Price: ₱${r.price} | SKU: ${r.sku}`);
    });

    const categoriesRes = await client.query('SELECT slug, name, item_count FROM categories ORDER BY id ASC;');
    console.log('[Verification] Category item counts:');
    categoriesRes.rows.forEach(c => {
      console.log(`  ${c.slug}: ${c.item_count} (${c.name})`);
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CleanSync Error] Rolled back transaction:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

cleanAndSyncDatabase();
