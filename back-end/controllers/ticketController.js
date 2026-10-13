const db = require('../config/db');

// @desc    Create a new support ticket
// @route   POST /api/tickets
// @access  Private
const createTicket = async (req, res, next) => {
  try {
    const { category, subject, description } = req.body;

    if (!subject || !category || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide category, subject, and description for the ticket'
      });
    }

    let userId = req.user ? req.user.id : null;
    let customerName = req.user ? (req.user.full_name || req.user.name) : (req.body.customerName || 'Customer');
    const customerEmail = req.user ? req.user.email : (req.body.customerEmail ? req.body.customerEmail.trim() : '');

    // Auto-resolve userId from users table if unauthenticated but email provided
    if (!userId && customerEmail) {
      try {
        const userLookup = await db.query('SELECT id, full_name FROM users WHERE LOWER(email) = LOWER($1)', [customerEmail]);
        if (userLookup.rows.length > 0) {
          userId = userLookup.rows[0].id;
          if (!req.body.customerName || customerName === 'Customer') {
            customerName = userLookup.rows[0].full_name;
          }
        }
      } catch (lookupErr) {
        // Continue with null userId if lookup fails
      }
    }

    // Generate guaranteed unique ticket number #TCK-XXXX
    let nextNum = 1001;
    try {
      const maxNumRes = await db.query(
        "SELECT COALESCE(MAX(NULLIF(regexp_replace(ticket_number, '\\D', '', 'g'), '')::integer), 1000) AS max_num FROM support_tickets"
      );
      if (maxNumRes.rows.length > 0 && maxNumRes.rows[0].max_num) {
        nextNum = parseInt(maxNumRes.rows[0].max_num, 10) + 1;
      }
    } catch (e) {
      nextNum = Date.now() % 9000 + 1000;
    }

    let ticketNumber = `#TCK-${nextNum}`;
    let exists = await db.query('SELECT id FROM support_tickets WHERE ticket_number = $1', [ticketNumber]);
    while (exists.rows.length > 0) {
      nextNum++;
      ticketNumber = `#TCK-${nextNum}`;
      exists = await db.query('SELECT id FROM support_tickets WHERE ticket_number = $1', [ticketNumber]);
    }

    // Insert ticket
    const ticketInsertRes = await db.query(
      `INSERT INTO support_tickets 
       (ticket_number, user_id, customer_name, customer_email, category, subject, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Open')
       RETURNING *`,
      [ticketNumber, userId, customerName, customerEmail, category.trim(), subject.trim()]
    );
    const newTicket = ticketInsertRes.rows[0];

    // Insert initial message
    const msgInsertRes = await db.query(
      `INSERT INTO ticket_messages 
       (ticket_id, sender_type, sender_name, message)
       VALUES ($1, 'user', $2, $3)
       RETURNING *`,
      [newTicket.id, customerName, description.trim()]
    );

    res.status(201).json({
      status: 'success',
      message: 'Support ticket created successfully',
      data: {
        id: newTicket.id,
        ticketNumber: newTicket.ticket_number,
        category: newTicket.category,
        subject: newTicket.subject,
        status: newTicket.status,
        createdAt: newTicket.created_at,
        messages: [msgInsertRes.rows[0]]
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tickets for logged-in user
// @route   GET /api/tickets/my-tickets
// @access  Private
const getMyTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userEmail = (req.user.email || '').trim().toLowerCase();

    const query = `
      SELECT 
        t.id,
        t.ticket_number AS "ticketNumber",
        t.category,
        t.subject,
        t.status,
        t.created_at AS "createdAt",
        t.updated_at AS "updatedAt",
        COUNT(m.id)::int AS "messageCount",
        (
          SELECT message 
          FROM ticket_messages tm 
          WHERE tm.ticket_id = t.id 
          ORDER BY tm.id DESC 
          LIMIT 1
        ) AS "latestMessage"
      FROM support_tickets t
      LEFT JOIN ticket_messages m ON m.ticket_id = t.id
      WHERE t.user_id = $1 OR (t.customer_email IS NOT NULL AND LOWER(TRIM(t.customer_email)) = $2)
      GROUP BY t.id
      ORDER BY t.created_at DESC;
    `;

    const result = await db.query(query, [userId, userEmail]);

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a single ticket
// @route   GET /api/tickets/:id/messages
// @access  Private
const getTicketMessages = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check ownership unless admin/staff
    const ticketRes = await db.query('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Support ticket not found'
      });
    }

    const ticket = ticketRes.rows[0];
    const userEmail = (req.user.email || '').trim().toLowerCase();
    const ticketEmail = (ticket.customer_email || '').trim().toLowerCase();

    if (userRole !== 'admin' && userRole !== 'staff' && ticket.user_id !== userId && ticketEmail !== userEmail) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view this ticket'
      });
    }

    const messagesRes = await db.query(
      `SELECT id, ticket_id AS "ticketId", sender_type AS "senderType", sender_name AS "senderName", message, created_at AS "createdAt"
       FROM ticket_messages
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [ticketId]
    );

    res.status(200).json({
      status: 'success',
      data: {
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          customerName: ticket.customer_name,
          customerEmail: ticket.customer_email,
          category: ticket.category,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.created_at
        },
        messages: messagesRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message/reply in a ticket
// @route   POST /api/tickets/:id/messages
// @access  Private
const addTicketMessage = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Message cannot be empty'
      });
    }

    const ticketRes = await db.query('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Support ticket not found'
      });
    }

    const ticket = ticketRes.rows[0];
    const userRole = req.user.role;
    const isStaff = userRole === 'admin' || userRole === 'staff';

    if (!isStaff && ticket.user_id !== req.user.id && ticket.customer_email !== req.user.email) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to reply to this ticket'
      });
    }

    const senderType = isStaff ? 'support' : 'user';
    const senderName = isStaff ? 'Taurus Support Rep' : (req.user.full_name || req.user.name || 'You');

    const msgRes = await db.query(
      `INSERT INTO ticket_messages (ticket_id, sender_type, sender_name, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, ticket_id AS "ticketId", sender_type AS "senderType", sender_name AS "senderName", message, created_at AS "createdAt"`,
      [ticketId, senderType, senderName, message.trim()]
    );

    // Update ticket updated_at
    await db.query('UPDATE support_tickets SET updated_at = NOW() WHERE id = $1', [ticketId]);

    // If staff replies and status was Open, move to In Progress
    if (isStaff && ticket.status === 'Open') {
      await db.query("UPDATE support_tickets SET status = 'In Progress' WHERE id = $1", [ticketId]);
    }

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: msgRes.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tickets (Admin/Staff)
// @route   GET /api/tickets
// @access  Private/Admin
const getAllTickets = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT 
        t.id,
        t.ticket_number AS "ticketNumber",
        t.customer_name AS "customerName",
        t.customer_email AS "customerEmail",
        t.category,
        t.subject,
        t.status,
        t.created_at AS "createdAt",
        t.updated_at AS "updatedAt",
        COUNT(m.id)::int AS "messageCount"
      FROM support_tickets t
      LEFT JOIN ticket_messages m ON m.ticket_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All' && status !== 'all') {
      params.push(status);
      sql += ` AND LOWER(t.status) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(t.ticket_number) LIKE $${params.length} OR LOWER(t.customer_name) LIKE $${params.length} OR LOWER(t.subject) LIKE $${params.length})`;
    }

    sql += ` GROUP BY t.id ORDER BY t.created_at DESC`;

    const result = await db.query(sql, params);

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ticket status (Admin/Staff)
// @route   PUT /api/tickets/:id/status
// @access  Private/Admin
const updateTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const ticketId = req.params.id;

    const allowed = ['Open', 'In Progress', 'Resolved', 'Closed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status. Allowed: ${allowed.join(', ')}`
      });
    }

    const result = await db.query(
      'UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Support ticket not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Ticket status updated',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketMessages,
  addTicketMessage,
  getAllTickets,
  updateTicketStatus
};
