const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', authMiddleware, songController.getSongs);
router.get('/:id', authMiddleware, songController.getSongById);
router.post('/upload', authMiddleware, upload.single('audio'), songController.uploadSong);
router.get('/:id/stream', authMiddleware, songController.streamSong);
router.post('/record-listening', authMiddleware, songController.recordListening);

module.exports = router;
