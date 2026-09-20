const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, searchController.globalSearch);

module.exports = router;
