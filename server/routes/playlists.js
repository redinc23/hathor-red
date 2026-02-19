const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const authMiddleware = require('../middleware/auth');
const { playlistValidation, aiPlaylistValidation, addSongToPlaylistValidation, idParamValidation, validate } = require('../middleware/validation');

router.get('/', authMiddleware, playlistController.getPlaylists);
router.get('/:id', authMiddleware, idParamValidation, validate, playlistController.getPlaylistById);
router.post('/', authMiddleware, playlistValidation, validate, playlistController.createPlaylist);
router.post('/add-song', authMiddleware, addSongToPlaylistValidation, validate, playlistController.addSongToPlaylist);
router.post('/generate-ai', authMiddleware, aiPlaylistValidation, validate, playlistController.generateAIPlaylist);
router.delete('/:id', authMiddleware, idParamValidation, validate, playlistController.deletePlaylist);

module.exports = router;
