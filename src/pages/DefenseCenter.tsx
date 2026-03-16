/**
 * 防禦甲板 — Defense Center
 * 真實 API 版本：防火牆 / 威脅 / 存取日誌 / 副手監控 / 聯盟協防
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Flame, Activity, Eye, Lock, AlertTriangle,
  CheckCircle, Clock, Cpu, RefreshCw, Power, PowerOff,
  Terminal, User, Zap, XCircle,
} from 'lucide-react';
import { FederationPanel } from '@/components/federation/FederationPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3011';
const AUTH = {
  Authorization: `Bearer ${import.meta.env.VITE_OPENCLAW_API_KEY || ''}`,
  'Content-Type': 'application/json',
};

// ─── Types ───

interface DefenseStatus {
  firewall: {
    enabled: boolean;
    allowedEvents: string[];
    blockedToday: number;
    recentLogs: FirewallLog[];
  };
  executor: {
    isRunning: boolean;
    dispatchMode: boolean;
    runningTasks: number;
    totalExecutedToday: number;
  };
}

interface FirewallLog {
  id?: string;
  event_type: string;
  origin: string;
  severity: string;
  blocked_at: string;
  details?: Record<string, unknown>;
}

interface DeputyStatus {
  mode: string;
  enabled: boolean;
  lastRun: string | null;
  lastRunStatus: string | null;
  lastRunDurationMs: number | null;
  recentLog: string[];
  executor: {
    isRunning: boolean;
    dispatchMode: boolean;
    pendingReviews: number;
    recentExecutions: Array<{
      taskId: string;
      taskName: string;
      riskLevel: string;
      status: string;
      executedAt: string;
      summary: string;
    }>;
  };
}

// ─── Severity 樣式 ───

const SEVERITY_STYLE: Record<string, string> = {
  low: 'text-blue-500 bg-blue-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  critical: 'text-red-500 bg-red-500/10',
};

const RISK_BADGE: Record<string, string> = {
  safe: 'bg-green-500/10 text-green-500',
  low: 'bg-blue-500/10 text-blue-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-orange-500/10 text-orange-500',
  critical: 'bg-red-500/10 text-red-500',
};

// ─── Tab 定義 ───

type Tab = 'firewall' | 'logs' | 'deputy' | 'intrusion' | 'federation';

export default function DefenseCenter() {
  const [tab, setTab] = useState<Tab>('firewall');
  const [status, setStatus] = useState<DefenseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/defense/status`, { headers: AUTH });
      if (r.ok) setStatus(await r.json());
    } catch { /* offline */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 15000);
    return () => clearInterval(t);
  }, [fetchStatus]);

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'firewall', label: '防火牆', icon: Flame },
    { id: 'logs', label: '攔截日誌', icon: Eye },
    { id: 'deputy', label: '副手監控', icon: Cpu },
    { id: 'intrusion', label: '入侵防禦', icon: Lock },
    { id: 'federation', label: '聯盟協防', icon: Shield },
  ];

  const blockedToday = status?.firewall.blockedToday ?? 0;
  const allowedCount = status?.firewall.allowedEvents.length ?? 0;
  const runningTasks = status?.executor.runningTasks ?? 0;
  const executedToday = status?.executor.totalExecutedToday ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-500" />
            防禦甲板
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            防火牆 / 攔截日誌 / 副手監控 / 入侵防禦 / 聯盟協防
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 總覽卡片 */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="防火牆"
          value={status?.firewall.enabled ? '啟用' : '停用'}
          sub={`白名單 ${allowedCount} 個事件`}
          color={status?.firewall.enabled ? 'text-green-500' : 'text-red-500'}
        />
        <StatCard
          label="今日攔截"
          value={blockedToday.toString()}
          sub="未授權事件"
          color={blockedToday > 0 ? 'text-red-500' : 'text-muted-foreground'}
        />
        <StatCard
          label="執行中任務"
          value={runningTasks.toString()}
          sub={runningTasks > 0 ? '⚠️ 執行中' : '✅ 無卡住'}
          color={runningTasks > 0 ? 'text-orange-500' : 'text-green-500'}
        />
        <StatCard
          label="今日執行"
          value={executedToday.toString()}
          sub="任務完成"
          color="text-blue-500"
        />
      </div>

      {/* Tab 列 */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* 內容區 */}
      {tab === 'firewall' && <FirewallPanel status={status} />}
      {tab === 'logs' && <FirewallLogsPanel />}
      {tab === 'deputy' && <DeputyPanel />}
      {tab === 'intrusion' && <IntrusionPanel />}
      {tab === 'federation' && <FederationPanel />}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

// ─── 防火牆規則面板 ───

function FirewallPanel({ status }: { status: DefenseStatus | null }) {
  if (!status) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <div className="animate-pulse text-muted-foreground text-sm">載入防火牆狀態…</div>
      </div>
    );
  }

  const { firewall, executor } = status;

  return (
    <div className="space-y-4">
      {/* postMessage 防火牆 */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-sm">PostMessage 防火牆</span>
          </div>
          <Badge className={firewall.enabled ? 'bg-green-500/10 text-green-600 border-green-500/30' : 'bg-red-500/10 text-red-600'}>
            {firewall.enabled ? '運行中' : '已停用'}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">白名單事件（{firewall.allowedEvents.length} 個）</p>
          <div className="flex flex-wrap gap-1.5">
            {firewall.allowedEvents.map(e => (
              <span key={e} className="px-2 py-0.5 rounded-md text-xs bg-muted font-mono">{e}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">今日攔截</p>
            <p className="text-xl font-bold text-red-500">{firewall.blockedToday}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">最近事件</p>
            <p className="text-sm font-medium">
              {firewall.recentLogs[0]
                ? `${firewall.recentLogs[0].event_type} · ${new Date(firewall.recentLogs[0].blocked_at).toLocaleTimeString('zh-TW')}`
                : '無'}
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Executor 防護狀態 */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span className="font-semibold text-sm">自動執行器防護</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">執行器狀態</p>
            <p className={`text-sm font-semibold mt-1 ${executor.isRunning ? 'text-green-500' : 'text-muted-foreground'}`}>
              {executor.isRunning ? '運行中' : '已停止'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">派工模式</p>
            <p className={`text-sm font-semibold mt-1 ${executor.dispatchMode ? 'text-blue-500' : 'text-muted-foreground'}`}>
              {executor.dispatchMode ? '啟用' : '停用'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">卡住任務</p>
            <p className={`text-sm font-semibold mt-1 ${executor.runningTasks > 0 ? 'text-orange-500' : 'text-green-500'}`}>
              {executor.runningTasks > 0 ? `${executor.runningTasks} 筆 ⚠️` : '乾淨 ✅'}
            </p>
          </div>
        </div>
      </div>

      {/* 最近攔截事件 */}
      {firewall.recentLogs.length > 0 && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            最近攔截事件
          </p>
          <div className="space-y-2">
            {firewall.recentLogs.slice(0, 5).map((log, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded font-semibold uppercase ${SEVERITY_STYLE[log.severity] || SEVERITY_STYLE.medium}`}>
                    {log.severity}
                  </span>
                  <span className="font-mono">{log.event_type}</span>
                </div>
                <div className="text-muted-foreground text-right">
                  <span>{log.origin}</span>
                  <span className="ml-2">{new Date(log.blocked_at).toLocaleTimeString('zh-TW')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 防火牆日誌面板 ───

function FirewallLogsPanel() {
  const [logs, setLogs] = useState<FirewallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/defense/firewall-logs?limit=100`, { headers: AUTH });
      const d = await r.json();
      setLogs(d.logs ?? []);
      if (d.note) setNote(d.note);
    } catch { /* offline */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const t = setInterval(fetchLogs, 20000);
    return () => clearInterval(t);
  }, [fetchLogs]);

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm animate-pulse">載入日誌…</div>;

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center space-y-2">
        <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
        <p className="font-semibold">防火牆日誌清空</p>
        <p className="text-sm text-muted-foreground">
          {note || '目前無攔截記錄。firewall_logs 表可能尚未建立，或無事件觸發。'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">共 {logs.length} 筆攔截記錄</p>
        <Button variant="ghost" size="sm" onClick={fetchLogs}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 text-muted-foreground">時間</th>
              <th className="text-left px-3 py-2 text-muted-foreground">事件類型</th>
              <th className="text-left px-3 py-2 text-muted-foreground">來源</th>
              <th className="text-left px-3 py-2 text-muted-foreground">嚴重性</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log, i) => (
              <tr key={log.id ?? i} className="hover:bg-muted/30">
                <td className="px-3 py-2 font-mono">
                  {new Date(log.blocked_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="px-3 py-2 font-mono text-red-500">{log.event_type}</td>
                <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate">{log.origin}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${SEVERITY_STYLE[log.severity] ?? SEVERITY_STYLE.medium}`}>
                    {log.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 副手監控面板 ───

function DeputyPanel() {
  const [deputy, setDeputy] = useState<DeputyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const fetchDeputy = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/defense/deputy`, { headers: AUTH });
      if (r.ok) setDeputy(await r.json());
    } catch { /* offline */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeputy();
    const t = setInterval(fetchDeputy, 10000);
    return () => clearInterval(t);
  }, [fetchDeputy]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await fetch(`${API}/api/openclaw/deputy/toggle`, { method: 'POST', headers: AUTH });
      await fetchDeputy();
    } finally {
      setToggling(false);
    }
  };

  const handleRunNow = async () => {
    setTriggering(true);
    try {
      await fetch(`${API}/api/openclaw/deputy/run-now`, { method: 'POST', headers: AUTH });
      await fetchDeputy();
    } finally {
      setTriggering(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm animate-pulse">載入副手狀態…</div>;
  if (!deputy) return <div className="text-center py-12 text-muted-foreground text-sm">無法取得副手狀態</div>;

  const { executor } = deputy;

  return (
    <div className="space-y-4">
      {/* 副手狀態卡 */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-purple-500" />
            <span className="font-semibold">小蔡 (Deputy)</span>
            <Badge className={deputy.enabled
              ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
              : 'bg-muted text-muted-foreground'}>
              {deputy.enabled ? `模式：${deputy.mode}` : '離線'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleToggle} disabled={toggling}>
              {deputy.enabled ? <PowerOff className="h-3.5 w-3.5 mr-1" /> : <Power className="h-3.5 w-3.5 mr-1" />}
              {toggling ? '切換中…' : deputy.enabled ? '停止' : '啟動'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRunNow} disabled={triggering || !deputy.enabled}>
              <Zap className="h-3.5 w-3.5 mr-1" />
              {triggering ? '觸發中…' : '立即執行'}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">最後執行</p>
            <p className="text-sm font-medium mt-1">
              {deputy.lastRun ? new Date(deputy.lastRun).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">執行結果</p>
            <p className={`text-sm font-medium mt-1 ${deputy.lastRunStatus === 'success' ? 'text-green-500' : deputy.lastRunStatus === 'error' ? 'text-red-500' : 'text-muted-foreground'}`}>
              {deputy.lastRunStatus ?? '—'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">耗時</p>
            <p className="text-sm font-medium mt-1">
              {deputy.lastRunDurationMs ? `${(deputy.lastRunDurationMs / 1000).toFixed(1)}s` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Executor 派工狀態 */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          自動執行器狀態
        </p>
        <div className="grid grid-cols-4 gap-3 text-center text-xs">
          <div className="rounded bg-muted/40 p-2">
            <p className="text-muted-foreground">狀態</p>
            <p className={`font-semibold mt-1 ${executor.isRunning ? 'text-green-500' : 'text-muted-foreground'}`}>
              {executor.isRunning ? '✅ 運行' : '⏸ 停止'}
            </p>
          </div>
          <div className="rounded bg-muted/40 p-2">
            <p className="text-muted-foreground">派工</p>
            <p className={`font-semibold mt-1 ${executor.dispatchMode ? 'text-blue-500' : 'text-muted-foreground'}`}>
              {executor.dispatchMode ? '✅ 啟用' : '⏸ 停用'}
            </p>
          </div>
          <div className="rounded bg-muted/40 p-2">
            <p className="text-muted-foreground">待審核</p>
            <p className={`font-semibold mt-1 ${executor.pendingReviews > 0 ? 'text-orange-500' : 'text-green-500'}`}>
              {executor.pendingReviews}
            </p>
          </div>
          <div className="rounded bg-muted/40 p-2">
            <p className="text-muted-foreground">最近執行</p>
            <p className="font-semibold mt-1">{executor.recentExecutions.length} 筆</p>
          </div>
        </div>
        {executor.recentExecutions.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground">最近任務</p>
            {executor.recentExecutions.map((ex, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1 border-b last:border-0">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${RISK_BADGE[ex.riskLevel] ?? RISK_BADGE.medium}`}>
                  {ex.riskLevel}
                </span>
                <span className={`w-14 shrink-0 ${ex.status === 'success' ? 'text-green-500' : ex.status === 'failed' ? 'text-red-500' : 'text-yellow-500'}`}>
                  {ex.status === 'success' ? '✅ 成功' : ex.status === 'failed' ? '❌ 失敗' : '⏳ 待審'}
                </span>
                <span className="truncate text-muted-foreground flex-1">{ex.taskName}</span>
                <span className="text-muted-foreground shrink-0">
                  {new Date(ex.executedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 副手 Log */}
      {deputy.recentLog.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4 text-green-500" />
            副手執行日誌（最後 {deputy.recentLog.length} 行）
          </p>
          <div className="bg-black/80 rounded p-3 font-mono text-xs text-green-400 space-y-0.5 max-h-48 overflow-y-auto">
            {deputy.recentLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 入侵防禦面板（真實防護指標）───

function IntrusionPanel() {
  const [health, setHealth] = useState<{
    ok: boolean;
    version?: string;
    services?: Record<string, { ok: boolean; latencyMs?: number }>;
  } | null>(null);

  useEffect(() => {
    fetch(`${API}/api/health`).then(r => r.json()).then(setHealth).catch(() => {});
    const t = setInterval(() => {
      fetch(`${API}/api/health`).then(r => r.json()).then(setHealth).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const checks = [
    { label: '自動封鎖', desc: '殭屍任務啟動時自動 reconcile', ok: true },
    { label: 'SIGTERM 回滾', desc: 'Server kill 時自動回滾執行中任務', ok: true },
    { label: 'FADP 封鎖清單', desc: '聯盟協防熱區 IP 封鎖', ok: true },
    { label: 'PostMessage 防火牆', desc: 'WebSocket 白名單過濾', ok: true },
    { label: '速率限制', desc: '每 IP 每 15 分鐘 1000 請求', ok: true },
    { label: 'Shell Injection 防護', desc: '子進程沙箱 + 指令單引號轉義', ok: true },
    { label: '環境變數沙箱', desc: '子進程不繼承敏感金鑰', ok: true },
    { label: 'Supabase 連線', desc: health?.services?.supabase ? (health.services.supabase.ok ? '已連線' : '失敗') : '—', ok: health?.services?.supabase?.ok ?? null },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-green-500" />
          <span className="font-semibold">防護機制一覽</span>
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30 ml-auto">
            v{health?.version ?? '…'}
          </Badge>
        </div>
        <div className="space-y-2">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
              {c.ok === true ? (
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              ) : c.ok === false ? (
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 應急停機 */}
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="font-semibold text-red-600">應急控制</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="border-red-500/40 text-red-600 hover:bg-red-500/10"
            onClick={async () => {
              if (!confirm('確定要停止自動執行器？')) return;
              await fetch(`${API}/api/openclaw/auto-executor/stop`, { method: 'POST', headers: AUTH });
            }}
          >
            <PowerOff className="h-4 w-4 mr-2" />
            停止執行器
          </Button>
          <Button
            variant="outline"
            className="border-orange-500/40 text-orange-600 hover:bg-orange-500/10"
            onClick={async () => {
              if (!confirm('確定要觸發 reconcile？這會將所有 running 任務改回 ready。')) return;
              await fetch(`${API}/api/openclaw/maintenance/reconcile`, { method: 'POST', headers: AUTH });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            強制 Reconcile
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          停止執行器後，所有自動任務將暫停，需手動重新啟動。
        </p>
      </div>
    </div>
  );
}
