const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Helper to generate JWT token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide name, email, and password'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const checkUser = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email already exists'
      });
    }

    // Role restriction
    const userRole = ['customer', 'staff', 'admin'].includes(role) ? role : 'customer';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertSql = `
      INSERT INTO users (full_name, email, password_hash, role, phone_number, address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, full_name, email, role, phone_number, address, created_at;
    `;

    const result = await db.query(insertSql, [
      name.trim(),
      cleanEmail,
      passwordHash,
      userRole,
      phone ? phone.trim() : '',
      address ? address.trim() : ''
    ]);

    const newUser = result.rows[0];
    const token = generateToken(newUser.id, newUser.role);

    res.status(201).json({
      status: 'success',
      message: 'Account registered successfully',
      token,
      data: {
        id: newUser.id,
        _id: newUser.id,
        name: newUser.full_name,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone_number,
        phone_number: newUser.phone_number,
        address: newUser.address,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }

    const searchIdentifier = email.trim().toLowerCase();

    // Find user by email or username/full_name
    const result = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(full_name) = $1 LIMIT 1',
      [searchIdentifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user.id, user.role);

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      token,
      data: {
        id: user.id,
        _id: user.id,
        name: user.full_name,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone_number,
        phone_number: user.phone_number,
        address: user.address
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, full_name, email, role, phone_number, address, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const u = result.rows[0];
    res.status(200).json({
      status: 'success',
      data: {
        id: u.id,
        _id: u.id,
        name: u.full_name,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        phone: u.phone_number,
        phone_number: u.phone_number,
        address: u.address,
        createdAt: u.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile & password
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const existing = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found'
      });
    }

    const current = existing.rows[0];
    const { name, email, phone, address, password } = req.body;

    const newName = name !== undefined ? name.trim() : current.full_name;
    const newEmail = email !== undefined ? email.trim().toLowerCase() : current.email;
    const newPhone = phone !== undefined ? phone.trim() : current.phone_number;
    const newAddress = address !== undefined ? address.trim() : current.address;

    let newPasswordHash = current.password_hash;
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      newPasswordHash = await bcrypt.hash(password.trim(), salt);
    }

    const updateSql = `
      UPDATE users
      SET full_name = $1, email = $2, phone_number = $3, address = $4, password_hash = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, full_name, email, role, phone_number, address, created_at;
    `;

    const result = await db.query(updateSql, [
      newName, newEmail, newPhone, newAddress, newPasswordHash, userId
    ]);

    const updatedUser = result.rows[0];

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        _id: updatedUser.id,
        name: updatedUser.full_name,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone_number,
        phone_number: updatedUser.phone_number,
        address: updatedUser.address
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile
};
