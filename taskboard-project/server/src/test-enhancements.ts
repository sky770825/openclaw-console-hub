import { getEnhancedHealth } from './utils/health.js';
import { generateDailyReport } from './services/reportService.js';
import { aiMemoryStore } from './services/aiMemoryStore.js';
import { logger } from './utils/logger.js';

async function runTests() {
  logger.info({ component: 'test', operation: 'runTests' }, '--- Starting OpenClaw System Enhancements Tests ---');

  // Test 1: Health Check
  logger.info({ component: 'test', operation: 'healthCheck' }, '[Test 1] Health Check Data:');
  const health = await getEnhancedHealth();
  logger.info({ health, component: 'test' }, 'Health check completed');

  // Test 2: AI Memory Store (Cache/Offline mode since we might not have real Supabase keys)
  logger.info({ component: 'test', operation: 'memoryStore' }, '[Test 2] AI Memory Store:');
  const testMemory = await aiMemoryStore.addMemory('Test memory content', { source: 'test-suite' });
  logger.info({ testMemory, component: 'test' }, 'Added memory');
  const memories = await aiMemoryStore.getMemories();
  logger.info({ cacheSize: memories.length, component: 'test' }, 'Memory cache size');

  // Test 3: Daily Report Logic
  logger.info({ component: 'test', operation: 'dailyReport' }, '[Test 3] Daily Report Generation:');
  const report = await generateDailyReport();
  logger.info({ report, component: 'test' }, 'Generated Report Content');

  logger.info({ component: 'test' }, '--- Tests Completed ---');
}

runTests().catch(err => {
  logger.error({ error: err, component: 'test' }, 'Tests failed');
  process.exit(1);
});
