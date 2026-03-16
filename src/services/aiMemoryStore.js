/**
 * AI 記憶收錄系統（Memory Store）
 *
 * 結構化記憶存儲，支援分類、標籤、搜尋。
 * 第一階段：localStorage（前端本地）
 * 第二階段：接 Supabase + pgvector（語義搜尋）
 *
 * 記憶格式：
 * {
 *   id: string,          // 唯一 ID
 *   ts: string,          // ISO timestamp
 *   type: string,        // 類型：decision | task_result | report | insight | external | note
 *   source: string,      // 來源：review | task | evo | daily_report | telegram | manual
 *   title: string,       // 標題（用於搜尋）
 *   content: string,     // 內容摘要
 *   tags: string[],      // 標籤（用於篩選）
 *   meta: object,        // 附加資料（原始 review/task 的關鍵欄位）
 *   importance: number,  // 重要度 0-10（影響保留優先級）
 *   relatedIds: string[],// 關聯 ID（連結其他記憶）
 * }
 */

const LS_KEY = "openclaw_ai_memory";
const MAX_ENTRIES = 500;

// ── API 設定 ──
const API_BASE = import.meta.env?.VITE_API_BASE_URL || "";
const apiKey =
  typeof import.meta.env?.VITE_OPENCLAW_API_KEY === "string"
    ? import.meta.env.VITE_OPENCLAW_API_KEY.trim()
    : "";

function apiHeaders() {
  const h = { "Content-Type": "application/json" };
  if (apiKey) h["x-api-key"] = apiKey;
  return h;
}

/** Fire-and-forget sync to backend */
function syncToBackend(entry) {
  if (!API_BASE && !location.origin) return;
  const base = API_BASE || "";
  fetch(`${base}/api/openclaw/memory`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(entry),
  }).catch(() => { /* 靜默失敗，localStorage 仍是 source of truth */ });
}

function syncDeleteToBackend(id) {
  if (!API_BASE && !location.origin) return;
  const base = API_BASE || "";
  fetch(`${base}/api/openclaw/memory/${id}`, {
    method: "DELETE",
    headers: apiHeaders(),
  }).catch(() => {});
}

// ── 讀寫 ──
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries) {
  try {
    // 超過上限時保留重要度高的
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => {
        // 先按重要度降序，再按時間降序
        if (b.importance !== a.importance) return b.importance - a.importance;
        return b.ts.localeCompare(a.ts);
      });
      entries.length = MAX_ENTRIES;
    }
    localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch {
    // localStorage 滿了，清掉最舊的低重要度項目
    try {
      entries.sort((a, b) => b.ts.localeCompare(a.ts));
      entries.length = Math.floor(MAX_ENTRIES * 0.7);
      localStorage.setItem(LS_KEY, JSON.stringify(entries));
    } catch { /* 放棄 */ }
  }
}

// ── 新增記憶 ──
export function addMemory({ type, source, title, content, tags = [], meta = {}, importance = 5, relatedIds = [] }) {
  const entries = load();
  const entry = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ts: new Date().toISOString(),
    type,
    source,
    title,
    content,
    tags,
    meta,
    importance: Math.max(0, Math.min(10, importance)),
    relatedIds,
  };
  entries.unshift(entry);
  save(entries);
  syncToBackend(entry);
  return entry;
}

// ── 批量新增 ──
export function addMemories(items) {
  const entries = load();
  const newEntries = items.map(item => ({
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ts: new Date().toISOString(),
    type: item.type || "note",
    source: item.source || "manual",
    title: item.title || "",
    content: item.content || "",
    tags: item.tags || [],
    meta: item.meta || {},
    importance: Math.max(0, Math.min(10, item.importance || 5)),
    relatedIds: item.relatedIds || [],
  }));
  entries.unshift(...newEntries);
  save(entries);
  return newEntries;
}

// ── 搜尋（關鍵字比對，第二階段換向量搜尋） ──
export function searchMemory(query, { type, source, tags, limit = 20 } = {}) {
  let entries = load();

  // 篩選 type
  if (type) entries = entries.filter(e => e.type === type);
  // 篩選 source
  if (source) entries = entries.filter(e => e.source === source);
  // 篩選 tags
  if (tags && tags.length > 0) {
    entries = entries.filter(e => tags.some(t => e.tags.includes(t)));
  }

  // 關鍵字搜尋（簡易版：title + content + tags 比對）
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    const keywords = q.split(/\s+/);
    entries = entries.filter(e => {
      const haystack = `${e.title} ${e.content} ${e.tags.join(" ")}`.toLowerCase();
      return keywords.every(kw => haystack.includes(kw));
    });
    // 按相關度排序（命中越多關鍵詞越前面）
    entries.sort((a, b) => {
      const ha = `${a.title} ${a.content}`.toLowerCase();
      const hb = `${b.title} ${b.content}`.toLowerCase();
      const sa = keywords.reduce((s, kw) => s + (ha.split(kw).length - 1), 0);
      const sb = keywords.reduce((s, kw) => s + (hb.split(kw).length - 1), 0);
      return sb - sa;
    });
  }

  return entries.slice(0, limit);
}

// ── 取得全部記憶（分頁） ──
export function getMemories({ offset = 0, limit = 50, type, source } = {}) {
  let entries = load();
  if (type) entries = entries.filter(e => e.type === type);
  if (source) entries = entries.filter(e => e.source === source);
  return {
    total: entries.length,
    items: entries.slice(offset, offset + limit),
  };
}

// ── 取得統計 ──
export function getMemoryStats() {
  const entries = load();
  const byType = {};
  const bySource = {};
  const tagCounts = {};
  entries.forEach(e => {
    byType[e.type] = (byType[e.type] || 0) + 1;
    bySource[e.source] = (bySource[e.source] || 0) + 1;
    (e.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });
  // 熱門標籤 top 10
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  return { total: entries.length, byType, bySource, topTags };
}

// ── 刪除單筆 ──
export function deleteMemory(id) {
  const entries = load();
  const filtered = entries.filter(e => e.id !== id);
  save(filtered);
  syncDeleteToBackend(id);
}

// ── 清空全部 ──
export function clearAllMemory() {
  save([]);
}

// ── 匯出（JSON） ──
export function exportMemory() {
  return load();
}

// ── 一次性全量同步到後端 ──
export async function syncAllToBackend() {
  const entries = load();
  if (entries.length === 0) return { ok: true, synced: 0 };
  const base = API_BASE || "";
  try {
    const resp = await fetch(`${base}/api/openclaw/memory/batch`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ items: entries }),
    });
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    return await resp.json();
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── 匯入 ──
export function importMemory(data) {
  if (!Array.isArray(data)) return 0;
  const entries = load();
  const existIds = new Set(entries.map(e => e.id));
  const newOnes = data.filter(e => e.id && !existIds.has(e.id));
  entries.push(...newOnes);
  save(entries);
  return newOnes.length;
}

// ── 自動收錄輔助函數 ──

/** 審核決策收錄 */
export function recordReviewDecision(review, decision, extra = {}) {
  const riskLabel = { none: "安全", low: "低風險", medium: "中風險", high: "高風險", critical: "極高風險" };
  const decisionLabel = { approved: "通過", rejected: "駁回", archived: "收錄", pending_boss: "送老蔡" };
  const importance = review._riskLevel === "critical" ? 9
    : review._riskLevel === "high" ? 8
    : decision === "rejected" ? 6
    : 5;

  return addMemory({
    type: "decision",
    source: "review",
    title: `${decisionLabel[decision] || decision}：${review.title}`,
    content: `審核「${review.title}」→ ${decisionLabel[decision] || decision}。風險：${riskLabel[review._riskLevel] || "未知"}。${extra.reason || ""}`,
    tags: [decision, review._riskLevel || "none", review.type || "unknown", ...(review.tags || [])].filter(Boolean),
    meta: { reviewId: review.id, risk: review._riskLevel, decision, src: review.src },
    importance,
    relatedIds: extra.taskId ? [extra.taskId] : [],
  });
}

/** 任務完成收錄 */
export function recordTaskCompletion(task) {
  return addMemory({
    type: "task_result",
    source: "task",
    title: `完成：${task.title || task.name}`,
    content: `任務「${task.title || task.name}」已完成。${task.thought || ""}`,
    tags: ["completed", ...(task.tags || [])],
    meta: { taskId: task.id, fromReview: task.fromR },
    importance: 6,
    relatedIds: task.fromR ? [task.fromR] : [],
  });
}

/** 日報收錄 */
export function recordDailyReport(reportText) {
  return addMemory({
    type: "report",
    source: "daily_report",
    title: `日報 ${new Date().toLocaleDateString("zh-TW")}`,
    content: reportText.slice(0, 500),
    tags: ["daily_report"],
    meta: {},
    importance: 7,
  });
}

/** 外部資訊收錄（Telegram / 許願池等） */
export function recordExternalInfo({ title, content, source, tags = [], importance = 5 }) {
  return addMemory({
    type: "external",
    source,
    title,
    content,
    tags: ["external", ...tags],
    meta: {},
    importance,
  });
}

/** 洞察/筆記收錄 */
export function recordInsight({ title, content, tags = [], importance = 7 }) {
  return addMemory({
    type: "insight",
    source: "manual",
    title,
    content,
    tags: ["insight", ...tags],
    importance,
  });
}

/** AI 策略切換收錄 */
export function recordStrategySwitch({ from, to, reason = "" }) {
  const labelMap = { auto: "自動", fast: "快速", standard: "標準", deep: "深度" };
  return addMemory({
    type: "decision",
    source: "strategy",
    title: `策略切換：${labelMap[from] || from} → ${labelMap[to] || to}`,
    content: `AI 策略從「${labelMap[from] || from}」切換至「${labelMap[to] || to}」。${reason}`,
    tags: ["strategy", from, to],
    meta: { from, to },
    importance: 6,
  });
}

/** 錯誤事件收錄 */
export function recordError({ operation, error, taskId, context = "" }) {
  return addMemory({
    type: "insight",
    source: "error",
    title: `⚠️ 錯誤：${operation}`,
    content: `操作「${operation}」失敗：${error}。${context}`,
    tags: ["error", operation],
    meta: { operation, error: String(error), taskId },
    importance: 7,
  });
}
