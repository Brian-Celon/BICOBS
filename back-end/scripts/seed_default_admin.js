/**
 * Seed / restore the single default TaurOS administrator account.
 *
 * Usage (from back-end/):  node scripts/seed_default_admin.js
 *
 * - Creates admin@taurusbike.ph if missing, or resets its password/role if it exists.
 * - Pass --only to delete every other account so the default admin is the sole user.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const DEFAULT_ADMIN = {
  full_name: 'Taurus Administrator',
  email: 'admin@taurusbike.ph',
  password: 'taurus2026',
  phone_number: '09171234567',
  address: 'Taurus Bike Shop, Sandico St, Marilao, Bulacan'
};

async function seedDefaultAdmin() {
  const onlyAdmin = process.argv.includes('--only');
  try {
    if (onlyAdmin) {
      const removed = await pool.query(
        'DELETE FROM users WHERE LOWER(email) <> $1 RETURNING email',
        [DEFAULT_ADMIN.email]
      );
      console.log(`[Seed] Removed ${removed.rowCount} other account(s).`);
    }

    const hash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone_number, address, is_verified)
       VALUES ($1, $2, $3, 'admin', $4, $5, true)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = 'admin',
         is_verified = true
       RETURNING id, full_name, email, role;`,
      [DEFAULT_ADMIN.full_name, DEFAULT_ADMIN.email, hash, DEFAULT_ADMIN.phone_number, DEFAULT_ADMIN.address]
    );
    console.log('[Seed] Default admin ready:', result.rows[0]);
  } catch (err) {
    console.error('[Seed Error]', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedDefaultAdmin();
