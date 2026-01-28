/**
 * AI Service - Frontend
 *
 * Enhanced frontend service for interacting with AI features.
 * This service extends the existing ai.js service with additional capabilities.
 */

import api from './api';

/**
 * Get the AI service status
 * @returns {Promise<Object>} AI service status
 */
export const getAIStatus = async () => {
  const response = await api.get('/ai/status');
  return response.data;
};

/**
 * Generate an AI-powered playlist
 * @param {string} prompt - Natural language description
 * @param {string} name - Optional playlist name
 * @param {number} songCount - Number of songs (default: 10)
 * @returns {Promise<Object>} Generated playlist with songs
 */
export const generateAIPlaylist = async (prompt, name = null, songCount = 10) => {
  const response = await api.post('/ai/playlist/generate', {
    prompt,
    name,
    songCount
  });
  return response.data;
};

/**
 * Get personalized music recommendations
 * @param {number} limit - Maximum number of recommendations
 * @returns {Promise<Object>} Recommendations with user profile
 */
export const getRecommendations = async (limit = 20) => {
  const response = await api.get('/ai/recommendations', {
    params: { limit }
  });
  return response.data;
};

/**
 * Get the daily mix playlist
 * @returns {Promise<Object>} Daily mix with songs
 */
export const getDailyMix = async () => {
  const response = await api.get('/ai/daily-mix');
  return response.data;
};

/**
 * Get songs similar to a specific song
 * @param {string} songId - The song ID
 * @param {number} limit - Maximum number of similar songs
 * @returns {Promise<Object>} Similar songs
 */
export const getSimilarSongs = async (songId, limit = 10) => {
  const response = await api.get(`/ai/similar/${songId}`, {
    params: { limit }
  });
  return response.data;
};

/**
 * Detect mood from user input
 * @param {string} input - User's text input
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} Mood analysis with suggested songs
 */
export const detectMood = async (input, context = {}) => {
  const response = await api.post('/ai/mood/detect', {
    input,
    context
  });
  return response.data;
};

/**
 * Perform semantic search for music
 * @param {string} query - Natural language search query
 * @param {number} limit - Maximum results
 * @returns {Promise<Object>} Search results with parameters
 */
export const semanticSearch = async (query, limit = 20) => {
  const response = await api.get('/ai/search', {
    params: { query, limit }
  });
  return response.data;
};

/**
 * Chat with the AI music assistant
 * @param {string} message - User's message
 * @param {Array} conversationHistory - Previous messages
 * @param {string} currentPage - Current page context
 * @returns {Promise<Object>} AI response with actions
 */
export const chatWithAI = async (message, conversationHistory = [], currentPage = 'home') => {
  const response = await api.post('/ai/chat', {
    message,
    conversationHistory,
    currentPage
  });
  return response.data;
};

/**
 * Get predictive playlist based on current context
 * @param {Object} context - Current context (time, activity, etc.)
 * @returns {Promise<Object>} Predictive playlist
 */
export const getPredictivePlaylist = async (context = {}) => {
  const response = await api.post('/ai/predictive-playlist', {
    context
  });
  return response.data;
};

/**
 * Create an emotional journey playlist
 * @param {string} targetEmotion - Target emotional state
 * @returns {Promise<Object>} Emotional journey data
 */
export const createEmotionalJourney = async (targetEmotion) => {
  const response = await api.post('/ai/emotional-journey', {
    targetEmotion
  });
  return response.data;
};

/**
 * Get collaborative recommendations for a group
 * @param {Array<string>} userIds - Array of user IDs
 * @param {number} limit - Maximum recommendations
 * @returns {Promise<Object>} Collaborative recommendations
 */
export const getCollaborativeRecommendations = async (userIds, limit = 20) => {
  const response = await api.post('/ai/collaborative-recommendations', {
    userIds,
    limit
  });
  return response.data;
};

/**
 * Get real-time analytics dashboard data
 * @returns {Promise<Object>} Dashboard analytics
 */
export const getAnalyticsDashboard = async () => {
  const response = await api.get('/ai/analytics/dashboard');
  return response.data;
};

/**
 * Get trending songs
 * @param {number} limit - Maximum number of songs
 * @param {string} timeframe - Time frame ('1h', '24h', '7d')
 * @returns {Promise<Object>} Trending songs
 */
export const getTrendingSongs = async (limit = 10, timeframe = '24h') => {
  const response = await api.get('/ai/analytics/trending', {
    params: { limit, timeframe }
  });
  return response.data;
};

/**
 * Track user interaction for analytics
 * @param {string} interactionType - Type of interaction
 * @param {Object} data - Interaction data
 */
export const trackInteraction = async (interactionType, data = {}) => {
  try {
    await api.post('/ai/track-interaction', {
      type: interactionType,
      ...data
    });
  } catch (error) {
    console.error('Failed to track interaction:', error);
    // Don't throw - tracking failures shouldn't break the app
  }
};

export default {
  getAIStatus,
  generateAIPlaylist,
  getRecommendations,
  getDailyMix,
  getSimilarSongs,
  detectMood,
  semanticSearch,
  chatWithAI,
  getPredictivePlaylist,
  createEmotionalJourney,
  getCollaborativeRecommendations,
  getAnalyticsDashboard,
  getTrendingSongs,
  trackInteraction
};
