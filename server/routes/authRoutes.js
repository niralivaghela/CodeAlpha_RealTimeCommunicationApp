const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', verifyToken, authController.getMe);
router.get('/users', verifyToken, authController.getAllUsers);
router.put('/profile', verifyToken, authController.updateProfile);
router.put('/presence', verifyToken, authController.updatePresence);

module.exports = router;
