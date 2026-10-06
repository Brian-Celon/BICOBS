const bcrypt = require('bcryptjs');
const db = require('../config/db');

// @desc    Get all users (for Admin / Staff)
// @route   GET /api/users
// @access  Private (Admin / Staff)
const getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    let sql = 'SELECT id, full_name, email, role, phone_number, address, is_verified, created_at, updated_at FROM users WHERE 1=1';
    const params = [];

    if (role && role !== 'all') {
      params.push(role.toLowerCase());
      sql += ` AND LOWER(role) = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(full_name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await db.query(sql, params);

    res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows.map(u => ({
        id: u.id,
        name: u.full_name,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        phoneNumber: u.phone_number,
        address: u.address,
        isVerified: u.is_verified,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new system user (Staff / Admin)
// @route   POST /api/users
// @access  Private (Admin only)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, and password are required'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check duplicate email
    const exists = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (exists.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'A user with this email address already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userRole = ['customer', 'staff', 'admin'].includes((role || '').toLowerCase())
      ? role.toLowerCase()
      : 'staff';

    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone_number, is_verified)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, full_name, email, role, phone_number, is_verified, created_at`,
      [cleanName, cleanEmail, passwordHash, userRole, phone || '']
    );

    const newUser = result.rows[0];

    res.status(201).json({
      status: 'success',
      data: {
        id: newUser.id,
        name: newUser.full_name,
        fullName: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        phoneNumber: newUser.phone_number,
        isVerified: newUser.is_verified,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details & role
// @route   PUT /api/users/:id
// @access  Private (Admin only)
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, phone, isVerified } = req.body;

    const findUser = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (findUser.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found'
      });
    }

    const current = findUser.rows[0];
    const newName = name ? name.trim() : current.full_name;
    const newEmail = email ? email.trim().toLowerCase() : current.email;
    const newRole = role ? role.toLowerCase() : current.role;
    const newPhone = phone !== undefined ? phone : current.phone_number;
    const newVerified = isVerified !== undefined ? isVerified : current.is_verified;

    // Email conflict check
    if (email && newEmail !== current.email) {
      const emailConflict = await db.query('SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2', [newEmail, id]);
      if (emailConflict.rows.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is already taken by another account'
        });
      }
    }

    const updateRes = await db.query(
      `UPDATE users
       SET full_name = $1, email = $2, role = $3, phone_number = $4, is_verified = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, full_name, email, role, phone_number, is_verified, created_at, updated_at`,
      [newName, newEmail, newRole, newPhone, newVerified, id]
    );

    const updated = updateRes.rows[0];

    res.status(200).json({
      status: 'success',
      data: {
        id: updated.id,
        name: updated.full_name,
        fullName: updated.full_name,
        email: updated.email,
        role: updated.role,
        phoneNumber: updated.phone_number,
        isVerified: updated.is_verified,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (String(req.user.id) === String(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot delete your own administrative account'
      });
    }

    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, full_name, email', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: `User ${result.rows[0].full_name} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
