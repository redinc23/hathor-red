/**
 * AI Routes
 *
 * API endpoints for AI-powered features in the Hathor Music Platform.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const aiController = require('../controllers/aiController');

// Public endpoint - check AI service status
router.get('/status', aiController.getStatus);

// Protected endpoints - require authentication
router.use(authMiddleware);

// Playlist generation
router.post('/playlist/generate', aiController.generatePlaylist);

// Recommendations
router.get('/recommendations', aiController.getRecommendations);
router.get('/daily-mix', aiController.getDailyMix);
router.get('/similar/:songId', aiController.getSimilarSongs);

// Mood detection
router.post('/mood/detect', aiController.detectMood);

// Semantic search
router.get('/search', aiController.semanticSearch);

// Chat assistant
router.post('/chat', aiController.chat);

module.exports = router;
