const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const { songUploadValidation, recordListeningValidation, idParamValidation, validate } = require('../middleware/validation');

router.get('/', authMiddleware, songController.getSongs);
router.get('/:id', authMiddleware, idParamValidation, validate, songController.getSongById);
router.post('/upload', authMiddleware, upload.single('audio'), songUploadValidation, validate, songController.uploadSong);
router.get('/:id/stream', authMiddleware, songController.streamSong);
router.post('/record-listening', authMiddleware, recordListeningValidation, validate, songController.recordListening);

module.exports = router;
