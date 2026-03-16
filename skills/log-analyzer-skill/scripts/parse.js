/**
 * Log Parser - 日誌解析器核心
 * 支援 Syslog、JSON、Plain Text 格式
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

// 預設配置
const DEFAULT_CONFIG = require('../config.json');

class LogParser {
  constructor(format, config = {}) {
    this.format = format;
    this.config = this.mergeConfig(config);
  }

  mergeConfig(userConfig) {
    const formatConfig = DEFAULT_CONFIG.parsers[this.format] || {};
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      parsers: {
        ...DEFAULT_CONFIG.parsers,
        [this.format]: {
          ...formatConfig,
          ...(userConfig.parsers?.[this.format] || {})
        }
      }
    };
  }

  /**
   * 解析單行日誌
   * @param {string} line - 日誌行
   * @returns {object|null} 解析後的日誌物件
   */
  parseLine(line) {
    if (!line || line.trim() === '') return null;

    switch (this.format) {
      case 'syslog':
        return this.parseSyslog(line);
      case 'json':
        return this.parseJson(line);
      case 'plain':
        return this.parsePlain(line);
      default:
        throw new Error(`不支援的日誌格式: ${this.format}`);
    }
  }

  /**
   * 解析 Syslog 格式
   * 範例: Feb 14 10:30:45 myserver kernel: [12345.678901] Warning: CPU temperature high
   */
  parseSyslog(line) {
    const config = this.config.parsers.syslog;
    
    // 解析時間戳
    const timestampMatch = line.match(new RegExp(config.timestampPattern, 'i'));
    const timestamp = timestampMatch ? this.parseSyslogTimestamp(timestampMatch[1]) : new Date();
    
    // 解析嚴重性
    const severityMatch = line.match(new RegExp(config.severityPattern, 'i'));
    const severity = severityMatch ? config.severityMap[severityMatch[1].toLowerCase()] || 'info' : 'info';
    
    // 解析主機名
    const hostnameMatch = line.match(new RegExp(config.hostnamePattern, 'i'));
    const hostname = hostnameMatch ? hostnameMatch[1] : 'unknown';
    
    // 解析服務名稱
    const serviceMatch = line.match(new RegExp(config.servicePattern, 'i'));
    const service = serviceMatch ? serviceMatch[1].trim() : 'unknown';
    
    // 提取訊息內容
    const message = line.replace(/^\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+[^:]+:\s*/, '').trim();
    
    return {
      timestamp,
      severity,
      hostname,
      service,
      message,
      raw: line,
      format: 'syslog'
    };
  }

  /**
   * 解析 Syslog 時間戳
   */
  parseSyslogTimestamp(ts) {
    const currentYear = new Date().getFullYear();
    const date = new Date(`${ts} ${currentYear}`);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  /**
   * 解析 JSON 格式
   * 範例: {"timestamp":"2026-02-14T10:30:45Z","level":"ERROR","message":"..."}
   */
  parseJson(line) {
    const config = this.config.parsers.json;
    
    try {
      const data = JSON.parse(line);
      
      const timestamp = data[config.timestampField] ? new Date(data[config.timestampField]) : new Date();
      const level = data[config.levelField] || 'info';
      const severity = config.severityMap[level.toLowerCase()] || 'info';
      const message = data[config.messageField] || JSON.stringify(data);
      const service = data[config.serviceField] || data.service || 'unknown';
      
      return {
        timestamp,
        severity,
        service,
        message,
        raw: line,
        format: 'json',
        ...data  // 保留所有原始欄位
      };
    } catch (e) {
      // JSON 解析失敗，回退為純文字
      return {
        timestamp: new Date(),
        severity: 'info',
        service: 'unknown',
        message: line,
        raw: line,
        format: 'json',
        parseError: true
      };
    }
  }

  /**
   * 解析 Plain Text 格式
   * 範例: [2026-02-14 10:30:45] [ERROR] Database connection failed
   */
  parsePlain(line) {
    const config = this.config.parsers.plain;
    
    // 解析時間戳
    const timestampMatch = line.match(new RegExp(config.timestampPattern));
    const timestamp = timestampMatch ? new Date(timestampMatch[1]) : new Date();
    
    // 解析嚴重性
    const severityMatch = line.match(new RegExp(config.severityPattern, 'i'));
    const severity = severityMatch ? config.severityMap[severityMatch[1]] || 'info' : 'info';
    
    // 提取訊息內容
    let message = line;
    message = message.replace(new RegExp(config.timestampPattern), '').trim();
    message = message.replace(new RegExp(config.severityPattern, 'i'), '').trim();
    message = message.replace(/^\[|\]$/g, '').trim();
    
    return {
      timestamp,
      severity,
      service: 'unknown',
      message,
      raw: line,
      format: 'plain'
    };
  }

  /**
   * 解析整個檔案
   * @param {string} filePath - 檔案路徑
   * @param {number} limit - 最大行數限制
   * @returns {Promise<Array>} 解析後的日誌陣列
   */
  async parseFile(filePath, limit = 10000) {
    const entries = [];
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
      if (count >= limit) break;
      
      const entry = this.parseLine(line);
      if (entry) {
        entries.push(entry);
        count++;
      }
    }

    return entries;
  }

  /**
   * 解析整個檔案（同步版本，適用於小檔案）
   */
  parseFileSync(filePath, limit = 10000) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const entries = [];

    for (let i = 0; i < Math.min(lines.length, limit); i++) {
      const entry = this.parseLine(lines[i]);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * 按嚴重性過濾
   */
  filterBySeverity(entries, severity) {
    if (severity === 'all') return entries;
    return entries.filter(e => e.severity === severity);
  }

  /**
   * 按時間範圍過濾
   */
  filterByTime(entries, startTime, endTime) {
    const start = startTime ? new Date(startTime) : null;
    const end = endTime ? new Date(endTime) : null;
    
    return entries.filter(e => {
      const ts = new Date(e.timestamp);
      if (start && ts < start) return false;
      if (end && ts > end) return false;
      return true;
    });
  }

  /**
   * 按服務名稱過濾
   */
  filterByService(entries, service) {
    return entries.filter(e => e.service === service);
  }

  /**
   * 按正則表達式過濾訊息
   */
  filterByPattern(entries, pattern) {
    const regex = new RegExp(pattern, 'i');
    return entries.filter(e => regex.test(e.message));
  }
}

module.exports = LogParser;

// CLI 使用範例
if (require.main === module) {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const format = args[1] || 'plain';

  if (!filePath) {
    console.log('用法: node parse.js <檔案路徑> [格式]');
    process.exit(1);
  }

  const parser = new LogParser(format);
  const entries = parser.parseFileSync(filePath);
  
  console.log(`解析完成，共 ${entries.length} 條記錄`);
  console.log(JSON.stringify(entries.slice(0, 5), null, 2));
}