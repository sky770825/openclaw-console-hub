import { useEffect, useState } from "react";
import {
  fetchOpenClaw,
  persistTask,
  persistReview,
  persistAutomation,
  persistEvo,
  runTask,
  runAutomation,
  deleteTask,
  createTask,
  createTaskFromReview,
  submitProposal,
  fetchBoardConfig,
  fetchBoardHealth,
  postWakeReport,
} from "@/services/openclawBoardApi";
import { C } from "@/components/openclaw/uiPrimitives";
import { recordReviewDecision, recordTaskCompletion, recordStrategySwitch, recordError } from "@/services/aiMemoryStore";

// ─── 風險偵測與修改策略自動生成 ───
const RISK_KEYWORDS = {
  critical: ["安全漏洞", "資料外洩", "權限繞過", "注入攻擊", "後門", "root 存取", "生產環境崩潰", "全站停機"],
  high: ["XSS", "CSRF", "未授權", "SQL injection", "critical", "嚴重", "緊急修復", "資料遺失"],
  medium: ["效能瓶頸", "相容性", "單點故障", "memory leak", "race condition", "風險", "risk", "deprecated"],
  low: ["code smell", "技術債", "重構", "refactor", "minor", "低優先"],
};

function detectRiskLevel(r) {
  // 已有明確 riskLevel
  if (r.riskLevel && r.riskLevel !== "none") return r.riskLevel;
  // 從分類判斷
  const src = r.src || r.filePath || "";
  if (src.includes("agent-proposal:risk")) return "medium";
  // 從 pri 判斷
  if (r.pri === "critical") return "critical";
  // 從文字偵測（按嚴重度從高到低匹配）
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

function generateRiskStrategy(riskLevel, r) {
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

function computeStrategyScore(item) {
  const risk = item._riskLevel || "none";
  const rw = RISK_WEIGHT[risk] || 10;
  const taskType = item._taskType || inferTaskType(item);
  const cw = COMPLEXITY_WEIGHT[taskType] || COMPLEXITY_WEIGHT.default;
  const collabs = (item.collaborators || []).length;
  const iw = collabs >= 4 ? 80 : collabs >= 2 ? 50 : 20;
  return Math.round(rw * 0.4 + cw * 0.3 + iw * 0.3);
}

function determineStrategy(item) {
  const score = computeStrategyScore(item);
  if (score < 30) return "fast";
  if (score < 65) return "standard";
  return "deep";
}

// ─── 錯誤累積門檻與甦醒機制 ───
const ERROR_THRESHOLDS = {
  wakeUp: 3,        // 累積 3 次錯誤 → 觸發甦醒
  escalate: 5,      // 累積 5 次 → 強制升級策略
  cooldownMs: 5 * 60 * 1000, // 5 分鐘內無新錯誤 → 自動冷卻歸零
};

const LS_ERROR_LOG = "openclaw_error_log";

function loadErrorLog() {
  try {
    const raw = localStorage.getItem(LS_ERROR_LOG);
    return raw ? JSON.parse(raw) : { errors: [], wakeCount: 0, lastWake: null, preWakeStrategy: null };
  } catch { return { errors: [], wakeCount: 0, lastWake: null, preWakeStrategy: null }; }
}

function saveErrorLog(log) {
  try { localStorage.setItem(LS_ERROR_LOG, JSON.stringify(log)); } catch {}
}

// ─── Fast 策略簡化子任務模板 ───
const FAST_SUBS_TEMPLATES = {
  learn: [{ t: "學習", d: false }, { t: "練習", d: false }, { t: "驗收", d: false }],
  skill: [{ t: "調研", d: false }, { t: "實作", d: false }, { t: "驗收", d: false }],
  issue: [{ t: "分析", d: false }, { t: "修復", d: false }, { t: "驗證", d: false }],
  proposal: [{ t: "規劃", d: false }, { t: "實作", d: false }, { t: "驗收", d: false }],
  tool: [{ t: "開發", d: false }, { t: "測試", d: false }, { t: "上線", d: false }],
  security: [{ t: "評估", d: false }, { t: "修復", d: false }, { t: "驗證", d: false }],
  default: [{ t: "執行", d: false }, { t: "測試", d: false }, { t: "完成", d: false }],
};

// ─── Deep 策略精細子任務模板 ───
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

// ─── 任務子步驟模板（根據任務類型/標籤自動擴充） ───
const SUBS_TEMPLATES = {
  learn: [
    { t: "資料蒐集", d: false },
    { t: "核心概念整理", d: false },
    { t: "實作練習", d: false },
    { t: "筆記/文件化", d: false },
    { t: "驗收評量", d: false },
  ],
  skill: [
    { t: "技術調研", d: false },
    { t: "POC 實作", d: false },
    { t: "整合測試", d: false },
    { t: "文件/筆記", d: false },
    { t: "驗收", d: false },
  ],
  issue: [
    { t: "問題分析", d: false },
    { t: "方案設計", d: false },
    { t: "修復實作", d: false },
    { t: "回歸測試", d: false },
    { t: "驗證完成", d: false },
  ],
  proposal: [
    { t: "需求分析", d: false },
    { t: "架構設計", d: false },
    { t: "核心實作", d: false },
    { t: "整合測試", d: false },
    { t: "部署/上線", d: false },
    { t: "驗收", d: false },
  ],
  tool: [
    { t: "概念驗證", d: false },
    { t: "核心邏輯", d: false },
    { t: "介面整合", d: false },
    { t: "測試", d: false },
    { t: "上線", d: false },
  ],
  security: [
    { t: "風險評估", d: false },
    { t: "防護方案", d: false },
    { t: "實作部署", d: false },
    { t: "滲透測試", d: false },
    { t: "監控設定", d: false },
    { t: "驗收", d: false },
  ],
  default: [
    { t: "分析/規劃", d: false },
    { t: "實作", d: false },
    { t: "測試", d: false },
    { t: "驗收", d: false },
  ],
};

function inferTaskType(t) {
  const title = (t.title || t.name || "").toLowerCase();
  const tags = (t.tags || []).map(x => x?.toLowerCase?.() || "");
  // 從 tags 直接匹配
  for (const key of Object.keys(SUBS_TEMPLATES)) {
    if (key !== "default" && tags.includes(key)) return key;
  }
  // 從標題推測
  if (/安全|防護|加密|xss|csrf|injection|漏洞/.test(title)) return "security";
  if (/學習|learn|drizzle|zod|教學/.test(title)) return "learn";
  if (/bug|fix|修復|退避|race|leak/.test(title)) return "issue";
  if (/工具|tool|保險箱|監測/.test(title)) return "tool";
  if (/提案|proposal|架構|系統|引擎|模組|頻道|權限|saas|中台/.test(title)) return "proposal";
  if (/技能|skill|框架/.test(title)) return "skill";
  return "default";
}

function enrichTaskSubs(t, strategy = "standard") {
  // 只擴充只有基本 [實作, 驗證] 且進度 0% 的任務
  const subs = t.subs || [];
  const isBasic = subs.length <= 2 && subs.every(s => !s.d);
  if (!isBasic || (t.progress || 0) > 0) return t;
  const type = inferTaskType(t);
  // 根據策略等級選擇不同顆粒度的模板
  const templateSet = strategy === "fast" ? FAST_SUBS_TEMPLATES
    : strategy === "deep" ? DEEP_SUBS_TEMPLATES
    : SUBS_TEMPLATES;
  const template = templateSet[type] || templateSet.default;
  const effectiveStrategy = strategy === "auto" ? determineStrategy(t) : strategy;
  return { ...t, subs: template.map(s => ({ ...s })), _taskType: type, _strategy: effectiveStrategy, _strategyScore: computeStrategyScore(t) };
}

const LS_STRATEGY = "openclaw_ai_strategy";

export function useOpenClawBoard() {
  const [autos, setAutos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [notice, setNotice] = useState(null);
  const [aiStrategy, _setAiStrategy] = useState(() => {
    try { return localStorage.getItem(LS_STRATEGY) || "auto"; } catch { return "auto"; }
  });
  const [boardConfig, setBoardConfig] = useState({
    n8nFlows: [],
    apiEndpoints: [],
    securityLayers: [],
    rbacMatrix: [],
    plugins: [],
  });
  const [evo, setEvo] = useState([]);

  // ─── 錯誤累積器狀態 ───
  const [errorAccum, setErrorAccum] = useState(() => loadErrorLog());
  const [wakePanel, setWakePanel] = useState(null); // null = 未甦醒, { errors, diagnosis, actions } = 甦醒面板

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cfg = await fetchBoardConfig();
      if (!mounted || !cfg) return;
      setBoardConfig({
        n8nFlows: cfg.n8nFlows || [],
        apiEndpoints: cfg.apiEndpoints || [],
        securityLayers: cfg.securityLayers || [],
        rbacMatrix: cfg.rbacMatrix || [],
        plugins: cfg.plugins || [],
      });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    let mounted = true;
    (async () => {
      const [tList, rList, aList, evoList, boardHealth] = await Promise.all([
        fetchOpenClaw("/api/openclaw/tasks", ac.signal),
        fetchOpenClaw("/api/openclaw/reviews", ac.signal),
        fetchOpenClaw("/api/openclaw/automations", ac.signal),
        fetchOpenClaw("/api/openclaw/evolution-log", ac.signal),
        fetchBoardHealth(ac.signal),
      ]);
      if (!mounted) return;
      if (Array.isArray(tList)) {
        // 正規化
        const normalized = tList.map((t) => ({ ...t, title: t.title ?? t.name, fromR: t.from_review_id || t.fromR }));
        // 去重：同 title 只保留最新（依 createdAt 降序，取第一筆）
        const seen = new Map();
        for (const t of normalized) {
          const key = (t.title || t.name || t.id).trim();
          const existing = seen.get(key);
          if (!existing) { seen.set(key, t); continue; }
          // 保留進度較高的，其次保留較新的
          const eProg = existing.progress || 0;
          const tProg = t.progress || 0;
          if (tProg > eProg) { seen.set(key, t); }
          else if (tProg === eProg && (t.createdAt || t.id) > (existing.createdAt || existing.id)) { seen.set(key, t); }
        }
        const deduped = [...seen.values()];
        if (deduped.length < normalized.length) {
          console.log(`[OpenClaw] 任務去重：${normalized.length} → ${deduped.length}（移除 ${normalized.length - deduped.length} 筆重複）`);
        }
        // 擴充子任務結構（基本 [實作, 驗證] → 依類型展開）
        const effectiveStrat = aiStrategy === "auto" ? "standard" : aiStrategy;
        setTasks(deduped.map(t => enrichTaskSubs(t, effectiveStrat)));
      }
      if (Array.isArray(rList)) {
        // also fetch tasks to cross-reference review→task linkage
        const taskIds = new Set((tList || []).map(t => t.fromR).filter(Boolean));
        setReviews(rList.map((r) => {
          const hasTask = taskIds.has(r.id);
          // infer progress from status
          const progress = r.progress ?? (
            r.status === "rejected" ? 0 :
            r.status === "pending" ? 10 :
            r.status === "archived" ? 100 :
            r.status === "approved" && hasTask ? 75 :
            r.status === "approved" ? 50 : 0
          );
          // infer collaborators
          const collaborators = r.collaborators || [];
          if (collaborators.length === 0) {
            const src = r.src || r.filePath || "";
            if (src.startsWith("agent-proposal")) collaborators.push({ name: "Claude Agent", role: "提案者" });
            if (r.reviewNote || (r.status === "approved" || r.status === "rejected")) collaborators.push({ name: "老蔡", role: "審核者" });
          }
          // risk detection
          const normalized = {
            ...r,
            desc: r.desc || r.summary || "",
            src: r.src || r.filePath || "",
            type: r.type || (r.tags && r.tags[0]) || "tool",
            pri: r.pri || (r.tags && r.tags[1]) || "medium",
            reasoning: r.reasoning || r.reviewNote || "",
            date: r.date || (r.createdAt ? new Date(r.createdAt).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" }) : ""),
            progress,
            collaborators,
            _hasTask: hasTask,
          };
          const riskLevel = detectRiskLevel(normalized);
          normalized._riskLevel = riskLevel;
          normalized._riskStrategy = generateRiskStrategy(riskLevel, normalized);
          return normalized;
        }));
      }
      if (Array.isArray(aList)) setAutos(aList.map((a) => ({ ...a, lastRun: a.last_run || a.lastRun })));
      if (Array.isArray(evoList)) setEvo(evoList.map((e) => ({ ...e, t: e.t || "", x: e.x || "", c: e.c || C.t2, tag: e.tag, tc: e.tc || C.t2 })));
      if (boardHealth && boardHealth.ok) {
        const source = boardHealth.backend.supabaseConnected ? "Supabase" : "fallback";
        setNotice({
          type: boardHealth.backend.supabaseConnected ? "ok" : "err",
          msg: `資料來源：${source}｜tasks ${boardHealth.counts.tasks}｜reviews ${boardHealth.counts.reviews}｜automations ${boardHealth.counts.automations}`,
        });
      }
    })();
    return () => {
      mounted = false;
      ac.abort();
    };
  }, []);

  const addE = (x, c, tag, tc) => {
    const e = { t: new Date().toTimeString().slice(0, 5), x, c, tag, tc };
    setEvo((p) => [e, ...p]);
    persistEvo(e);
  };

  const showApiError = (status, fallback) => {
    const m = status === 401 || status === 403
      ? "API 權限不足：請設定 VITE_OPENCLAW_API_KEY"
      : status === 503
        ? "後端設定不完整：請檢查 OPENCLAW_* 環境變數"
        : fallback || `API 失敗（${status || "network"}）`;
    setNotice({ type: "err", msg: m });
  };

  const showInfo = (m) => setNotice({ type: "ok", msg: m });

  // ─── 錯誤累積 + 甦醒偵測 ───
  const trackError = (operation, error, taskId) => {
    // 寫入記憶系統
    recordError({ operation, error: String(error), taskId });

    setErrorAccum(prev => {
      const now = Date.now();
      // 冷卻機制：超過 cooldown 時間沒有新錯誤 → 清零
      const recentErrors = prev.errors.filter(e => now - e.ts < ERROR_THRESHOLDS.cooldownMs);
      const newError = { ts: now, operation, error: String(error), taskId };
      const errors = [...recentErrors, newError];
      const log = { ...prev, errors };

      const count = errors.length;

      // 門檻偵測
      if (count >= ERROR_THRESHOLDS.escalate && !prev.preWakeStrategy) {
        // ≥5 次：強制升級到 deep + 甦醒
        log.wakeCount = (prev.wakeCount || 0) + 1;
        log.lastWake = now;
        log.preWakeStrategy = aiStrategy;
        triggerWakeUp(errors, "escalate");
      } else if (count >= ERROR_THRESHOLDS.wakeUp && !prev.preWakeStrategy) {
        // ≥3 次：甦醒偵測
        log.wakeCount = (prev.wakeCount || 0) + 1;
        log.lastWake = now;
        log.preWakeStrategy = aiStrategy;
        triggerWakeUp(errors, "wakeup");
      }

      saveErrorLog(log);
      return log;
    });

    // 演化日誌記錄
    addE(`⚠️ 錯誤：${operation} — ${String(error).slice(0, 50)}`, C.red, "錯誤", C.red);
  };

  const triggerWakeUp = (errors, level) => {
    // 診斷：統計錯誤分佈
    const opCounts = {};
    errors.forEach(e => { opCounts[e.operation] = (opCounts[e.operation] || 0) + 1; });
    const topOps = Object.entries(opCounts).sort((a, b) => b[1] - a[1]);
    const diagnosis = {
      totalErrors: errors.length,
      timeSpanMs: errors.length > 1 ? errors[errors.length - 1].ts - errors[0].ts : 0,
      topOperations: topOps,
      errors: errors.slice(-10), // 最近 10 筆
      level, // "wakeup" or "escalate"
    };

    // 自動行動：
    // escalate → 強制切 deep，因為問題嚴重
    // wakeup → 先切 standard（如果是 fast），展示面板讓老蔡決定
    if (level === "escalate") {
      _setAiStrategy("deep");
      try { localStorage.setItem(LS_STRATEGY, "deep"); } catch {}
      addE(`🚨 錯誤累積 ${errors.length} 次 → AI 甦醒！強制切換至 🟣深度模式`, C.red, "甦醒", C.red);
      recordStrategySwitch({ from: aiStrategy, to: "deep", reason: `錯誤累積 ${errors.length} 次，強制升級` });
    } else {
      if (aiStrategy === "fast") {
        _setAiStrategy("standard");
        try { localStorage.setItem(LS_STRATEGY, "standard"); } catch {}
        addE(`⚠️ 錯誤累積 ${errors.length} 次 → AI 甦醒！切換至 🔵標準模式`, C.amber, "甦醒", C.amber);
        recordStrategySwitch({ from: "fast", to: "standard", reason: `錯誤累積 ${errors.length} 次，自動升級` });
      } else {
        addE(`⚠️ 錯誤累積 ${errors.length} 次 → AI 甦醒！檢查中...`, C.amber, "甦醒", C.amber);
      }
    }

    // 同步甦醒報告到後端（讓 CLI 可讀取）
    const newStrategy = level === "escalate" ? "deep" : (aiStrategy === "fast" ? "standard" : aiStrategy);
    postWakeReport({
      level,
      totalErrors: errors.length,
      errors: diagnosis.errors,
      topOperations: topOps,
      preStrategy: aiStrategy,
      newStrategy,
    }).catch(e => console.warn("[WakeReport] 回報失敗，已存 localStorage", e));

    // 開啟甦醒面板
    setWakePanel({
      errors: diagnosis.errors,
      diagnosis,
      suggestedActions: generateWakeActions(diagnosis),
      triggeredAt: new Date().toISOString(),
    });
  };

  // 甦醒後產生建議行動
  const generateWakeActions = (diagnosis) => {
    const actions = [];
    const { topOperations, totalErrors, level } = diagnosis;

    // 根據錯誤類型產生建議
    for (const [op, count] of topOperations) {
      if (op.includes("審核") || op.includes("review")) {
        actions.push({ type: "fix", label: `🔧 直接修復：審核流程錯誤（${count}次）`, op, count });
      } else if (op.includes("任務") || op.includes("task")) {
        actions.push({ type: "fix", label: `🔧 直接修復：任務操作錯誤（${count}次）`, op, count });
      } else if (op.includes("API") || op.includes("persist")) {
        actions.push({ type: "ticket", label: `📋 開清單：API/資料庫連線問題（${count}次）`, op, count });
      } else {
        actions.push({ type: "ticket", label: `📋 開清單：${op} 錯誤（${count}次）`, op, count });
      }
    }

    // 通用行動
    if (level === "escalate") {
      actions.push({ type: "escalate", label: "🚨 已自動切換至深度模式，全部項目送老蔡審核" });
    }
    actions.push({ type: "dismiss", label: "✅ 確認完畢，切回原策略繼續運作" });

    return actions;
  };

  // 甦醒處理完成 → 切回原策略
  const dismissWake = (keepStrategy) => {
    if (!keepStrategy && errorAccum.preWakeStrategy) {
      const prev = errorAccum.preWakeStrategy;
      _setAiStrategy(prev);
      try { localStorage.setItem(LS_STRATEGY, prev); } catch {}
      addE(`甦醒處理完畢 → 切回「${prev}」模式`, C.green, "恢復", C.green);
      recordStrategySwitch({ from: aiStrategy, to: prev, reason: "甦醒處理完畢，恢復原策略" });
    } else {
      addE(`甦醒處理完畢 → 維持當前模式`, C.green, "恢復", C.green);
    }
    // 清空錯誤累積
    const resetLog = { errors: [], wakeCount: errorAccum.wakeCount, lastWake: errorAccum.lastWake, preWakeStrategy: null };
    setErrorAccum(resetLog);
    saveErrorLog(resetLog);
    setWakePanel(null);
  };

  // 從甦醒面板建立修復清單（開立任務）
  const createFixTasks = (wakeActions) => {
    const fixTasks = wakeActions.filter(a => a.type === "fix" || a.type === "ticket");
    fixTasks.forEach(a => {
      const newTask = {
        id: `fix-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        title: a.label.replace(/^[^\s]+\s/, ""), // 去掉 emoji 前綴
        name: a.label.replace(/^[^\s]+\s/, ""),
        status: a.type === "fix" ? "in_progress" : "queued",
        progress: 0,
        subs: a.type === "fix"
          ? [{ t: "診斷根因", d: false }, { t: "修復", d: false }, { t: "驗證", d: false }]
          : [{ t: "問題紀錄", d: false }, { t: "指派修復", d: false }, { t: "追蹤驗收", d: false }],
        tags: ["error-fix"],
        _fromWake: true,
      };
      setTasks(p => [newTask, ...p]);
      persistTask(newTask);
    });
    if (fixTasks.length > 0) {
      addE(`甦醒 → 建立 ${fixTasks.length} 個修復任務`, C.purple, "修復清單", C.purple);
      showInfo(`已建立 ${fixTasks.length} 個修復任務`);
    }
  };

  const togA = (id) => {
    setAutos((p) => p.map((a) => {
      if (a.id !== id) return a;
      const upd = { ...a, active: !a.active };
      persistAutomation(upd);
      return upd;
    }));
  };

  const okR = (id) => {
    const r = reviews.find((item) => item.id === id);
    const upd = { ...r, status: "approved" };
    setReviews((p) => p.map((item) => (item.id === id ? upd : item)));
    if (!r) return;
    addE(`審核通過「${r.title}」→ 排入執行`, C.green, "批准", C.green);
    persistReview(upd);
    recordReviewDecision(r, "approved");
  };

  const noR = (id) => {
    const r = reviews.find((item) => item.id === id);
    const upd = { ...r, status: "rejected" };
    setReviews((p) => p.map((item) => (item.id === id ? upd : item)));
    if (!r) return;
    addE(`駁回「${r.title}」`, C.t3, "駁回", C.t3);
    persistReview(upd);
    recordReviewDecision(r, "rejected");
  };

  const archiveR = (id, action) => {
    const r = reviews.find((item) => item.id === id);
    if (!r) return;
    const newStatus = action === "unarchive" ? "pending" : "archived";
    const upd = { ...r, status: newStatus };
    setReviews((p) => p.map((item) => (item.id === id ? upd : item)));
    const label = newStatus === "archived" ? "收錄" : "拉回待審";
    addE(`${label}「${r.title}」`, C.t3, label, C.t3);
    persistReview(upd);
    if (newStatus === "archived") recordReviewDecision(r, "archived");
  };

  const okRAndCreateTask = async (r) => {
    try {
      const { ok, status, data: created } = await createTaskFromReview(r);
      if (!ok) {
        showApiError(status, "建立任務失敗");
        return;
      }
      const upd = { ...r, status: "approved" };
      setReviews((p) => p.map((item) => (item.id === r.id ? upd : item)));
      persistReview(upd);
      const taskId = created?.id;
      addE(`審核通過「${r.title}」→ 已轉成任務${taskId ? ` (${taskId})` : ""}`, C.green, "批准+轉任務", C.green);
      if (taskId) setTasks((p) => [{ id: taskId, title: r.title, name: r.title, status: "queued", progress: 0, subs: [{ t: "實作", d: false }, { t: "驗證", d: false }], fromR: r.id }, ...p]);
      showInfo(`已通過並轉成任務：${r.title}`);
    } catch (e) {
      console.warn("[OpenClaw] okRAndCreateTask failed", e);
      showApiError(undefined, "轉成任務失敗");
      trackError("審核轉任務", e, r?.id);
    }
  };

  const handleDrawerSave = (updated) => {
    if (Array.isArray(updated.subs)) {
      setTasks((p) => p.map((t) => (t.id === updated.id ? updated : t)));
      persistTask(updated);
      showInfo("已儲存變更");
      return;
    }
    if (Array.isArray(updated.chain) && updated.cron !== undefined) {
      setAutos((p) => p.map((a) => (a.id === updated.id ? updated : a)));
      persistAutomation(updated);
      showInfo("已儲存變更");
      return;
    }
    setReviews((p) => p.map((r) => (r.id === updated.id ? updated : r)));
    persistReview(updated);
    showInfo("已儲存變更");
  };

  const progT = (id) => {
    setTasks((p) => p.map((t) => {
      if (t.id !== id) return t;
      const ni = t.subs.findIndex((s) => !s.d);
      if (ni === -1) return t;
      const ns = t.subs.map((s, i) => (i === ni ? { ...s, d: true } : s));
      const np = Math.round((ns.filter((s) => s.d).length / ns.length) * 100);
      const ad = ns.every((s) => s.d);
      const upd = {
        ...t,
        subs: ns,
        progress: np,
        status: ad ? "done" : t.status,
        thought: ad ? "✅ 完成！" : `執行中：${ns[ni + 1]?.t || "收尾"}...`,
      };
      addE(
        `推進「${t.title}」— 完成「${t.subs[ni].t}」→ ${np}%${ad ? " ✅" : ""}`,
        ad ? C.green : C.indigo,
        ad ? "完成" : "推進",
        ad ? C.green : C.indigo
      );
      persistTask(upd);
      if (ad) recordTaskCompletion(upd);
      return upd;
    }));
  };

  const moveT = (id, targetStatus) => {
    const labelMap = {
      queued: "排隊中",
      in_progress: "進行中",
      done: "完成",
    };
    const colorMap = {
      queued: C.t3,
      in_progress: C.indigo,
      done: C.green,
    };
    setTasks((p) =>
      p.map((t) => {
        if (t.id !== id) return t;
        let progress = t.progress ?? 0;
        if (targetStatus === "queued") progress = 0;
        if (targetStatus === "done") progress = 100;
        const upd = {
          ...t,
          status: targetStatus,
          progress,
        };
        persistTask(upd);
        addE(
          `狀態變更「${t.title || t.name || id}」→ ${labelMap[targetStatus] || targetStatus}`,
          colorMap[targetStatus] || C.t3,
          "狀態變更",
          colorMap[targetStatus] || C.t3
        );
        return upd;
      })
    );
  };

  const runT = async (id) => {
    try {
      const { ok, status, data: run } = await runTask(id);
      if (!ok) {
        showApiError(status, "執行任務失敗");
        return;
      }
      setTasks((p) => p.map((item) => {
        if (item.id !== id) return item;
        const upd = { ...item, status: "in_progress", thought: `執行中：Run ${run.id}...` };
        persistTask(upd);
        addE(`執行「${item.title || id}」→ Run ${run.id}`, C.indigo, "執行", C.indigo);
        return upd;
      }));
    } catch (e) {
      console.warn("[OpenClaw] run task failed", e);
      trackError("執行任務", e, id);
    }
  };

  const runA = async (id) => {
    const target = autos.find((a) => a.id === id);
    try {
      const { ok, status, data } = await runAutomation(id);
      if (!ok) {
        showApiError(status, data?.message || "執行自動化失敗");
        return;
      }
      const nextAutomation = data?.automation;
      if (nextAutomation) {
        setAutos((p) => p.map((a) => (a.id === id
          ? { ...a, ...nextAutomation, lastRun: nextAutomation.lastRun || nextAutomation.last_run || a.lastRun }
          : a)));
      } else {
        setAutos((p) => p.map((a) => (a.id === id
          ? { ...a, runs: (a.runs || 0) + 1 }
          : a)));
      }
      const runId = data?.run?.id ? ` · Run ${data.run.id}` : "";
      addE(`執行自動化「${target?.name || id}」${runId}`, C.indigo, "自動化", C.indigo);
      showInfo(`已執行自動化：${target?.name || id}`);
    } catch (e) {
      console.warn("[OpenClaw] run automation failed", e);
      showApiError(undefined, "執行自動化失敗");
      trackError("執行自動化", e, id);
    }
  };

  const delT = async (id) => {
    if (!confirm("確定要刪除此任務？刪除後無法回復。")) return;
    try {
      const { ok, status } = await deleteTask(id);
      if (!ok) {
        showApiError(status, "刪除任務失敗");
        return;
      }
      const t = tasks.find((x) => x.id === id);
      addE(`已刪除「${t?.title || t?.name || id}」`, C.t3, "刪除", C.t3);
      setTasks((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      console.warn("[OpenClaw] delete task failed", e);
      showApiError(undefined, "刪除任務失敗");
      trackError("刪除任務", e, id);
    }
  };

  const addQuiz = async () => {
    try {
      const defaultSubs = [{ t: "填寫測驗", d: false }, { t: "提交", d: false }];
      const { ok, status, data: created } = await createTask({
        name: "測驗單",
        tags: ["learn"],
        status: "ready",
        subs: defaultSubs,
      });
      if (!ok) {
        showApiError(status, "新增測驗單失敗");
        return;
      }
      const newTask = {
        id: created.id,
        title: created.title ?? created.name ?? "測驗單",
        name: created.name,
        status: created.status === "in_progress" ? "in_progress" : "queued",
        progress: created.progress ?? 0,
        subs: Array.isArray(created.subs) && created.subs.length ? created.subs : defaultSubs,
        thought: created.thought ?? "",
        cat: created.cat ?? "learn",
        fromR: created.from_review_id ?? null,
      };
      setTasks((p) => [...p, newTask]);
      addE("已加入「測驗單」", C.purple, "學習", C.purple);
      showInfo("已加入測驗單");
    } catch (e) {
      console.warn("[OpenClaw] add quiz failed", e);
      showApiError(undefined, "新增測驗單失敗");
      trackError("新增測驗單", e);
    }
  };

  const CAT_EMOJI = { commercial: "\u{1F4BC}", system: "\u2699\uFE0F", tool: "\u{1F527}", risk: "\u{1F6E1}\uFE0F", creative: "\u{1F4A1}" };

  const submitIdea = async ({ title, category, background, idea, goal, risk }) => {
    try {
      const { ok, status, data } = await submitProposal({ title, category, background, idea, goal, risk });
      if (!ok) {
        showApiError(status, "提交構想失敗");
        return false;
      }
      const emoji = CAT_EMOJI[category] || "\u{1F4A1}";
      setReviews((prev) => [{
        id: data.reviewId,
        title: `${emoji} ${title}`,
        type: "proposal",
        pri: "medium",
        status: "pending",
        desc: `\u3010\u80CC\u666F\u3011${background}\n\u3010\u9EDE\u5B50\u3011${idea}`,
        reasoning: idea,
        src: `agent-proposal:${category}`,
        tags: ["proposal", "medium"],
        date: new Date().toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" }),
      }, ...prev]);
      addE(`提交構想「${title}」→ 等待審核`, C.purple, "構想", C.purple);
      showInfo(`構想已提交：${title}`);
      return true;
    } catch (e) {
      console.warn("[OpenClaw] submitIdea failed", e);
      showApiError(undefined, "提交構想失敗");
      trackError("提交構想", e);
      return false;
    }
  };

  // ─── 策略切換 ───
  const setAiStrategy = (mode) => {
    const prev = aiStrategy;
    _setAiStrategy(mode);
    try { localStorage.setItem(LS_STRATEGY, mode); } catch {}
    if (prev !== mode) {
      const labelMap = { auto: "自動", fast: "快速", standard: "標準", deep: "深度" };
      addE(`策略切換：${labelMap[prev] || prev} → ${labelMap[mode] || mode}`, C.purple, "策略", C.purple);
      recordStrategySwitch({ from: prev, to: mode });
    }
  };

  // ─── 風險分流自動審核（策略感知） ───
  const autoReviewByRisk = async (id) => {
    const r = reviews.find((item) => item.id === id);
    if (!r || r.status !== "pending") return;
    const risk = r._riskLevel || "none";

    // 決定有效策略（auto 時根據項目分數判定）
    const effectiveStrat = aiStrategy === "auto" ? determineStrategy(r) : aiStrategy;

    // AI 蓋章標記（含策略資訊）
    const stamped = {
      ...r,
      _aiStamped: true,
      _aiStampedAt: new Date().toISOString(),
      _aiStampRisk: risk,
      _strategy: effectiveStrat,
      _strategyScore: computeStrategyScore(r),
    };

    // 根據策略等級決定是否自動通過
    const shouldAutoPass =
      effectiveStrat === "fast"     ? risk !== "critical" :          // 快速：除 critical 全過
      effectiveStrat === "deep"     ? risk === "none" :              // 深度：只有 none 自動過
      /* standard */                  risk === "none" || risk === "low" || risk === "medium"; // 標準：低中過

    if (shouldAutoPass) {
      // ── 低/中風險：直接通過 + 轉任務 ──
      try {
        const { ok, status, data: created } = await createTaskFromReview(stamped);
        if (!ok) {
          // API 失敗也 fallback 建任務（in-memory）
          const upd = { ...stamped, status: "approved" };
          setReviews((p) => p.map((item) => (item.id === id ? upd : item)));
          persistReview(upd);
          const fbId = `task-fb-${Date.now()}-${id.slice(-4)}`;
          setTasks((p) => [{ id: fbId, title: r.title, name: r.title, status: "queued", progress: 0, subs: [{ t: "實作", d: false }, { t: "驗證", d: false }], fromR: r.id }, ...p]);
          addE(`🔖 AI 蓋章通過「${r.title}」→ 已轉任務（${risk === "none" ? "安全" : risk === "low" ? "低風險" : "中風險"}，本地）`, C.green, "批准+轉任務", C.green);
          showInfo(`AI 自動通過：${r.title}（本地任務）`);
          recordReviewDecision(r, "approved", { taskId: fbId, reason: `AI 自動過篩（${risk}）` });
          return;
        }
        const upd = { ...stamped, status: "approved" };
        setReviews((p) => p.map((item) => (item.id === id ? upd : item)));
        persistReview(upd);
        const taskId = created?.id;
        if (taskId) {
          setTasks((p) => [{ id: taskId, title: r.title, name: r.title, status: "queued", progress: 0, subs: [{ t: "實作", d: false }, { t: "驗證", d: false }], fromR: r.id }, ...p]);
        }
        addE(`🔖 AI 蓋章通過「${r.title}」→ 已轉任務（${risk === "none" ? "安全" : risk === "low" ? "低風險" : "中風險"}）`, C.green, "批准+轉任務", C.green);
        showInfo(`AI 自動通過：${r.title}`);
        recordReviewDecision(r, "approved", { taskId: taskId || "", reason: `AI 自動過篩（${risk}）` });
      } catch (e) {
        console.warn("[OpenClaw] autoReviewByRisk failed", e);
        showApiError(undefined, "自動審核失敗");
        trackError("AI 自動審核", e, id);
      }
    } else {
      // ── 高/極高風險：送老蔡專區 ──
      const upd = { ...stamped, _pendingBoss: true };
      setReviews((p) => p.map((item) => (item.id === id ? upd : item)));
      persistReview(upd);
      const riskLabel = risk === "critical" ? "極高風險" : "高風險";
      addE(`🔖 AI 蓋章「${r.title}」→ 送老蔡審核（${riskLabel}）`, C.purple, "送審老蔡", C.purple);
      showInfo(`${riskLabel}：${r.title} 已送老蔡專區`);
      recordReviewDecision(r, "pending_boss", { reason: `${riskLabel}，需老蔡審核` });
    }
  };

  // 老蔡核准高風險項目 → 轉任務執行
  const bossApproveReview = async (id) => {
    const r = reviews.find((item) => item.id === id);
    if (!r) return;
    try {
      const { ok, status, data: created } = await createTaskFromReview(r);
      if (!ok) {
        // API 失敗也 fallback 建任務（in-memory）
        const upd = { ...r, status: "approved", _pendingBoss: false, _bossApproved: true, _bossApprovedAt: new Date().toISOString() };
        setReviews((p) => p.map((item) => (item.id === id ? upd : item)));
        persistReview(upd);
        const fbId = `task-fb-${Date.now()}-${id.slice(-4)}`;
        setTasks((p) => [{ id: fbId, title: r.title, name: r.title, status: "queued", progress: 0, subs: [{ t: "實作", d: false }, { t: "驗證", d: false }], fromR: r.id }, ...p]);
        addE(`👤 老蔡核准「${r.title}」→ 已轉任務（本地）`, C.green, "老蔡核准", C.green);
        showInfo(`老蔡已核准：${r.title} → 任務已發布（本地）`);
        recordReviewDecision(r, "approved", { taskId: fbId, reason: "老蔡核准高風險項目" });
        return;
      }
      const upd = { ...r, status: "approved", _pendingBoss: false, _bossApproved: true, _bossApprovedAt: new Date().toISOString() };
      setReviews((p) => p.map((item) => (item.id === id ? upd : item)));
      persistReview(upd);
      const taskId = created?.id;
      if (taskId) {
        setTasks((p) => [{ id: taskId, title: r.title, name: r.title, status: "queued", progress: 0, subs: [{ t: "實作", d: false }, { t: "驗證", d: false }], fromR: r.id }, ...p]);
      }
      addE(`👤 老蔡核准「${r.title}」→ 已轉任務發布執行`, C.green, "老蔡核准", C.green);
      showInfo(`老蔡已核准：${r.title} → 任務已發布`);
      recordReviewDecision(r, "approved", { taskId: taskId || "", reason: "老蔡核准高風險項目" });
    } catch (e) {
      console.warn("[OpenClaw] bossApproveReview failed", e);
      showApiError(undefined, "老蔡核准轉任務失敗");
      trackError("老蔡核准轉任務", e, id);
    }
  };

  // 老蔡駁回高風險項目
  const bossRejectReview = (id) => {
    const r = reviews.find((item) => item.id === id);
    if (!r) return;
    const upd = { ...r, status: "rejected", _pendingBoss: false, _bossRejected: true, _bossRejectedAt: new Date().toISOString() };
    setReviews((p) => p.map((item) => (item.id === id ? upd : item)));
    persistReview(upd);
    addE(`👤 老蔡駁回「${r.title}」`, C.red, "老蔡駁回", C.red);
    recordReviewDecision(r, "rejected", { reason: "老蔡駁回高風險項目" });
  };

  // ─── 審核意見 ───
  const commentR = (id, comment, action) => {
    if (!comment && action === "comment") return;
    setReviews((p) => p.map((r) => {
      if (r.id !== id) return r;
      const upd = { ...r, _reviewComment: comment, _reviewedAt: new Date().toISOString() };
      persistReview(upd);
      return upd;
    }));
    const r = reviews.find((item) => item.id === id);
    if (r) addE(`審核意見「${r.title}」：${comment?.slice(0, 30) || "(無內容)"}`, C.indigo, "審核意見", C.indigo);
  };

  // ─── 風險項目一鍵批准 ───
  const approveRiskItems = (riskLevel) => {
    const targets = reviews.filter(r =>
      r.status === "pending" && r._riskLevel === riskLevel
    );
    if (targets.length === 0) {
      showInfo(`沒有 ${riskLevel} 風險的待審項目`);
      return;
    }
    if (!confirm(`確定要一次批准全部 ${targets.length} 個「${riskLevel === "high" ? "高" : riskLevel === "medium" ? "中" : "低"}風險」項目嗎？`)) return;
    targets.forEach(r => {
      const upd = { ...r, status: "approved" };
      setReviews((p) => p.map((item) => (item.id === r.id ? upd : item)));
      persistReview(upd);
    });
    addE(`一鍵批准 ${targets.length} 個 ${riskLevel} 風險項目`, C.amber, "風險批准", C.amber);
    showInfo(`已批准 ${targets.length} 個風險項目`);
  };

  // ─── 任務批量推進 ───
  // 推進指定狀態的所有任務各一步
  const batchProgTasks = (targetStatus) => {
    const targets = tasks.filter(t =>
      t.status === targetStatus && (t.subs || []).some(s => !s.d)
    );
    if (targets.length === 0) {
      showInfo(`沒有可推進的「${targetStatus}」任務`);
      return;
    }
    let progressed = 0;
    setTasks((p) => p.map((t) => {
      if (t.status !== targetStatus) return t;
      const ni = (t.subs || []).findIndex((s) => !s.d);
      if (ni === -1) return t;
      const ns = t.subs.map((s, i) => (i === ni ? { ...s, d: true } : s));
      const np = Math.round((ns.filter((s) => s.d).length / ns.length) * 100);
      const ad = ns.every((s) => s.d);
      const upd = {
        ...t,
        subs: ns,
        progress: np,
        status: ad ? "done" : (t.status === "queued" ? "in_progress" : t.status),
        thought: ad ? "✅ 完成！" : `執行中：${ns[ni + 1]?.t || "收尾"}...`,
      };
      persistTask(upd);
      if (ad) recordTaskCompletion(upd);
      progressed++;
      return upd;
    }));
    addE(`批量推進 ${progressed} 個「${targetStatus}」任務各一步`, C.indigo, "批量推進", C.indigo);
    showInfo(`已推進 ${progressed} 個任務`);
  };

  // 啟動所有 queued 任務（改為 in_progress）
  const activateQueuedTasks = () => {
    const targets = tasks.filter(t => t.status === "queued");
    if (targets.length === 0) {
      showInfo("沒有排隊中的任務");
      return;
    }
    setTasks((p) => p.map((t) => {
      if (t.status !== "queued") return t;
      const upd = { ...t, status: "in_progress" };
      persistTask(upd);
      return upd;
    }));
    addE(`啟動 ${targets.length} 個排隊任務 → 進行中`, C.indigo, "批量啟動", C.indigo);
    showInfo(`已啟動 ${targets.length} 個任務`);
  };

  return {
    autos,
    reviews,
    tasks,
    drawer,
    notice,
    boardConfig,
    evo,
    setDrawer,
    setNotice,
    togA,
    okR,
    noR,
    archiveR,
    okRAndCreateTask,
    handleDrawerSave,
    progT,
    runT,
    runA,
    delT,
    moveT,
    addQuiz,
    submitIdea,
    approveRiskItems,
    commentR,
    autoReviewByRisk,
    bossApproveReview,
    bossRejectReview,
    batchProgTasks,
    activateQueuedTasks,
    aiStrategy,
    setAiStrategy,
    errorAccum,
    wakePanel,
    trackError,
    dismissWake,
    createFixTasks,
  };
}
