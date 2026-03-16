/**
 * Test Suite - 測試程式
 */

const fs = require('fs');
const path = require('path');
const LogParser = require('../scripts/parse');
const ReportGenerator = require('../scripts/report');

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 開始執行測試\n' + '='.repeat(50));

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ PASS: ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log('='.repeat(50));
    console.log(`\n📊 測試結果: ${this.passed} 通過, ${this.failed} 失敗`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }
}

const runner = new TestRunner();

// Syslog 解析測試
runner.test('解析 Syslog 格式', () => {
  const parser = new LogParser('syslog');
  const line = 'Feb 14 10:30:45 myserver kernel: Warning: CPU temperature high';
  const entry = parser.parseLine(line);

  runner.assert(entry !== null, '應該解析成功');
  runner.assertEqual(entry.severity, 'warn', '嚴重性應為 warn');
  runner.assertEqual(entry.service, 'kernel', '服務名稱應為 kernel');
  runner.assertEqual(entry.hostname, 'myserver', '主機名應為 myserver');
});

// JSON 解析測試
runner.test('解析 JSON 格式', () => {
  const parser = new LogParser('json');
  const line = JSON.stringify({
    timestamp: '2026-02-14T10:30:45Z',
    level: 'ERROR',
    message: 'Database connection failed',
    service: 'api-server'
  });
  const entry = parser.parseLine(line);

  runner.assert(entry !== null, '應該解析成功');
  runner.assertEqual(entry.severity, 'error', '嚴重性應為 error');
  runner.assertEqual(entry.service, 'api-server', '服務名稱應為 api-server');
});

// Plain Text 解析測試
runner.test('解析 Plain Text 格式', () => {
  const parser = new LogParser('plain');
  const line = '[2026-02-14 10:30:45] [ERROR] Database connection failed';
  const entry = parser.parseLine(line);

  runner.assert(entry !== null, '應該解析成功');
  runner.assertEqual(entry.severity, 'error', '嚴重性應為 error');
});

// 嚴重性過濾測試
runner.test('按嚴重性過濾', () => {
  const parser = new LogParser('json');
  const entries = [
    { severity: 'error', message: 'Error 1' },
    { severity: 'info', message: 'Info 1' },
    { severity: 'error', message: 'Error 2' },
    { severity: 'warn', message: 'Warn 1' }
  ];

  const errors = parser.filterBySeverity(entries, 'error');
  runner.assertEqual(errors.length, 2, '應該有 2 個錯誤');
});

// 報告生成測試
runner.test('生成 Markdown 報告', () => {
  const generator = new ReportGenerator();
  const entries = [
    { timestamp: new Date(), severity: 'error', service: 'test', message: 'Test error' },
    { timestamp: new Date(), severity: 'info', service: 'test', message: 'Test info' }
  ];

  const report = generator.generate(entries, 'markdown', { fileName: 'test.log', format: 'json' });
  runner.assert(report.includes('日誌分析報告'), '報告應包含標題');
  runner.assert(report.includes('總記錄數'), '報告應包含統計');
});

runner.test('生成 JSON 報告', () => {
  const generator = new ReportGenerator();
  const entries = [
    { timestamp: new Date(), severity: 'error', service: 'test', message: 'Test error' }
  ];

  const report = generator.generate(entries, 'json', { fileName: 'test.log', format: 'json' });
  const data = JSON.parse(report);
  runner.assert(data.summary.total === 1, '總數應為 1');
});

runner.test('生成 HTML 報告', () => {
  const generator = new ReportGenerator();
  const entries = [
    { timestamp: new Date(), severity: 'error', service: 'test', message: 'Test error' }
  ];

  const report = generator.generate(entries, 'html', { fileName: 'test.log', format: 'json' });
  runner.assert(report.includes('<!DOCTYPE html>'), '應為 HTML 格式');
  runner.assert(report.includes('日誌分析報告'), '應包含標題');
});

// 效能指標提取測試
runner.test('提取效能指標', () => {
  const generator = new ReportGenerator();
  const entries = [
    { timestamp: new Date(), severity: 'info', service: 'test', message: 'Request 1', duration_ms: 100 },
    { timestamp: new Date(), severity: 'info', service: 'test', message: 'Request 2', duration_ms: 200 },
    { timestamp: new Date(), severity: 'info', service: 'test', message: 'Request 3', duration_ms: 300 }
  ];

  const metrics = generator.extractPerformanceMetrics(entries);
  runner.assert(metrics !== null, '應該有效能指標');
  runner.assertEqual(metrics.count, 3, '應該有 3 個請求');
  runner.assertEqual(metrics.avg, 200, '平均值應為 200ms');
  runner.assertEqual(metrics.min, 100, '最小值應為 100ms');
  runner.assertEqual(metrics.max, 300, '最大值應為 300ms');
});

// 範例檔案測試
runner.test('解析範例 Syslog 檔案', async () => {
  const parser = new LogParser('syslog');
  const filePath = path.join(__dirname, '../examples/sample-syslog.log');
  
  if (!fs.existsSync(filePath)) {
    throw new Error('範例檔案不存在');
  }

  const entries = await parser.parseFile(filePath, 100);
  runner.assert(entries.length > 0, '應該解析到記錄');
  runner.assert(entries[0].format === 'syslog', '格式應為 syslog');
});

runner.test('解析範例 JSON 檔案', async () => {
  const parser = new LogParser('json');
  const filePath = path.join(__dirname, '../examples/sample-json.log');
  
  if (!fs.existsSync(filePath)) {
    throw new Error('範例檔案不存在');
  }

  const entries = await parser.parseFile(filePath, 100);
  runner.assert(entries.length > 0, '應該解析到記錄');
  runner.assert(entries[0].format === 'json', '格式應為 json');
});

runner.test('解析範例 Plain Text 檔案', async () => {
  const parser = new LogParser('plain');
  const filePath = path.join(__dirname, '../examples/sample-plain.log');
  
  if (!fs.existsSync(filePath)) {
    throw new Error('範例檔案不存在');
  }

  const entries = await parser.parseFile(filePath, 100);
  runner.assert(entries.length > 0, '應該解析到記錄');
  runner.assert(entries[0].format === 'plain', '格式應為 plain');
});

// 執行測試
runner.run().catch(console.error);
