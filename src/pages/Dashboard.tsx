import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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

const TelemetryChart = lazy(() => import('@/components/starship/fx/TelemetryChart'));
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getDashboardStats, getRuns, getAlerts, getAuditLogs, getAutoExecutorStatus, startAutoExecutor, stopAutoExecutor, telegramForceTest, api } from '@/services/api';
import type { Run, Alert, AuditLog } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLocale } from '@/i18n/LocaleContext';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  const [recentFailedRuns, setRecentFailedRuns] = useState<Run[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [autoExecutor, setAutoExecutor] = useState<AutoExecutorStatus | null>(null);
  const [isLoadingAutoExecutor, setIsLoadingAutoExecutor] = useState(false);
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
      ]);
      const [statsData, runsData, alertsData, auditData, autoExecStatus] = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
      if (statsData) setStats(statsData);
      if (runsData) setRecentFailedRuns(runsData.filter(r => r.status === 'failed').slice(0, 5));
      if (alertsData) setAlerts(alertsData.filter(a => a.status === 'open').slice(0, 5));
      if (auditData) setAuditLogs(auditData.slice(0, 5));
      if (autoExecStatus) setAutoExecutor((prev) => (isSameAutoExecutor(prev, autoExecStatus) ? prev : autoExecStatus));
    }
    loadData().catch((err) => {
      console.error('[Dashboard] loadData failed:', err);
      toast.error(t('dashboard.loadFailed'));
    });

    // 每 10 秒更新一次 AutoExecutor 狀態
    const interval = setInterval(async () => {
      const pollResults = await Promise.allSettled([getAutoExecutorStatus()]);
      const [status] = pollResults.map((r) => (r.status === 'fulfilled' ? r.value : null));
      if (status) setAutoExecutor((prev) => (isSameAutoExecutor(prev, status) ? prev : status));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleStartAutoExecutor = async () => {
    setIsLoadingAutoExecutor(true);
    try {
      const result = await startAutoExecutor(30000); // 30 秒輪詢
      setAutoExecutor(result);
      toast.success(t('dashboard.autoExecutorStarted'));
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
      toast.success(t('dashboard.autoExecutorStopped'));
    } catch (e) {
      toast.error('停止失敗: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoadingAutoExecutor(false);
    }
  };

  // 緊急停止所有任務
  const handleEmergencyStop = async () => {
    setIsStopping(true);
    try {
      await stopAutoExecutor();
      toast.success(t('dashboard.emergencyStopped'));
      const status = await getAutoExecutorStatus();
      setAutoExecutor(status);
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
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        icon="📊"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link to="/review" className="gap-1">
                <Lightbulb className="h-4 w-4" />
                {t('dashboard.review')}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/cursor" className="gap-1">
                <Bot className="h-4 w-4" />
                {t('dashboard.openclawBoard')}
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
              {t('dashboard.forceTest')}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setEmergencyDialogOpen(true)}
            >
              <AlertTriangle className="h-4 w-4" />
              {t('dashboard.emergencyStop')}
            </Button>
          </div>
        }
      />

      {/* KPI Cards — 帶 stagger 動畫 */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        className="oc-stats-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6"
      >
        {[
          { title: t('dashboard.todayRuns'), value: stats.todayRuns, icon: Activity, variant: 'default' as const },
          { title: t('dashboard.successRate'), value: `${stats.successRate}%`, icon: CheckCircle, variant: 'success' as const },
          { title: t('dashboard.failedRuns'), value: stats.failedRuns, icon: XCircle, variant: (stats.failedRuns > 0 ? 'destructive' : 'default') as any },
          { title: t('dashboard.avgDuration'), value: formatDuration(stats.avgDuration), icon: Clock, variant: 'default' as const },
          { title: t('dashboard.queueDepth'), value: stats.queueDepth, icon: Layers, variant: (stats.queueDepth > 10 ? 'warning' : 'default') as any },
          { title: t('dashboard.activeTasks'), value: stats.activeTasks, icon: Zap, variant: 'accent' as const },
        ].map((s) => (
          <motion.div
            key={s.title}
            variants={{
              hidden: { opacity: 0, y: 16, scale: 0.96 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4 } },
            }}
          >
            <StatCard title={s.title} value={s.value} icon={s.icon} variant={s.variant} />
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Chart + Failed Runs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Trend Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">{t('dashboard.weeklyTrend')}</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyChart data={stats.weeklyTrend} />
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: 'var(--oc-green)' }} />
                  <span style={{ color: 'var(--oc-t3)' }}>{t('dashboard.success')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: 'var(--oc-red)' }} />
                  <span style={{ color: 'var(--oc-t3)' }}>{t('dashboard.failed')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 即時遙測 — ECharts + Scroll-Driven */}
          <Card className="sc-scroll-reveal">
            <CardContent className="pt-4">
              <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">{t('dashboard.loadingChart')}</div>}>
                <TelemetryChart
                  title={t('dashboard.telemetry')}
                  height={220}
                  series={[
                    { name: t('dashboard.cpuLoad'), color: "#22d3ee" },
                    { name: t('dashboard.memory'), color: "#fbbf24" },
                    { name: t('dashboard.queueRate'), color: "#a78bfa" },
                  ]}
                />
              </Suspense>
            </CardContent>
          </Card>

          {/* Agent Usage Stats — Scroll-Driven */}
          {stats.agentStats && stats.agentStats.length > 0 && (
            <Card className="sc-scroll-reveal">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{t('dashboard.agentStats')}</CardTitle>
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
                          <span style={{ color: 'var(--oc-t3)' }}>{t('dashboard.runs')}</span>
                          <span className="font-semibold">{agent.runs}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--oc-t3)' }}>{t('dashboard.successRate')}</span>
                          <span className={agent.successRate >= 80 ? 'text-success' : agent.successRate >= 50 ? 'text-warning' : 'text-destructive'}>
                            {agent.successRate}%
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--oc-t3)' }}>{t('dashboard.failed')}</span>
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

          {/* Recent Failed Runs — Scroll-Driven */}
          <Card className="sc-scroll-reveal">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">{t('dashboard.recentFailed')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/runs?status=failed')}>
                {t('dashboard.viewAll')}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentFailedRuns.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-success mb-2" />
                  <p className="text-sm" style={{ color: 'var(--oc-t3)' }}>{t('dashboard.noFailedRuns')}</p>
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
                          {run.error?.message || t('dashboard.unknownError')}
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
                              toast.success(t('dashboard.requeued'));
                              const runsData = await getRuns();
                              setRecentFailedRuns(runsData.filter(r => r.status === 'failed').slice(0, 5));
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : t('dashboard.rerunFailed'));
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

        {/* Right Column — Container Query panel */}
        <div className="space-y-6 sc-cq-panel">
          {/* WebSocket Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                {ws.isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                )}
                {t('dashboard.wsLive')}
                {ws.isConnected && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>{t('dashboard.status')}</span>
                <span className={`text-sm font-medium ${ws.isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {ws.isConnected ? t('dashboard.connected') : t('dashboard.disconnected')}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>{t('dashboard.liveProgress')}</span>
                <span className="text-sm font-medium">
                  {ws.progress ? ws.progress.message : t('dashboard.waitingTasks')}
                </span>
              </div>
              {ws.logs.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">{t('dashboard.latestLogs')}</p>
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

          {/* AutoExecutor Control */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Bot className="h-4 w-4" />
                {t('dashboard.autoExecutor')}
                {autoExecutor?.isRunning && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {autoExecutor ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>{t('dashboard.status')}</span>
                    <span className={`text-sm font-medium ${autoExecutor.isRunning ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {autoExecutor.isRunning ? t('dashboard.running') : t('dashboard.stopped')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>{t('dashboard.pollInterval')}</span>
                    <span className="text-sm font-medium">{autoExecutor.pollIntervalMs / 1000} {t('dashboard.seconds')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>{t('dashboard.todayCount')}</span>
                    <span className="text-sm font-medium">{autoExecutor.totalExecutedToday}</span>
                  </div>
                  {autoExecutor.lastExecutedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--oc-t3)' }}>{t('dashboard.lastRun')}</span>
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
                        {t('dashboard.stop')}
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
                        {t('dashboard.start')}
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

          {/* 每日預算卡片 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                {t('dashboard.todayBudget')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('dashboard.spent')}</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${dailyBudget.spent.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('dashboard.budgetLimit')}</span>
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
                    {t('dashboard.remaining')} ${(dailyBudget.limit - dailyBudget.spent).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Open Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">{t('dashboard.openAlerts')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/alerts')}>
                {t('dashboard.viewAll')}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <CheckCircle className="h-6 w-6 text-success mb-2" />
                  <p className="text-sm" style={{ color: 'var(--oc-t3)' }}>{t('dashboard.noAlerts')}</p>
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
              <CardTitle className="text-base font-medium">{t('dashboard.recentActivity')}</CardTitle>
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
                <DialogTitle className="text-base font-semibold">{t('dashboard.confirmEmergency')}</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  {t('dashboard.confirmEmergencyDesc')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {t('dashboard.confirmWarning')}
          </div>
          <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setEmergencyDialogOpen(false)}
              disabled={isStopping}
            >
              {t('dashboard.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={handleEmergencyStop}
              disabled={isStopping}
            >
              {isStopping ? t('dashboard.stopping') : t('dashboard.confirmStop')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
