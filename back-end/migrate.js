const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('[Migration] Connected to PostgreSQL. Applying schema.sql...');

    // 1. Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('[Migration] Database schema applied successfully (tables created)!');

    // 2. Seed products from data/products.json
    const productsPath = path.join(__dirname, 'data/products.json');
    if (fs.existsSync(productsPath)) {
      const rawProducts = fs.readFileSync(productsPath, 'utf8');
      const products = JSON.parse(rawProducts);
      console.log(`[Migration] Seeding ${products.length} products into products table...`);

      for (const p of products) {
        await client.query(
          `INSERT INTO products (name, description, category, price, stock_quantity, sku, image_url, is_available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (sku) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             category = EXCLUDED.category,
             price = EXCLUDED.price,
             stock_quantity = EXCLUDED.stock_quantity,
             image_url = EXCLUDED.image_url,
             is_available = EXCLUDED.is_available;`,
          [
            p.name,
            p.description || '',
            p.category || 'general',
            p.price || 0,
            p.stockQuantity || 0,
            p.sku,
            p.imageUrl || '',
            p.isAvailable !== false
          ]
        );
      }
      console.log(`[Migration] Successfully seeded ${products.length} products!`);
    }

    // 3. Count rows in products table
    const countRes = await client.query('SELECT COUNT(*) FROM products;');
    console.log(`[Migration] Verified total products in database: ${countRes.rows[0].count}`);

    // 4. List all tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('[Migration] Created tables in public schema:');
    tablesRes.rows.forEach(r => console.log('  - ' + r.table_name));

  } catch (error) {
    console.error('[Migration Error]', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
