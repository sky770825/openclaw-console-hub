/**
 * 通信甲板 — Communication Deck
 *
 * 社區多層空間管理介面：
 * L0 公開展示 → L1 基礎接觸 → L2 協作空間 → L3 信任區
 * 防火牆隔離，安全橋接代理
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFederationPostMessageGuard } from '../hooks/useFederationPostMessageGuard';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Radio, Globe, Handshake, Settings2, Shield,
  Flame, GitMerge, Wifi, WifiOff, Activity, Users,
  MessageSquare, Lock, CheckCircle, AlertTriangle, Clock,
  Eye, UserCheck, Send, FileText, TrendingUp, Zap
} from 'lucide-react';

// ─── 層級定義 ─────────────────────────────────────────────

const LAYERS = [
  {
    id: 'l0', level: 0, label: 'L0 公開展示', icon: Globe,
    color: '#10b981', desc: '外部接觸第一線，純展示沙盒',
    sandbox: 'allow-scripts allow-popups',
    events: ['community:heartbeat'],
    status: 'active',
  },
  {
    id: 'l1', level: 1, label: 'L1 基礎接觸', icon: Handshake,
    color: '#22d3ee', desc: '可提交表單，低線接觸層級',
    sandbox: 'allow-scripts allow-popups allow-forms',
    events: ['heartbeat', 'nav-request'],
    status: 'active',
  },
  {
    id: 'l2', level: 2, label: 'L2 協作空間', icon: Settings2,
    color: '#f59e0b', desc: '可呼叫社區 API，任務協作層',
    sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups',
    events: ['heartbeat', 'nav-request', 'task-created', 'task-updated'],
    status: 'standby',
  },
  {
    id: 'l3', level: 3, label: 'L3 信任區', icon: Shield,
    color: '#a78bfa', desc: '完整社區功能，審核後開放',
    sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals',
    events: ['heartbeat', 'nav-request', 'task-created', 'task-updated', 'resource-request', 'bridge-sync'],
    status: 'locked',
  },
];

const MODULE_ROUTES: Record<string, string> = {
  l0: 'l0', l1: 'l1', l2: 'l2', l3: 'l3', firewall: 'firewall', bridge: 'bridge',
};

// ─── API 常數 ───────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3011';
const API_AUTH = { 'Authorization': `Bearer ${import.meta.env.VITE_OPENCLAW_API_KEY || ''}`, 'Content-Type': 'application/json' };

// ─── 真實系統狀態（從 /api/health + /api/federation/members） ──

function useLayerStats() {
  const [stats, setStats] = useState({
    activeConnections: 0,
    heartbeatOk: false,
    messagesIn: 0,
    messagesOut: 0,
    blockedAttempts: 0,
    lastHeartbeat: new Date(),
  });

  const load = useCallback(async () => {
    try {
      const [healthRes, membersRes] = await Promise.all([
        fetch(`${API_BASE}/api/health`, { headers: API_AUTH }),
        fetch(`${API_BASE}/api/federation/members`, { headers: API_AUTH }),
      ]);
      const health = await healthRes.json();
      const members = await membersRes.json();
      const activeMembers = (members.members || []).filter((m: any) => m.status === 'active').length;
      const blocklist = await fetch(`${API_BASE}/api/federation/blocklist`, { headers: API_AUTH }).then(r => r.json()).catch(() => ({ blocklist: [] }));
      setStats({
        activeConnections: health.services?.websocket?.totalConnections ?? 0,
        heartbeatOk: health.ok === true,
        messagesIn: activeMembers,
        messagesOut: (members.members || []).length,
        blockedAttempts: (blocklist.blocklist || []).filter((b: any) => b.status === 'active').length,
        lastHeartbeat: new Date(),
      });
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  return stats;
}

// ─── L0 公開展示詳情 ──────────────────────────────────────

function L0ShowcasePage() {
  const [health, setHealth] = useState<any>(null);
  const [activityLines, setActivityLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/health`, { headers: API_AUTH }).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/openclaw/activity-log?limit=10`, { headers: API_AUTH }).then(r => r.json()).catch(() => ({ lines: [] })),
    ]).then(([h, a]) => {
      setHealth(h);
      setActivityLines((a.lines || []).reverse().slice(0, 6));
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link to="/center/communication" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回通信甲板
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#10b98120', border: '1px solid #10b98140' }}>
          <Globe className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-emerald-400">L0 公開展示</h1>
          <p className="text-sm text-muted-foreground">外部接觸第一線 · 純展示沙盒 · 最低權限</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border" style={{ color: '#10b981', borderColor: '#10b98140', background: '#10b98110' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          運行中
        </div>
      </div>

      {/* 系統狀態統計（真實） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Server 版本', value: loading ? '…' : health ? `v${health.version}` : '離線', icon: Activity, color: health?.ok ? '#10b981' : '#ef4444' },
          { label: 'Uptime', value: loading ? '…' : health ? `${Math.round((health.uptime || 0) / 60)}m` : '—', icon: Clock, color: '#22d3ee' },
          { label: 'Heap 使用', value: loading ? '…' : health ? `${health.memory?.heapUsed ?? '?'} MB` : '—', icon: TrendingUp, color: '#f59e0b' },
          { label: '活動日誌', value: loading ? '…' : String(activityLines.length), icon: FileText, color: '#a78bfa' },
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

      {/* 近期活動日誌（真實） */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-medium">近期活動日誌</p>
          <span className="text-[10px] text-muted-foreground">源自 /api/openclaw/activity-log</span>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="px-4 py-6 text-xs text-muted-foreground text-center">載入中…</div>
          ) : activityLines.length === 0 ? (
            <div className="px-4 py-6 text-xs text-muted-foreground text-center">尚無活動記錄</div>
          ) : activityLines.map((line, i) => (
            <div key={i} className="px-4 py-2.5 text-[11px] font-mono text-foreground/70 break-all">{line}</div>
          ))}
        </div>
      </div>

      {/* 沙盒設定 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">沙盒設定</p>
          <p className="text-xs font-mono text-foreground/80 break-all">allow-scripts allow-popups</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground">允許事件</p>
          <div className="flex flex-wrap gap-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: '#10b98115', color: '#10b981' }}>community:heartbeat</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── L1 基礎接觸詳情 ──────────────────────────────────────

interface CommunityApplicationRow {
  id: string;
  name: string;
  topic?: string | null;
  channel?: string | null;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'replied';
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return '剛剛';
  if (diffMin < 60) return `${diffMin} 分前`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} 小時前`;
  const diffD = Math.round(diffH / 24);
  return `${diffD} 天前`;
}

function L1ContactPage() {
  const [apps, setApps] = useState<CommunityApplicationRow[]>([]);
  const [stats, setStats] = useState<{ today: number; pending: number; approvedThisWeek: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusCfg: Record<string, { color: string; label: string }> = {
    pending: { color: '#f59e0b', label: '待處理' },
    approved: { color: '#10b981', label: '已批准' },
    replied: { color: '#22c55e', label: '已回覆' },
    rejected: { color: '#ef4444', label: '已拒絕' },
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [appsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/api/community/applications?limit=20`, { headers: API_AUTH }),
          fetch(`${API_BASE}/api/community/contact-stats`, { headers: API_AUTH }),
        ]);
        if (!appsRes.ok) throw new Error(`apps HTTP ${appsRes.status}`);
        if (!statsRes.ok) throw new Error(`stats HTTP ${statsRes.status}`);
        const appsJson = await appsRes.json();
        const statsJson = await statsRes.json();
        if (cancelled) return;
        setApps(
          (appsJson.applications || []).map((a: any) => ({
            id: String(a.id),
            name: String(a.name || '未知用戶'),
            topic: a.topic ?? null,
            channel: a.channel ?? null,
            created_at: String(a.created_at),
            status: (a.status as CommunityApplicationRow['status']) || 'pending',
          }))
        );
        setStats({
          today: statsJson.today ?? 0,
          pending: statsJson.pending ?? 0,
          approvedThisWeek: statsJson.approvedThisWeek ?? 0,
        });
      } catch (e) {
        if (!cancelled) {
          setError('目前尚無真實接觸資料，以下為示意數據');
          const fallbackApps: CommunityApplicationRow[] = [
            {
              id: 'demo-1',
              name: '未知用戶-A8F2',
              topic: '合作詢問',
              channel: '表單',
              created_at: new Date(Date.now() - 5 * 60000).toISOString(),
              status: 'pending',
            },
            {
              id: 'demo-2',
              name: '未知用戶-C3D7',
              topic: 'Ollama 整合',
              channel: '網站',
              created_at: new Date(Date.now() - 12 * 60000).toISOString(),
              status: 'replied',
            },
          ];
          setApps(fallbackApps);
          setStats({ today: 8, pending: 3, approvedThisWeek: 2 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link to="/center/communication" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回通信甲板
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#22d3ee20', border: '1px solid #22d3ee40' }}>
          <Handshake className="h-6 w-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-cyan-400">L1 基礎接觸</h1>
          <p className="text-sm text-muted-foreground">低線接觸層 · 表單提交 · 協作者申請入口</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border" style={{ color: '#22d3ee', borderColor: '#22d3ee40', background: '#22d3ee10' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          運行中
        </div>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '今日提交', value: stats ? stats.today : 0, color: '#22d3ee' },
          { label: '待審核', value: stats ? stats.pending : 0, color: '#f59e0b' },
          { label: '本週批准', value: stats ? stats.approvedThisWeek : 0, color: '#10b981' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 接觸活動 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-medium">接觸活動紀錄</p>
          <span className="text-[10px] text-muted-foreground">sandbox: allow-forms</span>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="px-4 py-6 text-xs text-muted-foreground text-center">載入中…</div>
          ) : apps.length === 0 ? (
            <div className="px-4 py-6 text-xs text-muted-foreground text-center">
              目前尚無接觸紀錄
            </div>
          ) : (
            apps.map((c, i) => {
              const cfg = statusCfg[c.status] ?? { color: '#64748b', label: c.status };
              return (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-[10px] text-cyan-400 font-mono font-bold">
                    {c.name.slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {c.topic ? `主題：${c.topic}` : '未填主題'}
                      {c.channel ? ` · 來源：${c.channel}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ color: cfg.color, background: cfg.color + '30' }}
                    >
                      {cfg.label}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatRelativeTime(c.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 允許事件 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">沙盒設定</p>
          <p className="text-xs font-mono text-foreground/80 break-all">allow-scripts allow-popups allow-forms</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground">允許事件</p>
          <div className="flex flex-wrap gap-1">
            {['heartbeat', 'nav-request'].map(e => (
              <span key={e} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: '#22d3ee15', color: '#22d3ee' }}>{e}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── L2 協作空間詳情 ──────────────────────────────────────

function L2CollabPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/openclaw/tasks?limit=200`, { headers: API_AUTH })
      .then(r => r.json())
      .then(d => { setTasks(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const taskStats = {
    created: tasks.length,
    inProgress: tasks.filter(t => t.status === 'running' || t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'done' || t.status === 'completed').length,
    blocked: tasks.filter(t => t.status === 'blocked' || t.status === 'needs_review').length,
  };

  // 真實 owner 統計（排除系統 owner）
  const sysOwners = new Set(['老蔡', '小蔡', 'system', 'System', 'NEUXA', 'auto']);
  const ownerMap: Record<string, { name: string; tasks: number; statuses: string[] }> = {};
  tasks.forEach(t => {
    const owner = t.owner || 'unknown';
    if (sysOwners.has(owner)) return;
    if (!ownerMap[owner]) ownerMap[owner] = { name: owner, tasks: 0, statuses: [] };
    ownerMap[owner].tasks++;
    ownerMap[owner].statuses.push(t.status);
  });
  const collaborators = Object.values(ownerMap).slice(0, 8);

  // 最近 8 個任務
  const recentTasks = [...tasks].slice(0, 8);

  const statusCfg: Record<string, { color: string; label: string }> = {
    completed: { color: '#10b981', label: '完成' },
    'in-progress': { color: '#f59e0b', label: '進行中' },
    pending: { color: '#6b7280', label: '待開始' },
    blocked: { color: '#f87171', label: '阻塞' },
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link to="/center/communication" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回通信甲板
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b20', border: '1px solid #f59e0b40' }}>
          <Settings2 className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-amber-400">L2 協作空間</h1>
          <p className="text-sm text-muted-foreground">協作者工作區 · 任務執行 · API 呼叫層</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border" style={{ color: '#f59e0b', borderColor: '#f59e0b40', background: '#f59e0b10' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          待機
        </div>
      </div>

      {/* 任務統計 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '已建立', value: taskStats.created, color: '#22d3ee' },
          { label: '進行中', value: taskStats.inProgress, color: '#f59e0b' },
          { label: '已完成', value: taskStats.completed, color: '#10b981' },
          { label: '阻塞', value: taskStats.blocked, color: '#f87171' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 協作者清單 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">活躍協作者</p>
        </div>
        <div className="divide-y">
          {collaborators.map(c => (
            <div key={c.id} className="px-4 py-2.5 flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">{c.name[3]}</div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${c.online ? 'bg-green-400' : 'bg-gray-500'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.level} · {c.tasks} 任務 · 最後活躍 {c.lastActive}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-amber-400">{c.score}</p>
                <p className="text-[10px] text-muted-foreground">信任分</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 近期任務（真實） */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex justify-between items-center">
          <p className="text-xs font-medium">最近任務</p>
          <span className="text-[10px] text-muted-foreground">源自 /api/openclaw/tasks</span>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="px-4 py-6 text-xs text-muted-foreground text-center">載入中…</div>
          ) : recentTasks.length === 0 ? (
            <div className="px-4 py-6 text-xs text-muted-foreground text-center">尚無任務</div>
          ) : recentTasks.map(t => {
            const statusColor: Record<string, string> = { done: '#10b981', completed: '#10b981', running: '#f59e0b', in_progress: '#f59e0b', needs_review: '#f87171', blocked: '#f87171', ready: '#6b7280', pending: '#6b7280' };
            const col = statusColor[t.status] || '#6b7280';
            return (
              <div key={t.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                <span className="font-mono text-muted-foreground w-24 truncate">{t.id}</span>
                <div className="flex-1">
                  <p className="text-sm text-foreground/90 truncate">{t.name}</p>
                  <p className="text-muted-foreground">{t.owner || '—'}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ color: col, background: col + '18' }}>{t.status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 沙盒 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">沙盒設定</p>
          <p className="text-xs font-mono text-foreground/80 break-all">allow-scripts allow-same-origin allow-forms allow-popups</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground">允許事件</p>
          <div className="flex flex-wrap gap-1">
            {['heartbeat', 'nav-request', 'task-created', 'task-updated'].map(e => (
              <span key={e} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: '#f59e0b15', color: '#f59e0b' }}>{e}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── L3 信任區詳情 ──────────────────────────────────────────

function L3TrustedPage() {
  const members = [
    { id: 'T-001', name: '合作夥伴 Delta', role: '技術主任', projects: 8, clearance: 'L3-Full', since: '2024-11' },
    { id: 'T-002', name: '核心協作者 Zeta', role: '安全審查', projects: 5, clearance: 'L3-Security', since: '2025-03' },
    { id: 'T-003', name: '架構夥伴 Eta', role: '系統架構', projects: 3, clearance: 'L3-Arch', since: '2025-06' },
  ];

  const resources = [
    { title: '系統架構藍圖 v2.1', type: '機密文件', access: 'L3+', size: '4.2MB' },
    { title: '安全審計完整報告', type: '安全報告', access: 'L3-Security', size: '2.8MB' },
    { title: '部署金鑰管理手冊', type: '操作手冊', access: 'L3+', size: '1.1MB' },
    { title: 'Supabase 資料庫完整綱要', type: '技術文件', access: 'L3+', size: '892KB' },
    { title: '緊急事故應變程序', type: '程序文件', access: 'L3+', size: '456KB' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link to="/center/communication" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回通信甲板
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#a78bfa20', border: '1px solid #a78bfa40' }}>
          <Shield className="h-6 w-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-violet-400">L3 信任區</h1>
          <p className="text-sm text-muted-foreground">深度信任層 · 完整資源存取 · 需審核開放</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border" style={{ color: '#6b7280', borderColor: '#6b728040', background: '#6b728010' }}>
          <Lock className="h-3 w-3" />
          已鎖定
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
        <Lock className="h-5 w-5 text-yellow-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-yellow-500">此層級需要審核才能開放</p>
          <p className="text-xs text-muted-foreground mt-0.5">L3 信任區需滿足信任升級條件：信任分 &gt;95、任務完成率 &gt;90%、至少 3 個月活躍紀錄</p>
        </div>
      </div>

      {/* 信任成員 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">信任成員（{members.length} 人）</p>
        </div>
        <div className="divide-y">
          {members.map(m => (
            <div key={m.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-400">{m.name[3]}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-[10px] text-muted-foreground">{m.role} · {m.projects} 個專案 · 自 {m.since}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: '#a78bfa15', color: '#a78bfa' }}>{m.clearance}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 深度資源 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">受保護資源</p>
        </div>
        <div className="divide-y">
          {resources.map((r, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs opacity-60">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-foreground/70">{r.title}</p>
                <p className="text-muted-foreground">{r.type} · {r.size}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: '#a78bfa15', color: '#a78bfa' }}>{r.access}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 沙盒設定 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">沙盒設定</p>
          <p className="text-xs font-mono text-foreground/80 break-all">allow-scripts allow-same-origin allow-forms allow-popups allow-modals</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground">允許事件（解鎖後）</p>
          <div className="flex flex-wrap gap-1">
            {['heartbeat', 'nav-request', 'task-created', 'task-updated', 'resource-request', 'bridge-sync'].map(e => (
              <span key={e} className="px-2 py-0.5 rounded text-[10px] font-mono opacity-50" style={{ background: '#a78bfa15', color: '#a78bfa' }}>{e}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 子頁面：防火牆閘道 ───────────────────────────────────

// ─── 預設允許的 origin 白名單 ───────────────────────────────
const DEFAULT_ALLOWED_ORIGINS = [
  window.location.origin,  // 自身（localhost 或部署域名）
];

function FirewallGate() {
  const stats = useLayerStats();

  // postMessage 白名單（可即時編輯）
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>(DEFAULT_ALLOWED_ORIGINS);
  const [newOrigin, setNewOrigin] = useState('');
  // 攻擊日誌（真實資料）
  const [attackLog, setAttackLog] = useState<Array<{
    time: string; origin: string; reason: string;
  }>>([]);
  const attackLogRef = useRef(attackLog);
  attackLogRef.current = attackLog;

  const handleAttack = useCallback((origin: string, reason: string) => {
    const entry = {
      time: new Date().toLocaleTimeString('zh-TW'),
      origin: origin || '(unknown)',
      reason,
    };
    setAttackLog(prev => [entry, ...prev].slice(0, 20));
  }, []);

  const { blockedCount } = useFederationPostMessageGuard({
    allowedOrigins,
    enabled: true,
    onAttack: handleAttack,
  });

  function addOrigin() {
    const trimmed = newOrigin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      setAllowedOrigins(prev => [...prev, trimmed]);
    }
    setNewOrigin('');
  }

  function removeOrigin(origin: string) {
    setAllowedOrigins(prev => prev.filter(o => o !== origin));
  }

  const rules = [
    { dir: 'IN', event: 'community:heartbeat', action: 'ALLOW', layer: 'ALL' },
    { dir: 'IN', event: 'nav-request', action: 'ALLOW', layer: 'L1+' },
    { dir: 'IN', event: 'task-created', action: 'ALLOW', layer: 'L2+' },
    { dir: 'IN', event: 'resource-request', action: 'ALLOW', layer: 'L3' },
    { dir: 'IN', event: '*', action: 'BLOCK', layer: 'ALL' },
    { dir: 'OUT', event: 'hub:task-assigned', action: 'ALLOW', layer: 'L2+' },
    { dir: 'OUT', event: 'hub:review-result', action: 'ALLOW', layer: 'L2+' },
    { dir: 'OUT', event: 'hub:status-update', action: 'ALLOW', layer: 'L1+' },
    { dir: 'OUT', event: '*', action: 'BLOCK', layer: 'ALL' },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/communication" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回通信甲板
      </Link>

      <div className="flex items-center gap-3">
        <Flame className="h-7 w-7 text-orange-500" />
        <div>
          <h1 className="text-xl font-semibold">防火牆閘道</h1>
          <p className="text-sm text-muted-foreground">出入站訊息白名單控制</p>
        </div>
      </div>

      {/* 即時狀態 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '入站訊息', value: stats.messagesIn, icon: Activity, color: '#22d3ee' },
          { label: '出站訊息', value: stats.messagesOut, icon: MessageSquare, color: '#10b981' },
          { label: '攔截嘗試', value: blockedCount, icon: AlertTriangle, color: '#f87171' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* 心跳狀態 */}
      <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
        {stats.heartbeatOk
          ? <Wifi className="h-4 w-4 text-green-400" />
          : <WifiOff className="h-4 w-4 text-red-400" />}
        <span className="text-sm">{stats.heartbeatOk ? '心跳正常' : '心跳異常'}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          <Clock className="h-3 w-3 inline mr-1" />
          {stats.lastHeartbeat.toLocaleTimeString('zh-TW')}
        </span>
      </div>

      {/* 規則列表 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">防火牆規則</p>
        </div>
        <div className="divide-y">
          {rules.map((r, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${r.dir === 'IN' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                {r.dir}
              </span>
              <span className="font-mono text-foreground/80 flex-1">{r.event}</span>
              <span className="text-muted-foreground">{r.layer}</span>
              <span className={`px-2 py-0.5 rounded font-medium ${r.action === 'ALLOW' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {r.action}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Origin 白名單管理 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-medium">postMessage Origin 白名單</p>
          <span className="text-[10px] text-muted-foreground">{allowedOrigins.length} 個允許來源</span>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <input
              value={newOrigin}
              onChange={e => setNewOrigin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addOrigin()}
              placeholder="https://example.com"
              className="flex-1 text-xs bg-background border rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              onClick={addOrigin}
              className="px-3 py-1 text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded hover:bg-cyan-500/20 transition-colors"
            >
              加入
            </button>
          </div>
          <div className="space-y-1">
            {allowedOrigins.map(origin => (
              <div key={origin} className="flex items-center gap-2 text-xs">
                <CheckCircle className="h-3 w-3 text-green-400 shrink-0" />
                <span className="flex-1 font-mono text-foreground/80">{origin}</span>
                <button
                  onClick={() => removeOrigin(origin)}
                  className="text-red-400/60 hover:text-red-400 text-[10px] transition-colors"
                >
                  移除
                </button>
              </div>
            ))}
            {allowedOrigins.length === 0 && (
              <p className="text-[10px] text-red-400 px-1">⚠ 白名單為空，所有 postMessage 將被攔截</p>
            )}
          </div>
        </div>
      </div>

      {/* 即時攔截日誌 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-medium">即時攔截日誌</p>
          <span className="text-[10px] text-muted-foreground">本次會話 {blockedCount} 次</span>
        </div>
        <div className="divide-y max-h-40 overflow-y-auto">
          {attackLog.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">目前無攔截記錄 ✅</p>
          ) : attackLog.map((b, i) => (
            <div key={i} className="px-4 py-2 flex items-start gap-2 text-xs">
              <span className="text-muted-foreground font-mono shrink-0">{b.time}</span>
              <span className="text-red-400 font-mono shrink-0 max-w-[120px] truncate">{b.origin}</span>
              <span className="flex-1 text-foreground/70">{b.reason}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 子頁面：安全橋接代理 ────────────────────────────────

function BridgeProxy() {
  const [activityLines, setActivityLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [federationStatus, setFederationStatus] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [actRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/api/openclaw/activity-log?limit=20`, { headers: API_AUTH }),
        fetch(`${API_BASE}/api/federation/status`, { headers: API_AUTH }),
      ]);
      const act = await actRes.json();
      const status = await statusRes.json().catch(() => null);
      setActivityLines((act.lines || []).reverse().slice(0, 12));
      setFederationStatus(status);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/communication" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回通信甲板
      </Link>

      <div className="flex items-center gap-3">
        <GitMerge className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-xl font-semibold">安全橋接代理</h1>
          <p className="text-sm text-muted-foreground">核心 ↔ 社區訊息清洗代理（postMessage 白名單）</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '聯盟狀態', value: federationStatus?.ok ? 'OK' : loading ? '…' : '離線', color: federationStatus?.ok ? '#10b981' : '#ef4444', icon: Zap },
          { label: '成員數', value: loading ? '…' : String(federationStatus?.memberCount ?? 0), color: '#22d3ee', icon: TrendingUp },
          { label: '活動日誌', value: loading ? '…' : String(activityLines.length), color: '#a78bfa', icon: Activity },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-medium">活動日誌（真實）</p>
          <span className="flex items-center gap-1 text-[10px] text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            每 15 秒更新
          </span>
        </div>
        <div className="divide-y max-h-80 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-6 text-xs text-muted-foreground text-center">載入中…</div>
          ) : activityLines.length === 0 ? (
            <div className="px-4 py-6 text-xs text-muted-foreground text-center">尚無活動記錄</div>
          ) : activityLines.map((line, i) => (
            <div key={i} className="px-4 py-2 text-[11px] font-mono text-foreground/70 break-all">{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 通信甲板總覽 ─────────────────────────────────────────

function CommunicationOverview() {
  const stats = useLayerStats();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link to="/center" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回甲板總覽
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Radio className="h-6 w-6 text-emerald-400" />
            通信甲板
          </h1>
          <p className="text-sm text-muted-foreground mt-1">社區多層空間 L0–L3 · 防火牆隔離架構</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {stats.heartbeatOk
            ? <><Wifi className="h-4 w-4 text-green-400" /><span className="text-green-400">通信正常</span></>
            : <><WifiOff className="h-4 w-4 text-red-400" /><span className="text-red-400">通信異常</span></>}
        </div>
      </div>

      {/* 即時統計 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '活躍連線', value: stats.activeConnections, icon: Users, color: '#10b981' },
          { label: '入站訊息', value: stats.messagesIn, icon: Activity, color: '#22d3ee' },
          { label: '出站訊息', value: stats.messagesOut, icon: MessageSquare, color: '#a78bfa' },
          { label: '攔截嘗試', value: stats.blockedAttempts, icon: AlertTriangle, color: '#f87171' },
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

      {/* 四大層級 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { id: 'l0', label: 'L0 公開展示', icon: Globe, color: '#10b981', desc: '外部接觸第一線，純展示沙盒', status: 'active', stat: `WS: ${stats.activeConnections} 連線`, events: ['heartbeat'] },
          { id: 'l1', label: 'L1 基礎接觸', icon: Handshake, color: '#22d3ee', desc: '可提交表單，低線接觸層級', status: 'active', stat: '表單 / 申請', events: ['heartbeat', 'nav-request'] },
          { id: 'l2', label: 'L2 協作空間', icon: Settings2, color: '#f59e0b', desc: '可呼叫社區 API，任務協作層', status: 'standby', stat: `封鎖: ${stats.blockedAttempts}`, events: ['heartbeat', 'nav-request', 'task-created', 'task-updated'] },
          { id: 'l3', label: 'L3 信任區', icon: Shield, color: '#a78bfa', desc: '完整社區功能，審核後開放', status: 'locked', stat: `成員: ${stats.messagesOut}`, events: ['heartbeat', 'nav-request', 'task-created', 'task-updated', 'resource-request', 'bridge-sync'] },
        ].map(layer => {
          const Icon = layer.icon;
          const statusColor = layer.status === 'active' ? '#10b981' : layer.status === 'standby' ? '#f59e0b' : '#6b7280';
          const statusLabel = layer.status === 'active' ? '運行中' : layer.status === 'standby' ? '待機' : '已鎖定';
          return (
            <Link key={layer.id} to={`/center/communication/${layer.id}`} className="rounded-lg border bg-card p-4 hover:bg-accent/50 hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: layer.color + '20', border: `1px solid ${layer.color}30` }}>
                    <Icon className="h-4 w-4" style={{ color: layer.color }} />
                  </div>
                  <span className="font-medium text-sm" style={{ color: layer.color }}>{layer.label}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: statusColor, background: statusColor + '15' }}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{layer.desc}</p>
              <p className="text-xs font-medium mb-2" style={{ color: layer.color }}>{layer.stat}</p>
              <div className="flex flex-wrap gap-1">
                {layer.events.slice(0, 3).map(e => (
                  <span key={e} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: layer.color + '10', color: layer.color }}>
                    {e}
                  </span>
                ))}
                {layer.events.length > 3 && <span className="text-[9px] text-muted-foreground">+{layer.events.length - 3}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {/* 基礎設施 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/center/communication/firewall" className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors flex items-center gap-3">
          <Flame className="h-8 w-8 text-orange-500" />
          <div className="flex-1">
            <p className="font-medium text-sm">防火牆閘道</p>
            <p className="text-xs text-muted-foreground">出入站白名單 · 心跳偵測 · 攔截記錄</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-orange-500/10 text-orange-400">9 條規則</span>
        </Link>
        <Link to="/center/communication/bridge" className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors flex items-center gap-3">
          <GitMerge className="h-8 w-8 text-emerald-400" />
          <div className="flex-1">
            <p className="font-medium text-sm">安全橋接代理</p>
            <p className="text-xs text-muted-foreground">postMessage 清洗 · 核心↔社區橋接</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">284 今日</span>
        </Link>
      </div>

      {/* 最近通信事件 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-medium">最近通信事件</p>
          <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="divide-y">
          {[
            { time: '20:51', layer: 'L2', type: 'task-created', from: '協作者 Alpha', status: 'ok' },
            { time: '20:49', layer: 'L1', type: 'nav-request', from: '未知用戶-B4F1', status: 'ok' },
            { time: '20:47', layer: 'L1', type: 'resource-request', from: '未知用戶-E3K9', status: 'blocked' },
            { time: '20:45', layer: 'L2', type: 'task-updated', from: '協作者 Beta', status: 'ok' },
            { time: '20:43', layer: 'L0', type: 'heartbeat', from: 'system', status: 'ok' },
          ].map((e, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs">
              <span className="text-muted-foreground w-12">{e.time}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                color: e.layer === 'L0' ? '#10b981' : e.layer === 'L1' ? '#22d3ee' : e.layer === 'L2' ? '#f59e0b' : '#a78bfa',
                background: (e.layer === 'L0' ? '#10b981' : e.layer === 'L1' ? '#22d3ee' : e.layer === 'L2' ? '#f59e0b' : '#a78bfa') + '15',
              }}>{e.layer}</span>
              <span className="font-mono flex-1 text-foreground/80">{e.type}</span>
              <span className="text-muted-foreground">{e.from}</span>
              {e.status === 'ok'
                ? <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                : <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 主路由元件 ───────────────────────────────────────────

export default function CommunicationDeck() {
  const { module } = useParams<{ module?: string }>();

  if (module === 'l0') return <L0ShowcasePage />;
  if (module === 'l1') return <L1ContactPage />;
  if (module === 'l2') return <L2CollabPage />;
  if (module === 'l3') return <L3TrustedPage />;
  if (module === 'firewall') return <FirewallGate />;
  if (module === 'bridge') return <BridgeProxy />;

  return <CommunicationOverview />;
}
