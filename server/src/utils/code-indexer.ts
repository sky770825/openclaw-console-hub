/**
 * Code Indexer — 將 TypeScript 原始碼拆分為語義 chunk，供向量資料庫索引
 *
 * 設計原則：
 *   - 只負責「讀檔 + 拆 chunk + 產出結構化物件」
 *   - 不直接呼叫 embedding API（由上層 batch indexer 處理）
 *   - chunk 粒度：每個 export 宣告（function / class / const / interface / type）一個 chunk
 *   - 過大的 chunk（> MAX_CHUNK_CHARS）會在邏輯邊界處再拆
 */

import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../logger.js';

const log = createLogger('code-indexer');

// ── 常數 ──

/** 單一 chunk 最大字元數；超過此值會在邏輯邊界處再拆 */
const MAX_CHUNK_CHARS = 2000;

/** 要掃描的 server/src 子目錄（相對於 server/src） */
const SCAN_SUBDIRS = ['telegram', 'utils', 'routes'] as const;

// ── 型別 ──

/** 索引 chunk — 對齊 openclaw_embeddings 表結構 */
export interface CodeChunk {
  /** 對應 doc_title 欄位：檔案名稱（不含路徑） */
  doc_title: string;
  /** 對應 section_title 欄位：函式/類別/變數名稱 */
  section_title: string;
  /** 完整程式碼片段 */
  content: string;
  /** 相對路徑（相對於專案根目錄） */
  file_path: string;
  /** 固定為 'codebase' */
  category: 'codebase';
  /** 在同一檔案中的 chunk 序號（0-based） */
  chunk_index: number;
  /** 用於生成 embedding 的文字（doc_title + category + section_title + 程式碼前 800 字） */
  embedText: string;
}

// ── 匯出拆分 regex ──

/**
 * 匹配 TypeScript 頂層 export 宣告的開頭。
 * 使用 lookahead 讓 split 保留分隔符本身。
 *
 * 支援：
 *   export function / export async function
 *   export class / export abstract class
 *   export const / export let / export var
 *   export interface / export type / export enum
 *   export default function / export default class
 */
const EXPORT_SPLIT_RE =
  /(?=^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|abstract\s+class|const|let|var|interface|type|enum)\s)/m;

/**
 * 從 chunk 的第一行提取匯出名稱。
 * Group 1 = 名稱（函式名 / 類別名 / 變數名 / 介面名 / 型別名 / enum 名）
 */
const EXPORT_NAME_RE =
  /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|abstract\s+class|const|let|var|interface|type|enum)\s+(\w+)/m;

// ── 核心函式 ──

/**
 * 讀取一個 TypeScript 檔案，拆分為語義 chunk 物件陣列。
 *
 * @param filePath 絕對路徑
 * @returns CodeChunk[] — 空陣列代表檔案不存在或內容太短
 */
export function indexSourceCode(filePath: string): CodeChunk[] {
  if (!fs.existsSync(filePath)) {
    log.warn(`indexSourceCode: 檔案不存在 ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.trim().length < 30) {
    log.debug(`indexSourceCode: 檔案內容太短，跳過 ${filePath}`);
    return [];
  }

  const fileName = path.basename(filePath);

  // 計算相對路徑（以專案根目錄為基準）
  // server/src/telegram/xxx.ts → server/src/telegram/xxx.ts
  const serverSrcIdx = filePath.indexOf('server/src/');
  const relPath = serverSrcIdx >= 0
    ? filePath.slice(serverSrcIdx)
    : path.basename(filePath);

  // ── Step 1: 拆分 raw sections ──
  const rawSections = content.split(EXPORT_SPLIT_RE).filter(s => s.trim().length > 0);

  // 如果檔案沒有任何 export（例如純 import 檔），整檔作為一個 chunk
  if (rawSections.length === 0) {
    return buildChunksFromSection(content, fileName, relPath, 'module', 0);
  }

  // ── Step 2: 識別 preamble（import 區塊）vs export sections ──
  const chunks: CodeChunk[] = [];
  let globalIdx = 0;

  for (const section of rawSections) {
    const trimmed = section.trim();
    if (trimmed.length === 0) continue;

    // 提取名稱
    const nameMatch = trimmed.match(EXPORT_NAME_RE);
    const sectionName = nameMatch ? nameMatch[1] : inferSectionName(trimmed, globalIdx);

    // 如果區段不是以 export 開頭，它是 preamble（imports + 頂層非 export 程式碼）
    const isPreamble = !trimmed.startsWith('export');

    const sectionLabel = isPreamble ? 'imports' : sectionName;

    const newChunks = buildChunksFromSection(trimmed, fileName, relPath, sectionLabel, globalIdx);
    chunks.push(...newChunks);
    globalIdx += newChunks.length;
  }

  log.debug(`indexSourceCode: ${fileName} → ${chunks.length} chunks`);
  return chunks;
}

/**
 * 掃描專案 server/src 下的關鍵子目錄，回傳所有 .ts 檔的絕對路徑。
 *
 * 掃描範圍：
 *   - server/src/telegram/
 *   - server/src/utils/
 *   - server/src/routes/
 *   - server/src/ 根目錄（不遞迴子目錄，只取直接 .ts 檔）
 *
 * @param rootDir 專案根目錄（包含 server/ 子目錄的那一層）
 * @returns 絕對路徑陣列，按字母排序
 */
export function getCodeFiles(rootDir: string): string[] {
  const serverSrc = path.join(rootDir, 'server', 'src');
  if (!fs.existsSync(serverSrc)) {
    log.warn(`getCodeFiles: server/src 不存在 (rootDir=${rootDir})`);
    return [];
  }

  const results: string[] = [];

  // 1. 掃描指定子目錄（遞迴）
  for (const subdir of SCAN_SUBDIRS) {
    const dir = path.join(serverSrc, subdir);
    if (fs.existsSync(dir)) {
      collectTsFiles(dir, results);
    }
  }

  // 2. 掃描 server/src/ 根目錄的直接 .ts 檔（不遞迴）
  try {
    const entries = fs.readdirSync(serverSrc, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        results.push(path.join(serverSrc, entry.name));
      }
    }
  } catch {
    // 忽略讀取錯誤
  }

  // 去重 + 排序
  return [...new Set(results)].sort();
}

// ── 內部輔助 ──

/**
 * 遞迴收集目錄下所有 .ts 檔。
 */
function collectTsFiles(dir: string, results: string[]): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectTsFiles(full, results);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        results.push(full);
      }
    }
  } catch {
    // 忽略無法讀取的目錄
  }
}

/**
 * 將一個 section（可能很長）拆成 <= MAX_CHUNK_CHARS 的 chunk。
 * 大 section 會在邏輯邊界（空行、大括號配對、函式內部分隔）處切割。
 */
function buildChunksFromSection(
  code: string,
  fileName: string,
  relPath: string,
  sectionName: string,
  startIdx: number,
): CodeChunk[] {
  if (code.length <= MAX_CHUNK_CHARS) {
    return [makeChunk(code, fileName, relPath, sectionName, startIdx)];
  }

  // 大 chunk：在邏輯邊界處切割
  const subChunks = splitAtLogicalBoundaries(code);
  return subChunks.map((sub, i) =>
    makeChunk(sub, fileName, relPath, `${sectionName}#part${i + 1}`, startIdx + i),
  );
}

/**
 * 建立單一 CodeChunk 物件。
 */
function makeChunk(
  code: string,
  fileName: string,
  relPath: string,
  sectionName: string,
  chunkIndex: number,
): CodeChunk {
  const embedText = `[${fileName}] [codebase] [${sectionName}] ${code.slice(0, 800)}`;
  return {
    doc_title: fileName,
    section_title: sectionName,
    content: code,
    file_path: relPath,
    category: 'codebase',
    chunk_index: chunkIndex,
    embedText,
  };
}

/**
 * 在邏輯邊界處切割過長的程式碼。
 *
 * 策略（優先序）：
 *   1. 雙空行 `\n\n\n`（函式內的段落分隔）
 *   2. 單空行 `\n\n`
 *   3. 以 `}` 結尾的行（區塊結束）
 *   4. 強制切割（保底）
 */
function splitAtLogicalBoundaries(code: string): string[] {
  const results: string[] = [];
  let remaining = code;

  while (remaining.length > MAX_CHUNK_CHARS) {
    // 在 MAX_CHUNK_CHARS 範圍內找最佳切割點
    const searchWindow = remaining.slice(0, MAX_CHUNK_CHARS);

    let splitPos = -1;

    // 策略 1：雙空行
    const doubleBlank = searchWindow.lastIndexOf('\n\n\n');
    if (doubleBlank > MAX_CHUNK_CHARS * 0.3) {
      splitPos = doubleBlank + 1; // 保留一個 \n 給前段
    }

    // 策略 2：單空行
    if (splitPos === -1) {
      const singleBlank = searchWindow.lastIndexOf('\n\n');
      if (singleBlank > MAX_CHUNK_CHARS * 0.3) {
        splitPos = singleBlank + 1;
      }
    }

    // 策略 3：} 結尾的行
    if (splitPos === -1) {
      const closeBrace = searchWindow.lastIndexOf('}\n');
      if (closeBrace > MAX_CHUNK_CHARS * 0.3) {
        splitPos = closeBrace + 2; // 包含 }\n
      }
    }

    // 策略 4：強制切割（找最後一個換行）
    if (splitPos === -1) {
      const lastNewline = searchWindow.lastIndexOf('\n');
      splitPos = lastNewline > 0 ? lastNewline + 1 : MAX_CHUNK_CHARS;
    }

    results.push(remaining.slice(0, splitPos).trimEnd());
    remaining = remaining.slice(splitPos).trimStart();
  }

  if (remaining.trim().length > 0) {
    results.push(remaining.trimEnd());
  }

  return results;
}

/**
 * 當 export 名稱無法用 regex 提取時，嘗試推斷一個有意義的名稱。
 */
function inferSectionName(code: string, index: number): string {
  // 嘗試匹配非 export 的函式宣告
  const funcMatch = code.match(/(?:async\s+)?function\s+(\w+)/);
  if (funcMatch) return funcMatch[1];

  // 嘗試匹配 const xxx = (arrow function)
  const arrowMatch = code.match(/const\s+(\w+)\s*=/);
  if (arrowMatch) return arrowMatch[1];

  // 嘗試匹配 class 宣告
  const classMatch = code.match(/class\s+(\w+)/);
  if (classMatch) return classMatch[1];

  // Fallback
  return `chunk-${index}`;
}
