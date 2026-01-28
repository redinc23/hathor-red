/**
 * Colab Enterprise AI Service
 *
 * This service layer connects to Google Colab Enterprise APIs to provide
 * AI-powered features for the Hathor Music Platform.
 *
 * Features:
 * - Intelligent playlist generation with natural language understanding
 * - Personalized music recommendations
 * - Mood detection and contextual suggestions
 * - Semantic music search
 * - AI chat assistant for music discovery
 */

const { COLAB_CONFIG, isConfigured, getFeatureConfig } = require('../config/colabAI');

class ColabAIService {
  constructor() {
    this.initialized = false;
    this.client = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 100; // Limit memory usage
  }

  /**
   * Initialize the Colab AI service
   */
  async initialize() {
    if (this.initialized) return true;

    if (!isConfigured()) {
      console.warn('Colab AI Service: Not configured. AI features will use fallback mode.');
      return false;
    }

    try {
      // Initialize the API client
      // In production, this would use Google's official SDK
      this.client = this._createClient();
      this.initialized = true;
      console.log('Colab AI Service: Initialized successfully');
      return true;
    } catch (error) {
      console.error('Colab AI Service: Initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Create the API client for Colab Enterprise
   */
  _createClient() {
    return {
      endpoint: COLAB_CONFIG.apiEndpoint,
      projectId: COLAB_CONFIG.projectId,
      region: COLAB_CONFIG.region,
      timeout: COLAB_CONFIG.timeout
    };
  }

  /**
   * Make a request to the Colab Enterprise API
   * @param {string} endpoint - API endpoint
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} API response
   */
  async _makeRequest(endpoint, payload) {
    if (!this.initialized) {
      throw new Error('Colab AI Service not initialized');
    }

    const url = `${this.client.endpoint}/${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${COLAB_CONFIG.apiKey}`,
      'X-Project-ID': COLAB_CONFIG.projectId
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.client.timeout)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Colab AI request to ${endpoint} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Generate text using the AI model
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generateText(prompt, options = {}) {
    const payload = {
      model: options.model || COLAB_CONFIG.models.textGeneration,
      prompt: prompt,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1024,
      topP: options.topP || 0.9
    };

    // Check cache
    const cacheKey = JSON.stringify(payload);
    if (this.cache.has(cacheKey)) {
      const { timestamp, data } = this.cache.get(cacheKey);
      if (Date.now() - timestamp < this.cacheTimeout) {
        // Refresh cache entry (LRU)
        this.cache.delete(cacheKey);
        this.cache.set(cacheKey, { timestamp, data });
        return data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const response = await this._makeRequest('generate', payload);
      const result = response.text || response.content || '';

      // Cache the successful result
      if (this.cache.size >= this.maxCacheSize) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }

      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: result
      });

      return result;
    } catch (error) {
      // Use fallback generation
      return this._fallbackGenerate(prompt, options);
    }
  }

  /**
   * Fallback text generation when API is unavailable
   */
  _fallbackGenerate(prompt, options = {}) {
    // Return a structured fallback response
    return JSON.stringify({
      fallback: true,
      message: 'AI service temporarily unavailable',
      suggestions: []
    });
  }

  // ============================================================
  // PLAYLIST GENERATION
  // ============================================================

  /**
   * Generate an intelligent playlist based on natural language prompt
   * @param {string} prompt - User's natural language description
   * @param {Object} context - Additional context (user history, preferences)
   * @returns {Promise<Object>} Playlist configuration
   */
  async analyzePlaylistPrompt(prompt, context = {}) {
    const featureConfig = getFeatureConfig('playlistGeneration');

    if (!featureConfig.enabled || !this.initialized) {
      return this._fallbackPlaylistAnalysis(prompt);
    }

    const systemPrompt = `You are a music curator AI. Analyze the user's playlist request and extract:
1. Mood/energy level (1-10)
2. Genres that match the request
3. Tempo preference (slow/medium/fast)
4. Era preference (decade or range)
5. Special attributes (instrumental, live, acoustic, etc.)
6. Keywords for search

User's listening history: ${JSON.stringify(context.history || [])}
User's favorite genres: ${JSON.stringify(context.favoriteGenres || [])}

Respond in JSON format with the following structure:
{
  "mood": { "name": "string", "energy": number },
  "genres": ["string"],
  "tempo": "string",
  "era": { "start": number, "end": number },
  "attributes": ["string"],
  "keywords": ["string"],
  "songCount": number,
  "description": "string"
}`;

    try {
      const response = await this.generateText(
        `${systemPrompt}\n\nUser request: "${prompt}"`,
        { temperature: 0.5 }
      );

      return this._parsePlaylistAnalysis(response, prompt);
    } catch (error) {
      console.error('Playlist analysis failed:', error);
      return this._fallbackPlaylistAnalysis(prompt);
    }
  }

  /**
   * Parse AI response for playlist analysis
   */
  _parsePlaylistAnalysis(response, originalPrompt) {
    try {
      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Parsing failed, use fallback
    }
    return this._fallbackPlaylistAnalysis(originalPrompt);
  }

  /**
   * Fallback playlist analysis using keyword matching
   */
  _fallbackPlaylistAnalysis(prompt) {
    const promptLower = prompt.toLowerCase();
    const analysis = {
      mood: { name: 'neutral', energy: 5 },
      genres: [],
      tempo: 'medium',
      era: { start: 1960, end: 2024 },
      attributes: [],
      keywords: prompt.split(/\s+/).filter(w => w.length > 3),
      songCount: 10,
      description: `Playlist based on: ${prompt}`
    };

    // Mood detection
    const moodPatterns = {
      happy: { keywords: ['happy', 'joy', 'upbeat', 'cheerful', 'fun'], energy: 7 },
      sad: { keywords: ['sad', 'melancholy', 'blue', 'heartbreak'], energy: 3 },
      energetic: { keywords: ['workout', 'energy', 'pump', 'power', 'gym', 'run'], energy: 9 },
      chill: { keywords: ['chill', 'relax', 'calm', 'peaceful', 'zen', 'sleep'], energy: 2 },
      party: { keywords: ['party', 'dance', 'club', 'celebration'], energy: 8 },
      focus: { keywords: ['focus', 'study', 'work', 'concentrate'], energy: 4 },
      romantic: { keywords: ['romantic', 'love', 'date', 'valentine'], energy: 5 }
    };

    for (const [mood, config] of Object.entries(moodPatterns)) {
      if (config.keywords.some(k => promptLower.includes(k))) {
        analysis.mood = { name: mood, energy: config.energy };
        break;
      }
    }

    // Genre detection
    const genrePatterns = {
      'Rock': ['rock', 'guitar', 'band'],
      'Hip Hop': ['hip hop', 'rap', 'beats', 'urban'],
      'Electronic': ['electronic', 'edm', 'techno', 'house', 'synth'],
      'Jazz': ['jazz', 'swing', 'blues'],
      'Classical': ['classical', 'orchestra', 'symphony', 'piano'],
      'Pop': ['pop', 'hits', 'mainstream', 'top 40'],
      'R&B': ['r&b', 'soul', 'rnb'],
      'Country': ['country', 'folk', 'acoustic'],
      'Metal': ['metal', 'heavy', 'thrash'],
      'Indie': ['indie', 'alternative', 'underground']
    };

    for (const [genre, keywords] of Object.entries(genrePatterns)) {
      if (keywords.some(k => promptLower.includes(k))) {
        analysis.genres.push(genre);
      }
    }

    // Default genres based on mood if none detected
    if (analysis.genres.length === 0) {
      const moodGenres = {
        happy: ['Pop', 'Rock'],
        sad: ['R&B', 'Indie'],
        energetic: ['Rock', 'Electronic', 'Hip Hop'],
        chill: ['Jazz', 'Electronic', 'Indie'],
        party: ['Electronic', 'Hip Hop', 'Pop'],
        focus: ['Classical', 'Electronic', 'Jazz'],
        romantic: ['R&B', 'Pop', 'Jazz'],
        neutral: ['Pop', 'Rock', 'Hip Hop']
      };
      analysis.genres = moodGenres[analysis.mood.name] || moodGenres.neutral;
    }

    // Tempo detection
    if (promptLower.match(/slow|ballad|gentle/)) analysis.tempo = 'slow';
    if (promptLower.match(/fast|quick|rapid|intense/)) analysis.tempo = 'fast';

    // Era detection
    const decadeMatch = promptLower.match(/(19|20)\d0s?/);
    if (decadeMatch) {
      const decade = parseInt(decadeMatch[0]);
      analysis.era = { start: decade, end: decade + 9 };
    }

    // Attributes
    const attributePatterns = {
      instrumental: ['instrumental', 'no vocals', 'without words'],
      acoustic: ['acoustic', 'unplugged'],
      live: ['live', 'concert', 'performance'],
      remix: ['remix', 'remixed']
    };

    for (const [attr, keywords] of Object.entries(attributePatterns)) {
      if (keywords.some(k => promptLower.includes(k))) {
        analysis.attributes.push(attr);
      }
    }

    return analysis;
  }

  // ============================================================
  // MUSIC RECOMMENDATIONS
  // ============================================================

  /**
   * Get personalized music recommendations
   * @param {Object} userContext - User's listening history and preferences
   * @param {Object} options - Recommendation options
   * @returns {Promise<Object>} Recommendations with explanations
   */
  async getRecommendations(userContext, options = {}) {
    const featureConfig = getFeatureConfig('recommendations');

    if (!featureConfig.enabled || !this.initialized) {
      return this._fallbackRecommendations(userContext, options);
    }

    const systemPrompt = `You are a music recommendation AI. Based on the user's listening history and preferences, suggest songs and explain why.

User's recent plays: ${JSON.stringify(userContext.recentPlays || [])}
User's favorite artists: ${JSON.stringify(userContext.favoriteArtists || [])}
User's favorite genres: ${JSON.stringify(userContext.favoriteGenres || [])}
Time of day: ${options.timeOfDay || 'unknown'}
Day of week: ${options.dayOfWeek || 'unknown'}

Provide recommendations in JSON format:
{
  "recommendations": [
    { "type": "genre", "value": "string", "reason": "string" },
    { "type": "mood", "value": "string", "reason": "string" },
    { "type": "similar_to", "value": "string", "reason": "string" }
  ],
  "searchQueries": ["string"],
  "genres": ["string"],
  "mood": "string",
  "energyLevel": number
}`;

    try {
      const response = await this.generateText(systemPrompt, { temperature: 0.6 });
      return this._parseRecommendations(response, userContext);
    } catch (error) {
      console.error('Recommendations generation failed:', error);
      return this._fallbackRecommendations(userContext, options);
    }
  }

  /**
   * Parse AI recommendations response
   */
  _parseRecommendations(response, userContext) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Parsing failed
    }
    return this._fallbackRecommendations(userContext, {});
  }

  /**
   * Fallback recommendations
   */
  _fallbackRecommendations(userContext, options) {
    const favoriteGenres = userContext.favoriteGenres || ['Pop', 'Rock'];
    const hour = new Date().getHours();

    let mood = 'neutral';
    let energyLevel = 5;

    // Time-based mood adjustment
    if (hour >= 6 && hour < 12) {
      mood = 'energetic';
      energyLevel = 7;
    } else if (hour >= 12 && hour < 17) {
      mood = 'focus';
      energyLevel = 5;
    } else if (hour >= 17 && hour < 21) {
      mood = 'chill';
      energyLevel = 4;
    } else {
      mood = 'calm';
      energyLevel = 3;
    }

    return {
      recommendations: [
        { type: 'genre', value: favoriteGenres[0], reason: 'Based on your listening history' },
        { type: 'mood', value: mood, reason: `Perfect for ${this._getTimeOfDay(hour)}` }
      ],
      searchQueries: favoriteGenres.map(g => g.toLowerCase()),
      genres: favoriteGenres,
      mood: mood,
      energyLevel: energyLevel
    };
  }

  _getTimeOfDay(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  // ============================================================
  // MOOD DETECTION
  // ============================================================

  /**
   * Detect mood from user input or context
   * @param {string} input - User's text input or query
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Detected mood and suggestions
   */
  async detectMood(input, context = {}) {
    const featureConfig = getFeatureConfig('moodDetection');

    if (!featureConfig.enabled || !this.initialized) {
      return this._fallbackMoodDetection(input);
    }

    const systemPrompt = `Analyze the user's message to detect their current mood and music preferences.

Respond in JSON format:
{
  "mood": "string",
  "confidence": number,
  "energy": number,
  "valence": number,
  "suggestedGenres": ["string"],
  "suggestedActivities": ["string"],
  "playlistSuggestion": "string"
}`;

    try {
      const response = await this.generateText(
        `${systemPrompt}\n\nUser message: "${input}"`,
        { temperature: 0.4 }
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Mood detection failed:', error);
    }

    return this._fallbackMoodDetection(input);
  }

  /**
   * Fallback mood detection
   */
  _fallbackMoodDetection(input) {
    const inputLower = input.toLowerCase();

    const moodIndicators = {
      happy: {
        keywords: ['happy', 'excited', 'great', 'amazing', 'wonderful', 'joy'],
        energy: 7, valence: 8, genres: ['Pop', 'Dance']
      },
      sad: {
        keywords: ['sad', 'down', 'depressed', 'lonely', 'heartbroken'],
        energy: 3, valence: 2, genres: ['R&B', 'Indie']
      },
      angry: {
        keywords: ['angry', 'frustrated', 'mad', 'annoyed'],
        energy: 8, valence: 3, genres: ['Rock', 'Metal']
      },
      calm: {
        keywords: ['calm', 'peaceful', 'relaxed', 'chill', 'tired'],
        energy: 2, valence: 6, genres: ['Jazz', 'Ambient']
      },
      motivated: {
        keywords: ['motivated', 'workout', 'gym', 'running', 'exercise'],
        energy: 9, valence: 7, genres: ['Electronic', 'Hip Hop']
      }
    };

    for (const [mood, config] of Object.entries(moodIndicators)) {
      if (config.keywords.some(k => inputLower.includes(k))) {
        return {
          mood: mood,
          confidence: 0.7,
          energy: config.energy,
          valence: config.valence,
          suggestedGenres: config.genres,
          suggestedActivities: [],
          playlistSuggestion: `${mood} vibes playlist`
        };
      }
    }

    return {
      mood: 'neutral',
      confidence: 0.5,
      energy: 5,
      valence: 5,
      suggestedGenres: ['Pop', 'Rock'],
      suggestedActivities: ['listening', 'discovering'],
      playlistSuggestion: 'Your daily mix'
    };
  }

  // ============================================================
  // SEMANTIC SEARCH
  // ============================================================

  /**
   * Perform semantic search for music
   * @param {string} query - Natural language search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search parameters and filters
   */
  async semanticSearch(query, options = {}) {
    const featureConfig = getFeatureConfig('semanticSearch');

    if (!featureConfig.enabled || !this.initialized) {
      return this._fallbackSemanticSearch(query);
    }

    const systemPrompt = `Convert the user's natural language music search into structured search parameters.

Respond in JSON format:
{
  "searchTerms": ["string"],
  "genres": ["string"],
  "artists": ["string"],
  "moods": ["string"],
  "decades": ["string"],
  "filters": {
    "instrumental": boolean,
    "live": boolean,
    "explicit": boolean
  }
}`;

    try {
      const response = await this.generateText(
        `${systemPrompt}\n\nSearch query: "${query}"`,
        { temperature: 0.3 }
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Semantic search failed:', error);
    }

    return this._fallbackSemanticSearch(query);
  }

  /**
   * Fallback semantic search
   */
  _fallbackSemanticSearch(query) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);

    return {
      searchTerms: words.filter(w => w.length > 2),
      genres: [],
      artists: [],
      moods: [],
      decades: [],
      filters: {
        instrumental: queryLower.includes('instrumental'),
        live: queryLower.includes('live'),
        explicit: false
      }
    };
  }

  // ============================================================
  // CHAT ASSISTANT
  // ============================================================

  /**
   * AI chat assistant for music-related queries
   * @param {string} message - User's message
   * @param {Array} conversationHistory - Previous messages
   * @param {Object} context - User context
   * @returns {Promise<Object>} Assistant response
   */
  async chat(message, conversationHistory = [], context = {}) {
    const featureConfig = getFeatureConfig('chatAssistant');

    if (!featureConfig.enabled || !this.initialized) {
      return this._fallbackChat(message);
    }

    const systemPrompt = `You are a helpful music assistant for the Hathor Music Platform. You can help users:
- Find and discover new music
- Create playlists based on their mood or activity
- Get recommendations based on their taste
- Learn about artists and genres
- Navigate the platform

User's favorite genres: ${JSON.stringify(context.favoriteGenres || [])}
Current context: ${context.currentPage || 'home'}

Previous conversation:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

Respond naturally and helpfully. If suggesting actions, use this format:
{
  "message": "Your response text",
  "actions": [
    { "type": "create_playlist", "params": { "prompt": "string" } },
    { "type": "search", "params": { "query": "string" } },
    { "type": "navigate", "params": { "page": "string" } }
  ]
}`;

    try {
      const response = await this.generateText(
        `${systemPrompt}\n\nUser: ${message}`,
        { temperature: 0.7, maxTokens: 512 }
      );

      // Try to parse as JSON
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Not JSON, return as plain message
      }

      return {
        message: response,
        actions: []
      };
    } catch (error) {
      console.error('Chat failed:', error);
      return this._fallbackChat(message);
    }
  }

  /**
   * Fallback chat responses
   */
  _fallbackChat(message) {
    const messageLower = message.toLowerCase();

    if (messageLower.includes('playlist')) {
      return {
        message: "I can help you create a playlist! Just tell me what mood or activity you want music for, and I'll put together something perfect for you.",
        actions: []
      };
    }

    if (messageLower.includes('recommend') || messageLower.includes('suggestion')) {
      return {
        message: "I'd love to recommend some music! What are you in the mood for today? Or I can suggest something based on your listening history.",
        actions: []
      };
    }

    if (messageLower.includes('hello') || messageLower.includes('hi')) {
      return {
        message: "Hello! I'm your music assistant. I can help you discover new music, create playlists, or find songs that match your mood. What would you like to do?",
        actions: []
      };
    }

    return {
      message: "I'm here to help with all things music! You can ask me to create playlists, find recommendations, or search for specific songs and artists.",
      actions: []
    };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      configured: isConfigured(),
      features: COLAB_CONFIG.features,
      fallbackMode: !this.initialized
    };
  }

  /**
   * Clear the response cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
const colabAIService = new ColabAIService();

module.exports = colabAIService;
