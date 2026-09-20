const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { verifyToken } = require('../middleware/auth');

router.get('/health', systemController.getHealth);
router.get('/activity', verifyToken, systemController.getActivityLogs);
router.get('/activity-logs', verifyToken, systemController.getActivityLogs);

module.exports = router;
