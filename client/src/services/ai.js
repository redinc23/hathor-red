/**
 * AI Service
 *
 * Frontend service for interacting with the Colab Enterprise AI features.
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

export default {
  getAIStatus,
  generateAIPlaylist,
  getRecommendations,
  getDailyMix,
  getSimilarSongs,
  detectMood,
  semanticSearch,
  chatWithAI
};
