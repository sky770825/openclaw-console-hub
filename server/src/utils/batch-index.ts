/**
 * 批次向量索引工具
 * 讀取目錄下所有 .md 檔案，切 chunk → embed (Google API) → upsert Supabase openclaw_embeddings
 * 與 action-handlers.ts 的 handleIndexFile 使用相同邏輯，但支援整個目錄批次處理
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createLogger } from '../logger.js';

const log = createLogger('batch-index');

const NEUXA_WORKSPACE = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

// ── 結果型別 ──

export interface BatchIndexResult {
  total: number;
  indexed: number;
  failed: number;
  files: string[];
}

// ── Google Embedding（與 action-handlers.ts 相同邏輯）──

async function googleEmbed(text: string): Promise<number[] | null> {
  const apiKey = process.env.GOOGLE_API_KEY || '';
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: 768 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as { embedding?: { values?: number[] } };
  return data?.embedding?.values || null;
}

// ── 從路徑猜測 category（與 action-handlers.ts 相同邏輯）──

function guessCategoryFromPath(relPath: string): string {
  const parts = relPath.split('/');
  const dir = parts[0]?.toLowerCase() || '';
  const categoryMap: Record<string, string> = {
    cookbook: 'cookbook',
    'sop-知識庫': 'sop',
    'xiaocai-指令集': 'instruction',
    knowledge: 'knowledge',
    docs: 'docs',
    reports: 'reports',
    proposals: 'proposals',
    projects: 'projects',
    learning: 'learning',
    memories: 'memories',
    notes: 'notes',
    memory: 'memory',
    extensions: 'extensions',
    core: 'core',
    anchors: 'core',
  };
  return categoryMap[dir] || 'knowledge';
}

// ── 並行限制器 ──

function concurrencyLimiter(maxConcurrent: number) {
  let running = 0;
  const queue: Array<() => void> = [];

  return async function <T>(fn: () => Promise<T>): Promise<T> {
    if (running >= maxConcurrent) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    running++;
    try {
      return await fn();
    } finally {
      running--;
      const next = queue.shift();
      if (next) next();
    }
  };
}

// ── 推斷 content_type 和 zone（與 action-handlers.ts 相同邏輯）──

function inferContentType(cat: string, fileName: string): string {
  // 先看 category（目錄）
  if (['soul', 'identity'].includes(cat)) return 'soul';
  if (['cookbook', 'sop', 'instruction'].includes(cat)) return 'sop';
  if (cat === 'codebase') return 'codebase';
  if (cat === 'reports') return 'diagnosis';
  if (cat === 'proposals') return 'plan';
  if (cat === 'learning') return 'exercise';
  // 再看檔名特徵
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes('soul') || lowerName.includes('identity') || lowerName.includes('awakening')) return 'soul';
  if (lowerName.includes('report') || lowerName.includes('diagnosis') || lowerName.includes('error-report')) return 'diagnosis';
  if (lowerName.includes('plan') || lowerName.includes('proposal') || lowerName.includes('roadmap')) return 'plan';
  if (lowerName.includes('exercise') || lowerName.includes('practice')) return 'exercise';
  return 'reference';
}

function inferZone(cat: string): string {
  return ['reports', 'proposals'].includes(cat) ? 'cold' : 'hot';
}

const SOUL_FILES = ['SOUL.md', 'IDENTITY.md', 'AGENTS.md', 'AWAKENING.md', 'CONSCIOUSNESS_ANCHOR.md'];

// ── 單檔索引（內部用）──

async function indexSingleFile(
  filePath: string,
  category: string,
  sb: any,
  limiter: <T>(fn: () => Promise<T>) => Promise<T>,
): Promise<{ ok: boolean; fileName: string; chunks: number; indexed: number }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const relPath = path.relative(NEUXA_WORKSPACE, filePath);
  const cat = category || guessCategoryFromPath(relPath);

  const sections = content.split(/(?=^## )/m).filter((s) => s.trim().length > 50);
  if (sections.length === 0) {
    log.warn(`[BatchIndex] 跳過 ${fileName}：內容太短或沒有 ## 章節`);
    return { ok: false, fileName, chunks: 0, indexed: 0 };
  }

  // 去重：索引前先刪除同檔案的舊 chunks
  await sb.from('openclaw_embeddings').delete().eq('file_path', relPath);

  const titleMatch = content.match(/^# (.+)/m);
  const docTitle = titleMatch ? titleMatch[1].trim() : fileName.replace('.md', '');
  const contentType = inferContentType(cat, fileName);
  const zone = inferZone(cat);
  const isPinned = SOUL_FILES.includes(fileName);

  let indexed = 0;

  // 用 limiter 控制 embedding 並行度
  const tasks = sections.map((section, i) => {
    return limiter(async () => {
      const sec = section.trim();
      const secTitleMatch = sec.match(/^## (.+)/m);
      const secTitle = secTitleMatch ? secTitleMatch[1].replace(/#/g, '').trim() : `chunk-${i}`;

      // 上下文充實：doc 標題 + 分類 + section 標題 + 內容（800 chars）
      const embedText = `[${docTitle}] [${cat}] [${secTitle}] ${sec.slice(0, 800)}`;
      const vector = await googleEmbed(embedText);
      if (!vector) {
        log.warn(`[BatchIndex] embedding 失敗: ${fileName} chunk-${i}`);
        return false;
      }

      const hash = crypto.createHash('md5').update(`${relPath}:${i}`).digest('hex');
      const pointId = parseInt(hash.slice(0, 15), 16);

      const { error } = await sb.from('openclaw_embeddings').upsert(
        {
          id: pointId,
          doc_title: docTitle,
          section_title: secTitle,
          content: sec,
          content_preview: sec.slice(0, 200),
          file_path: relPath,
          file_name: fileName,
          category: cat,
          chunk_index: i,
          chunk_total: sections.length,
          size: sec.length,
          date: new Date().toISOString().split('T')[0],
          embedding: JSON.stringify(vector),
          status: 'active',
          content_type: contentType,
          zone,
          is_pinned: isPinned,
          indexed_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

      if (error) {
        log.warn(`[BatchIndex] upsert 失敗: ${fileName} chunk-${i}: ${error.message}`);
        return false;
      }
      return true;
    });
  });

  const results = await Promise.all(tasks);
  indexed = results.filter(Boolean).length;

  log.info(`[BatchIndex] ${fileName} → ${indexed}/${sections.length} chunks (cat: ${cat})`);
  return { ok: true, fileName, chunks: sections.length, indexed };
}

// ── 批次索引主函式 ──

/**
 * 批次索引一個目錄下的所有 .md 檔案到 Supabase 向量庫
 *
 * @param dirPath - 要掃描的目錄絕對路徑
 * @param category - 分類標籤（如 'cookbook'），若不指定則自動從路徑猜測
 * @returns 索引結果摘要
 */
export async function batchIndexDirectory(
  dirPath: string,
  category: string,
): Promise<BatchIndexResult> {
  const resolved = path.resolve(dirPath);

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`目錄不存在或不是目錄: ${resolved}`);
  }

  // 動態載入 Supabase（與 action-handlers.ts 相同模式）
  const { hasSupabase, supabase: sb } = await import('../supabase.js');
  if (!hasSupabase() || !sb) {
    throw new Error('Supabase 未連線，無法索引');
  }

  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY 未設定，無法產生 embedding');
  }

  // 遞迴掃描所有 .md 檔案
  const mdFiles: string[] = [];
  const entries = fs.readdirSync(resolved, { recursive: true }) as string[];
  for (const entry of entries) {
    if (typeof entry === 'string' && entry.endsWith('.md')) {
      mdFiles.push(path.join(resolved, entry));
    }
  }

  if (mdFiles.length === 0) {
    return { total: 0, indexed: 0, failed: 0, files: [] };
  }

  log.info(`[BatchIndex] 開始索引 ${resolved}，找到 ${mdFiles.length} 個 .md 檔案，category=${category}`);

  const limiter = concurrencyLimiter(3); // 最多 3 個 embedding 並行呼叫
  const result: BatchIndexResult = { total: mdFiles.length, indexed: 0, failed: 0, files: [] };

  // 逐檔處理（檔案之間循序，embedding 呼叫在檔案內受 limiter 控制）
  for (const filePath of mdFiles) {
    try {
      const fileResult = await indexSingleFile(filePath, category, sb, limiter);
      if (fileResult.ok && fileResult.indexed > 0) {
        result.indexed++;
        result.files.push(`${fileResult.fileName} (${fileResult.indexed}/${fileResult.chunks} chunks)`);
      } else {
        result.failed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`[BatchIndex] 檔案失敗 ${path.basename(filePath)}: ${msg}`);
      result.failed++;
    }
  }

  log.info(
    `[BatchIndex] 完成！total=${result.total}, indexed=${result.indexed}, failed=${result.failed}`,
  );
  return result;
}
