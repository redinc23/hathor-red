const colabAIService = require('../services/colabAIService');
const { COLAB_CONFIG } = require('../config/colabAI');

// Ensure the service is in a clean state
beforeEach(() => {
  // Reset singleton state if possible or mock behaviors
  // Since it is a singleton, we might need to be careful.
  // We can mock the configuration to ensure fallback mode.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ColabAIService', () => {
  describe('Initialization', () => {
    it('should initialize in fallback mode when configuration is missing', async () => {
      // Mock COLAB_CONFIG to be empty or invalid
      // Since COLAB_CONFIG is imported, we might not be able to change it easily if it's a const object.
      // However, `isConfigured` checks process.env variables which are loaded into COLAB_CONFIG at module load time.
      // Modifying process.env NOW might not affect COLAB_CONFIG if it's already loaded.

      // Instead, we verify that in this test environment (where we haven't set valid keys), it returns false or initializes in fallback.

      const result = await colabAIService.initialize();
      // Expect false because we don't have API keys
      expect(result).toBe(false);

      // Check status
      const status = colabAIService.getStatus();
      expect(status.fallbackMode).toBe(true);
    });
  });

  describe('Fallback Features', () => {
    // Force initialization state if needed, but initialize() returning false keeps it uninitialized, triggering fallbacks.

    it('should return fallback playlist analysis', async () => {
      const prompt = 'Upbeat workout music';
      const analysis = await colabAIService.analyzePlaylistPrompt(prompt);

      expect(analysis).toBeDefined();
      // The logic in fallback might prioritize "happy" (first mood in map) if "upbeat" matches "happy" keywords.
      // Let's check which mood it matched.
      // "Upbeat" is in "happy" keywords. "workout" is in "energetic" keywords.
      // The iteration order of object keys is generally insertion order but not guaranteed strictly in all envs, though usually consistent.
      // However, "happy" is defined first in `moodPatterns`.
      // If "upbeat" is in prompt, it matches "happy".

      // Let's use a prompt that ONLY matches energetic
      const energeticPrompt = 'workout gym power';
      const energeticAnalysis = await colabAIService.analyzePlaylistPrompt(energeticPrompt);
      expect(energeticAnalysis.mood.name).toBe('energetic');

      // And verify the original prompt behavior if we want, or just accept that "Upbeat" triggers "happy"
      if (analysis.mood.name === 'happy') {
         expect(analysis.mood.energy).toBe(7);
      } else {
         expect(analysis.mood.name).toBe('energetic');
      }
    });

    it('should return fallback recommendations', async () => {
      const userContext = {
        favoriteGenres: ['Jazz', 'Blues']
      };

      const recommendations = await colabAIService.getRecommendations(userContext);

      expect(recommendations).toBeDefined();
      expect(recommendations.genres).toEqual(['Jazz', 'Blues']);
      expect(recommendations.recommendations).toHaveLength(2);
    });

    it('should return fallback mood detection', async () => {
      const input = 'I feel so happy today';
      const moodData = await colabAIService.detectMood(input);

      expect(moodData).toBeDefined();
      expect(moodData.mood).toBe('happy');
      expect(moodData.confidence).toBeGreaterThan(0);
    });

    it('should return fallback semantic search', async () => {
        const query = 'live jazz music';
        const searchParams = await colabAIService.semanticSearch(query);

        expect(searchParams).toBeDefined();
        expect(searchParams.filters.live).toBe(true);
        expect(searchParams.searchTerms).toContain('jazz');
    });

    it('should return fallback chat response', async () => {
        const message = 'Can you create a playlist?';
        const response = await colabAIService.chat(message);

        expect(response).toBeDefined();
        expect(response.message).toContain('playlist');
    });
  });
});
