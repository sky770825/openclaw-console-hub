/**
 * 自動補全任務排程
 * 依照資料庫需求智能判斷、嚴禁無效空任務
 * 品質閘門：最少驗收條件、回滾計畫、證據連結
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { fetchOpenClawTasks, upsertOpenClawTask } from './openclawSupabase.js';
import { hasSupabase } from './supabase.js';
import { taskToOpenClawTask } from './openclawMapper.js';
import { validateTaskForGate } from './taskCompliance.js';
import type { Task } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type AutoTaskSource = 'internal-ops' | 'business-model' | 'external-radar';

export interface AutoTaskGeneratorState {
  isRunning: boolean;
  pollIntervalMs: number;
  maxTasksPerCycle: number;
  backlogTarget: number;
  zeroReadyStreak?: number;
  lastEffectiveMaxTasksPerCycle?: number;
  lastCycleAt: string | null;
  nextCycleAt: string | null;
  lastSummary: string | null;
  generatedToday: number;
  totalGenerated: number;
  perSource: Record<AutoTaskSource, number>;
  sourceWeights: Record<AutoTaskSource, number>;
  qualityGateEnabled: boolean;
  qualityGate: {
    minAcceptanceCriteria: number;
    requireRollbackPlan: boolean;
    minRollbackLength: number;
    requireEvidenceLinks: boolean;
  };
  recentSignatures?: Record<string, number>;
}

const STATE_PATH = path.resolve(__dirname, '..', 'auto-task-generator-state.json');

const DEFAULT_STATE: AutoTaskGeneratorState = {
  isRunning: false,
  pollIntervalMs: 15 * 60 * 1000,
  maxTasksPerCycle: 3,
  backlogTarget: 20,
  zeroReadyStreak: 0,
  lastEffectiveMaxTasksPerCycle: 3,
  lastCycleAt: null,
  nextCycleAt: null,
  lastSummary: null,
  generatedToday: 0,
  totalGenerated: 0,
  perSource: { 'internal-ops': 0, 'business-model': 0, 'external-radar': 0 },
  sourceWeights: { 'internal-ops': 35, 'business-model': 50, 'external-radar': 15 },
  qualityGateEnabled: true,
  qualityGate: {
    minAcceptanceCriteria: 3,
    requireRollbackPlan: true,
    minRollbackLength: 20,
    requireEvidenceLinks: true,
  },
  recentSignatures: {},
};

function loadState(): AutoTaskGeneratorState {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const raw = fs.readFileSync(STATE_PATH, 'utf8');
      const j = JSON.parse(raw) as Partial<AutoTaskGeneratorState>;
      return { ...DEFAULT_STATE, ...j };
    }
  } catch (e) {
    console.warn('[AutoTaskGenerator] load state failed:', e);
  }
  return { ...DEFAULT_STATE };
}

function saveState(state: AutoTaskGeneratorState): void {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
  } catch (e) {
    console.warn('[AutoTaskGenerator] save state failed:', e);
  }
}

export function getState(): AutoTaskGeneratorState {
  return loadState();
}

export function patchState(patch: Partial<AutoTaskGeneratorState>): AutoTaskGeneratorState {
  const cur = loadState();
  const next: AutoTaskGeneratorState = { ...cur, ...patch };
  saveState(next);
  return next;
}

/** 任務模板：符合品質閘門、嚴禁無效空任務 */
interface TaskTemplate {
  source: AutoTaskSource;
  name: string;
  description: string;
  acceptanceCriteria: string[];
  rollbackPlan: string;
  evidenceLinks: string[];
  projectPath: string;
  deliverables: string[];
  runCommands: string[];
}

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    source: 'internal-ops',
    name: '內部技術掃描：ready 池低於目標時補齊',
    description: '掃描內部待辦、技術債、知識庫缺口，產出可執行任務',
    acceptanceCriteria: ['至少 1 個明確產出', '含驗收方式', '可回滾'],
    rollbackPlan: '若產出品質不足則刪除任務、不影響既有流程',
    evidenceLinks: ['projects/'],
    projectPath: 'projects/batcha/modules/internal-ops',
    deliverables: ['RESULT.md', 'docs/updates/'],
    runCommands: ['echo scan'],
  },
  {
    source: 'internal-ops',
    name: '知識庫健康檢查：過期內容與缺口',
    description: '檢查 SOP 與知識庫更新時效、缺口，提出補齊建議',
    acceptanceCriteria: ['列出過期項目', '列出缺口', '建議優先順序'],
    rollbackPlan: '僅產出報告不直接改檔，誤判不影響',
    evidenceLinks: ['knowledge/'],
    projectPath: 'projects/batcha/modules/knowledge',
    deliverables: ['STATUS.md', 'docs/updates/'],
    runCommands: ['echo check'],
  },
  {
    source: 'internal-ops',
    name: '效能優化盤點：執行時長與 token 用量',
    description: '分析近期 run 的耗時與 token，提出降本建議',
    acceptanceCriteria: ['彙整平均耗時', '彙整 token 用量', '至少 1 條優化建議'],
    rollbackPlan: '只讀分析，無回滾需求',
    evidenceLinks: ['server/'],
    projectPath: 'projects/batcha/modules/perf',
    deliverables: ['RESULT.md'],
    runCommands: ['echo perf'],
  },
  {
    source: 'business-model',
    name: '商業模式盤點：轉換漏斗與可變現任務',
    description: '從註冊到轉化、漏斗分析，產出可執行優化任務',
    acceptanceCriteria: ['列出漏斗階段', '標示轉化率', '至少 1 個可執行優化'],
    rollbackPlan: '僅產出分析報告，不直接改業務邏輯',
    evidenceLinks: ['docs/'],
    projectPath: 'projects/batcha/modules/business',
    deliverables: ['RESULT.md', 'docs/updates/'],
    runCommands: ['echo funnel'],
  },
  {
    source: 'business-model',
    name: '營運漏斗診斷：註冊到首單轉化',
    description: '診斷用戶旅程各階段流失，產出改進建議',
    acceptanceCriteria: ['診斷至少 3 個階段', '標示流失點', '建議對應動作'],
    rollbackPlan: '只產出診斷報告，不改資料庫',
    evidenceLinks: ['docs/'],
    projectPath: 'projects/batcha/modules/business',
    deliverables: ['RESULT.md'],
    runCommands: ['echo diagnose'],
  },
  {
    source: 'external-radar',
    name: '外部情報掃描：官方更新與社群新做法',
    description: '掃描官方 release、社群討論，整理可採用方案',
    acceptanceCriteria: ['至少 3 個來源', '每個附摘要與連結', '1 個可執行 POC 建議'],
    rollbackPlan: '只產出情報摘要，不自動改碼',
    evidenceLinks: ['https://github.com/trending'],
    projectPath: 'projects/batcha/modules/radar',
    deliverables: ['RESULT.md', 'docs/updates/'],
    runCommands: ['echo radar'],
  },
  {
    source: 'external-radar',
    name: '技術雷達更新：新工具與框架評估',
    description: '追蹤新工具、框架、最佳實踐，更新技術雷達',
    acceptanceCriteria: ['至少 2 個新項目', '附採用建議', '風險與依賴說明'],
    rollbackPlan: '雷達為建議性質，不影響生產',
    evidenceLinks: ['https://github.com'],
    projectPath: 'projects/batcha/modules/radar',
    deliverables: ['RADAR.md', 'RESULT.md'],
    runCommands: ['echo radar'],
  },
];

function pickWeightedSource(weights: Record<AutoTaskSource, number>): AutoTaskSource {
  const total = weights['internal-ops'] + weights['business-model'] + weights['external-radar'];
  let r = Math.random() * total;
  if (r < weights['internal-ops']) return 'internal-ops';
  r -= weights['internal-ops'];
  if (r < weights['business-model']) return 'business-model';
  return 'external-radar';
}

function passesQualityGate(
  t: Task,
  gate: AutoTaskGeneratorState['qualityGate']
): { ok: true } | { ok: false; reason: string } {
  if (!t.name?.trim()) return { ok: false, reason: '名稱為空' };
  if (!t.description?.trim()) return { ok: false, reason: '說明為空' };
  const ac = t.acceptanceCriteria ?? [];
  if (ac.filter(Boolean).length < gate.minAcceptanceCriteria) {
    return { ok: false, reason: `驗收條件少於 ${gate.minAcceptanceCriteria} 條` };
  }
  if (gate.requireRollbackPlan && (!t.rollbackPlan?.trim() || t.rollbackPlan.trim().length < gate.minRollbackLength)) {
    return { ok: false, reason: `回滾計畫不足 ${gate.minRollbackLength} 字` };
  }
  if (gate.requireEvidenceLinks) {
    const links = t.evidenceLinks ?? [];
    if (links.filter(Boolean).length === 0) {
      return { ok: false, reason: '缺少證據連結' };
    }
  }
  return { ok: true };
}

function templateToTask(tpl: TaskTemplate): Task {
  const id = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: tpl.name,
    description: tpl.description,
    status: 'ready',
    tags: ['auto', `source:${tpl.source}`],
    owner: 'OpenClaw',
    priority: 3,
    scheduleType: 'manual',
    scheduleExpr: '',
    taskType: 'research',
    complexity: 'M',
    riskLevel: 'low',
    deadline: null,
    reviewer: '',
    rollbackPlan: tpl.rollbackPlan,
    acceptanceCriteria: tpl.acceptanceCriteria,
    evidenceLinks: tpl.evidenceLinks,
    reporterTarget: '',
    projectPath: tpl.projectPath,
    runPath: '',
    idempotencyKey: `auto-${tpl.source}-${id}`,
    deliverables: tpl.deliverables,
    runCommands: tpl.runCommands,
    modelPolicy: 'subscription+ollama-only',
    agent: { type: 'openclaw' },
    modelConfig: {
      provider: 'ollama',
      primary: 'ollama/qwen3:8b',
      fallbacks: ['ollama/deepseek-r1:8b'],
    },
    allowPaid: false,
    executionProvider: 'openclaw',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function runOneCycle(
  stateOverride?: Partial<AutoTaskGeneratorState>
): Promise<{ created: number; skipped: number; candidates: number; summary: string }> {
  const state = { ...loadState(), ...stateOverride };
  if (!hasSupabase()) {
    return { created: 0, skipped: 0, candidates: 0, summary: 'Supabase 未連線，跳過' };
  }

  const ocTasks = await fetchOpenClawTasks();
  const readyCount = ocTasks.filter((t) => t.status === 'queued').length;

  // 智能判斷：若 ready 已達目標，不補任務或僅補少量
  const need = Math.max(0, state.backlogTarget - readyCount);
  const effectiveMax = Math.min(state.maxTasksPerCycle, need);

  const candidates = TASK_TEMPLATES.filter((t) => {
    const sig = `${t.source}:${t.name}`;
    const recent = state.recentSignatures ?? {};
    const last = recent[sig];
    if (last && Date.now() - last < 24 * 60 * 60 * 1000) return false; // 24h 內不重複
    return true;
  });

  if (effectiveMax <= 0 || candidates.length === 0) {
    const summary = `ready=${readyCount}, target=${state.backlogTarget}, effectiveMax=0, candidates=${candidates.length}`;
    patchState({
      lastCycleAt: new Date().toISOString(),
      lastSummary: summary,
    });
    return { created: 0, skipped: effectiveMax, candidates: candidates.length, summary };
  }

  // 依權重選來源，再從該來源的模板中選
  const bySource = new Map<AutoTaskSource, TaskTemplate[]>();
  for (const t of candidates) {
    if (!bySource.has(t.source)) bySource.set(t.source, []);
    bySource.get(t.source)!.push(t);
  }

  const toTry: TaskTemplate[] = [];
  for (let i = 0; i < effectiveMax && toTry.length < effectiveMax; i++) {
    const src = pickWeightedSource(state.sourceWeights);
    const list = bySource.get(src);
    if (!list?.length) continue;
    const idx = Math.floor(Math.random() * list.length);
    toTry.push(list[idx]);
  }

  let created = 0;
  const perSource: Record<AutoTaskSource, number> = { ...state.perSource };
  const recentSignatures = { ...(state.recentSignatures ?? {}) };
  const todayStart = new Date().toISOString().slice(0, 10);

  for (const tpl of toTry) {
    const task = templateToTask(tpl);

    // 品質閘門
    if (state.qualityGateEnabled) {
      const gateResult = passesQualityGate(task, state.qualityGate);
      if (!gateResult.ok) {
        console.log(`[AutoTaskGenerator] skip: ${task.name} - ${gateResult.reason}`);
        continue;
      }
    }

    // validateTaskForGate（Ready 合規）
    const gate = validateTaskForGate(task, 'ready');
    if (!gate.ok) {
      console.log(`[AutoTaskGenerator] skip gate: ${task.name} - missing: ${gate.missing.join(', ')}`);
      continue;
    }

    const oc = taskToOpenClawTask(task);
    const ok = await upsertOpenClawTask({
      id: task.id,
      title: oc.title ?? task.name,
      thought: oc.thought,
      status: 'queued',
      cat: 'feature',
      progress: 0,
      auto: true,
      subs: [],
    });

    if (ok) {
      created++;
      perSource[tpl.source]++;
      recentSignatures[`${tpl.source}:${tpl.name}`] = Date.now();
      //  prune recentSignatures 避免無限增長
      const keys = Object.keys(recentSignatures);
      if (keys.length > 50) {
        const sorted = keys.sort((a, b) => (recentSignatures[b] ?? 0) - (recentSignatures[a] ?? 0));
        for (const k of sorted.slice(50)) delete recentSignatures[k];
      }
    }
  }

  const now = new Date().toISOString();
  const lastWasToday = state.lastCycleAt && state.lastCycleAt.slice(0, 10) === todayStart;
  const newGeneratedToday = lastWasToday ? state.generatedToday + created : created;

  const summary = `ready=${readyCount}, created=${created}, skipped=${toTry.length - created}, candidates=${candidates.length}`;
  patchState({
    lastCycleAt: now,
    lastSummary: summary,
    generatedToday: newGeneratedToday,
    totalGenerated: state.totalGenerated + created,
    perSource,
    recentSignatures,
  });

  return {
    created,
    skipped: toTry.length - created,
    candidates: candidates.length,
    summary,
  };
}
