const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth');

router.get('/meeting/:meetingId', verifyToken, messageController.getMeetingMessages);

// 1-to-1 Direct Messaging Routes
router.get('/direct/conversations', verifyToken, messageController.getDirectConversations);
router.get('/direct/:partnerId', verifyToken, messageController.getDirectMessages);
router.post('/direct', verifyToken, messageController.sendDirectMessage);
router.delete('/direct/:messageId', verifyToken, messageController.deleteDirectMessage);

module.exports = router;
