const express = require('express');
const router = express.Router();
const {
  sendContactMessage,
  getAllMessages,
  getMessage,
  updateMessageStatus,
  deleteMessage
} = require('../controllers/contactController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
// Send contact message
router.post('/send', sendContactMessage);

// Admin routes (protected)
// Get all messages
router.get('/', protect, getAllMessages);

// Get single message
router.get('/:id', protect, getMessage);

// Update message status
router.patch('/:id', protect, updateMessageStatus);

// Delete message
router.delete('/:id', protect, deleteMessage);

module.exports = router;

