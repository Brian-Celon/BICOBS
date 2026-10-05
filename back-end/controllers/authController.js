const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendVerificationOtpEmail } = require('../utils/emailService');

// Helper to generate JWT token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// @desc    Register a new user & dispatch 6-digit OTP verification code
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
    const cleanName = name.trim();

    // Generate 6-digit verification code & 10-minute expiry
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userRole = ['customer', 'staff', 'admin'].includes(role) ? role : 'customer';

    // Check if user already exists
    const checkUser = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    
    if (checkUser.rows.length > 0) {
      const existingUser = checkUser.rows[0];

      // If already verified, do not allow re-registration
      if (existingUser.is_verified) {
        return res.status(400).json({
          status: 'error',
          message: 'An account with this email already exists. Please sign in instead.'
        });
      }

      // If user exists but is not verified, refresh credentials & send a new OTP code
      const updateUnverifiedSql = `
        UPDATE users
        SET full_name = $1, password_hash = $2, phone_number = $3, address = $4,
            verification_otp = $5, otp_expires_at = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING id, full_name, email, role, phone_number, address;
      `;

      await db.query(updateUnverifiedSql, [
        cleanName, passwordHash, phone ? phone.trim() : '', address ? address.trim() : '',
        otpCode, otpExpiresAt, existingUser.id
      ]);

      const emailResult = await sendVerificationOtpEmail(cleanEmail, cleanName, otpCode);

      return res.status(200).json({
        status: 'success',
        requiresVerification: true,
        email: cleanEmail,
        message: 'A 6-digit verification code has been sent to your email. Please verify to activate your account.',
        devOtp: emailResult.simulated ? otpCode : undefined
      });
    }

    // Insert new user as unverified
    const insertSql = `
      INSERT INTO users (full_name, email, password_hash, role, phone_number, address, is_verified, verification_otp, otp_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
      RETURNING id, full_name, email, role, phone_number, address, created_at;
    `;

    const result = await db.query(insertSql, [
      cleanName,
      cleanEmail,
      passwordHash,
      userRole,
      phone ? phone.trim() : '',
      address ? address.trim() : '',
      otpCode,
      otpExpiresAt
    ]);

    const emailResult = await sendVerificationOtpEmail(cleanEmail, cleanName, otpCode);

    res.status(201).json({
      status: 'success',
      requiresVerification: true,
      email: cleanEmail,
      message: 'Account created! A 6-digit verification code has been sent to your email.',
      devOtp: emailResult.simulated ? otpCode : undefined
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 6-digit OTP code & activate customer account
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and 6-digit verification code'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const result = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Account not found with this email'
      });
    }

    const user = result.rows[0];

    // Already verified
    if (user.is_verified) {
      const token = generateToken(user.id, user.role);
      return res.status(200).json({
        status: 'success',
        message: 'Account is already verified. You are now logged in.',
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
    }

    // Check code match
    if (!user.verification_otp || user.verification_otp !== cleanOtp) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code. Please check your email and try again.'
      });
    }

    // Check expiration
    if (!user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification code has expired. Please click Resend Code.'
      });
    }

    // Mark as verified & clear OTP
    const updateRes = await db.query(
      `UPDATE users
       SET is_verified = true, verification_otp = NULL, otp_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, full_name, email, role, phone_number, address, created_at;`,
      [user.id]
    );

    const verifiedUser = updateRes.rows[0];
    const token = generateToken(verifiedUser.id, verifiedUser.role);

    res.status(200).json({
      status: 'success',
      message: 'Email successfully verified! Welcome to Taurus Bike.',
      token,
      data: {
        id: verifiedUser.id,
        _id: verifiedUser.id,
        name: verifiedUser.full_name,
        full_name: verifiedUser.full_name,
        email: verifiedUser.email,
        role: verifiedUser.role,
        phone: verifiedUser.phone_number,
        phone_number: verifiedUser.phone_number,
        address: verifiedUser.address
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend 6-digit OTP verification code
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email address'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No account found with this email'
      });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        status: 'error',
        message: 'This account is already verified. Please sign in.'
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      'UPDATE users SET verification_otp = $1, otp_expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [otpCode, otpExpiresAt, user.id]
    );

    const emailResult = await sendVerificationOtpEmail(cleanEmail, user.full_name, otpCode);

    res.status(200).json({
      status: 'success',
      message: 'A new 6-digit verification code has been sent to your email.',
      email: cleanEmail,
      devOtp: emailResult.simulated ? otpCode : undefined
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

    // Require email verification for customer accounts
    if (user.is_verified === false) {
      // Auto-refresh an OTP code in background so user can verify immediately
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await db.query(
        'UPDATE users SET verification_otp = $1, otp_expires_at = $2 WHERE id = $3',
        [otpCode, otpExpiresAt, user.id]
      );
      const emailResult = await sendVerificationOtpEmail(user.email, user.full_name, otpCode);

      return res.status(403).json({
        status: 'unverified',
        requiresVerification: true,
        email: user.email,
        message: 'Your email address is not verified yet. We have sent a 6-digit verification code to your email.',
        devOtp: emailResult.simulated ? otpCode : undefined
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
  verifyOtp,
  resendOtp,
  loginUser,
  getMe,
  updateProfile
};
