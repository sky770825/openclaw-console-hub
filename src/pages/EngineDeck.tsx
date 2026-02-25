/**
 * 輪機艙 — Engine Room
 *
 * 核心引擎群監控介面：
 * - 治理引擎（斷路器 / 回滾 / 驗收 / 信任分）
 * - 工作流引擎（DAG / 拓撲排序 / 循環偵測）
 * - AutoExecutor（自動派工 / 批次執行）
 * - 斷路器狀態（closed / open / half-open）
 * - 防死鎖引擎
 * - 摘要引擎
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Zap, Building2, GitBranch, Play, Square,
  RotateCw, AlertTriangle, CheckCircle, Clock, TrendingUp,
  Activity, Shield, Database, Cpu, RefreshCw, Mail
} from 'lucide-react';

// ─── 模擬引擎狀態 ─────────────────────────────────────────

function useEngineStatus() {
  const [status, setStatus] = useState({
    governance: {
      circuitBreaker: 'closed' as 'closed' | 'open' | 'half-open',
      consecutiveFails: 0,
      trustScore: 87.4,
      rollbackCount: 2,
      acceptanceRate: 94.2,
    },
    workflow: {
      activeGraphs: 3,
      completedToday: 28,
      pendingNodes: 7,
      cycleDetected: false,
    },
    executor: {
      running: true,
      queueDepth: 4,
      processedToday: 142,
      successRate: 96.5,
      lastDispatch: new Date(Date.now() - 45000),
    },
    antiStuck: {
      active: true,
      detectedToday: 1,
      forcedTerminations: 0,
      avgRetries: 1.3,
    },
    digest: {
      lastSent: new Date(Date.now() - 3600000 * 2),
      nextScheduled: new Date(Date.now() + 3600000 * 4),
      totalSent: 47,
    },
  });

  useEffect(() => {
    const t = setInterval(() => {
      setStatus(s => ({
        ...s,
        executor: {
          ...s.executor,
          processedToday: s.executor.processedToday + (Math.random() > 0.7 ? 1 : 0),
          queueDepth: Math.max(0, s.executor.queueDepth + Math.floor((Math.random() - 0.5) * 3)),
          lastDispatch: Math.random() > 0.8 ? new Date() : s.executor.lastDispatch,
        },
        governance: {
          ...s.governance,
          trustScore: Math.min(100, Math.max(0, s.governance.trustScore + (Math.random() - 0.5) * 0.5)),
        },
      }));
    }, 2500);
    return () => clearInterval(t);
  }, []);

  return status;
}

// ─── 斷路器視覺 ───────────────────────────────────────────

function CircuitBreakerBadge({ state }: { state: 'closed' | 'open' | 'half-open' }) {
  const cfg = {
    closed: { color: '#10b981', label: '閉合（正常）', bg: '#10b98115' },
    open: { color: '#f87171', label: '斷開（保護中）', bg: '#f8717115' },
    'half-open': { color: '#f59e0b', label: '半開（試探中）', bg: '#f59e0b15' },
  }[state];
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
      <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// ─── 子頁面：治理引擎 ─────────────────────────────────────

function GovernanceEngine() {
  const { governance } = useEngineStatus();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/engine" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回輪機艙
      </Link>
      <div className="flex items-center gap-3">
        <Building2 className="h-7 w-7 text-orange-400" />
        <div>
          <h1 className="text-xl font-semibold">治理引擎</h1>
          <p className="text-sm text-muted-foreground">斷路器 · 自動回滾 · 驗收驗證 · 信任分追蹤</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <p className="text-xs text-muted-foreground">斷路器狀態</p>
          <CircuitBreakerBadge state={governance.circuitBreaker} />
          <div className="text-xs text-muted-foreground">連續失敗：{governance.consecutiveFails} / 3</div>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground">Agent 信任分</p>
          <p className="text-2xl font-bold text-orange-400 tabular-nums">{governance.trustScore.toFixed(1)}</p>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-orange-400 transition-all" style={{ width: `${governance.trustScore}%` }} />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">自動回滾次數</p>
          <p className="text-xl font-bold text-yellow-400">{governance.rollbackCount}</p>
          <p className="text-[10px] text-muted-foreground">本週</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">驗收通過率</p>
          <p className="text-xl font-bold text-green-400">{governance.acceptanceRate}%</p>
          <p className="text-[10px] text-muted-foreground">本月累計</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-xs font-medium">機制說明</p>
        {[
          { icon: Shield, label: '斷路器', desc: '連續失敗 3 次後自動斷開，冷卻 5 分鐘後進入半開狀態', color: '#f87171' },
          { icon: RotateCw, label: '自動回滾', desc: '讀取任務 rollbackPlan，執行指定回滾腳本', color: '#f59e0b' },
          { icon: CheckCircle, label: '驗收驗證', desc: '任務完成後自動檢查 acceptanceCriteria', color: '#10b981' },
          { icon: TrendingUp, label: '信任分追蹤', desc: '根據 Agent 執行成功率動態調整信任分（0-100）', color: '#22d3ee' },
        ].map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="flex items-start gap-3">
              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: m.color }} />
              <div>
                <p className="text-xs font-medium">{m.label}</p>
                <p className="text-[11px] text-muted-foreground">{m.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 子頁面：工作流引擎 ───────────────────────────────────

function WorkflowEngine() {
  const { workflow } = useEngineStatus();

  const sampleGraph = [
    { id: 'T001', label: '需求分析', deps: [], status: 'done' },
    { id: 'T002', label: '架構設計', deps: ['T001'], status: 'done' },
    { id: 'T003', label: '前端實作', deps: ['T002'], status: 'running' },
    { id: 'T004', label: '後端實作', deps: ['T002'], status: 'running' },
    { id: 'T005', label: '整合測試', deps: ['T003', 'T004'], status: 'pending' },
    { id: 'T006', label: '部署上線', deps: ['T005'], status: 'pending' },
  ];

  const statusCfg = {
    done: { color: '#10b981', label: '完成' },
    running: { color: '#22d3ee', label: '執行中' },
    pending: { color: '#6b7280', label: '等待' },
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/engine" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回輪機艙
      </Link>
      <div className="flex items-center gap-3">
        <GitBranch className="h-7 w-7 text-indigo-400" />
        <div>
          <h1 className="text-xl font-semibold">工作流引擎</h1>
          <p className="text-sm text-muted-foreground">DAG 任務依賴執行 · 拓撲排序 · 循環偵測</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '活躍圖', value: workflow.activeGraphs, color: '#6366f1' },
          { label: '今日完成', value: workflow.completedToday, color: '#10b981' },
          { label: '待執行節點', value: workflow.pendingNodes, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {!workflow.cycleDetected
        ? <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2.5 text-sm text-green-400">
            <CheckCircle className="h-4 w-4" /> 無循環依賴偵測
          </div>
        : <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4" /> 偵測到循環依賴！請立即檢查
          </div>}

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">範例執行圖（DAG）</p>
        </div>
        <div className="p-4 space-y-2">
          {sampleGraph.map(node => {
            const cfg = statusCfg[node.status as keyof typeof statusCfg];
            return (
              <div key={node.id} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-muted-foreground w-12">{node.id}</span>
                <span className="flex-1">{node.label}</span>
                {node.deps.length > 0 && (
                  <span className="text-muted-foreground/50 text-[10px]">← {node.deps.join(', ')}</span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px]" style={{ color: cfg.color, background: cfg.color + '15' }}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 子頁面：自動執行器 ───────────────────────────────────

function AutoExecutorDetail() {
  const { executor } = useEngineStatus();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await fetch(`/api/openclaw/auto-executor/${executor.running ? 'stop' : 'start'}`, { method: 'POST' })
      .catch(() => {});
    setTimeout(() => setToggling(false), 1000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/engine" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回輪機艙
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Play className="h-7 w-7 text-green-400" />
          <div>
            <h1 className="text-xl font-semibold">自動執行器</h1>
            <p className="text-sm text-muted-foreground">自動派工 · 批次執行 · 任務輪詢</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
            executor.running
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'
          }`}
        >
          {executor.running ? <><Square className="h-4 w-4" />停止</> : <><Play className="h-4 w-4" />啟動</>}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '佇列深度', value: executor.queueDepth, color: '#f59e0b' },
          { label: '今日處理', value: executor.processedToday, color: '#22d3ee' },
          { label: '成功率', value: `${executor.successRate}%`, color: '#10b981' },
          { label: '狀態', value: executor.running ? '運行中' : '已停止', color: executor.running ? '#10b981' : '#6b7280' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-2">
        <p className="text-xs font-medium mb-3">派工風險等級</p>
        {[
          { level: '🟢 安全任務', desc: '自動批准執行', color: '#10b981' },
          { level: '🟡 低風險', desc: 'Claude 審核後執行', color: '#f59e0b' },
          { level: '🔴 中風險', desc: 'Claude 審慎執行', color: '#f87171' },
          { level: '🟣 高風險', desc: '等待老蔡手動審核', color: '#a78bfa' },
        ].map(r => (
          <div key={r.level} className="flex items-center justify-between text-xs">
            <span>{r.level}</span>
            <span style={{ color: r.color }}>{r.desc}</span>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Clock className="h-3.5 w-3.5" />
        最後派發：{executor.lastDispatch.toLocaleTimeString('zh-TW')}
      </div>
    </div>
  );
}

// ─── 輪機艙總覽 ───────────────────────────────────────────

function EngineOverview() {
  const status = useEngineStatus();

  const engines = [
    {
      id: 'governance', label: '治理引擎', icon: Building2, color: '#f97316',
      route: '/center/engine/governance',
      stats: [`信任分 ${status.governance.trustScore.toFixed(0)}`, `斷路器：${status.governance.circuitBreaker}`],
      status: status.governance.circuitBreaker === 'closed' ? 'ok' : 'warn',
    },
    {
      id: 'workflow', label: '工作流引擎', icon: GitBranch, color: '#6366f1',
      route: '/center/engine/workflow',
      stats: [`活躍圖 ${status.workflow.activeGraphs}`, `今日完成 ${status.workflow.completedToday}`],
      status: status.workflow.cycleDetected ? 'error' : 'ok',
    },
    {
      id: 'executor', label: '自動執行器', icon: Play, color: '#10b981',
      route: '/center/engine/executor',
      stats: [`佇列 ${status.executor.queueDepth}`, `今日 ${status.executor.processedToday} 筆`],
      status: status.executor.running ? 'ok' : 'stopped',
    },
    {
      id: 'circuit-breaker', label: '斷路器', icon: Zap, color: '#f87171',
      route: '/center/engine/circuit-breaker',
      stats: [`狀態：${status.governance.circuitBreaker}`, `連失 ${status.governance.consecutiveFails}/3`],
      status: status.governance.circuitBreaker === 'open' ? 'error' : 'ok',
    },
    {
      id: 'anti-stuck', label: '防死鎖引擎', icon: RefreshCw, color: '#22d3ee',
      route: '/center/engine/anti-stuck',
      stats: [`今日偵測 ${status.antiStuck.detectedToday}`, `強制終止 ${status.antiStuck.forcedTerminations}`],
      status: 'ok',
    },
    {
      id: 'digest', label: '摘要引擎', icon: Mail, color: '#a78bfa',
      route: '/center/engine/digest',
      stats: [`累計 ${status.digest.totalSent} 份`, `下次 ${status.digest.nextScheduled.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`],
      status: 'ok',
    },
  ];

  const statusIcon = {
    ok: <CheckCircle className="h-4 w-4 text-green-400" />,
    warn: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
    error: <AlertTriangle className="h-4 w-4 text-red-400" />,
    stopped: <Square className="h-4 w-4 text-gray-400" />,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link to="/center" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回甲板總覽
      </Link>

      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Zap className="h-6 w-6 text-orange-400" />
          輪機艙
        </h1>
        <p className="text-sm text-muted-foreground mt-1">核心引擎群 · 動力系統監控</p>
      </div>

      {/* 總覽統計 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '活躍引擎', value: 6, icon: Cpu, color: '#f97316' },
          { label: '今日執行', value: status.executor.processedToday, icon: Activity, color: '#22d3ee' },
          { label: '成功率', value: `${status.executor.successRate}%`, icon: TrendingUp, color: '#10b981' },
          { label: '待執行', value: status.executor.queueDepth, icon: Database, color: '#f59e0b' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* 引擎卡片 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {engines.map(engine => {
          const Icon = engine.icon;
          return (
            <Link key={engine.id} to={engine.route} className="rounded-lg border bg-card p-4 hover:bg-accent/50 hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: engine.color + '20', border: `1px solid ${engine.color}30` }}>
                    <Icon className="h-4 w-4" style={{ color: engine.color }} />
                  </div>
                  <span className="font-medium text-sm">{engine.label}</span>
                </div>
                {statusIcon[engine.status as keyof typeof statusIcon]}
              </div>
              <div className="space-y-1">
                {engine.stats.map(s => (
                  <p key={s} className="text-[11px] text-muted-foreground">{s}</p>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── 通用佔位子頁 ─────────────────────────────────────────

function EnginePlaceholder({ name }: { name: string }) {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <Link to="/center/engine" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回輪機艙
      </Link>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
        <Zap className="h-10 w-10 text-orange-400/40" />
        <p className="font-medium">{name}</p>
        <p className="text-xs">引擎模組建置中</p>
      </div>
    </div>
  );
}

// ─── 主路由元件 ───────────────────────────────────────────

export default function EngineDeck() {
  const { module } = useParams<{ module?: string }>();

  if (module === 'governance') return <GovernanceEngine />;
  if (module === 'workflow') return <WorkflowEngine />;
  if (module === 'executor') return <AutoExecutorDetail />;
  if (module === 'circuit-breaker') return <EnginePlaceholder name="斷路器詳情" />;
  if (module === 'anti-stuck') return <EnginePlaceholder name="防死鎖引擎詳情" />;
  if (module === 'digest') return <EnginePlaceholder name="摘要引擎詳情" />;

  return <EngineOverview />;
}
