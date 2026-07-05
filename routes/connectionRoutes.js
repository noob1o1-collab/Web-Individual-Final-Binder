const router = require('express').Router();
const connectionController = require('../controller/connectionController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/request', authMiddleware, connectionController.sendConnectionRequest);

module.exports = router;