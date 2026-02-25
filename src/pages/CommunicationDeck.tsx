/**
 * 通信甲板 — Communication Deck
 *
 * 社區多層空間管理介面：
 * L0 公開展示 → L1 基礎接觸 → L2 協作空間 → L3 信任區
 * 防火牆隔離，安全橋接代理
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Radio, Globe, Handshake, Settings2, Shield,
  Flame, GitMerge, Wifi, WifiOff, Activity, Users,
  MessageSquare, Lock, CheckCircle, AlertTriangle, Clock
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

// ─── 模擬即時狀態 ──────────────────────────────────────────

function useLayerStats() {
  const [stats, setStats] = useState({
    activeConnections: 12,
    heartbeatOk: true,
    messagesIn: 847,
    messagesOut: 231,
    blockedAttempts: 3,
    lastHeartbeat: new Date(),
  });

  useEffect(() => {
    const t = setInterval(() => {
      setStats(s => ({
        ...s,
        messagesIn: s.messagesIn + Math.floor(Math.random() * 3),
        messagesOut: s.messagesOut + Math.floor(Math.random() * 2),
        lastHeartbeat: new Date(),
        heartbeatOk: Math.random() > 0.05,
      }));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return stats;
}

// ─── 子頁面：層級詳情 ─────────────────────────────────────

function LayerDetail({ layerId }: { layerId: string }) {
  const layer = LAYERS.find(l => l.id === layerId);
  if (!layer) return <div className="p-6 text-muted-foreground">找不到層級：{layerId}</div>;

  const Icon = layer.icon;
  const statusColor = layer.status === 'active' ? '#10b981' : layer.status === 'standby' ? '#f59e0b' : '#6b7280';
  const statusLabel = layer.status === 'active' ? '運行中' : layer.status === 'standby' ? '待機' : '已鎖定';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/communication" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回通信甲板
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: layer.color + '20', border: `1px solid ${layer.color}40` }}>
          <Icon className="h-6 w-6" style={{ color: layer.color }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: layer.color }}>{layer.label}</h1>
          <p className="text-sm text-muted-foreground">{layer.desc}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border" style={{ color: statusColor, borderColor: statusColor + '40', background: statusColor + '10' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          {statusLabel}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">沙盒設定</p>
          <p className="text-xs font-mono text-foreground/80 break-all">{layer.sandbox}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground">允許事件</p>
          <div className="flex flex-wrap gap-1">
            {layer.events.map(e => (
              <span key={e} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: layer.color + '15', color: layer.color }}>
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>

      {layer.status === 'locked' && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <Lock className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-500">此層級需要審核才能開放</p>
            <p className="text-xs text-muted-foreground mt-0.5">提交申請至構想審核，待老蔡批准後啟用</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 子頁面：防火牆閘道 ───────────────────────────────────

function FirewallGate() {
  const stats = useLayerStats();

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
          { label: '攔截嘗試', value: stats.blockedAttempts, icon: AlertTriangle, color: '#f87171' },
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
    </div>
  );
}

// ─── 子頁面：安全橋接代理 ────────────────────────────────

function BridgeProxy() {
  const [syncLog] = useState([
    { time: '20:14:32', dir: '→', event: 'hub:task-assigned', layer: 'L2', ok: true },
    { time: '20:14:28', dir: '←', event: 'task-updated', layer: 'L2', ok: true },
    { time: '20:14:15', dir: '←', event: 'resource-request', layer: 'L1', ok: false },
    { time: '20:13:57', dir: '→', event: 'hub:status-update', layer: 'L1', ok: true },
    { time: '20:13:40', dir: '←', event: 'bridge-sync', layer: 'L3', ok: true },
  ]);

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

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-medium">橋接日誌</p>
          <span className="flex items-center gap-1 text-[10px] text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            即時監聽中
          </span>
        </div>
        <div className="divide-y">
          {syncLog.map((log, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs font-mono">
              <span className="text-muted-foreground">{log.time}</span>
              <span className={log.dir === '→' ? 'text-blue-400' : 'text-purple-400'}>{log.dir}</span>
              <span className="flex-1 text-foreground/80">{log.event}</span>
              <span className="text-muted-foreground">{log.layer}</span>
              {log.ok
                ? <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                : <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
            </div>
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
        {LAYERS.map(layer => {
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
          <div>
            <p className="font-medium text-sm">防火牆閘道</p>
            <p className="text-xs text-muted-foreground">出入站白名單 · 心跳偵測 · 攔截記錄</p>
          </div>
        </Link>
        <Link to="/center/communication/bridge" className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors flex items-center gap-3">
          <GitMerge className="h-8 w-8 text-emerald-400" />
          <div>
            <p className="font-medium text-sm">安全橋接代理</p>
            <p className="text-xs text-muted-foreground">postMessage 清洗 · 核心↔社區橋接</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─── 主路由元件 ───────────────────────────────────────────

export default function CommunicationDeck() {
  const { module } = useParams<{ module?: string }>();

  if (module === 'firewall') return <FirewallGate />;
  if (module === 'bridge') return <BridgeProxy />;
  if (module && MODULE_ROUTES[module]) return <LayerDetail layerId={module} />;

  return <CommunicationOverview />;
}
