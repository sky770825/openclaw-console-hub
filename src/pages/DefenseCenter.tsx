/**
 * 防衛中心 — Defense Center
 *
 * 防火牆管理、威脅偵測、存取記錄、入侵防禦
 * 這是核心系統的第二道防火牆控制台。
 */

import { useState } from 'react';
import { Shield, Flame, Activity, Eye, Lock, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

// ─── 模擬資料（未來接後端 API）───

interface FirewallRule {
  id: string;
  name: string;
  layer: string;
  status: 'active' | 'inactive' | 'alert';
  blockedCount: number;
  lastTriggered: string;
}

interface ThreatEvent {
  id: string;
  type: 'intrusion' | 'scan' | 'anomaly' | 'blocked';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  target: string;
  timestamp: string;
  status: 'detected' | 'blocked' | 'investigating';
  description: string;
}

interface AccessRecord {
  id: string;
  user: string;
  action: 'login' | 'logout' | 'access' | 'denied' | 'export';
  target: string;
  timestamp: string;
  ip: string;
  result: 'success' | 'denied' | 'flagged';
}

const MOCK_FIREWALL_RULES: FirewallRule[] = [
  { id: 'fw1', name: '核心防線（L4 閘門）', layer: 'L4', status: 'active', blockedCount: 0, lastTriggered: '-' },
  { id: 'fw2', name: '信任區閘道（L3）', layer: 'L3', status: 'inactive', blockedCount: 0, lastTriggered: '-' },
  { id: 'fw3', name: '協作區閘道（L2）', layer: 'L2', status: 'active', blockedCount: 3, lastTriggered: '2 小時前' },
  { id: 'fw4', name: '接觸區閘道（L1）', layer: 'L1', status: 'active', blockedCount: 12, lastTriggered: '15 分鐘前' },
  { id: 'fw5', name: '公開展示防護（L0）', layer: 'L0', status: 'active', blockedCount: 47, lastTriggered: '3 分鐘前' },
  { id: 'fw6', name: '資料外帶攔截', layer: '全域', status: 'active', blockedCount: 8, lastTriggered: '1 小時前' },
];

const MOCK_THREATS: ThreatEvent[] = [
  { id: 't1', type: 'blocked', severity: 'low', source: '外部 IP', target: 'L0 公開層', timestamp: '14:32', status: 'blocked', description: '自動化掃描偵測，已攔截' },
  { id: 't2', type: 'anomaly', severity: 'medium', source: '未知來源', target: 'L1 接觸區', timestamp: '13:15', status: 'investigating', description: '異常高頻存取，正在調查' },
  { id: 't3', type: 'blocked', severity: 'low', source: '社區使用者', target: '核心 API', timestamp: '12:08', status: 'blocked', description: '未授權嘗試存取核心端點' },
  { id: 't4', type: 'scan', severity: 'low', source: '定時掃描', target: '全層級', timestamp: '12:00', status: 'detected', description: '定期安全掃描完成，無異常' },
];

const MOCK_ACCESS_LOG: AccessRecord[] = [
  { id: 'a1', user: '老蔡', action: 'login', target: '核心防線', timestamp: '14:30', ip: '127.0.0.1', result: 'success' },
  { id: 'a2', user: 'Claude Agent', action: 'access', target: 'Agent 指揮板', timestamp: '14:28', ip: 'internal', result: 'success' },
  { id: 'a3', user: '未知', action: 'denied', target: '核心 API', timestamp: '14:15', ip: '外部', result: 'denied' },
  { id: 'a4', user: '老蔡', action: 'export', target: '任務資料', timestamp: '13:45', ip: '127.0.0.1', result: 'success' },
  { id: 'a5', user: '訪客', action: 'access', target: 'L0 公開層', timestamp: '13:30', ip: '外部', result: 'success' },
];

// ─── UI ───

const SEVERITY_STYLE: Record<string, string> = {
  low: 'text-blue-500 bg-blue-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  critical: 'text-red-500 bg-red-500/10',
};

const STATUS_ICON: Record<string, typeof CheckCircle> = {
  active: CheckCircle,
  inactive: Clock,
  alert: AlertTriangle,
};

const RESULT_STYLE: Record<string, string> = {
  success: 'text-green-500',
  denied: 'text-red-500',
  flagged: 'text-yellow-500',
};

type Tab = 'firewall' | 'threats' | 'access' | 'intrusion';

export default function DefenseCenter() {
  const [tab, setTab] = useState<Tab>('firewall');

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'firewall', label: '防火牆', icon: Flame },
    { id: 'threats', label: '威脅偵測', icon: Eye },
    { id: 'access', label: '存取記錄', icon: Activity },
    { id: 'intrusion', label: '入侵防禦', icon: Lock },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-6 w-6 text-red-500" />
          防衛中心
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          防火牆管理、威脅偵測、存取記錄、入侵防禦
        </p>
      </div>

      {/* 總覽卡片 */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="防火牆規則" value={MOCK_FIREWALL_RULES.filter(r => r.status === 'active').length + '/' + MOCK_FIREWALL_RULES.length} sub="啟用中" color="text-green-500" />
        <StatCard label="今日攔截" value={MOCK_FIREWALL_RULES.reduce((s, r) => s + r.blockedCount, 0).toString()} sub="次" color="text-red-500" />
        <StatCard label="威脅事件" value={MOCK_THREATS.length.toString()} sub={`待處理 ${MOCK_THREATS.filter(t => t.status === 'investigating').length}`} color="text-yellow-500" />
        <StatCard label="存取記錄" value={MOCK_ACCESS_LOG.length.toString()} sub="筆（今日）" color="text-blue-500" />
      </div>

      {/* Tab 列 */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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
      {tab === 'firewall' && <FirewallPanel />}
      {tab === 'threats' && <ThreatPanel />}
      {tab === 'access' && <AccessPanel />}
      {tab === 'intrusion' && <IntrusionPanel />}
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

function FirewallPanel() {
  return (
    <div className="space-y-3">
      {MOCK_FIREWALL_RULES.map(rule => {
        const Icon = STATUS_ICON[rule.status] || CheckCircle;
        return (
          <div key={rule.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${rule.status === 'active' ? 'text-green-500' : rule.status === 'alert' ? 'text-red-500' : 'text-muted-foreground/40'}`} />
              <div>
                <p className="text-sm font-medium">{rule.name}</p>
                <p className="text-xs text-muted-foreground">層級：{rule.layer}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono">{rule.blockedCount} 攔截</p>
              <p className="text-xs text-muted-foreground">最近觸發：{rule.lastTriggered}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ThreatPanel() {
  return (
    <div className="space-y-3">
      {MOCK_THREATS.map(threat => (
        <div key={threat.id} className="flex items-start gap-3 rounded-lg border bg-card p-4">
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${SEVERITY_STYLE[threat.severity]}`}>
            {threat.severity}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{threat.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {threat.source} → {threat.target} · {threat.timestamp}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            threat.status === 'blocked' ? 'bg-green-500/10 text-green-500' :
            threat.status === 'investigating' ? 'bg-yellow-500/10 text-yellow-500' :
            'bg-blue-500/10 text-blue-500'
          }`}>
            {threat.status === 'blocked' ? '已攔截' : threat.status === 'investigating' ? '調查中' : '已偵測'}
          </span>
        </div>
      ))}
    </div>
  );
}

function AccessPanel() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">時間</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">使用者</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">動作</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">目標</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">來源</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">結果</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {MOCK_ACCESS_LOG.map(rec => (
            <tr key={rec.id} className="hover:bg-muted/30">
              <td className="px-4 py-2.5 font-mono text-xs">{rec.timestamp}</td>
              <td className="px-4 py-2.5">{rec.user}</td>
              <td className="px-4 py-2.5 text-xs">{rec.action}</td>
              <td className="px-4 py-2.5 text-xs">{rec.target}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{rec.ip}</td>
              <td className={`px-4 py-2.5 text-xs font-medium ${RESULT_STYLE[rec.result]}`}>
                {rec.result === 'success' ? '通過' : rec.result === 'denied' ? '拒絕' : '標記'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntrusionPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6 text-center">
        <Lock className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="text-lg font-medium">入侵防禦系統運作正常</p>
        <p className="text-sm text-muted-foreground mt-1">目前無偵測到入侵嘗試</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-left">
          <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3">
            <p className="text-xs text-green-600 font-medium">自動封鎖</p>
            <p className="text-sm mt-1">啟用中 — 異常存取自動攔截</p>
          </div>
          <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3">
            <p className="text-xs text-green-600 font-medium">速率限制</p>
            <p className="text-sm mt-1">啟用中 — 每 IP 每分鐘 60 請求</p>
          </div>
          <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3">
            <p className="text-xs text-green-600 font-medium">地理封鎖</p>
            <p className="text-sm mt-1">未啟用 — 可依需求設定</p>
          </div>
        </div>
      </div>
    </div>
  );
}
