const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, contactController.getContacts);
router.post('/add', verifyToken, contactController.addContact);
router.post('/', verifyToken, contactController.addContact);
router.delete('/:contactId', verifyToken, contactController.removeContact);

module.exports = router;
