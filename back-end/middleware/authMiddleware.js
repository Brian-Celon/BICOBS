const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Protect routes - Verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const result = await db.query(
        'SELECT id, full_name, email, role, phone_number, address FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          status: 'error',
          message: 'Please sign in to your account to continue'
        });
      }

      const userRow = result.rows[0];
      req.user = {
        _id: userRow.id,
        id: userRow.id,
        name: userRow.full_name,
        full_name: userRow.full_name,
        email: userRow.email,
        role: userRow.role,
        phone: userRow.phone_number,
        phone_number: userRow.phone_number,
        address: userRow.address
      };

      return next();
    } catch (error) {
      console.error('[Auth Error]', error.message);
      return res.status(401).json({
        status: 'error',
        message: 'Your session has expired. Please sign in again.'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Please sign in to continue'
    });
  }
};

// Grant access to specific roles (e.g., 'admin', 'staff')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
