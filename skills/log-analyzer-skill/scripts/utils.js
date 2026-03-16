/**
 * Utility Functions - 工具函數
 */

/**
 * 格式化位元組大小
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 格式化持續時間
 */
function formatDuration(ms) {
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(2) + 's';
  if (ms < 3600000) return (ms / 60000).toFixed(2) + 'm';
  return (ms / 3600000).toFixed(2) + 'h';
}

/**
 * 顏色輸出（終端機）
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return colors[color] + text + colors.reset;
}

/**
 * 進度條顯示
 */
function progressBar(current, total, length = 40) {
  const percent = Math.round((current / total) * 100);
  const filled = Math.round((length * current) / total);
  const bar = '█'.repeat(filled) + '░'.repeat(length - filled);
  return `[${bar}] ${percent}%`;
}

/**
 * 載入設定檔
 */
function loadConfig(configPath) {
  const fs = require('fs');
  const path = require('path');
  
  const defaultConfig = require('../config.json');
  
  if (!fs.existsSync(configPath)) {
    return defaultConfig;
  }

  try {
    const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { ...defaultConfig, ...userConfig };
  } catch (error) {
    console.warn(`⚠️  設定檔載入失敗: ${error.message}`);
    return defaultConfig;
  }
}

/**
 * 驗證日期格式
 */
function isValidDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * 遮罩敏感資訊
 */
function maskSensitiveInfo(text, patterns = []) {
  const defaultPatterns = [
    { regex: /password[:\s=]+\S+/gi, replacement: 'password=***' },
    { regex: /api[_-]?key[:\s=]+\S+/gi, replacement: 'api_key=***' },
    { regex: /token[:\s=]+\S+/gi, replacement: 'token=***' },
    { regex: /secret[:\s=]+\S+/gi, replacement: 'secret=***' },
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
    { regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[IP]' }
  ];

  const allPatterns = [...defaultPatterns, ...patterns];
  
  return allPatterns.reduce((result, pattern) => {
    return result.replace(pattern.regex, pattern.replacement);
  }, text);
}

/**
 * 分組統計
 */
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

/**
 * 取得檔案統計
 */
function getFileStats(filePath) {
  const fs = require('fs');
  
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const stats = fs.statSync(filePath);
  return {
    size: stats.size,
    sizeFormatted: formatBytes(stats.size),
    created: stats.birthtime,
    modified: stats.mtime,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory()
  };
}

/**
 * 生成時間戳記
 */
function timestamp() {
  return new Date().toISOString();
}

module.exports = {
  formatBytes,
  formatDuration,
  colorize,
  progressBar,
  loadConfig,
  isValidDate,
  maskSensitiveInfo,
  groupBy,
  getFileStats,
  timestamp,
  colors
};
