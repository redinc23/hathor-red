const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, playlistController.getPlaylists);
router.get('/:id', authMiddleware, playlistController.getPlaylistById);
router.post('/', authMiddleware, playlistController.createPlaylist);
router.post('/add-song', authMiddleware, playlistController.addSongToPlaylist);
router.post('/generate-ai', authMiddleware, playlistController.generateAIPlaylist);
router.delete('/:id', authMiddleware, playlistController.deletePlaylist);

module.exports = router;
