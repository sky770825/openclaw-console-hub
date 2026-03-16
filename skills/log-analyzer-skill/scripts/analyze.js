#!/usr/bin/env node
/**
 * Log Analyzer - 日誌分析主程式
 */

const fs = require('fs');
const path = require('path');
const LogParser = require('./parse');
const ReportGenerator = require('./report');

function showHelp() {
  console.log(`
用法: node analyze.js [選項]

選項:
  -f, --file <path>       日誌檔案路徑 (必填)
  -t, --format <format>   日誌格式: syslog|json|plain (必填)
  -o, --output <path>     輸出報告路徑
  --type <type>           報告類型: markdown|json|html (預設: markdown)
  --start <time>          開始時間 (ISO 格式)
  --end <time>            結束時間 (ISO 格式)
  --severity <level>      過濾嚴重性: critical|error|warn|info|debug|all
  --limit <number>        最大分析行數 (預設: 10000)
  --service <name>        過濾特定服務
  --pattern <regex>       正則表達式過濾
  -h, --help              顯示說明

範例:
  node analyze.js -f /var/log/syslog -t syslog
  node analyze.js -f app.log -t json -o report.html --type html
  node analyze.js -f server.log -t plain --severity error --start 2026-02-01T00:00:00Z
`);
}

function parseArgs(args) {
  const options = {
    type: 'markdown',
    limit: 10000,
    severity: 'all'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-f':
      case '--file':
        options.file = args[++i];
        break;
      case '-t':
      case '--format':
        options.format = args[++i];
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '--type':
        options.type = args[++i];
        break;
      case '--start':
        options.start = args[++i];
        break;
      case '--end':
        options.end = args[++i];
        break;
      case '--severity':
        options.severity = args[++i];
        break;
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--service':
        options.service = args[++i];
        break;
      case '--pattern':
        options.pattern = args[++i];
        break;
      case '-h':
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(1);
  }

  const options = parseArgs(args);

  // 驗證必填參數
  if (!options.file) {
    console.error('❌ 錯誤: 請指定日誌檔案路徑 (--file)');
    process.exit(1);
  }

  if (!options.format) {
    console.error('❌ 錯誤: 請指定日誌格式 (--format)');
    process.exit(1);
  }

  // 檢查檔案是否存在
  if (!fs.existsSync(options.file)) {
    console.error(`❌ 錯誤: 檔案不存在: ${options.file}`);
    process.exit(1);
  }

  console.log('📊 Log Analyzer v1.0.0');
  console.log(`📁 分析檔案: ${options.file}`);
  console.log(`📝 日誌格式: ${options.format}`);
  console.log(`🔢 最大行數: ${options.limit}`);
  console.log('⏳ 正在分析...\n');

  const startTime = Date.now();

  try {
    // 建立解析器
    const parser = new LogParser(options.format);

    // 解析檔案
    const entries = await parser.parseFile(options.file, options.limit);
    console.log(`✅ 解析完成: ${entries.length} 條記錄`);

    // 過濾處理
    let filtered = entries;

    if (options.severity !== 'all') {
      filtered = parser.filterBySeverity(filtered, options.severity);
      console.log(`🔍 嚴重性過濾 (${options.severity}): ${filtered.length} 條記錄`);
    }

    if (options.start || options.end) {
      filtered = parser.filterByTime(filtered, options.start, options.end);
      console.log(`⏰ 時間範圍過濾: ${filtered.length} 條記錄`);
    }

    if (options.service) {
      filtered = parser.filterByService(filtered, options.service);
      console.log(`🖥️  服務過濾 (${options.service}): ${filtered.length} 條記錄`);
    }

    if (options.pattern) {
      filtered = parser.filterByPattern(filtered, options.pattern);
      console.log(`🔎 模式過濾: ${filtered.length} 條記錄`);
    }

    // 生成報告
    const generator = new ReportGenerator();
    const report = generator.generate(filtered, options.type, {
      fileName: path.basename(options.file),
      format: options.format
    });

    // 輸出報告
    if (options.output) {
      fs.writeFileSync(options.output, report, 'utf8');
      console.log(`\n📝 報告已儲存: ${options.output}`);
    } else {
      console.log('\n' + '='.repeat(60));
      console.log(report);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ 分析完成! 耗時: ${duration} 秒`);

  } catch (error) {
    console.error(`\n❌ 分析失敗: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
