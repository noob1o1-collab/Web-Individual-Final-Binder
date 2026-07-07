const router = require('express').Router();
const diaryController = require('../controller/diaryController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/add', authMiddleware, diaryController.addDiaryEntry);
router.get('/personal', authMiddleware, diaryController.fetchPersonalSpace);
router.get('/shared', authMiddleware, diaryController.fetchSharedSpace);
router.delete('/delete/:id', authMiddleware, diaryController.eraseDiaryEntry);

module.exports = router;
