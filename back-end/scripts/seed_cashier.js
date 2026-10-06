require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seedCashier() {
  try {
    const hash = await bcrypt.hash('taurus2026', 10);
    const sql = `
      INSERT INTO users (full_name, email, password_hash, role, phone_number, address, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        is_verified = true
      RETURNING id, full_name, email, role;
    `;
    const res = await pool.query(sql, [
      'Russel Lu Caisido',
      'russel@taurusbike.ph',
      hash,
      'staff',
      '09179876543',
      'Taurus Bike Shop, Marilao, Bulacan'
    ]);
    console.log('[Seed] Cashier account ready:', res.rows[0]);
  } catch (err) {
    console.error('[Seed Error]:', err.message);
  } finally {
    await pool.end();
  }
}

seedCashier();
