#!/usr/bin/env node
/**
 * Log Monitor - 即時日誌監控程式
 */

const fs = require('fs');
const path = require('path');
const LogParser = require('./parse');

class LogMonitor {
  constructor(options) {
    this.options = {
      file: options.file,
      format: options.format,
      severity: options.severity || 'error',
      interval: parseInt(options.interval, 10) || 1000,
      webhook: options.webhook,
      pattern: options.pattern,
      ...options
    };
    
    this.parser = new LogParser(this.options.format);
    this.lastPosition = 0;
    this.alertCount = 0;
    this.running = false;
  }

  start() {
    console.log('🔴 Log Monitor 啟動');
    console.log(`📁 監控檔案: ${this.options.file}`);
    console.log(`📝 格式: ${this.options.format}`);
    console.log(`⚠️  告警門檻: ${this.options.severity}`);
    console.log(`⏱️  檢查間隔: ${this.options.interval}ms`);
    if (this.options.pattern) {
      console.log(`🔎 自定義模式: ${this.options.pattern}`);
    }
    console.log('按 Ctrl+C 停止監控\n');

    this.running = true;
    
    if (fs.existsSync(this.options.file)) {
      this.lastPosition = fs.statSync(this.options.file).size;
    }

    this.monitorLoop();

    process.on('SIGINT', () => {
      this.stop();
    });
  }

  stop() {
    console.log('\n🛑 停止監控');
    console.log(`📊 總共發出 ${this.alertCount} 次告警`);
    this.running = false;
    process.exit(0);
  }

  async monitorLoop() {
    while (this.running) {
      try {
        await this.checkNewLines();
      } catch (error) {
        console.error(`監控錯誤: ${error.message}`);
      }
      await this.sleep(this.options.interval);
    }
  }

  async checkNewLines() {
    if (!fs.existsSync(this.options.file)) {
      return;
    }

    const stats = fs.statSync(this.options.file);
    const currentSize = stats.size;

    if (currentSize < this.lastPosition) {
      console.log('🔄 檔案已輪替，重新定位');
      this.lastPosition = 0;
    }

    if (currentSize > this.lastPosition) {
      const newLines = await this.readNewLines();
      
      for (const line of newLines) {
        const entry = this.parser.parseLine(line);
        if (entry && this.shouldAlert(entry)) {
          this.triggerAlert(entry);
        }
      }

      this.lastPosition = currentSize;
    }
  }

  async readNewLines() {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.options.file, {
        start: this.lastPosition,
        encoding: 'utf8'
      });

      let content = '';
      stream.on('data', chunk => {
        content += chunk;
      });

      stream.on('end', () => {
        const lines = content.split('\n').filter(line => line.trim() !== '');
        resolve(lines);
      });

      stream.on('error', reject);
    });
  }

  shouldAlert(entry) {
    if (this.options.pattern) {
      const regex = new RegExp(this.options.pattern, 'i');
      return regex.test(entry.message) || regex.test(entry.raw);
    }

    const severityLevels = {
      'debug': 0, 'info': 1, 'warn': 2, 'error': 3, 'critical': 4
    };

    const entryLevel = severityLevels[entry.severity] || 0;
    const thresholdLevel = severityLevels[this.options.severity] || 3;

    return entryLevel >= thresholdLevel;
  }

  triggerAlert(entry) {
    this.alertCount++;
    const timestamp = new Date().toLocaleString();
    const severityIcon = this.getSeverityIcon(entry.severity);
    
    console.log(`\n${severityIcon} [${timestamp}] 告警 #${this.alertCount}`);
    console.log(`   嚴重性: ${entry.severity.toUpperCase()}`);
    console.log(`   服務: ${entry.service}`);
    console.log(`   時間: ${new Date(entry.timestamp).toLocaleString()}`);
    console.log(`   訊息: ${entry.message.substring(0, 200)}`);
    
    if (this.options.webhook) {
      this.sendWebhook(entry);
    }
  }

  async sendWebhook(entry) {
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        severity: entry.severity,
        service: entry.service,
        message: entry.message,
        source: 'log-analyzer-skill'
      };

      const url = new URL(this.options.webhook);
      const https = url.protocol === 'https:' ? require('https') : require('http');

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('   📤 Webhook 發送成功');
        } else {
          console.log(`   ⚠️  Webhook 回應: ${res.statusCode}`);
        }
      });

      req.on('error', (err) => {
        console.log(`   ❌ Webhook 發送失敗: ${err.message}`);
      });

      req.write(JSON.stringify(payload));
      req.end();

    } catch (error) {
      console.log(`   ❌ Webhook 錯誤: ${error.message}`);
    }
  }

  getSeverityIcon(severity) {
    const icons = {
      'critical': '🔴', 'error': '❌', 'warn': '⚠️', 'info': 'ℹ️', 'debug': '🔍'
    };
    return icons[severity] || '•';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

function showHelp() {
  console.log(`
用法: node monitor.js [選項]

選項:
  -f, --file <path>       監控的日誌檔案 (必填)
  -t, --format <format>   日誌格式: syslog|json|plain (必填)
  --severity <level>      告警嚴重性門檻 (預設: error)
  --interval <ms>         檢查間隔，毫秒 (預設: 1000)
  --webhook <url>         告警 Webhook URL
  --pattern <regex>       自定義匹配正則表達式
  -h, --help              顯示說明

範例:
  node monitor.js -f /var/log/app.log -t json
  node monitor.js -f server.log -t plain --severity warn --webhook https://hooks.slack.com/...
  node monitor.js -f auth.log -t syslog --pattern "Failed password"
`);
}

function parseArgs(args) {
  const options = {};

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
      case '--severity':
        options.severity = args[++i];
        break;
      case '--interval':
        options.interval = args[++i];
        break;
      case '--webhook':
        options.webhook = args[++i];
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

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(1);
  }

  const options = parseArgs(args);

  if (!options.file) {
    console.error('❌ 錯誤: 請指定日誌檔案路徑 (--file)');
    process.exit(1);
  }

  if (!options.format) {
    console.error('❌ 錯誤: 請指定日誌格式 (--format)');
    process.exit(1);
  }

  if (!fs.existsSync(options.file)) {
    console.error(`❌ 錯誤: 檔案不存在: ${options.file}`);
    process.exit(1);
  }

  const monitor = new LogMonitor(options);
  monitor.start();
}

main();
