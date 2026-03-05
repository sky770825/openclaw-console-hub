/**
 * NEUXA 星群 — Inbox 協作引擎
 * 讓 bots 能讀取、處理、回報彼此的 inbox 檔案
 *
 * 協作流程：bot A write_file → bot B inbox scan → crewThink 處理 → 歸檔 + 群組回報
 */

import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../../logger.js';

const log = createLogger('crew-inbox');

const CREW_DIR = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'crew');

// ── 型別 ──

export interface InboxFile {
  /** 完整路徑 */
  filePath: string;
  /** 檔名 */
  fileName: string;
  /** 類型：alert/task/data/req/report */
  type: InboxType;
  /** 來源 bot ID（從檔名解析） */
  fromBot: string;
  /** 檔案最後修改時間 */
  modifiedAt: number;
  /** 檔案內容（掃描時讀取） */
  content: string;
  /** 優先級（根據 type + 內容中的 P0/P1/P2/P3） */
  priority: 0 | 1 | 2 | 3;
}

export type InboxType = 'alert' | 'task' | 'data' | 'req' | 'report' | 'unknown';

/** 已處理的 inbox 檔案追蹤（避免重複處理） */
const processedFiles = new Set<string>();
const PROCESSED_MAX = 500;

// ── 核心掃描 ──

/**
 * 掃描某個 bot 的 inbox 目錄，回傳待處理的檔案（按優先級排序）
 */
export function scanInbox(botId: string): InboxFile[] {
  const inboxDir = path.join(CREW_DIR, botId, 'inbox');

  if (!fs.existsSync(inboxDir)) return [];

  let files: string[];
  try {
    files = fs.readdirSync(inboxDir).filter(f =>
      f.endsWith('.md') && f !== 'README.md',
    );
  } catch {
    return [];
  }

  if (files.length === 0) return [];

  const items: InboxFile[] = [];

  for (const fileName of files) {
    const filePath = path.join(inboxDir, fileName);

    // 已處理過 → 跳過
    if (processedFiles.has(filePath)) continue;

    try {
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8').trim();

      // 空檔案或太短（< 10 字）→ 跳過
      if (content.length < 10) continue;

      const parsed = parseInboxFileName(fileName);
      const priority = detectPriority(fileName, content);

      items.push({
        filePath,
        fileName,
        type: parsed.type,
        fromBot: parsed.fromBot,
        modifiedAt: stat.mtimeMs,
        content,
        priority,
      });
    } catch {
      // 讀取失敗 → 跳過
    }
  }

  // 按優先級排序（P0 最先，同優先級按時間舊→新）
  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.modifiedAt - b.modifiedAt;
  });

  return items;
}

/**
 * 掃描所有 bot 的 inbox，回傳彙總
 */
export function scanAllInboxes(): Record<string, InboxFile[]> {
  const result: Record<string, InboxFile[]> = {};

  let dirs: string[];
  try {
    dirs = fs.readdirSync(CREW_DIR).filter(d => {
      try { return fs.statSync(path.join(CREW_DIR, d)).isDirectory(); }
      catch { return false; }
    });
  } catch { return result; }

  for (const botId of dirs) {
    const items = scanInbox(botId);
    if (items.length > 0) {
      result[botId] = items;
    }
  }

  return result;
}

// ── 處理完成後的歸檔 ──

/**
 * 標記 inbox 檔案已處理 → 移到 notes/ 歸檔
 */
export function archiveInboxFile(inboxFile: InboxFile): boolean {
  try {
    const botDir = path.dirname(path.dirname(inboxFile.filePath)); // crew/{botId}
    const notesDir = path.join(botDir, 'notes');

    // 確保 notes 目錄存在
    if (!fs.existsSync(notesDir)) {
      fs.mkdirSync(notesDir, { recursive: true });
    }

    const archiveName = `processed-${Date.now()}-${inboxFile.fileName}`;
    const archivePath = path.join(notesDir, archiveName);

    fs.renameSync(inboxFile.filePath, archivePath);
    processedFiles.add(inboxFile.filePath);

    // 清理過大的 processedFiles set
    if (processedFiles.size > PROCESSED_MAX) {
      const entries = [...processedFiles];
      for (let i = 0; i < entries.length - 200; i++) processedFiles.delete(entries[i]);
    }

    log.info(`[CrewInbox] 已歸檔: ${inboxFile.fileName} → notes/${archiveName}`);
    return true;
  } catch (err) {
    log.error({ err }, `[CrewInbox] 歸檔失敗: ${inboxFile.fileName}`);
    return false;
  }
}

/**
 * 跳過（不處理）某個 inbox 檔案 — 加入已處理集，不歸檔
 */
export function skipInboxFile(filePath: string): void {
  processedFiles.add(filePath);
}

// ── Context 注入（給 crew-think 用）──

/**
 * 產生 inbox 摘要文字（注入到 bot 的 system prompt）
 * 告訴 bot「你有 N 個待處理任務」+ 最高優先級的摘要
 */
export function getInboxContext(botId: string): string {
  const items = scanInbox(botId);
  if (items.length === 0) return '';

  const lines: string[] = [
    `## 📬 你的 Inbox（${items.length} 個待處理）`,
    '',
  ];

  // 最多展示前 3 個（避免 prompt 太長）
  const shown = items.slice(0, 3);
  for (const item of shown) {
    const typeEmoji = TYPE_EMOJI[item.type] || '📄';
    const pLabel = `P${item.priority}`;
    // 內容摘要：取前 200 字
    const summary = item.content.length > 200
      ? item.content.slice(0, 200) + '...'
      : item.content;
    lines.push(`${typeEmoji} **[${pLabel}] ${item.fileName}**（來自 ${item.fromBot}）`);
    lines.push(summary);
    lines.push('');
  }

  if (items.length > 3) {
    lines.push(`...還有 ${items.length - 3} 個待處理`);
  }

  lines.push('');
  lines.push('**處理方式**：讀取 inbox 檔案內容 → 根據要求執行 action → 在群組回報結果。處理完後系統會自動歸檔。');

  return lines.join('\n');
}

// ── 統計 ──

export interface InboxStats {
  botId: string;
  total: number;
  byPriority: Record<number, number>;
  byType: Record<string, number>;
  oldestMs: number;
}

/**
 * 取得所有 bot 的 inbox 統計
 */
export function getInboxStats(): InboxStats[] {
  const allInboxes = scanAllInboxes();
  const stats: InboxStats[] = [];

  for (const [botId, items] of Object.entries(allInboxes)) {
    const byPriority: Record<number, number> = {};
    const byType: Record<string, number> = {};
    let oldest = Date.now();

    for (const item of items) {
      byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
      byType[item.type] = (byType[item.type] || 0) + 1;
      if (item.modifiedAt < oldest) oldest = item.modifiedAt;
    }

    stats.push({
      botId,
      total: items.length,
      byPriority,
      byType,
      oldestMs: items.length > 0 ? Date.now() - oldest : 0,
    });
  }

  return stats;
}

// ── 內部工具 ──

const TYPE_EMOJI: Record<string, string> = {
  alert: '🚨',
  task: '📋',
  data: '📊',
  req: '📩',
  report: '📝',
  unknown: '📄',
};

/** 解析 inbox 檔名：{type}-{timestamp}-{fromBot}.md */
function parseInboxFileName(fileName: string): { type: InboxType; fromBot: string } {
  // 多種格式支援：
  // alert-1709712000000-ayan.md
  // task-patrol-report-error-analysis-ace.md
  // req-{{timestamp}}-agong.md
  const nameWithoutExt = fileName.replace(/\.md$/, '');
  const parts = nameWithoutExt.split('-');

  const typeStr = parts[0]?.toLowerCase() || 'unknown';
  const type: InboxType = ['alert', 'task', 'data', 'req', 'report'].includes(typeStr)
    ? typeStr as InboxType
    : 'unknown';

  // 最後一段是來源 bot
  const fromBot = parts[parts.length - 1] || 'unknown';

  return { type, fromBot };
}

/** 偵測優先級：從檔名 type + 內容中的 P0/P1/P2/P3 */
function detectPriority(fileName: string, content: string): 0 | 1 | 2 | 3 {
  const lower = content.toLowerCase();

  // 內容中明確標記
  if (lower.includes('p0') || lower.includes('嚴重度：p0') || lower.includes('severity: p0')) return 0;
  if (lower.includes('p1') || lower.includes('嚴重度：p1') || lower.includes('severity: p1')) return 1;
  if (lower.includes('p2') || lower.includes('嚴重度：p2') || lower.includes('severity: p2')) return 2;
  if (lower.includes('p3') || lower.includes('嚴重度：p3') || lower.includes('severity: p3')) return 3;

  // 從檔名 type 推斷
  if (fileName.startsWith('alert')) return 1;  // 告警預設 P1
  if (fileName.startsWith('task')) return 2;   // 任務預設 P2
  if (fileName.startsWith('req')) return 2;    // 請求預設 P2
  if (fileName.startsWith('data')) return 3;   // 數據預設 P3
  if (fileName.startsWith('report')) return 3; // 報告預設 P3

  return 2; // 預設 P2
}
