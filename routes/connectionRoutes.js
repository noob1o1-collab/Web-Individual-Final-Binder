const router = require('express').Router();
const connectionController = require('../controller/connectionController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/request', authMiddleware, connectionController.sendConnectionRequest);
router.get('/pending', authMiddleware, connectionController.getPendingRequests);
router.post('/accept/:id', authMiddleware, connectionController.acceptConnection);
router.post('/decline/:id', authMiddleware, connectionController.declineConnection);

module.exports = router;
