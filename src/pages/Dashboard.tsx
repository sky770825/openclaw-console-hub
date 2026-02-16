import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  Zap,
  RefreshCw,
  ArrowRight,
  Play,
  Square,
  Bot,
  Wifi,
  WifiOff,
  Compass,
  Lightbulb,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { PageContainer, SectionHeader, Section } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/Badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getDashboardStats, getRuns, getAlerts, getAuditLogs, getAutoExecutorStatus, startAutoExecutor, stopAutoExecutor, getAutopilotStatus, startAutopilot, stopAutopilot, getAutopilotLog, telegramForceTest, getTaskCompliance, getTaskAudit, api } from '@/services/api';
import type { Run, Alert, AuditLog } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} 毫秒`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} 秒`;
  return `${(ms / 60000).toFixed(1)} 分鐘`;
}

function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '剛剛';
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  if (diffHour < 24) return `${diffHour} 小時前`;
  return `${diffDay} 天前`;
}

function WeeklyChart({ data }: { data: { day: string; success: number; failed: number }[] }) {
  const maxValue = Math.max(1, ...data.map(d => d.success + d.failed));
  
  return (
    <div className="flex items-end justify-between h-32 gap-2 px-2">
      {data.map((item) => {
        const successHeight = (item.success / maxValue) * 100;
        const failedHeight = (item.failed / maxValue) * 100;
        
        return (
          <div key={item.day} className="flex flex-col items-center gap-1 flex-1">
            <div className="flex flex-col-reverse w-full gap-0.5" style={{ height: '100px' }}>
              <div 
                className="w-full rounded-t transition-all" 
                style={{ height: `${successHeight}%`, background: 'var(--oc-green)' }}
              />
              {item.failed > 0 && (
                <div 
                  className="w-full rounded-t transition-all" 
                  style={{ height: `${failedHeight}%`, background: 'var(--oc-red)' }}
                />
              )}
            </div>
            <span className="text-xs" style={{ color: 'var(--oc-t3)' }}>{item.day}</span>
          </div>
        );
      })}
    </div>
  );
}

interface AutoExecutorStatus {
  ok: boolean;
  isRunning: boolean;
  pollIntervalMs: number;
  maxTasksPerMinute?: number;
  lastPollAt: string | null;
  lastExecutedTaskId: string | null;
  lastExecutedAt: string | null;
  totalExecutedToday: number;
  nextPollAt: string | null;
}

interface AutopilotStatus {
  ok: boolean;
  isRunning: boolean;
  cycleCount: number;
  intervalMinutes: number;
  lastCycleAt: string | null;
  nextCycleAt: string | null;
  stats: {
    tasksCompleted: number;
    tasksFailed: number;
  };
}

interface AutopilotLogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

type TaskCompliance = {
  ok: boolean;
  total: number;
  ready: number;
  compliantReady: number;
  noncompliantReady: number;
  sample: { id: string; name: string; missing: string[] }[];
};

function isSameAutoExecutor(a: AutoExecutorStatus | null, b: AutoExecutorStatus | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.ok === b.ok &&
    a.isRunning === b.isRunning &&
    a.pollIntervalMs === b.pollIntervalMs &&
    (a.maxTasksPerMinute ?? null) === (b.maxTasksPerMinute ?? null) &&
    a.lastPollAt === b.lastPollAt &&
    a.lastExecutedTaskId === b.lastExecutedTaskId &&
    a.lastExecutedAt === b.lastExecutedAt &&
    a.totalExecutedToday === b.totalExecutedToday &&
    a.nextPollAt === b.nextPollAt
  );
}

function isSameAutopilot(a: AutopilotStatus | null, b: AutopilotStatus | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.ok === b.ok &&
    a.isRunning === b.isRunning &&
    a.cycleCount === b.cycleCount &&
    a.intervalMinutes === b.intervalMinutes &&
    a.lastCycleAt === b.lastCycleAt &&
    a.nextCycleAt === b.nextCycleAt &&
    a.stats.tasksCompleted === b.stats.tasksCompleted &&
    a.stats.tasksFailed === b.stats.tasksFailed
  );
}

function isSameAutopilotLogs(a: AutopilotLogEntry[], b: AutopilotLogEntry[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].timestamp !== b[i].timestamp ||
      a[i].level !== b[i].level ||
      a[i].message !== b[i].message
    ) {
      return false;
    }
  }
  return true;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  const [recentFailedRuns, setRecentFailedRuns] = useState<Run[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [autoExecutor, setAutoExecutor] = useState<AutoExecutorStatus | null>(null);
  const [isLoadingAutoExecutor, setIsLoadingAutoExecutor] = useState(false);
  const [autopilot, setAutopilot] = useState<AutopilotStatus | null>(null);
  const [autopilotLogs, setAutopilotLogs] = useState<AutopilotLogEntry[]>([]);
  const [isLoadingAutopilot, setIsLoadingAutopilot] = useState(false);
  const [taskCompliance, setTaskCompliance] = useState<TaskCompliance | null>(null);
  const [taskAudit, setTaskAudit] = useState<Awaited<ReturnType<typeof getTaskAudit>> | null>(null);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isForcingTelegramTest, setIsForcingTelegramTest] = useState(false);
  const ws = useWebSocket();

  // 每日預算（靜態版本，之後接 API）
  const dailyBudget = { spent: 0, limit: 5.0 }; // $0.00 / $5.00
  const budgetProgress = (dailyBudget.spent / dailyBudget.limit) * 100;

  useEffect(() => {
    async function loadData() {
      const results = await Promise.allSettled([
        getDashboardStats(),
        getRuns(),
        getAlerts(),
        getAuditLogs(),
        getAutoExecutorStatus(),
        getAutopilotStatus(),
        getAutopilotLog(),
        getTaskCompliance(),
        getTaskAudit(),
      ]);
      const [statsData, runsData, alertsData, auditData, autoExecStatus, autopilotStatus, autopilotLogData, complianceData, auditData2] = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
      if (statsData) setStats(statsData);
      if (runsData) setRecentFailedRuns(runsData.filter(r => r.status === 'failed').slice(0, 5));
      if (alertsData) setAlerts(alertsData.filter(a => a.status === 'open').slice(0, 5));
      if (auditData) setAuditLogs(auditData.slice(0, 5));
      if (autoExecStatus) setAutoExecutor((prev) => (isSameAutoExecutor(prev, autoExecStatus) ? prev : autoExecStatus));
      if (autopilotStatus) setAutopilot((prev) => (isSameAutopilot(prev, autopilotStatus) ? prev : autopilotStatus));
      if (autopilotLogData) {
        const latestLogs = autopilotLogData.logs?.slice(-5) || [];
        setAutopilotLogs((prev) => (isSameAutopilotLogs(prev, latestLogs) ? prev : latestLogs));
      }
      if (complianceData) setTaskCompliance(complianceData);
      if (auditData2?.ok) setTaskAudit(auditData2);
    }
    loadData().catch((err) => {
      console.error('[Dashboard] loadData failed:', err);
      toast.error('儀表板載入失敗，請重新整理');
    });

    // 每 10 秒更新一次 AutoExecutor 和 Autopilot 狀態
    const interval = setInterval(async () => {
      const pollResults = await Promise.allSettled([
        getAutoExecutorStatus(),
        getAutopilotStatus(),
        getAutopilotLog(),
        getTaskCompliance(),
        getTaskAudit(),
      ]);
      const [status, autopilotStatus, autopilotLogData, complianceData, auditData2] = pollResults.map((r) => (r.status === 'fulfilled' ? r.value : null));
      if (status) setAutoExecutor((prev) => (isSameAutoExecutor(prev, status) ? prev : status));
      if (autopilotStatus) setAutopilot((prev) => (isSameAutopilot(prev, autopilotStatus) ? prev : autopilotStatus));
      if (autopilotLogData) {
        const latestLogs = autopilotLogData.logs?.slice(-5) || [];
        setAutopilotLogs((prev) => (isSameAutopilotLogs(prev, latestLogs) ? prev : latestLogs));
      }
      if (complianceData) setTaskCompliance(complianceData);
      if (auditData2?.ok) setTaskAudit(auditData2);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleStartAutoExecutor = async () => {
    setIsLoadingAutoExecutor(true);
    try {
      const result = await startAutoExecutor(30000); // 30 秒輪詢
      setAutoExecutor(result);
      toast.success('AutoExecutor 已啟動');
    } catch (e) {
      toast.error('啟動失敗: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoadingAutoExecutor(false);
    }
  };

  const handleStopAutoExecutor = async () => {
    setIsLoadingAutoExecutor(true);
    try {
      const result = await stopAutoExecutor();
      setAutoExecutor(result);
      toast.success('AutoExecutor 已停止');
    } catch (e) {
      toast.error('停止失敗: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoadingAutoExecutor(false);
    }
  };

  const handleStartAutopilot = async () => {
    setIsLoadingAutopilot(true);
    try {
      const result = await startAutopilot(10); // 10 分鐘間隔
      if (result.ok) {
        setAutopilot(prev => prev ? { ...prev, isRunning: true, intervalMinutes: result.intervalMinutes } : null);
        toast.success('Autopilot 已啟動');
      } else {
        toast.error(result.message || '啟動失敗');
      }
    } catch (e) {
      toast.error('啟動失敗: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoadingAutopilot(false);
    }
  };

  const handleStopAutopilot = async () => {
    setIsLoadingAutopilot(true);
    try {
      const result = await stopAutopilot();
      if (result.ok) {
        setAutopilot(prev => prev ? { ...prev, isRunning: false } : null);
        toast.success('Autopilot 已停止');
      } else {
        toast.error(result.message || '停止失敗');
      }
    } catch (e) {
      toast.error('停止失敗: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoadingAutopilot(false);
    }
  };

  // 緊急停止所有任務
  const handleEmergencyStop = async () => {
    setIsStopping(true);
    try {
      // Use existing, well-defined endpoints (more reliable than a single "stop-all" route).
      await Promise.allSettled([stopAutoExecutor(), stopAutopilot()]);
      toast.success('🚨 已緊急停止（AutoExecutor + Autopilot）');
      const [status, autopilotStatus] = await Promise.all([
        getAutoExecutorStatus(),
        getAutopilotStatus(),
      ]);
      setAutoExecutor(status);
      setAutopilot(autopilotStatus);
    } catch (e) {
      toast.error('緊急停止失敗: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsStopping(false);
      setEmergencyDialogOpen(false);
    }
  };

  if (!stats) {
    return (
      <PageContainer>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SectionHeader
        title="儀表板"
        description="任務自動化系統總覽 · 與 OpenClaw Agent 板同步"
        icon="📊"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link to="/review" className="gap-1">
                <Lightbulb className="h-4 w-4" />
                發想審核
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/cursor" className="gap-1">
                <Bot className="h-4 w-4" />
                OpenClaw 任務板
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              disabled={isForcingTelegramTest}
              onClick={async () => {
                try {
                  setIsForcingTelegramTest(true);
                  const res = await telegramForceTest();
                  if (!res?.ok) {
                    toast.error('Telegram 強制測試失敗');
                    return;
                  }
                  toast.success(`Telegram 已送出 (nonce=${res.nonce ?? '-'})`);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Telegram 強制測試失敗');
                } finally {
                  setIsForcingTelegramTest(false);
                }
              }}
            >
              <RefreshCw className={cn('h-4 w-4', isForcingTelegramTest && 'animate-spin')} />
              🧪 強制測試
            </Button>

            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setEmergencyDialogOpen(true)}
            >
              <AlertTriangle className="h-4 w-4" />
              🚨 緊急停止
            </Button>
          </div>
        }
      />

      {/* KPI Cards — OpenClaw Stats 風格 */}
      <div className="oc-stats-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard
          title="今日執行"
          value={stats.todayRuns}
          icon={Activity}
        />
        <StatCard
          title="成功率"
          value={`${stats.successRate}%`}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="失敗執行"
          value={stats.failedRuns}
          icon={XCircle}
          variant={stats.failedRuns > 0 ? 'destructive' : 'default'}
        />
        <StatCard
          title="平均耗時"
          value={formatDuration(stats.avgDuration)}
          icon={Clock}
        />
        <StatCard
          title="佇列深度"
          value={stats.queueDepth}
          icon={Layers}
          variant={stats.queueDepth > 10 ? 'warning' : 'default'}
        />
        <StatCard
          title="活躍任務"
          value={stats.activeTasks}
          icon={Zap}
          variant="accent"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Chart + Failed Runs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Trend Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">每週執行趨勢</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyChart data={stats.weeklyTrend} />
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: 'var(--oc-green)' }} />
                  <span style={{ color: 'var(--oc-t3)' }}>成功</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: 'var(--oc-red)' }} />
                  <span style={{ color: 'var(--oc-t3)' }}>失敗</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Usage Stats */}
          {stats.agentStats && stats.agentStats.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Agent 使用統計</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {stats.agentStats.map((agent) => (
                    <div
                      key={agent.name}
                      className="p-4 rounded-lg border border-[var(--oc-border)] hover:bg-[var(--oc-s3)] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {agent.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-sm">{agent.name}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--oc-t3)' }}>執行</span>
                          <span className="font-semibold">{agent.runs}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--oc-t3)' }}>成功率</span>
                          <span className={agent.successRate >= 80 ? 'text-success' : agent.successRate >= 50 ? 'text-warning' : 'text-destructive'}>
                            {agent.successRate}%
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--oc-t3)' }}>失敗</span>
                          <span className="text-destructive">{agent.failed}</span>
                        </div>
                      </div>
                      {/* 成功率進度條 */}
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success transition-all"
                          style={{ width: `${agent.successRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Failed Runs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">近期失敗執行</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/runs?status=failed')}>
                查看全部
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentFailedRuns.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-success mb-2" />
                  <p className="text-sm" style={{ color: 'var(--oc-t3)' }}>沒有失敗的執行！太棒了！🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentFailedRuns.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer border border-[var(--oc-border)] hover:bg-[var(--oc-s3)]"
                      onClick={() => navigate(`/runs/${run.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{run.taskName}</span>
                          <StatusBadge status={run.status} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {run.error?.message || '未知錯誤'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <span className="text-xs" style={{ color: 'var(--oc-t3)' }}>
                          {formatRelativeTime(run.startedAt)}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await api.rerun(run.id);
                              toast.success('已加入重跑佇列');
                              const runsData = await getRuns();
                              setRecentFailedRuns(runsData.filter(r => r.status === 'failed').slice(0, 5));
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : '重跑失敗');
                            }
                          }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Alerts + Audit */}
        <div className="space-y-6">
          {/* WebSocket Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                {ws.isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                )}
                WebSocket 即時連線
                {ws.isConnected && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>狀態</span>
                <span className={`text-sm font-medium ${ws.isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {ws.isConnected ? '已連接' : '未連接'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>即時進度</span>
                <span className="text-sm font-medium">
                  {ws.progress ? ws.progress.message : '等待任務...'}
                </span>
              </div>
              {ws.logs.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">最新日誌</p>
                  <div className="text-xs space-y-1">
                    {ws.logs.slice(-3).map((log) => (
                      <div key={log.id} className="truncate">
                        <span className={
                          log.level === 'error' ? 'text-red-500' :
                          log.level === 'success' ? 'text-green-500' :
                          log.level === 'warn' ? 'text-yellow-500' :
                          'text-blue-500'
                        }>
                          {log.level === 'error' ? '❌' : log.level === 'success' ? '✅' : log.level === 'warn' ? '⚠️' : 'ℹ️'}
                        </span>
                        {' '}{log.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 空/無用任務審計 */}
          {taskAudit && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  空/無用任務
                  <Badge variant={taskAudit.emptyOrUseless.count > 0 ? 'destructive' : 'secondary'}>
                    {taskAudit.emptyOrUseless.count}/{taskAudit.total}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  依：空標題、空/極短說明、佔位符標題、needs-meta、ready 但不合規
                </p>
                {taskAudit.emptyOrUseless.byCriteria && (
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span>空標題</span><span>{taskAudit.emptyOrUseless.byCriteria.emptyName}</span>
                    <span>空/極短說明</span><span>{taskAudit.emptyOrUseless.byCriteria.emptyOrTinyDesc}</span>
                    <span>佔位符</span><span>{taskAudit.emptyOrUseless.byCriteria.placeholderTitle}</span>
                    <span>needs-meta</span><span>{taskAudit.emptyOrUseless.byCriteria.hasNeedsMeta}</span>
                    <span>ready 不合規</span><span>{taskAudit.emptyOrUseless.byCriteria.readyButNoncompliant}</span>
                  </div>
                )}
                {taskAudit.emptyOrUseless.sample?.length > 0 && (
                  <div className="rounded-md border p-2 text-xs space-y-1 max-h-24 overflow-y-auto">
                    {taskAudit.emptyOrUseless.sample.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex justify-between gap-2 truncate">
                        <span className="truncate">{s.name || s.id}</span>
                        <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => navigate(`/tasks/${s.id}`)}>
                          打開
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/tasks?tag=needs-meta')}>
                  查看 needs-meta
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Ready Compliance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Ready 合規
                {taskCompliance && (
                  <Badge variant={taskCompliance.noncompliantReady > 0 ? 'destructive' : 'secondary'}>
                    {taskCompliance.compliantReady}/{taskCompliance.ready}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Ready 需具備 projectPath、agent、riskLevel、rollbackPlan、acceptanceCriteria、deliverables、runCommands、modelPolicy、executionProvider、allowPaid。
              </p>
              {taskCompliance && taskCompliance.sample?.length > 0 && (
                <div className="rounded-md border p-3 text-xs space-y-2">
                  <div className="font-medium">不合規樣本（前 3 筆）</div>
                  {taskCompliance.sample.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate">{s.name}</div>
                        <div className="text-muted-foreground truncate">缺少：{s.missing.join(', ')}</div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7" onClick={() => navigate(`/tasks/${s.id}`)}>
                        打開
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => navigate('/tasks?status=ready')}>
                  查看 Ready
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate('/tasks?tag=needs-meta')}>
                  needs-meta
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AutoExecutor Control */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Bot className="h-4 w-4" />
                自動執行器
                {autoExecutor?.isRunning && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {autoExecutor ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>狀態</span>
                    <span className={`text-sm font-medium ${autoExecutor.isRunning ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {autoExecutor.isRunning ? '運行中' : '已停止'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>輪詢間隔</span>
                    <span className="text-sm font-medium">{autoExecutor.pollIntervalMs / 1000} 秒</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>今日執行</span>
                    <span className="text-sm font-medium">{autoExecutor.totalExecutedToday} 個</span>
                  </div>
                  {autoExecutor.lastExecutedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>上次執行</span>
                      <span className="text-sm font-medium">{formatRelativeTime(autoExecutor.lastExecutedAt)}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    {autoExecutor.isRunning ? (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1"
                        onClick={handleStopAutoExecutor}
                        disabled={isLoadingAutoExecutor}
                      >
                        <Square className="h-4 w-4 mr-1" />
                        停止
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1"
                        onClick={handleStartAutoExecutor}
                        disabled={isLoadingAutoExecutor}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        啟動
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Autopilot Control */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Compass className="h-4 w-4" />
                自主循環模式 (Autopilot)
                {autopilot?.isRunning && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {autopilot ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>狀態</span>
                    <span className={`text-sm font-medium ${autopilot.isRunning ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {autopilot.isRunning ? '運行中' : '已停止'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>循環次數</span>
                    <span className="text-sm font-medium">{autopilot.cycleCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>已完成任務</span>
                    <span className="text-sm font-medium">{autopilot.stats.tasksCompleted}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>間隔</span>
                    <span className="text-sm font-medium">{autopilot.intervalMinutes} 分鐘</span>
                  </div>
                  {autopilot.lastCycleAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>上次循環</span>
                      <span className="text-sm font-medium">{formatRelativeTime(autopilot.lastCycleAt)}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    {autopilot.isRunning ? (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1"
                        onClick={handleStopAutopilot}
                        disabled={isLoadingAutopilot}
                      >
                        <Square className="h-4 w-4 mr-1" />
                        停止
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1"
                        onClick={handleStartAutopilot}
                        disabled={isLoadingAutopilot}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        啟動
                      </Button>
                    )}
                  </div>
                  {autopilotLogs.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">最近日誌</p>
                      <div className="text-xs space-y-1">
                        {autopilotLogs.map((log, idx) => (
                          <div key={idx} className="truncate">
                            <span className={
                              log.level === 'error' ? 'text-red-500' :
                              log.level === 'warn' ? 'text-yellow-500' :
                              'text-blue-500'
                            }>
                              {log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️'}
                            </span>
                            {' '}{log.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 每日預算卡片 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                💰 今日預算
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">已花費</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${dailyBudget.spent.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">預算上限</span>
                    <span className="font-medium">${dailyBudget.limit.toFixed(2)}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-500 rounded-full',
                        budgetProgress > 80 ? 'bg-red-500' : budgetProgress > 50 ? 'bg-yellow-500' : 'bg-green-500'
                      )}
                      style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    剩餘 ${(dailyBudget.limit - dailyBudget.spent).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Open Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">未處理警報</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/alerts')}>
                查看全部
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <CheckCircle className="h-6 w-6 text-success mb-2" />
                  <p className="text-sm" style={{ color: 'var(--oc-t3)' }}>沒有未處理的警報</p>
                </div>
              ) : (
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                <div
                      key={alert.id}
                      className="p-3 rounded-lg border-l-4"
                      style={{
                        borderLeftColor: alert.severity === 'critical' ? 'var(--oc-red)' : alert.severity === 'warning' ? 'var(--oc-amber)' : 'var(--oc-indigo)',
                        background: alert.severity === 'critical' ? 'var(--oc-red-g)' : alert.severity === 'warning' ? 'var(--oc-amber-g)' : 'var(--oc-indigo-g)',
                      }}
                    >
                        <p className="text-sm font-medium line-clamp-2">{alert.message}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--oc-t3)' }}>
                          {formatRelativeTime(alert.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity / Audit */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">近期活動</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--oc-s3)' }}>
                        <span className="text-xs font-medium">{log.user.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.user}</span>
                          {' '}
                          <span style={{ color: 'var(--oc-t3)' }}>{log.action}</span>
                          {' '}
                          <span className="font-medium">{log.target}</span>
                        </p>
                        {log.details && (
                          <p className="text-xs truncate" style={{ color: 'var(--oc-t3)' }}>{log.details}</p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: 'var(--oc-t3)' }}>
                          {formatRelativeTime(log.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 緊急停止確認對話框 */}
      <Dialog open={emergencyDialogOpen} onOpenChange={setEmergencyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-base font-semibold">確認緊急停止？</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  此操作將立即停止所有正在執行的任務，包括 AutoExecutor 和 Autopilot。
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            ⚠️ 警告：此操作無法撤銷，進行中的任務將被強制終止。
          </div>
          <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setEmergencyDialogOpen(false)}
              disabled={isStopping}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={handleEmergencyStop}
              disabled={isStopping}
            >
              {isStopping ? '停止中…' : '確認緊急停止'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
