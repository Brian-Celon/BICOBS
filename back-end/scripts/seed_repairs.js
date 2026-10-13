/**
 * Seed initial bicycle repair tickets and ensure table constraint supports 'waiting'.
 * Usage: node scripts/seed_repairs.js
 */
require('dotenv').config();
const { pool } = require('../config/db');

const SAMPLE_REPAIRS = [
  {
    ticket_number: '#R001',
    customer_name: 'Carlos Mendoza',
    customer_phone: '09171234567',
    bike_model: 'Trek Domane AL 2 Disc',
    mechanic_name: 'Reynaldo',
    service_type: 'Brake Bleed & Tuning',
    problem_description: 'Hydraulic disc brakes feeling spongy, rear derailleur indexing adjustment',
    status: 'in-progress',
    estimated_cost: 850.00,
    estimated_finish: 'Today 3:00 PM'
  },
  {
    ticket_number: '#R002',
    customer_name: 'Maria Clara Santos',
    customer_phone: '09289876543',
    bike_model: 'Giant Talon 1 Mountain Bike',
    mechanic_name: 'Mark',
    service_type: 'Drivetrain Overhaul',
    problem_description: 'Chain slipping under high gear load, bottom bracket clicking noise',
    status: 'waiting',
    estimated_cost: 1200.00,
    estimated_finish: 'Tomorrow 11:00 AM'
  },
  {
    ticket_number: '#R003',
    customer_name: 'Juancho Bautista',
    customer_phone: '09395551234',
    bike_model: 'Sunpeed Kepler Gravel Bike',
    mechanic_name: 'Jun',
    service_type: 'Tubeless Wheel Setup',
    problem_description: 'Install tubeless rim tape, valves, and fresh sealant on both wheels',
    status: 'completed',
    estimated_cost: 650.00,
    estimated_finish: 'Completed'
  },
  {
    ticket_number: '#R004',
    customer_name: 'Angelo Reyes',
    customer_phone: '09187654321',
    bike_model: 'Specialized Allez E5 Sport',
    mechanic_name: 'Reynaldo',
    service_type: 'Full Bike Tune-Up',
    problem_description: 'Annual safety inspection, headset repacking, new bar tape wrap',
    status: 'in-progress',
    estimated_cost: 1500.00,
    estimated_finish: 'Today 5:30 PM'
  }
];

async function seedRepairs() {
  try {
    // 1. Update constraint if needed to include 'waiting'
    await pool.query(`
      ALTER TABLE repairs DROP CONSTRAINT IF EXISTS repairs_status_check;
      ALTER TABLE repairs ADD CONSTRAINT repairs_status_check 
        CHECK (status IN ('pending', 'in-progress', 'waiting', 'completed', 'cancelled'));
    `);
    console.log('[Seed Repairs] Successfully updated repairs_status_check to include "waiting".');

    const existing = await pool.query('SELECT COUNT(*) FROM repairs');
    const count = parseInt(existing.rows[0].count, 10);
    if (count > 0 && !process.argv.includes('--force')) {
      console.log(`[Seed Repairs] Repairs table already has ${count} records. Pass --force to re-seed.`);
      return;
    }

    if (process.argv.includes('--force')) {
      await pool.query('DELETE FROM repairs');
      console.log('[Seed Repairs] Cleared existing repair tickets.');
    }

    for (const r of SAMPLE_REPAIRS) {
      await pool.query(
        `INSERT INTO repairs (ticket_number, customer_name, customer_phone, bike_model, mechanic_name, service_type, problem_description, status, estimated_cost, estimated_finish)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (ticket_number) DO NOTHING`,
        [
          r.ticket_number,
          r.customer_name,
          r.customer_phone,
          r.bike_model,
          r.mechanic_name,
          r.service_type,
          r.problem_description,
          r.status,
          r.estimated_cost,
          r.estimated_finish
        ]
      );
    }
    console.log(`[Seed Repairs] Successfully seeded ${SAMPLE_REPAIRS.length} repair tickets!`);
  } catch (err) {
    console.error('[Seed Repairs Error]', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedRepairs();
