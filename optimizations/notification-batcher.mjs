#!/usr/bin/env node

/**
 * Notification Batcher for OpenClaw
 *
 * 依優先級分層批次發送 Telegram 通知
 * - critical: 立即發送
 * - high: 每小時批次
 * - medium: 每 3 小時批次
 * - low: 每日摘要
 *
 * Usage:
 *   echo '{"priority":"critical","title":"...","body":"..."}' | ./notification-batcher.mjs
 *   ./notification-batcher.mjs --flush [--priority high]
 *   ./notification-batcher.mjs --status
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import readline from 'node:readline';

// --- Configuration ---

const HOME = process.env.HOME;
const TELEGRAM_ENV_PATH = path.join(HOME, '.openclaw/config/telegram.env');
const QUEUE_DIR = path.join(HOME, '.openclaw/delivery-queue');
const QUEUE_FILE = path.join(QUEUE_DIR, 'notification-batch.jsonl');

// Batch intervals in milliseconds
const BATCH_INTERVALS = {
  high: 60 * 60 * 1000,        // 1 hour
  medium: 3 * 60 * 60 * 1000,  // 3 hours
  low: 24 * 60 * 60 * 1000,    // 24 hours
};

const PRIORITY_LABELS = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];

// --- Telegram Config ---

function loadTelegramConfig() {
  try {
    const content = fs.readFileSync(TELEGRAM_ENV_PATH, 'utf-8');
    const config = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      config[key] = val;
    }
    return {
      botToken: config.TELEGRAM_BOT_TOKEN,
      chatId: config.TELEGRAM_CHAT_ID,
    };
  } catch (err) {
    console.error(`[ERROR] 無法讀取 Telegram 設定: ${TELEGRAM_ENV_PATH}`);
    console.error(err.message);
    process.exit(1);
  }
}

// --- Telegram Send ---

async function sendTelegram(text) {
  const { botToken, chatId } = loadTelegramConfig();
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  // Split long messages (Telegram limit: 4096 chars)
  const chunks = [];
  if (text.length <= 4096) {
    chunks.push(text);
  } else {
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= 4096) {
        chunks.push(remaining);
        break;
      }
      // Find last newline before 4096
      let splitAt = remaining.lastIndexOf('\n', 4096);
      if (splitAt === -1) splitAt = 4096;
      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt);
    }
  }

  for (const chunk of chunks) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        console.error(`[ERROR] Telegram API 錯誤: ${resp.status} ${errBody}`);
      }
    } catch (err) {
      console.error(`[ERROR] 發送 Telegram 失敗: ${err.message}`);
    }
  }
}

// --- Queue Operations ---

function ensureQueueDir() {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
}

function appendToQueue(notification) {
  ensureQueueDir();
  const entry = {
    ...notification,
    timestamp: notification.timestamp || new Date().toISOString(),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  fs.appendFileSync(QUEUE_FILE, JSON.stringify(entry) + '\n');
  return entry;
}

function readQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return [];
  const content = fs.readFileSync(QUEUE_FILE, 'utf-8').trim();
  if (!content) return [];
  return content.split('\n').map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function writeQueue(entries) {
  ensureQueueDir();
  if (entries.length === 0) {
    // Clear file
    fs.writeFileSync(QUEUE_FILE, '');
    return;
  }
  fs.writeFileSync(QUEUE_FILE, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

// --- Batch Formatting ---

function formatTimestamp(isoStr) {
  const d = new Date(isoStr);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatBatchMessage(entries) {
  const now = new Date();
  const dateStr = formatDate(now.toISOString());
  const timeStr = formatTimestamp(now.toISOString());

  let msg = `<b>[批次通知]</b> ${dateStr} ${timeStr}\n`;

  // Group by priority
  const grouped = {};
  for (const entry of entries) {
    const p = entry.priority || 'medium';
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(entry);
  }

  for (const priority of PRIORITY_ORDER) {
    const items = grouped[priority];
    if (!items || items.length === 0) continue;

    const label = PRIORITY_LABELS[priority];
    msg += `\n<b>--- ${label} (${items.length} 則) ---</b>\n`;

    for (const item of items) {
      const time = formatTimestamp(item.timestamp);
      const source = item.source ? ` [${item.source}]` : '';
      msg += `\n<b>[${time}]</b> ${item.title}${source}\n`;
      if (item.body) {
        msg += `  ${item.body}\n`;
      }
    }
  }

  return msg;
}

function formatCriticalMessage(entry) {
  const time = formatTimestamp(entry.timestamp);
  const source = entry.source ? ` [${entry.source}]` : '';
  let msg = `<b>[CRITICAL]</b> ${time}${source}\n`;
  msg += `<b>${entry.title}</b>\n`;
  if (entry.body) {
    msg += `${entry.body}\n`;
  }
  return msg;
}

// --- Flush Logic ---

async function flushQueue(options = {}) {
  const { priority: filterPriority, force = false } = options;
  const entries = readQueue();

  if (entries.length === 0) {
    console.log('[INFO] 佇列為空，無需發送。');
    return;
  }

  const now = Date.now();
  const toSend = [];
  const toKeep = [];

  for (const entry of entries) {
    const p = entry.priority || 'medium';

    // If filtering by priority, skip others
    if (filterPriority && p !== filterPriority) {
      toKeep.push(entry);
      continue;
    }

    // If force or the batch interval has elapsed
    const entryAge = now - new Date(entry.timestamp).getTime();
    const interval = BATCH_INTERVALS[p] || BATCH_INTERVALS.medium;

    if (force || entryAge >= interval) {
      toSend.push(entry);
    } else {
      toKeep.push(entry);
    }
  }

  if (toSend.length === 0) {
    console.log('[INFO] 沒有到期的通知需要發送。');
    return;
  }

  console.log(`[INFO] 準備發送 ${toSend.length} 則通知...`);

  const message = formatBatchMessage(toSend);
  await sendTelegram(message);

  writeQueue(toKeep);
  console.log(`[OK] 已發送 ${toSend.length} 則，佇列剩餘 ${toKeep.length} 則。`);
}

// --- Status ---

function showStatus() {
  const entries = readQueue();
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const entry of entries) {
    const p = entry.priority || 'medium';
    if (counts[p] !== undefined) counts[p]++;
  }

  const total = entries.length;

  console.log('=== 通知佇列狀態 ===');
  console.log(`總計待發: ${total} 則`);
  console.log('');
  for (const p of PRIORITY_ORDER) {
    const interval = p === 'critical' ? '即時' :
      p === 'high' ? '每小時' :
      p === 'medium' ? '每 3 小時' : '每日';
    console.log(`  ${PRIORITY_LABELS[p].padEnd(10)} ${String(counts[p]).padStart(3)} 則  (${interval})`);
  }

  if (entries.length > 0) {
    const oldest = entries.reduce((a, b) =>
      new Date(a.timestamp) < new Date(b.timestamp) ? a : b
    );
    const newest = entries.reduce((a, b) =>
      new Date(a.timestamp) > new Date(b.timestamp) ? a : b
    );
    console.log('');
    console.log(`  最早: ${oldest.timestamp}`);
    console.log(`  最新: ${newest.timestamp}`);
  }

  console.log('');
  console.log(`佇列檔案: ${QUEUE_FILE}`);
}

// --- Receive Notification from stdin ---

async function receiveFromStdin() {
  return new Promise((resolve) => {
    let data = '';
    const rl = readline.createInterface({ input: process.stdin });

    // Check if stdin is a TTY (no piped input)
    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }

    rl.on('line', (line) => {
      data += line;
    });

    rl.on('close', () => {
      if (!data.trim()) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(data.trim()));
      } catch (err) {
        console.error(`[ERROR] 無效的 JSON 輸入: ${err.message}`);
        process.exit(1);
      }
    });

    // Timeout after 1 second if no input
    setTimeout(() => {
      rl.close();
    }, 1000);
  });
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);

  const hasFlush = args.includes('--flush');
  const hasStatus = args.includes('--status');
  const priorityIdx = args.indexOf('--priority');
  const filterPriority = priorityIdx !== -1 ? args[priorityIdx + 1] : null;

  // Validate priority if provided
  if (filterPriority && !PRIORITY_ORDER.includes(filterPriority)) {
    console.error(`[ERROR] 無效的優先級: ${filterPriority}`);
    console.error(`有效值: ${PRIORITY_ORDER.join(', ')}`);
    process.exit(1);
  }

  if (hasStatus) {
    showStatus();
    return;
  }

  if (hasFlush) {
    await flushQueue({ priority: filterPriority, force: true });
    return;
  }

  // Receive notification from stdin
  const notification = await receiveFromStdin();

  if (!notification) {
    console.log('用法:');
    console.log('  echo \'{"priority":"critical","title":"...","body":"..."}\' | notification-batcher.mjs');
    console.log('  notification-batcher.mjs --flush [--priority high|medium|low]');
    console.log('  notification-batcher.mjs --status');
    return;
  }

  // Validate
  if (!notification.priority || !PRIORITY_ORDER.includes(notification.priority)) {
    console.error(`[ERROR] 缺少或無效的 priority 欄位。有效值: ${PRIORITY_ORDER.join(', ')}`);
    process.exit(1);
  }
  if (!notification.title) {
    console.error('[ERROR] 缺少 title 欄位。');
    process.exit(1);
  }

  // Add timestamp if missing
  notification.timestamp = notification.timestamp || new Date().toISOString();

  if (notification.priority === 'critical') {
    // Critical: send immediately
    console.log(`[CRITICAL] 立即發送: ${notification.title}`);
    const msg = formatCriticalMessage(notification);
    await sendTelegram(msg);
    console.log('[OK] Critical 通知已發送。');
  } else {
    // Queue it
    const entry = appendToQueue(notification);
    const interval = notification.priority === 'high' ? '1 小時' :
      notification.priority === 'medium' ? '3 小時' : '24 小時';
    console.log(`[QUEUED] ${PRIORITY_LABELS[notification.priority]} — ${notification.title}`);
    console.log(`  將在下次批次（${interval}內）發送，或使用 --flush 立即發送。`);
  }
}

main().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(1);
});
