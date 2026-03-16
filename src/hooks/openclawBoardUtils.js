/**
 * OpenClaw Board Utilities — Pure functions & constants
 *
 * Extracted from useOpenClawBoard.js to reduce hook file size.
 * No React dependencies — all pure logic.
 */

// ─── 風險偵測與修改策略自動生成 ───
const RISK_KEYWORDS = {
  critical: ["安全漏洞", "資料外洩", "權限繞過", "注入攻擊", "後門", "root 存取", "生產環境崩潰", "全站停機"],
  high: ["XSS", "CSRF", "未授權", "SQL injection", "critical", "嚴重", "緊急修復", "資料遺失"],
  medium: ["效能瓶頸", "相容性", "單點故障", "memory leak", "race condition", "風險", "risk", "deprecated"],
  low: ["code smell", "技術債", "重構", "refactor", "minor", "低優先"],
};

export function detectRiskLevel(r) {
  if (r.riskLevel && r.riskLevel !== "none") return r.riskLevel;
  const src = r.src || r.filePath || "";
  if (src.includes("agent-proposal:risk")) return "medium";
  if (r.pri === "critical") return "critical";
  const text = `${r.title || ""} ${r.desc || r.summary || ""} ${r.reasoning || r.reviewNote || ""}`.toLowerCase();
  for (const level of ["critical", "high", "medium", "low"]) {
    if (RISK_KEYWORDS[level].some(kw => text.includes(kw.toLowerCase()))) return level;
  }
  return "none";
}

const RISK_STRATEGIES = {
  critical: [
    { action: "立即停機評估", detail: "確認是否需要緊急停機或回滾" },
    { action: "安全團隊介入", detail: "通知安全團隊進行緊急審查" },
    { action: "建立修復任務", detail: "拆解為具體修復子任務並排最高優先" },
    { action: "影響範圍評估", detail: "確認受影響的模組、資料和使用者" },
    { action: "全面回歸測試", detail: "修復後需全面回歸+滲透測試" },
  ],
  high: [
    { action: "立即安全審查", detail: "由安全團隊進行程式碼/架構審查" },
    { action: "建立修復任務", detail: "拆解為具體修復子任務並排入高優先" },
    { action: "影響範圍評估", detail: "確認受影響的模組、資料和使用者" },
    { action: "回歸測試", detail: "修復後需全面回歸測試" },
  ],
  medium: [
    { action: "評估影響範圍", detail: "確認影響的功能和使用者數量" },
    { action: "排入修復排程", detail: "加入近期迭代的修復清單" },
    { action: "監控指標", detail: "設定監控告警，追蹤問題發展" },
  ],
  low: [
    { action: "記錄追蹤", detail: "加入技術債清單持續追蹤" },
    { action: "排入重構排程", detail: "納入下次重構週期處理" },
  ],
  none: [],
};

export function generateRiskStrategy(riskLevel) {
  const strategies = RISK_STRATEGIES[riskLevel] || [];
  if (strategies.length === 0) return null;
  return {
    riskLevel,
    strategies,
    summary: riskLevel === "critical"
      ? `🟣 極高風險：需立即停機評估，老蔡親自審核`
      : riskLevel === "high"
        ? `🔴 高風險：需立即處理，建議拆解為修復任務`
        : riskLevel === "medium"
          ? `🟠 中風險：建議排入近期迭代修復`
          : `🟡 低風險：加入技術債追蹤`,
  };
}

// ─── AI 策略引擎 ───
export const AI_STRATEGIES = {
  fast:     { label: "⚡ 快速", desc: "全自動通過（除 critical）", color: "#fbbf24" },
  standard: { label: "🔵 標準", desc: "AI 過篩 + 風險分流", color: "#818cf8" },
  deep:     { label: "🟣 深度", desc: "全部送老蔡 + 精細拆解", color: "#a78bfa" },
};

const RISK_WEIGHT = { none: 10, low: 25, medium: 50, high: 80, critical: 100 };
const COMPLEXITY_WEIGHT = { learn: 20, skill: 20, issue: 40, tool: 50, proposal: 70, security: 90, default: 35 };

export function computeStrategyScore(item) {
  const risk = item._riskLevel || "none";
  const rw = RISK_WEIGHT[risk] || 10;
  const taskType = item._taskType || inferTaskType(item);
  const cw = COMPLEXITY_WEIGHT[taskType] || COMPLEXITY_WEIGHT.default;
  const collabs = (item.collaborators || []).length;
  const iw = collabs >= 4 ? 80 : collabs >= 2 ? 50 : 20;
  return Math.round(rw * 0.4 + cw * 0.3 + iw * 0.3);
}

export function determineStrategy(item) {
  const score = computeStrategyScore(item);
  if (score < 30) return "fast";
  if (score < 65) return "standard";
  return "deep";
}

// ─── 錯誤累積門檻 ───
export const ERROR_THRESHOLDS = {
  wakeUp: 3,
  escalate: 5,
  cooldownMs: 5 * 60 * 1000,
};

const LS_ERROR_LOG = "openclaw_error_log";

export function loadErrorLog() {
  try {
    const raw = localStorage.getItem(LS_ERROR_LOG);
    return raw ? JSON.parse(raw) : { errors: [], wakeCount: 0, lastWake: null, preWakeStrategy: null };
  } catch { return { errors: [], wakeCount: 0, lastWake: null, preWakeStrategy: null }; }
}

export function saveErrorLog(log) {
  try { localStorage.setItem(LS_ERROR_LOG, JSON.stringify(log)); } catch {}
}

// ─── 任務子步驟模板 ───
const FAST_SUBS_TEMPLATES = {
  learn: [{ t: "學習", d: false }, { t: "練習", d: false }, { t: "驗收", d: false }],
  skill: [{ t: "調研", d: false }, { t: "實作", d: false }, { t: "驗收", d: false }],
  issue: [{ t: "分析", d: false }, { t: "修復", d: false }, { t: "驗證", d: false }],
  proposal: [{ t: "規劃", d: false }, { t: "實作", d: false }, { t: "驗收", d: false }],
  tool: [{ t: "開發", d: false }, { t: "測試", d: false }, { t: "上線", d: false }],
  security: [{ t: "評估", d: false }, { t: "修復", d: false }, { t: "驗證", d: false }],
  default: [{ t: "執行", d: false }, { t: "測試", d: false }, { t: "完成", d: false }],
};

const DEEP_SUBS_TEMPLATES = {
  learn: [
    { t: "資料蒐集", d: false }, { t: "核心概念整理", d: false },
    { t: "實作練習", d: false }, { t: "筆記/文件化", d: false },
    { t: "知識分享", d: false }, { t: "驗收評量", d: false },
  ],
  skill: [
    { t: "技術調研", d: false }, { t: "POC 實作", d: false },
    { t: "整合測試", d: false }, { t: "效能驗證", d: false },
    { t: "文件/筆記", d: false }, { t: "回顧驗收", d: false },
  ],
  issue: [
    { t: "問題分析", d: false }, { t: "根因定位", d: false },
    { t: "方案設計", d: false }, { t: "修復實作", d: false },
    { t: "回歸測試", d: false }, { t: "監控設定", d: false },
    { t: "驗證完成", d: false },
  ],
  proposal: [
    { t: "需求與利害關係人確認", d: false }, { t: "技術可行性評估", d: false },
    { t: "架構設計", d: false }, { t: "風險評估", d: false },
    { t: "核心實作", d: false }, { t: "整合測試", d: false },
    { t: "效能驗證", d: false }, { t: "部署/上線", d: false },
    { t: "回顧驗收", d: false },
  ],
  tool: [
    { t: "概念驗證", d: false }, { t: "核心邏輯", d: false },
    { t: "介面整合", d: false }, { t: "測試覆蓋", d: false },
    { t: "效能驗證", d: false }, { t: "上線", d: false },
    { t: "回顧", d: false },
  ],
  security: [
    { t: "威脅建模", d: false }, { t: "風險量化評估", d: false },
    { t: "防護方案設計", d: false }, { t: "安全審查", d: false },
    { t: "實作部署", d: false }, { t: "滲透測試", d: false },
    { t: "監控告警設定", d: false }, { t: "回顧與文件化", d: false },
  ],
  default: [
    { t: "分析/規劃", d: false }, { t: "設計", d: false },
    { t: "實作", d: false }, { t: "測試", d: false },
    { t: "驗證", d: false }, { t: "回顧", d: false },
  ],
};

const SUBS_TEMPLATES = {
  learn: [
    { t: "資料蒐集", d: false }, { t: "核心概念整理", d: false },
    { t: "實作練習", d: false }, { t: "筆記/文件化", d: false },
    { t: "驗收評量", d: false },
  ],
  skill: [
    { t: "技術調研", d: false }, { t: "POC 實作", d: false },
    { t: "整合測試", d: false }, { t: "文件/筆記", d: false },
    { t: "驗收", d: false },
  ],
  issue: [
    { t: "問題分析", d: false }, { t: "方案設計", d: false },
    { t: "修復實作", d: false }, { t: "回歸測試", d: false },
    { t: "驗證完成", d: false },
  ],
  proposal: [
    { t: "需求分析", d: false }, { t: "架構設計", d: false },
    { t: "核心實作", d: false }, { t: "整合測試", d: false },
    { t: "部署/上線", d: false }, { t: "驗收", d: false },
  ],
  tool: [
    { t: "概念驗證", d: false }, { t: "核心邏輯", d: false },
    { t: "介面整合", d: false }, { t: "測試", d: false },
    { t: "上線", d: false },
  ],
  security: [
    { t: "風險評估", d: false }, { t: "防護方案", d: false },
    { t: "實作部署", d: false }, { t: "滲透測試", d: false },
    { t: "監控設定", d: false }, { t: "驗收", d: false },
  ],
  default: [
    { t: "分析/規劃", d: false }, { t: "實作", d: false },
    { t: "測試", d: false }, { t: "驗收", d: false },
  ],
};

export function inferTaskType(t) {
  const title = (t.title || t.name || "").toLowerCase();
  const tags = (t.tags || []).map(x => x?.toLowerCase?.() || "");
  for (const key of Object.keys(SUBS_TEMPLATES)) {
    if (key !== "default" && tags.includes(key)) return key;
  }
  if (/安全|防護|加密|xss|csrf|injection|漏洞/.test(title)) return "security";
  if (/學習|learn|drizzle|zod|教學/.test(title)) return "learn";
  if (/bug|fix|修復|退避|race|leak/.test(title)) return "issue";
  if (/工具|tool|保險箱|監測/.test(title)) return "tool";
  if (/提案|proposal|架構|系統|引擎|模組|頻道|權限|saas|中台/.test(title)) return "proposal";
  if (/技能|skill|框架/.test(title)) return "skill";
  return "default";
}

export function enrichTaskSubs(t, strategy = "standard") {
  const subs = t.subs || [];
  const isBasic = subs.length <= 2 && subs.every(s => !s.d);
  if (!isBasic || (t.progress || 0) > 0) return t;
  const type = inferTaskType(t);
  const templateSet = strategy === "fast" ? FAST_SUBS_TEMPLATES
    : strategy === "deep" ? DEEP_SUBS_TEMPLATES
    : SUBS_TEMPLATES;
  const template = templateSet[type] || templateSet.default;
  const effectiveStrategy = strategy === "auto" ? determineStrategy(t) : strategy;
  return { ...t, subs: template.map(s => ({ ...s })), _taskType: type, _strategy: effectiveStrategy, _strategyScore: computeStrategyScore(t) };
}

export const LS_STRATEGY = "openclaw_ai_strategy";
