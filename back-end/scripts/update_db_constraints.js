const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL missing from back-end/.env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('[Fix] Applying updated constraints to live database...');
    
    // 1. Add decline_reason column if not exists
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS decline_reason TEXT DEFAULT '';`);
    console.log('✓ decline_reason column verified');

    // 2. Drop and re-add orders_order_status_check
    await client.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;`);
    await client.query(`
      ALTER TABLE orders ADD CONSTRAINT orders_order_status_check 
        CHECK (order_status IN (
          'payment_confirmation', 'pending', 'confirmed', 'processing', 
          'ready_for_pickup', 'ready_for_delivery', 'out_for_delivery', 
          'shipped', 'completed', 'cancelled', 'declined'
        ));
    `);
    console.log('✓ orders_order_status_check updated to include payment_confirmation & declined');

    // 3. Drop and re-add orders_payment_status_check
    await client.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;`);
    await client.query(`
      ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'declined'));
    `);
    console.log('✓ orders_payment_status_check updated to include declined');

    // 4. Drop and re-add billings_payment_status_check
    await client.query(`ALTER TABLE billings DROP CONSTRAINT IF EXISTS billings_payment_status_check;`);
    await client.query(`
      ALTER TABLE billings ADD CONSTRAINT billings_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'declined'));
    `);
    console.log('✓ billings_payment_status_check updated to include declined');

    console.log('[Fix] ALL CONSTRAINTS APPLIED SUCCESSFULLY!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('[Fix Error]', err);
  process.exit(1);
});
