/**
 * Seed realistic customer support tickets into Supabase PostgreSQL.
 * Links to existing customer accounts in the database.
 *
 * Usage: node scripts/seed_support_tickets.js
 */
require('dotenv').config();
const { pool } = require('../config/db');

const SAMPLE_TICKETS = [
  {
    ticket_number: '#TCK-1001',
    user_email: 'troylitsdancel.pdm@gmail.com',
    fallback_name: 'Troy Lits Dancel',
    category: 'Warranty / Repairs',
    subject: 'Front suspension squeaking after 2 weeks',
    status: 'Open',
    created_offset_hours: 4,
    messages: [
      {
        sender_type: 'user',
        sender_name: 'Troy Lits Dancel',
        message: 'Hi Taurus support, I bought a mountain bike from your Marilao store two weeks ago and the front fork is making loud squeaking sounds whenever going over bumps. Can I bring it in for inspection under warranty?'
      }
    ]
  },
  {
    ticket_number: '#TCK-1002',
    user_email: 'brianhoward.celon@gmail.com',
    fallback_name: 'Brian Celon',
    category: 'Shipping / Delivery',
    subject: 'Delivery status inquiry for Order #TBR-1042',
    status: 'In Progress',
    created_offset_hours: 18,
    messages: [
      {
        sender_type: 'user',
        sender_name: 'Brian Celon',
        message: "Hello, can I ask for an update on the delivery schedule for my Shimano Deore groupset order? The courier tracking hasn't updated since yesterday."
      },
      {
        sender_type: 'support',
        sender_name: 'Taurus Support Rep',
        message: 'Good day Brian! We checked with Lalamove dispatch and your package was picked up this morning. You should receive an SMS update before 3 PM today.'
      }
    ]
  },
  {
    ticket_number: '#TCK-1003',
    user_email: 'capisondajhonedrian@gmail.com',
    fallback_name: 'Jhon Edrian Capisonda',
    category: 'Product Information',
    subject: 'Compatibility of Sagmit Air Fork with 29er frame',
    status: 'Resolved',
    created_offset_hours: 42,
    messages: [
      {
        sender_type: 'user',
        sender_name: 'Jhon Edrian Capisonda',
        message: 'Hi! Is the Sagmit Air Suspension Fork 29er compatible with the Cult Odyssey frame or do I need a tapered adapter headset?'
      },
      {
        sender_type: 'support',
        sender_name: 'Taurus Support Rep',
        message: 'Hello Jhon! The Cult Odyssey frame has a 44-56mm tapered headtube, so you can fit this fork directly using the standard sealed bearing headset included with the frame.'
      }
    ]
  },
  {
    ticket_number: '#TCK-1004',
    user_email: 'troylitsdiazdancel@gmail.com',
    fallback_name: 'Troy Lits D. Dancel',
    category: 'Billing & Payment',
    subject: 'Payment receipt confirmation for GCash transaction',
    status: 'Closed',
    created_offset_hours: 72,
    messages: [
      {
        sender_type: 'user',
        sender_name: 'Troy Lits D. Dancel',
        message: 'Hello, I submitted my GCash payment reference number for Order #TBR-1045. Could you please confirm if the payment was reflected on your side?'
      },
      {
        sender_type: 'support',
        sender_name: 'Taurus Support Rep',
        message: 'Hello Troy! Yes, your GCash payment has been verified and your order is now in preparation for dispatch. Thank you!'
      }
    ]
  }
];

async function seedTickets() {
  console.log('[Seed Tickets] Checking database for existing support tickets...');
  try {
    const existing = await pool.query('SELECT COUNT(*) FROM support_tickets');
    const count = parseInt(existing.rows[0].count, 10);

    if (count > 0 && !process.argv.includes('--force')) {
      console.log(`[Seed Tickets] Database already contains ${count} ticket(s). Pass --force to re-seed.`);
      return;
    }

    if (process.argv.includes('--force')) {
      console.log('[Seed Tickets] --force flag detected. Clearing old support tickets...');
      await pool.query('DELETE FROM support_tickets');
    }

    // Lookup existing users by email
    const usersRes = await pool.query('SELECT id, full_name, email FROM users');
    const userMap = new Map();
    usersRes.rows.forEach(u => {
      userMap.set(u.email.toLowerCase(), u);
    });

    for (const t of SAMPLE_TICKETS) {
      const matchedUser = userMap.get(t.user_email.toLowerCase());
      const userId = matchedUser ? matchedUser.id : null;
      const custName = matchedUser ? matchedUser.full_name : t.fallback_name;

      const ticketInsert = await pool.query(
        `INSERT INTO support_tickets 
          (ticket_number, user_id, customer_name, customer_email, category, subject, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - ($8 || ' hours')::INTERVAL, NOW() - ($8 || ' hours')::INTERVAL)
         RETURNING id, ticket_number`,
        [t.ticket_number, userId, custName, t.user_email, t.category, t.subject, t.status, t.created_offset_hours]
      );

      const ticketId = ticketInsert.rows[0].id;

      for (const m of t.messages) {
        await pool.query(
          `INSERT INTO ticket_messages 
            (ticket_id, sender_type, sender_name, message, created_at)
           VALUES ($1, $2, $3, $4, NOW() - ($5 || ' hours')::INTERVAL)`,
          [ticketId, m.sender_type, m.sender_name, m.message, t.created_offset_hours]
        );
      }

      console.log(`[Seed Tickets] Created ${t.ticket_number} (${t.subject}) with ${t.messages.length} message(s).`);
    }

    console.log('[Seed Tickets] Successfully seeded support tickets!');
  } catch (err) {
    console.error('[Seed Tickets Error]', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedTickets();
