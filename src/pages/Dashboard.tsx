import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Layers,
  Zap,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { PageContainer, SectionHeader, Section } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/Badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getDashboardStats, getRuns, getAlerts, getAuditLogs } from '@/services/api';
import type { Run, Alert, AuditLog } from '@/types';
import { cn } from '@/lib/utils';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  const [recentFailedRuns, setRecentFailedRuns] = useState<Run[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    async function loadData() {
      const [statsData, runsData, alertsData, auditData] = await Promise.all([
        getDashboardStats(),
        getRuns(),
        getAlerts(),
        getAuditLogs(),
      ]);
      setStats(statsData);
      setRecentFailedRuns(runsData.filter(r => r.status === 'failed').slice(0, 5));
      setAlerts(alertsData.filter(a => a.status === 'open').slice(0, 5));
      setAuditLogs(auditData.slice(0, 5));
    }
    loadData();
  }, []);

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
                          onClick={(e) => {
                            e.stopPropagation();
                            // Mock re-run
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
    </PageContainer>
  );
}
