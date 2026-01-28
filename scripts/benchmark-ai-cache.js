const colabAIService = require('../server/services/colabAIService');

async function benchmark() {
  console.log('Starting Benchmark...');

  // 1. Force Initialize to bypass configuration checks
  colabAIService.initialized = true;
  colabAIService.client = { endpoint: 'http://mock', timeout: 5000 };

  // 2. Mock _makeRequest to simulate latency
  // We mock it on the instance directly
  let callCount = 0;
  // Store original implementation if we wanted to restore it, but for this script we don't need to.

  colabAIService._makeRequest = async function(endpoint, payload) {
    callCount++;
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms latency
    return { text: 'Mock AI Response' };
  };

  const prompt = 'Test Prompt for Benchmark';
  const options = { temperature: 0.7 };

  // Run once to ensure JIT etc (optional, but good practice, though here we want to see cache effect directly)

  console.log('--- Run 1 (Cold Cache) ---');
  const start1 = performance.now();
  const res1 = await colabAIService.generateText(prompt, options);
  const end1 = performance.now();
  console.log(`Time: ${(end1 - start1).toFixed(2)}ms`);
  console.log(`Result: ${res1.substring(0, 20)}...`);

  console.log('\n--- Run 2 (Should be Warm Cache) ---');
  const start2 = performance.now();
  const res2 = await colabAIService.generateText(prompt, options);
  const end2 = performance.now();
  console.log(`Time: ${(end2 - start2).toFixed(2)}ms`);
  console.log(`Result: ${res2.substring(0, 20)}...`);

  console.log(`\nTotal API calls: ${callCount}`);

  if (callCount === 1) {
    console.log('SUCCESS: Cache HIT observed.');
  } else if (callCount === 2) {
    console.log('BASELINE: No cache hit (expected before optimization).');
  } else {
    console.log(`Unexpected call count: ${callCount}`);
  }
}

benchmark().catch(console.error);
