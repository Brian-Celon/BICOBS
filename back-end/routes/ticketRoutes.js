const express = require('express');
const router = express.Router();
const {
  createTicket,
  getMyTickets,
  getTicketMessages,
  addTicketMessage,
  getAllTickets,
  updateTicketStatus
} = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customer ticket routes
router.post('/', protect, createTicket);
router.get('/my-tickets', protect, getMyTickets);
router.get('/:id/messages', protect, getTicketMessages);
router.post('/:id/messages', protect, addTicketMessage);

// Admin / Staff routes
router.get('/', protect, authorize('admin', 'staff'), getAllTickets);
router.put('/:id/status', protect, authorize('admin', 'staff'), updateTicketStatus);

module.exports = router;
