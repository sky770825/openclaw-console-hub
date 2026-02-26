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

// ─── L0 公開展示詳情 ──────────────────────────────────────

function L0ShowcasePage() {
  const [visitors] = useState(1247);
  const [pageViews] = useState(3891);

  const showcaseItems = [
    { title: '星艦指揮中心 v2.1', type: '產品展示', views: 892, status: 'live', updated: '今日' },
    { title: 'MDCI 文明指數系統', type: '功能介紹', views: 634, status: 'live', updated: '2d前' },
    { title: 'n8n 自動化工作流展示', type: '技術展示', views: 521, status: 'live', updated: '3d前' },
    { title: 'AI 任務派工演示', type: '演示影片', views: 478, status: 'live', updated: '5d前' },
    { title: 'Ollama 本地 AI 整合', type: '技術文章', views: 312, status: 'live', updated: '1w前' },
    { title: '9 甲板架構設計說明', type: '設計文件', views: 267, status: 'draft', updated: '今日' },
  ];

  const recentVisitors = [
    { ip: '118.xxx.xxx.12', region: '台北', device: 'Chrome / macOS', time: '剛才', pages: 4 },
    { ip: '49.xxx.xxx.87', region: '高雄', device: 'Safari / iPhone', time: '3分前', pages: 2 },
    { ip: '203.xxx.xxx.45', region: '台中', device: 'Firefox / Windows', time: '7分前', pages: 6 },
    { ip: '1.xxx.xxx.98', region: '新竹', device: 'Chrome / Android', time: '12分前', pages: 3 },
    { ip: '61.xxx.xxx.134', region: '新加坡', device: 'Edge / Windows', time: '18分前', pages: 1 },
  ];

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

      {/* 流量統計 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '今日訪客', value: visitors.toLocaleString(), icon: Users, color: '#10b981' },
          { label: '總頁面瀏覽', value: pageViews.toLocaleString(), icon: Eye, color: '#22d3ee' },
          { label: '展示項目', value: showcaseItems.length, icon: FileText, color: '#f59e0b' },
          { label: '平均停留', value: '3:24', icon: Clock, color: '#a78bfa' },
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

      {/* 展示內容清單 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-medium">公開展示內容</p>
          <span className="text-[10px] text-muted-foreground">sandbox: allow-scripts allow-popups</span>
        </div>
        <div className="divide-y">
          {showcaseItems.map((item, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">{item.type} · {item.views} 次瀏覽 · 更新 {item.updated}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.status === 'live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                {item.status === 'live' ? '已發布' : '草稿'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 最近訪客 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">即時訪客紀錄</p>
        </div>
        <div className="divide-y">
          {recentVisitors.map((v, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] text-emerald-400 font-bold">{i + 1}</span>
              <div className="flex-1">
                <p className="font-mono text-foreground/80">{v.ip}</p>
                <p className="text-muted-foreground">{v.device}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">{v.region}</p>
                <p className="text-muted-foreground/60">{v.pages} 頁 · {v.time}</p>
              </div>
            </div>
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

function L1ContactPage() {
  const contacts = [
    { name: '未知用戶-A8F2', action: '提交聯絡表單', topic: '合作詢問', time: '5分前', status: 'pending' },
    { name: '未知用戶-C3D7', action: '瀏覽技術文章', topic: 'Ollama 整合', time: '12分前', status: 'viewing' },
    { name: '未知用戶-E9B1', action: '申請協作者', topic: 'AI 開發', time: '28分前', status: 'reviewing' },
    { name: '未知用戶-F4A6', action: '提交表單', topic: '技術支援', time: '1h前', status: 'replied' },
    { name: '未知用戶-K2M8', action: '申請協作者', topic: 'DevOps 工程', time: '3h前', status: 'approved' },
  ];

  const statusCfg: Record<string, { color: string; label: string }> = {
    pending: { color: '#f59e0b', label: '待處理' },
    viewing: { color: '#22d3ee', label: '瀏覽中' },
    reviewing: { color: '#a78bfa', label: '審核中' },
    replied: { color: '#10b981', label: '已回覆' },
    approved: { color: '#10b981', label: '已批准' },
  };

  const formStats = [
    { label: '今日提交', value: 8, color: '#22d3ee' },
    { label: '待審核', value: 3, color: '#f59e0b' },
    { label: '本週批准', value: 2, color: '#10b981' },
  ];

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
        {formStats.map(s => (
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
          {contacts.map((c, i) => {
            const cfg = statusCfg[c.status];
            return (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-[10px] text-cyan-400 font-mono font-bold">{c.name.slice(-2)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.action} · 主題：{c.topic}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.color + '15' }}>{cfg.label}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{c.time}</p>
                </div>
              </div>
            );
          })}
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
  const [taskStats] = useState({ created: 18, inProgress: 6, completed: 42, blocked: 1 });

  const collaborators = [
    { id: 'COL-001', name: '協作者 Alpha', level: 'L2', tasks: 14, score: 92, lastActive: '1h前', online: true },
    { id: 'COL-002', name: '協作者 Beta', level: 'L2', tasks: 8, score: 87, lastActive: '30m前', online: true },
    { id: 'COL-003', name: '合作夥伴 Delta', level: 'L3', tasks: 31, score: 97, lastActive: '剛才', online: true },
    { id: 'COL-004', name: '協作者 Gamma', level: 'L2', tasks: 5, score: 81, lastActive: '3h前', online: false },
    { id: 'COL-005', name: '技術夥伴 Epsilon', level: 'L2', tasks: 9, score: 89, lastActive: '2h前', online: false },
  ];

  const recentTasks = [
    { id: 'T-1482', title: '整合 n8n 週報自動化', assignee: '協作者 Alpha', status: 'completed', priority: 'high' },
    { id: 'T-1483', title: '修復 Telegram Bot 心跳', assignee: '協作者 Beta', status: 'in-progress', priority: 'high' },
    { id: 'T-1484', title: 'API 文件更新', assignee: '合作夥伴 Delta', status: 'in-progress', priority: 'medium' },
    { id: 'T-1485', title: '資料庫索引最佳化', assignee: '協作者 Gamma', status: 'pending', priority: 'medium' },
    { id: 'T-1486', title: 'Supabase RLS 規則審查', assignee: '技術夥伴 Epsilon', status: 'pending', priority: 'low' },
  ];

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

      {/* 近期任務 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">協作任務</p>
        </div>
        <div className="divide-y">
          {recentTasks.map(t => {
            const cfg = statusCfg[t.status];
            return (
              <div key={t.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                <span className="font-mono text-muted-foreground w-16">{t.id}</span>
                <div className="flex-1">
                  <p className="text-sm text-foreground/90">{t.title}</p>
                  <p className="text-muted-foreground">{t.assignee}</p>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.priority === 'high' ? 'text-red-400 bg-red-500/10' : t.priority === 'medium' ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400 bg-gray-500/10'}`}>{t.priority}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ color: cfg.color, background: cfg.color + '15' }}>{cfg.label}</span>
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
  const [syncLog, setSyncLog] = useState([
    { time: '20:51:18', dir: '→', event: 'hub:task-assigned', layer: 'L2', ok: true },
    { time: '20:49:44', dir: '←', event: 'task-updated', layer: 'L2', ok: true },
    { time: '20:47:31', dir: '←', event: 'resource-request', layer: 'L1', ok: false },
    { time: '20:45:12', dir: '→', event: 'hub:status-update', layer: 'L1', ok: true },
    { time: '20:43:08', dir: '←', event: 'bridge-sync', layer: 'L3', ok: true },
    { time: '20:41:55', dir: '→', event: 'hub:review-result', layer: 'L2', ok: true },
    { time: '20:39:22', dir: '←', event: 'task-created', layer: 'L2', ok: true },
    { time: '20:37:04', dir: '→', event: 'hub:task-assigned', layer: 'L2', ok: true },
  ]);

  useEffect(() => {
    const t = setInterval(() => {
      const events = ['hub:task-assigned', 'task-updated', 'hub:status-update', 'hub:review-result'];
      const layers = ['L1', 'L2', 'L3'];
      const dirs = ['→', '←'];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      setSyncLog(prev => [{
        time: timeStr,
        dir: dirs[Math.floor(Math.random() * dirs.length)],
        event: events[Math.floor(Math.random() * events.length)],
        layer: layers[Math.floor(Math.random() * layers.length)],
        ok: Math.random() > 0.1,
      }, ...prev.slice(0, 9)]);
    }, 5000);
    return () => clearInterval(t);
  }, []);

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
          { label: '今日橋接', value: 284, color: '#10b981', icon: Zap },
          { label: '成功率', value: '97.2%', color: '#22d3ee', icon: TrendingUp },
          { label: '平均延遲', value: '12ms', color: '#a78bfa', icon: Activity },
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
        {[
          { id: 'l0', label: 'L0 公開展示', icon: Globe, color: '#10b981', desc: '外部接觸第一線，純展示沙盒', status: 'active', stat: '1,247 訪客/日', events: ['heartbeat'] },
          { id: 'l1', label: 'L1 基礎接觸', icon: Handshake, color: '#22d3ee', desc: '可提交表單，低線接觸層級', status: 'active', stat: '8 表單/今日', events: ['heartbeat', 'nav-request'] },
          { id: 'l2', label: 'L2 協作空間', icon: Settings2, color: '#f59e0b', desc: '可呼叫社區 API，任務協作層', status: 'standby', stat: '5 名協作者', events: ['heartbeat', 'nav-request', 'task-created', 'task-updated'] },
          { id: 'l3', label: 'L3 信任區', icon: Shield, color: '#a78bfa', desc: '完整社區功能，審核後開放', status: 'locked', stat: '3 信任成員', events: ['heartbeat', 'nav-request', 'task-created', 'task-updated', 'resource-request', 'bridge-sync'] },
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
