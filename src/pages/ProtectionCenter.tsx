/**
 * 防護中心 — Protection Center
 *
 * 掃描掃毒、客戶防護、個資安全、客戶安全上線流程
 *
 * 流程：
 *   外部接觸 → 掃描掃毒 → 建立防護 → 個資確認 → 進入社交圈
 */

import { useState } from 'react';
import { Shield, Search, Lock, UserCheck, CheckCircle, Circle, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import { ONBOARDING_STEPS, type OnboardingStep } from '@/config/hubCenters';

type Tab = 'scanner' | 'privacy' | 'clients' | 'onboarding';

// ─── 模擬資料 ───

interface ScanResult {
  id: string;
  target: string;
  type: 'user' | 'data' | 'connection';
  timestamp: string;
  status: 'clean' | 'threat' | 'scanning';
  details: string;
}

interface ClientRecord {
  id: string;
  name: string;
  joinDate: string;
  shieldStatus: 'active' | 'pending' | 'expired';
  privacyScore: number;
  layer: string;
}

const MOCK_SCANS: ScanResult[] = [
  { id: 's1', target: '新接觸使用者 A', type: 'user', timestamp: '14:35', status: 'clean', details: '掃描完成，無威脅' },
  { id: 's2', target: '上傳檔案 report.pdf', type: 'data', timestamp: '14:20', status: 'clean', details: '檔案安全，無惡意程式' },
  { id: 's3', target: '外部 API 連線', type: 'connection', timestamp: '14:10', status: 'scanning', details: '正在掃描連線安全性...' },
  { id: 's4', target: '新接觸使用者 B', type: 'user', timestamp: '13:45', status: 'threat', details: '偵測到可疑行為模式，需人工審查' },
];

const MOCK_CLIENTS: ClientRecord[] = [
  { id: 'c1', name: '協作者 Alpha', joinDate: '2025-01', shieldStatus: 'active', privacyScore: 95, layer: 'L2' },
  { id: 'c2', name: '協作者 Beta', joinDate: '2025-02', shieldStatus: 'active', privacyScore: 88, layer: 'L1' },
  { id: 'c3', name: '新申請者 C', joinDate: '2025-02', shieldStatus: 'pending', privacyScore: 0, layer: '申請中' },
];

// ─── 元件 ───

export default function ProtectionCenter() {
  const [tab, setTab] = useState<Tab>('onboarding');

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'onboarding', label: '安全上線', icon: UserCheck },
    { id: 'scanner', label: '掃描掃毒', icon: Search },
    { id: 'privacy', label: '個資安全', icon: Lock },
    { id: 'clients', label: '客戶防護', icon: Shield },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-6 w-6 text-green-500" />
          防護中心
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          掃描掃毒、個資安全、客戶防護、安全上線流程
        </p>
      </div>

      {/* 總覽卡片 */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="掃描次數（今日）" value={MOCK_SCANS.length.toString()} color="text-blue-500" />
        <StatCard label="威脅偵測" value={MOCK_SCANS.filter(s => s.status === 'threat').length.toString()} color="text-red-500" />
        <StatCard label="受保護客戶" value={MOCK_CLIENTS.filter(c => c.shieldStatus === 'active').length.toString()} color="text-green-500" />
        <StatCard label="待上線" value={MOCK_CLIENTS.filter(c => c.shieldStatus === 'pending').length.toString()} color="text-yellow-500" />
      </div>

      {/* Tab */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'onboarding' && <OnboardingPanel />}
      {tab === 'scanner' && <ScannerPanel />}
      {tab === 'privacy' && <PrivacyPanel />}
      {tab === 'clients' && <ClientsPanel />}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

// ─── 安全上線流程 ───

function OnboardingPanel() {
  const [steps, setSteps] = useState<OnboardingStep[]>(() =>
    ONBOARDING_STEPS.map(s => ({ ...s }))
  );
  const [running, setRunning] = useState(false);

  const simulateOnboarding = async () => {
    setRunning(true);
    // 重設
    setSteps(ONBOARDING_STEPS.map(s => ({ ...s, status: 'pending' })));

    for (let i = 0; i < steps.length; i++) {
      // scanning
      setSteps(prev => prev.map((s, j) => j === i ? { ...s, status: 'scanning' } : s));
      await new Promise(r => setTimeout(r, 1200));
      // passed
      setSteps(prev => prev.map((s, j) => j === i ? { ...s, status: 'passed' } : s));
      await new Promise(r => setTimeout(r, 400));
    }
    setRunning(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">客戶安全上線流程</h3>
        <p className="text-xs text-muted-foreground mb-6">
          外部接觸者必須通過完整的安全檢查才能進入社交圈。每一步都是一道防線。
        </p>

        {/* 流程步驟 */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.id}>
              <div className="flex items-center gap-4">
                {/* 步驟圖示 */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  step.status === 'passed' ? 'bg-green-500 text-white' :
                  step.status === 'scanning' ? 'bg-yellow-500 text-white' :
                  step.status === 'failed' ? 'bg-red-500 text-white' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {step.status === 'passed' ? <CheckCircle className="h-5 w-5" /> :
                   step.status === 'scanning' ? <Loader2 className="h-5 w-5 animate-spin" /> :
                   step.status === 'failed' ? <AlertTriangle className="h-5 w-5" /> :
                   <Circle className="h-5 w-5" />}
                </div>

                {/* 步驟內容 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{step.icon}</span>
                    <span className="text-sm font-medium">{step.label}</span>
                    {step.status === 'passed' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">通過</span>
                    )}
                    {step.status === 'scanning' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500">檢查中</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>

              {/* 連接線 */}
              {i < steps.length - 1 && (
                <div className="ml-5 w-px h-6 bg-border" />
              )}
            </div>
          ))}
        </div>

        {/* 啟動按鈕 */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={simulateOnboarding}
            disabled={running}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            {running ? '上線流程進行中...' : '模擬客戶上線流程'}
          </button>
          {steps.every(s => s.status === 'passed') && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              所有檢查通過，可進入 L1 社交圈
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 掃描掃毒 ───

function ScannerPanel() {
  return (
    <div className="space-y-3">
      {MOCK_SCANS.map(scan => (
        <div key={scan.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
            scan.status === 'clean' ? 'bg-green-500/10' :
            scan.status === 'threat' ? 'bg-red-500/10' :
            'bg-yellow-500/10'
          }`}>
            {scan.status === 'clean' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
             scan.status === 'threat' ? <AlertTriangle className="h-4 w-4 text-red-500" /> :
             <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{scan.target}</p>
            <p className="text-xs text-muted-foreground">{scan.details}</p>
          </div>
          <div className="text-right">
            <span className={`text-xs px-2 py-0.5 rounded ${
              scan.status === 'clean' ? 'bg-green-500/10 text-green-500' :
              scan.status === 'threat' ? 'bg-red-500/10 text-red-500' :
              'bg-yellow-500/10 text-yellow-500'
            }`}>
              {scan.status === 'clean' ? '安全' : scan.status === 'threat' ? '威脅' : '掃描中'}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{scan.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 個資安全 ───

function PrivacyPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-green-500" />
          <h3 className="text-sm font-semibold">個資安全閘道</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SecurityFeature title="資料加密" status="啟用" description="所有個資以 AES-256 加密儲存" ok />
          <SecurityFeature title="存取控制" status="啟用" description="個資存取需 admin 以上權限" ok />
          <SecurityFeature title="傳輸加密" status="啟用" description="所有 API 通訊經 TLS 加密" ok />
          <SecurityFeature title="自動清除" status="啟用" description="過期個資 90 天後自動清除" ok />
          <SecurityFeature title="資料去識別化" status="啟用" description="匯出資料自動遮蔽敏感欄位" ok />
          <SecurityFeature title="稽核記錄" status="啟用" description="所有個資存取皆記錄在案" ok />
        </div>
      </div>
    </div>
  );
}

function SecurityFeature({ title, status, description, ok }: { title: string; status: string; description: string; ok: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${ok ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${ok ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {status}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

// ─── 客戶防護 ───

function ClientsPanel() {
  return (
    <div className="space-y-3">
      {MOCK_CLIENTS.map(client => (
        <div key={client.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
              client.shieldStatus === 'active' ? 'bg-green-500' :
              client.shieldStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              {client.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{client.name}</p>
              <p className="text-xs text-muted-foreground">加入：{client.joinDate} · 層級：{client.layer}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Shield className={`h-4 w-4 ${
                client.shieldStatus === 'active' ? 'text-green-500' :
                client.shieldStatus === 'pending' ? 'text-yellow-500' : 'text-red-500'
              }`} />
              <span className="text-sm">
                {client.shieldStatus === 'active' ? '防護中' :
                 client.shieldStatus === 'pending' ? '待啟動' : '已過期'}
              </span>
            </div>
            {client.privacyScore > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                個資安全分數：{client.privacyScore}/100
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
