const router = require('express').Router();
const gameController = require('../controller/gameController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/state', authMiddleware, gameController.getGameState);
router.post('/move', authMiddleware, gameController.makeMove);
router.post('/reset', authMiddleware, gameController.resetGame);

module.exports = router;
