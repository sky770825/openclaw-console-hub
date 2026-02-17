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
} from "@/services/openclawBoardApi";
import { C } from "@/components/openclaw/uiPrimitives";
import { recordReviewDecision, recordTaskCompletion } from "@/services/aiMemoryStore";

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

export function useOpenClawBoard() {
  const [autos, setAutos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [notice, setNotice] = useState(null);
  const [boardConfig, setBoardConfig] = useState({
    n8nFlows: [],
    apiEndpoints: [],
    securityLayers: [],
    rbacMatrix: [],
    plugins: [],
  });
  const [evo, setEvo] = useState([]);

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
      if (Array.isArray(tList)) setTasks(tList.map((t) => ({ ...t, title: t.title ?? t.name, fromR: t.from_review_id || t.fromR })));
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
      return false;
    }
  };

  // ─── 風險分流自動審核 ───
  // 低/中風險：AI 蓋章後自動通過 + 轉任務
  // 高/極高風險：AI 蓋章後送老蔡專區，老蔡核准後才轉任務
  const autoReviewByRisk = async (id) => {
    const r = reviews.find((item) => item.id === id);
    if (!r || r.status !== "pending") return;
    const risk = r._riskLevel || "none";

    // AI 蓋章標記
    const stamped = {
      ...r,
      _aiStamped: true,
      _aiStampedAt: new Date().toISOString(),
      _aiStampRisk: risk,
    };

    if (risk === "none" || risk === "low" || risk === "medium") {
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
  };
}
