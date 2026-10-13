const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://bicobs_db_user:SSaPsJ8gHkhLuIml9KMiHlAlr94lwJr5@dpg-db6cred9fdbs73fmlohg-a.singapore-postgres.render.com/bicobs_db';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Error] Unexpected error on idle client:', err.message);
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT current_database(), NOW() as current_time;');
    console.log(`[PostgreSQL] Connected to Supabase DB: ${res.rows[0].current_database} at ${res.rows[0].current_time}`);
    client.release();
  } catch (error) {
    console.error(`[PostgreSQL Error] Connection failed: ${error.message}`);
    console.warn(`[PostgreSQL Warning] Server will run, but database queries will fail until connected.`);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  connectDB
};
