/**
 * Data Collection Service
 *
 * Collects and aggregates user interaction data for analytics and AI training.
 * Handles:
 * - User listening events
 * - Interaction tracking (plays, skips, likes, etc.)
 * - Session analytics
 * - Behavioral pattern collection
 */

const { getRedisClient } = require('../config/redis');

class DataCollectionService {
  constructor() {
    this.initialized = false;
    this.redis = null;
    this.eventQueue = [];
    this.batchSize = 100;
    this.flushInterval = 60000; // 1 minute
    this.flushTimer = null;
  }

  /**
   * Initialize the data collection service
   */
  async initialize() {
    if (this.initialized) return true;

    try {
      this.redis = await getRedisClient();
      
      // Start periodic flush
      this.flushTimer = setInterval(() => this.flushEvents(), this.flushInterval);
      
      this.initialized = true;
      console.log('Data Collection Service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Data Collection Service:', error);
      return false;
    }
  }

  /**
   * Track a listening event
   * @param {Object} event - The listening event data
   */
  async trackListeningEvent(event) {
    const enrichedEvent = {
      ...event,
      timestamp: Date.now(),
      type: 'listening',
      sessionId: event.sessionId || 'unknown'
    };

    this.eventQueue.push(enrichedEvent);

    // Flush if batch size reached
    if (this.eventQueue.length >= this.batchSize) {
      await this.flushEvents();
    }

    // Store in Redis for real-time access
    if (this.redis) {
      const key = `listening:${event.userId}:${Date.now()}`;
      await this.redis.setEx(key, 86400, JSON.stringify(enrichedEvent)); // 24 hour TTL
    }
  }

  /**
   * Track user interaction (play, pause, skip, like, etc.)
   * @param {Object} interaction - The interaction data
   */
  async trackInteraction(interaction) {
    const enrichedInteraction = {
      ...interaction,
      timestamp: Date.now(),
      type: 'interaction'
    };

    this.eventQueue.push(enrichedInteraction);

    // Store interaction counts
    if (this.redis) {
      const countKey = `interaction:count:${interaction.type}:${interaction.userId}`;
      await this.redis.incr(countKey);
    }
  }

  /**
   * Track session data
   * @param {Object} sessionData - The session information
   */
  async trackSession(sessionData) {
    if (!this.redis) return;

    const key = `session:${sessionData.userId}:${sessionData.sessionId}`;
    await this.redis.setEx(key, 3600, JSON.stringify(sessionData)); // 1 hour TTL
  }

  /**
   * Get user listening history
   * @param {string} userId - The user ID
   * @param {number} limit - Maximum number of entries
   * @returns {Promise<Array>} Listening history
   */
  async getUserListeningHistory(userId, limit = 50) {
    if (!this.redis) return [];

    try {
      const pattern = `listening:${userId}:*`;
      const keys = [];

      // Use SCAN via scanIterator to avoid blocking Redis with KEYS
      for await (const key of this.redis.scanIterator({ MATCH: pattern })) {
        keys.push(key);
        // Optional safety cap to avoid scanning an unbounded number of keys
        if (keys.length >= limit * 2) {
          break;
        }
      }
      
      // Get the most recent entries
      const recentKeys = keys.sort().reverse().slice(0, limit);
      
      const values = await this.redis.mGet(recentKeys);
      const history = values
        .filter(data => data !== null)
        .map(data => JSON.parse(data));
      
      return history;
    } catch (error) {
      console.error('Error fetching listening history:', error);
      return [];
    }
  }

  /**
   * Get interaction statistics for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} Interaction statistics
   */
  async getUserInteractionStats(userId) {
    if (!this.redis) return {};

    try {
      const stats = {};
      const types = ['play', 'pause', 'skip', 'like', 'share', 'playlist_add'];
      
      for (const type of types) {
        const key = `interaction:count:${type}:${userId}`;
        const count = await this.redis.get(key);
        stats[type] = parseInt(count || '0');
      }
      
      return stats;
    } catch (error) {
      console.error('Error fetching interaction stats:', error);
      return {};
    }
  }

  /**
   * Analyze user behavior patterns
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} Behavior analysis
   */
  async analyzeUserBehavior(userId) {
    const history = await this.getUserListeningHistory(userId, 100);
    const stats = await this.getUserInteractionStats(userId);

    if (history.length === 0) {
      return {
        totalPlays: 0,
        averageSessionLength: 0,
        favoriteGenres: [],
        peakListeningTime: 'unknown',
        engagementScore: 0
      };
    }

    // Analyze genres
    const genreCounts = {};
    history.forEach(event => {
      const genre = event.genre || 'Unknown';
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });

    const favoriteGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    // Calculate engagement score
    const totalInteractions = Object.values(stats).reduce((sum, count) => sum + count, 0);
    const engagementScore = Math.min(
      (totalInteractions / Math.max(history.length, 1)) * 10,
      10
    );

    return {
      totalPlays: history.length,
      averageSessionLength: 0, // Would need session data
      favoriteGenres,
      peakListeningTime: this._determinePeakTime(history),
      engagementScore: engagementScore.toFixed(2),
      interactionStats: stats
    };
  }

  /**
   * Determine peak listening time from history
   * @param {Array} history - Listening history
   * @returns {string} Peak time description
   */
  _determinePeakTime(history) {
    const hourCounts = new Array(24).fill(0);
    
    history.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    });

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    
    if (peakHour >= 6 && peakHour < 12) return 'morning';
    if (peakHour >= 12 && peakHour < 17) return 'afternoon';
    if (peakHour >= 17 && peakHour < 21) return 'evening';
    return 'night';
  }

  /**
   * Flush queued events to persistent storage
   */
  async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // In production, this would write to a database or data warehouse
      console.log(`Flushing ${eventsToFlush.length} events to storage`);
      
      // Store aggregated data in Redis
      if (this.redis) {
        const key = `events:batch:${Date.now()}`;
        await this.redis.setEx(key, 86400 * 7, JSON.stringify(eventsToFlush)); // 7 days
      }
    } catch (error) {
      console.error('Error flushing events:', error);
      // Re-add events to queue on failure
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      queuedEvents: this.eventQueue.length,
      batchSize: this.batchSize,
      flushInterval: this.flushInterval
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushEvents();
    this.initialized = false;
  }
}

// Export singleton instance
const dataCollectionService = new DataCollectionService();

module.exports = dataCollectionService;
