const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  getMe,
  updateProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
