const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { verifyToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.post('/upload', verifyToken, upload.single('file'), fileController.uploadFile);
router.get('/download/:id', fileController.downloadFile);
router.get('/meeting/:meetingId', verifyToken, fileController.getMeetingFiles);

module.exports = router;
