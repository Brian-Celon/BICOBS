const db = require('../config/db');

// @desc    Get all bike repair tickets
// @route   GET /api/repairs
// @access  Private (Admin / Staff)
const getRepairs = async (req, res, next) => {
  try {
    const { status, mechanic, search } = req.query;
    let sql = 'SELECT * FROM repairs WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      params.push(status.toLowerCase());
      sql += ` AND LOWER(status) = $${params.length}`;
    }

    if (mechanic && mechanic !== 'all') {
      params.push(`%${mechanic.toLowerCase()}%`);
      sql += ` AND LOWER(mechanic_name) LIKE $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(customer_name) LIKE $${params.length} OR LOWER(ticket_number) LIKE $${params.length} OR LOWER(bike_model) LIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await db.query(sql, params);

    res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows.map(r => ({
        id: r.id,
        ticketNumber: r.ticket_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        bikeModel: r.bike_model,
        mechanicName: r.mechanic_name,
        serviceType: r.service_type,
        problemDescription: r.problem_description,
        status: r.status,
        estimatedCost: parseFloat(r.estimated_cost || 0),
        estimatedFinish: r.estimated_finish,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new repair ticket
// @route   POST /api/repairs
// @access  Private (Admin / Staff)
const createRepair = async (req, res, next) => {
  try {
    const { customerName, customerPhone, bikeModel, mechanicName, serviceType, problemDescription, estimatedCost, estimatedFinish } = req.body;

    if (!customerName || !bikeModel) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer name and bike model are required'
      });
    }

    // Generate ticket number from highest existing ticket
    const lastRes = await db.query("SELECT ticket_number FROM repairs ORDER BY id DESC LIMIT 1");
    let nextNum = 11;
    if (lastRes.rows.length > 0) {
      const match = (lastRes.rows[0].ticket_number || '').match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }
    const ticketNumber = `#R${String(nextNum).padStart(3, '0')}`;

    const result = await db.query(
      `INSERT INTO repairs (ticket_number, customer_name, customer_phone, bike_model, mechanic_name, service_type, problem_description, status, estimated_cost, estimated_finish)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'in-progress', $8, $9)
       RETURNING *`,
      [
        ticketNumber,
        customerName.trim(),
        customerPhone || '',
        bikeModel.trim(),
        mechanicName || 'Reynaldo',
        serviceType || 'General Tune-Up',
        problemDescription || '',
        parseFloat(estimatedCost || 0),
        estimatedFinish || 'Today'
      ]
    );

    const r = result.rows[0];

    res.status(201).json({
      status: 'success',
      data: {
        id: r.id,
        ticketNumber: r.ticket_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        bikeModel: r.bike_model,
        mechanicName: r.mechanic_name,
        serviceType: r.service_type,
        problemDescription: r.problem_description,
        status: r.status,
        estimatedCost: parseFloat(r.estimated_cost || 0),
        estimatedFinish: r.estimated_finish,
        createdAt: r.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update repair status and details
// @route   PUT /api/repairs/:id
// @access  Private (Admin / Staff)
const updateRepair = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, mechanicName, estimatedFinish, problemDescription, estimatedCost } = req.body;

    const findRes = await db.query('SELECT * FROM repairs WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Repair ticket not found'
      });
    }

    const current = findRes.rows[0];
    const newStatus = status ? status.toLowerCase() : current.status;
    const newMechanic = mechanicName || current.mechanic_name;
    const newFinish = estimatedFinish !== undefined ? estimatedFinish : current.estimated_finish;
    const newNotes = problemDescription !== undefined ? problemDescription : current.problem_description;
    const newCost = estimatedCost !== undefined ? parseFloat(estimatedCost) : current.estimated_cost;

    const updateRes = await db.query(
      `UPDATE repairs
       SET status = $1, mechanic_name = $2, estimated_finish = $3, problem_description = $4, estimated_cost = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [newStatus, newMechanic, newFinish, newNotes, newCost, id]
    );

    const r = updateRes.rows[0];

    res.status(200).json({
      status: 'success',
      data: {
        id: r.id,
        ticketNumber: r.ticket_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        bikeModel: r.bike_model,
        mechanicName: r.mechanic_name,
        serviceType: r.service_type,
        problemDescription: r.problem_description,
        status: r.status,
        estimatedCost: parseFloat(r.estimated_cost || 0),
        estimatedFinish: r.estimated_finish,
        updatedAt: r.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete repair ticket
// @route   DELETE /api/repairs/:id
// @access  Private (Admin only)
const deleteRepair = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM repairs WHERE id = $1 RETURNING id, ticket_number', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Repair ticket not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Repair ticket ${result.rows[0].ticket_number} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRepairs,
  createRepair,
  updateRepair,
  deleteRepair
};
