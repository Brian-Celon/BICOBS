const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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
