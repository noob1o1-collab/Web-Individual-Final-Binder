const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const PhotoController = require('../controller/photoController');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads'));
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}-${Math.random().toString(36).substring(2, 12)}${ext}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        cb(null, allowed.includes(file.mimetype));
    }
});

router.post('/upload', authMiddleware, upload.single('photo'), PhotoController.uploadPhoto);
router.get('/shared', authMiddleware, PhotoController.fetchSharedPhotos);

module.exports = router;
