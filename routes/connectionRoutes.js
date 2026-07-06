const router = require('express').Router();
const connectionController = require('../controller/connectionController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/request', authMiddleware, connectionController.sendConnectionRequest);
router.get('/pending', authMiddleware, connectionController.getPendingRequests);
router.post('/accept/:id', authMiddleware, connectionController.acceptConnection);
router.post('/decline/:id', authMiddleware, connectionController.declineConnection);
router.post('/link-account', authMiddleware, connectionController.linkAccount);
router.put('/update-dates', authMiddleware, connectionController.updateConnectionDates);
router.get('/status', authMiddleware, connectionController.getConnectionStatus);
router.get('/accepted', authMiddleware, connectionController.getAcceptedConnections);
router.get('/detail', authMiddleware, connectionController.getConnectionDetail);

module.exports = router;