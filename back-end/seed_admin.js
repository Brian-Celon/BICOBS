const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function seedAdmin() {
  try {
    const hash = await bcrypt.hash('taurus2026', 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone_number, address, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (email) DO UPDATE SET 
         password_hash = EXCLUDED.password_hash, 
         role = 'admin', 
         is_verified = true
       RETURNING id, full_name, email, role, is_verified;`,
      [
        'Taurus Administrator',
        'admin@taurusbike.ph',
        hash,
        'admin',
        '09171234567',
        'Taurus Bike Shop, Sandico St, Marilao, Bulacan',
        true
      ]
    );
    console.log('[Admin Seed Success]', result.rows[0]);
  } catch (err) {
    console.error('[Admin Seed Error]', err);
  } finally {
    await pool.end();
  }
}

seedAdmin();
