const colabAIService = require('../services/colabAIService');

describe('ColabAIService Caching', () => {
  let originalMakeRequest;
  let originalInitialized;
  let originalClient;

  beforeAll(() => {
    originalMakeRequest = colabAIService._makeRequest;
    originalInitialized = colabAIService.initialized;
    originalClient = colabAIService.client;
  });

  afterAll(() => {
    colabAIService._makeRequest = originalMakeRequest;
    colabAIService.initialized = originalInitialized;
    colabAIService.client = originalClient;
  });

  beforeEach(() => {
    colabAIService.clearCache();
    // Force initialization for these tests
    colabAIService.initialized = true;
    colabAIService.client = { endpoint: 'http://mock', timeout: 1000 };
  });

  it('should cache successful responses', async () => {
    const mockResponse = { text: 'Cached Response' };
    const makeRequestSpy = jest.fn().mockResolvedValue(mockResponse);
    colabAIService._makeRequest = makeRequestSpy;

    const prompt = 'Test Prompt';

    // First call - should hit API
    const result1 = await colabAIService.generateText(prompt);
    expect(result1).toBe('Cached Response');
    expect(makeRequestSpy).toHaveBeenCalledTimes(1);

    // Second call - should hit cache
    const result2 = await colabAIService.generateText(prompt);
    expect(result2).toBe('Cached Response');
    expect(makeRequestSpy).toHaveBeenCalledTimes(1); // Call count remains 1
  });

  it('should invalidate cache after timeout', async () => {
    const mockResponse = { text: 'Response' };
    const makeRequestSpy = jest.fn().mockResolvedValue(mockResponse);
    colabAIService._makeRequest = makeRequestSpy;

    // Shorten cache timeout for test
    const originalTimeout = colabAIService.cacheTimeout;
    colabAIService.cacheTimeout = 100; // 100ms

    const prompt = 'Timeout Test';

    // First call
    await colabAIService.generateText(prompt);
    expect(makeRequestSpy).toHaveBeenCalledTimes(1);

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Second call - should hit API again
    await colabAIService.generateText(prompt);
    expect(makeRequestSpy).toHaveBeenCalledTimes(2);

    // Restore timeout
    colabAIService.cacheTimeout = originalTimeout;
  });

  it('should not cache fallback responses', async () => {
    // Mock failure
    const makeRequestSpy = jest.fn().mockRejectedValue(new Error('API Error'));
    colabAIService._makeRequest = makeRequestSpy;

    const prompt = 'Fallback Test';

    // First call - fails, returns fallback
    const result1 = await colabAIService.generateText(prompt);
    // Result will be fallback string
    expect(makeRequestSpy).toHaveBeenCalledTimes(1);

    // Second call - should try API again because we shouldn't cache failures
    const result2 = await colabAIService.generateText(prompt);
    expect(makeRequestSpy).toHaveBeenCalledTimes(2);
  });

  it('should respect max cache size and evict oldest entries', async () => {
    // Save original max size
    const originalMaxSize = colabAIService.maxCacheSize;
    colabAIService.maxCacheSize = 2;
    colabAIService.clearCache();

    const mockResponse = { text: 'Response' };
    colabAIService._makeRequest = jest.fn().mockResolvedValue(mockResponse);

    // Fill cache
    await colabAIService.generateText('Prompt 1');
    const keys1 = [...colabAIService.cache.keys()];
    const key1 = keys1[0];

    await colabAIService.generateText('Prompt 2');
    const keys2 = [...colabAIService.cache.keys()];
    const key2 = keys2[1];

    expect(colabAIService.cache.size).toBe(2);
    expect(colabAIService.cache.has(key1)).toBe(true);
    expect(colabAIService.cache.has(key2)).toBe(true);

    // Add one more
    await colabAIService.generateText('Prompt 3');
    const keys3 = [...colabAIService.cache.keys()];
    const key3 = keys3[keys3.length - 1]; // It was added at end

    expect(colabAIService.cache.size).toBe(2);
    expect(colabAIService.cache.has(key3)).toBe(true);
    expect(colabAIService.cache.has(key1)).toBe(false); // Evicted

    // Access Prompt 2 to make it most recently used
    await colabAIService.generateText('Prompt 2');

    // Prompt 2 should be at the end now
    const keysAfterAccess = [...colabAIService.cache.keys()];
    expect(keysAfterAccess[keysAfterAccess.length - 1]).toBe(key2); // Most recent

    // Add another
    await colabAIService.generateText('Prompt 4');
    const keys4 = [...colabAIService.cache.keys()];
    const key4 = keys4[keys4.length - 1];

    // Prompt 3 should be evicted because Prompt 2 was refreshed
    expect(colabAIService.cache.has(key4)).toBe(true);
    expect(colabAIService.cache.has(key2)).toBe(true);
    expect(colabAIService.cache.has(key3)).toBe(false);

    // Restore max size
    colabAIService.maxCacheSize = originalMaxSize;
  });
});
