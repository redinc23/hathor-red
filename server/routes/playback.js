const express = require('express');
const router = express.Router();
const playbackController = require('../controllers/playbackController');
const authMiddleware = require('../middleware/auth');

router.get('/state', authMiddleware, playbackController.getPlaybackState);
router.post('/state', authMiddleware, playbackController.updatePlaybackState);

module.exports = router;
