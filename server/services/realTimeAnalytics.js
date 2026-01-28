/**
 * Real-Time Analytics Service
 *
 * Provides real-time analytics and metrics for the platform.
 * Handles:
 * - Live user activity tracking
 * - Platform-wide statistics
 * - Trending songs and playlists
 * - Real-time dashboard metrics
 */

const { getRedisClient } = require('../config/redis');

class RealTimeAnalytics {
  constructor() {
    this.initialized = false;
    this.redis = null;
    this.updateInterval = 30000; // 30 seconds
    this.updateTimer = null;
  }

  /**
   * Initialize the real-time analytics service
   */
  async initialize() {
    if (this.initialized) return true;

    try {
      this.redis = await getRedisClient();
      
      // Start periodic analytics update
      this.updateTimer = setInterval(() => this.updateAnalytics(), this.updateInterval);
      
      this.initialized = true;
      console.log('Real-Time Analytics Service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Real-Time Analytics:', error);
      return false;
    }
  }

  /**
   * Track active user
   * @param {string} userId - The user ID
   */
  async trackActiveUser(userId) {
    if (!this.redis) return;

    const key = 'analytics:active_users';
    const timestamp = Date.now();
    
    // Add user to sorted set with current timestamp
    await this.redis.zAdd(key, { score: timestamp, value: userId });
    
    // Remove users inactive for more than 5 minutes
    const fiveMinutesAgo = timestamp - 5 * 60 * 1000;
    await this.redis.zRemRangeByScore(key, 0, fiveMinutesAgo);
  }

  /**
   * Get count of currently active users
   * @returns {Promise<number>} Number of active users
   */
  async getActiveUserCount() {
    if (!this.redis) return 0;

    try {
      const key = 'analytics:active_users';
      return await this.redis.zCard(key);
    } catch (error) {
      console.error('Error getting active user count:', error);
      return 0;
    }
  }

  /**
   * Track song play
   * @param {string} songId - The song ID
   * @param {string} userId - The user ID
   */
  async trackSongPlay(songId, userId) {
    if (!this.redis) return;

    const timestamp = Date.now();
    const hour = new Date(timestamp).getHours();

    // Increment total play count
    await this.redis.incr(`analytics:song:${songId}:plays`);
    
    // Add to trending songs (last 24 hours)
    await this.redis.zIncrBy('analytics:trending:24h', 1, songId);
    
    // Track hourly plays
    const hourKey = `analytics:song:${songId}:plays:hour:${hour}`;
    await this.redis.incr(hourKey);
    await this.redis.expire(hourKey, 86400); // Expire after 24 hours
    
    // Track recent plays
    const recentKey = `analytics:song:${songId}:recent_plays`;
    await this.redis.lPush(recentKey, JSON.stringify({ userId, timestamp }));
    await this.redis.lTrim(recentKey, 0, 99); // Keep last 100 plays
  }

  /**
   * Get trending songs
   * @param {number} limit - Maximum number of songs
   * @param {string} timeframe - Time frame ('1h', '24h', '7d')
   * @returns {Promise<Array>} Trending songs with play counts
   */
  async getTrendingSongs(limit = 10, timeframe = '24h') {
    if (!this.redis) return [];

    try {
      const key = `analytics:trending:${timeframe}`;
      
      // Get top songs from sorted set
      const results = await this.redis.zRangeWithScores(key, 0, limit - 1, { REV: true });
      
      return results.map(item => ({
        songId: item.value,
        playCount: item.score
      }));
    } catch (error) {
      console.error('Error getting trending songs:', error);
      return [];
    }
  }

  /**
   * Get platform-wide statistics
   * @returns {Promise<Object>} Platform statistics
   */
  async getPlatformStats() {
    if (!this.redis) {
      return {
        activeUsers: 0,
        totalPlays: 0,
        totalSessions: 0,
        averageSessionLength: 0
      };
    }

    try {
      const activeUsers = await this.getActiveUserCount();
      
      // Get total plays (would be aggregated from all songs)
      const totalPlaysKey = 'analytics:platform:total_plays';
      const totalPlays = parseInt(await this.redis.get(totalPlaysKey) || '0');
      
      // Get total sessions
      const totalSessionsKey = 'analytics:platform:total_sessions';
      const totalSessions = parseInt(await this.redis.get(totalSessionsKey) || '0');

      return {
        activeUsers,
        totalPlays,
        totalSessions,
        averageSessionLength: totalSessions > 0 ? Math.round(totalPlays / totalSessions) : 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting platform stats:', error);
      return {
        activeUsers: 0,
        totalPlays: 0,
        totalSessions: 0,
        averageSessionLength: 0
      };
    }
  }

  /**
   * Get song analytics
   * @param {string} songId - The song ID
   * @returns {Promise<Object>} Song analytics
   */
  async getSongAnalytics(songId) {
    if (!this.redis) {
      return {
        totalPlays: 0,
        recentPlays: [],
        trendingScore: 0
      };
    }

    try {
      // Get total plays
      const totalPlays = parseInt(
        await this.redis.get(`analytics:song:${songId}:plays`) || '0'
      );
      
      // Get recent plays
      const recentPlaysData = await this.redis.lRange(
        `analytics:song:${songId}:recent_plays`,
        0,
        9
      );
      const recentPlays = recentPlaysData.map(data => JSON.parse(data));
      
      // Get trending score
      const trendingScore = await this.redis.zScore('analytics:trending:24h', songId);

      return {
        totalPlays,
        recentPlays,
        trendingScore: trendingScore || 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting song analytics:', error);
      return {
        totalPlays: 0,
        recentPlays: [],
        trendingScore: 0
      };
    }
  }

  /**
   * Track playlist creation
   * @param {string} playlistId - The playlist ID
   * @param {string} userId - The user ID
   */
  async trackPlaylistCreation(playlistId, userId) {
    if (!this.redis) return;

    await this.redis.incr('analytics:platform:total_playlists');
    await this.redis.zAdd('analytics:recent_playlists', {
      score: Date.now(),
      value: playlistId
    });
  }

  /**
   * Update analytics periodically
   */
  async updateAnalytics() {
    if (!this.redis) return;

    try {
      // Clean up old trending data
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      await this.redis.zRemRangeByScore('analytics:trending:24h', 0, oneDayAgo);
      
      // Could add more periodic cleanup tasks here
      console.log('Analytics updated successfully');
    } catch (error) {
      console.error('Error updating analytics:', error);
    }
  }

  /**
   * Get real-time dashboard data
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData() {
    try {
      const [platformStats, trendingSongs] = await Promise.all([
        this.getPlatformStats(),
        this.getTrendingSongs(10)
      ]);

      return {
        platformStats,
        trendingSongs,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return {
        platformStats: { activeUsers: 0, totalPlays: 0 },
        trendingSongs: [],
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      updateInterval: this.updateInterval
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    this.initialized = false;
  }
}

// Export singleton instance
const realTimeAnalytics = new RealTimeAnalytics();

module.exports = realTimeAnalytics;
