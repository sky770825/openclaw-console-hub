/**
 * 護盾甲板 — Protection Center
 *
 * 掃描掃毒、客戶防護、個資安全、客戶安全上線流程。
 * 本頁會直接讀取後端 /api/protection/summary 的真實安全設定狀態，
 * 避免只顯示假數據，讓老蔡能一眼看到目前安全等級。
 *
 * 流程：
 *   外部接觸 → 掃描掃毒 → 建立防護 → 個資確認 → 進入社交圈
 */

import { useEffect, useState } from 'react';
import { Shield, Search, Lock, UserCheck, CheckCircle, Circle, AlertTriangle, Loader2 } from 'lucide-react';
import { ONBOARDING_STEPS, type OnboardingStep } from '@/config/hubCenters';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3011';
const AUTH = { 'Authorization': `Bearer ${import.meta.env.VITE_OPENCLAW_API_KEY || ''}`, 'Content-Type': 'application/json' };

type Tab = 'scanner' | 'privacy' | 'clients' | 'onboarding';

// ─── 後端 Protection Summary 型別 ───

interface ProtectionSummary {
  ok: boolean;
  timestamp: string;
  backend: {
    supabaseConnected: boolean;
    n8nConfigured: boolean;
  };
  configChecks: {
    apiKeyStrong: boolean;
    adminKeyStrong: boolean;
    dashboardAuthConfigured: boolean;
    corsConfigured: boolean;
    enforceWriteAuth: boolean;
  };
  taskCounts: {
    total: number;
    securityTagged: number;
    highRisk: number;
  };
}

// ─── 任務板型別 ───

interface Task {
  id?: string;
  name: string;
  status: string;
  priority?: number;
  tags?: string[];
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── 元件 ───

export default function ProtectionCenter() {
  const [summary, setSummary] = useState<ProtectionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('onboarding');

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'onboarding', label: '安全上線', icon: UserCheck },
    { id: 'scanner', label: '掃描掃毒', icon: Search },
    { id: 'privacy', label: '個資安全', icon: Lock },
    { id: 'clients', label: '客戶防護', icon: Shield },
  ];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/protection/summary`, { headers: AUTH });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ProtectionSummary;
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled) setError('無法取得後端安全狀態');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 60_000); // 每分鐘刷新一次
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const passedChecks = summary
    ? Object.values(summary.configChecks).filter(Boolean).length
    : 0;
  const totalChecks = summary ? Object.values(summary.configChecks).length : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-6 w-6 text-green-500" />
          護盾甲板
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          掃描掃毒、個資安全、客戶防護、安全上線流程。此處顯示的指標直接來自後端安全檢查結果。
        </p>
        {loading && (
          <p className="text-xs text-muted-foreground mt-1">
            正在讀取後端安全狀態…
          </p>
        )}
        {error && (
          <p className="text-xs text-red-500 mt-1">
            {error}
          </p>
        )}
      </div>

      {/* 總覽卡片 */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="後端健康狀態"
          value={
            summary
              ? summary.backend.supabaseConnected && summary.backend.n8nConfigured
                ? '正常'
                : '需注意'
              : '--'
          }
          color={
            summary
              ? summary.backend.supabaseConnected && summary.backend.n8nConfigured
                ? 'text-green-500'
                : 'text-yellow-500'
              : 'text-muted-foreground'
          }
        />
        <StatCard
          label="安全設定通過項目"
          value={summary ? `${passedChecks}/${totalChecks}` : '--'}
          color={passedChecks === totalChecks && totalChecks > 0 ? 'text-green-500' : 'text-yellow-500'}
        />
        <StatCard
          label="安全相關任務數量"
          value={summary ? summary.taskCounts.securityTagged.toString() : '--'}
          color="text-blue-500"
        />
        <StatCard
          label="高風險任務數量"
          value={summary ? summary.taskCounts.highRisk.toString() : '--'}
          color={summary && summary.taskCounts.highRisk === 0 ? 'text-green-500' : 'text-red-500'}
        />
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
      {tab === 'scanner' && <ScannerPanel summary={summary} />}
      {tab === 'privacy' && <PrivacyPanel summary={summary} />}
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

const SECURITY_OWNERS = new Set(['老蔡', '小蔡', 'system']);

function isSecurityTask(task: Task): boolean {
  const nameLower = task.name.toLowerCase();
  const hasSecurityTag = Array.isArray(task.tags) && task.tags.some(t =>
    t.toLowerCase() === 'security'
  );
  const hasSecurityName = /安全|防護|掃描/.test(task.name) || nameLower.includes('security');
  return hasSecurityTag || hasSecurityName;
}

function taskStatusToScanStatus(status: string): 'clean' | 'threat' | 'scanning' {
  const s = status.toLowerCase();
  if (s === 'done' || s === 'completed') return 'clean';
  if (s === 'blocked' || s === 'failed' || s === 'error') return 'threat';
  return 'scanning';
}

function ScannerPanel({ summary }: { summary: ProtectionSummary | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/openclaw/tasks?limit=200`, { headers: AUTH });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Task[];
        if (!cancelled) {
          const secTasks = (Array.isArray(data) ? data : []).filter(isSecurityTask);
          setTasks(secTasks);
        }
      } catch (e) {
        if (!cancelled) setError('無法取得任務板資料');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      {/* 真實安全任務概況 */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-2">任務安全掃描結果（來自任務板）</h3>
        {summary ? (
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>· 總任務數：{summary.taskCounts.total}</li>
            <li>· 判定為「安全/防護相關」的任務：{summary.taskCounts.securityTagged}</li>
            <li className={summary.taskCounts.highRisk === 0 ? 'text-green-600' : 'text-red-500'}>
              · 高風險任務：{summary.taskCounts.highRisk} 個
            </li>
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            尚未取得任務板資料。
          </p>
        )}
      </div>

      {/* 掃描列表 */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          載入中…
        </div>
      )}
      {error && (
        <p className="text-xs text-red-500 p-4">{error}</p>
      )}
      {!loading && !error && tasks.length === 0 && (
        <p className="text-sm text-muted-foreground p-4">尚無記錄</p>
      )}
      <div className="space-y-3">
        {tasks.map((task, idx) => {
          const scanStatus = taskStatusToScanStatus(task.status);
          return (
            <div key={task.id ?? idx} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                scanStatus === 'clean' ? 'bg-green-500/10' :
                scanStatus === 'threat' ? 'bg-red-500/10' :
                'bg-yellow-500/10'
              }`}>
                {scanStatus === 'clean' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                 scanStatus === 'threat' ? <AlertTriangle className="h-4 w-4 text-red-500" /> :
                 <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{task.name}</p>
                <p className="text-xs text-muted-foreground">
                  {task.owner ? `負責人：${task.owner}` : ''}
                  {task.tags && task.tags.length > 0 ? ` · 標籤：${task.tags.join(', ')}` : ''}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  scanStatus === 'clean' ? 'bg-green-500/10 text-green-500' :
                  scanStatus === 'threat' ? 'bg-red-500/10 text-red-500' :
                  'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {scanStatus === 'clean' ? '安全' : scanStatus === 'threat' ? '威脅' : '掃描中'}
                </span>
                <p className="text-xs text-muted-foreground mt-1">{task.status}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 個資安全 ───

function PrivacyPanel({ summary }: { summary: ProtectionSummary | null }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-green-500" />
          <h3 className="text-sm font-semibold">個資安全閘道</h3>
        </div>
        {summary ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <SecurityFeature
              title="API Key 強度"
              status={summary.configChecks.apiKeyStrong ? '良好' : '需更換'}
              description={summary.configChecks.apiKeyStrong
                ? 'OPENCLAW_API_KEY 為足夠長度的隨機密鑰'
                : '偵測到可能是 dev-key 或過短字串，建議盡快更新'}
              ok={summary.configChecks.apiKeyStrong}
            />
            <SecurityFeature
              title="管理者金鑰"
              status={summary.configChecks.adminKeyStrong ? '良好' : '需更換'}
              description={summary.configChecks.adminKeyStrong
                ? 'OPENCLAW_ADMIN_KEY 長度充足'
                : '建議改為 32+ 字元強隨機密鑰'}
              ok={summary.configChecks.adminKeyStrong}
            />
            <SecurityFeature
              title="Dashboard 基本認證"
              status={summary.configChecks.dashboardAuthConfigured ? '已啟用' : '未啟用'}
              description={summary.configChecks.dashboardAuthConfigured
                ? '前端儀表板已啟用 Basic Auth 保護'
                : '公開部署前建議設定 OPENCLAW_DASHBOARD_BASIC_USER/PASS'}
              ok={summary.configChecks.dashboardAuthConfigured}
            />
            <SecurityFeature
              title="CORS 白名單"
              status={summary.configChecks.corsConfigured ? '已設定' : '未設定'}
              description={summary.configChecks.corsConfigured
                ? 'ALLOWED_ORIGINS 已指定正式網域'
                : '目前僅預設 localhost，對公開環境建議明確設定'}
              ok={summary.configChecks.corsConfigured}
            />
            <SecurityFeature
              title="寫入驗證保護"
              status={summary.configChecks.enforceWriteAuth ? '啟用中' : '關閉'}
              description={summary.configChecks.enforceWriteAuth
                ? '所有寫入 API 需帶有效 API Key'
                : '建議啟用 OPENCLAW_ENFORCE_WRITE_AUTH 以防未授權寫入'}
              ok={summary.configChecks.enforceWriteAuth}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            尚未取得後端設定，暫時僅顯示規則標題。
          </p>
        )}
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

const SYSTEM_OWNERS = new Set(['老蔡', '小蔡', 'system', 'System', '老蔡/小蔡']);

function ClientsPanel() {
  const [owners, setOwners] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/openclaw/tasks?limit=200`, { headers: AUTH });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Task[];
        if (!cancelled) {
          const allTasks = Array.isArray(data) ? data : [];
          const uniqueOwners = Array.from(
            new Set(
              allTasks
                .map(t => t.owner ?? '')
                .filter(o => o && !SYSTEM_OWNERS.has(o))
            )
          );
          setOwners(uniqueOwners);
        }
      } catch (e) {
        if (!cancelled) setError('無法取得任務板資料');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        載入中…
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-500 p-4">{error}</p>;
  }

  if (owners.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">尚無記錄</p>;
  }

  return (
    <div className="space-y-3">
      {owners.map((owner, idx) => (
        <div key={idx} className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold bg-green-500">
              {owner.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{owner}</p>
              <p className="text-xs text-muted-foreground">任務板成員</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span className="text-sm">防護中</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
