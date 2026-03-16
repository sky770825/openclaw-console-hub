import { useControlCenter } from '@/hooks/useControlCenter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  Database,
  MessageSquare,
  Cpu,
  RefreshCw,
  Play,
  Square,
  Bot,
  Send,
  Users,
  FileText,
  Zap,
  Shield,
  AlertTriangle,
} from 'lucide-react';

function StatCard({
  label,
  value,
  icon: Icon,
  status,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  status: 'ok' | 'warn' | 'fail' | 'off';
}) {
  const colors = {
    ok: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    warn: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    fail: 'text-red-400 bg-red-400/10 border-red-400/20',
    off: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
  };

  return (
    <Card className={`border ${colors[status]}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[status]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function parseLogLine(line: string) {
  const match = line.match(/^\[(.+?)\] \[(.+?)\] \[(.+?)\] (.+)$/);
  if (!match) return { time: '', source: '', action: '', message: line };
  const [, time, source, action, message] = match;
  return {
    time: new Date(time).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
    source,
    action,
    message,
  };
}

const sourceColors: Record<string, string> = {
  claude: 'bg-violet-500/20 text-violet-400',
  xiaocai: 'bg-blue-500/20 text-blue-400',
  boss: 'bg-amber-500/20 text-amber-400',
};

const actionColors: Record<string, string> = {
  task: 'bg-emerald-500/20 text-emerald-400',
  sync: 'bg-cyan-500/20 text-cyan-400',
  deploy: 'bg-orange-500/20 text-orange-400',
  config: 'bg-pink-500/20 text-pink-400',
  checkpoint: 'bg-zinc-500/20 text-zinc-400',
};

export default function ControlCenter() {
  const {
    health,
    deputy,
    dispatch,
    activityLog,
    loading,
    refresh,
    toggleDeputy,
    toggleDispatch,
    triggerDeputyNow,
  } = useControlCenter();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">控制台</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">控制台</h1>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-1" /> 刷新
        </Button>
      </div>

      {/* 服務健康 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">服務健康</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="API 服務"
            value={health ? `運行 ${formatUptime(health.uptime)}` : '離線'}
            icon={Activity}
            status={health?.ok ? 'ok' : 'fail'}
          />
          <StatCard
            label="Supabase"
            value={health?.supabase === 'ok' ? '已連線' : health?.supabase === 'fail' ? '連線失敗' : '未設定'}
            icon={Database}
            status={health?.supabase === 'ok' ? 'ok' : health?.supabase === 'fail' ? 'fail' : 'off'}
          />
          <StatCard
            label="Telegram"
            value={health?.telegram ? '已設定' : '未設定'}
            icon={MessageSquare}
            status={health?.telegram ? 'ok' : 'off'}
          />
          <StatCard
            label="記憶體"
            value={health ? `${health.memory.heapUsed} ${health.memory.unit}` : '—'}
            icon={Cpu}
            status={health && health.memory.heapUsed < 100 ? 'ok' : health ? 'warn' : 'off'}
          />
        </div>
      </section>

      {/* 模式控制 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">模式控制</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 暫代模式 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-violet-400" />
                暫代模式
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {deputy?.enabled ? '小蔡可自動接單派工' : '等待老蔡指令'}
                </span>
                <Switch checked={deputy?.enabled ?? false} onCheckedChange={toggleDeputy} />
              </div>
              {deputy?.enabled && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>上限 {deputy.maxTasksPerRun} 任務/次</span>
                  <span>|</span>
                  <span>標籤: {deputy.allowedTags?.join(', ') || 'auto-ok'}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={triggerDeputyNow}
                disabled={!deputy?.enabled}
              >
                <Play className="h-3 w-3 mr-1" /> 立即執行一輪
              </Button>
            </CardContent>
          </Card>

          {/* 派工模式 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                自動派工
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {dispatch?.isRunning ? '自動執行中' : '已暫停'}
                </span>
                <Switch checked={dispatch?.isRunning ?? false} onCheckedChange={toggleDispatch} />
              </div>
              {dispatch && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>間隔 {(dispatch.pollIntervalMs / 1000).toFixed(0)}s</span>
                  <span>|</span>
                  <span>今日執行 {dispatch.totalExecutedToday} 次</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bot 狀態 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Bot 狀態</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Send className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium">@caij_n8n_bot</p>
                <p className="text-xs text-muted-foreground">通知推播</p>
              </div>
              <Badge variant="outline" className="ml-auto text-emerald-400 border-emerald-400/30">
                active
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Bot className="h-5 w-5 text-violet-400" />
              <div>
                <p className="text-sm font-medium">@ollama168bot</p>
                <p className="text-xs text-muted-foreground">私聊控制</p>
              </div>
              <Badge
                variant="outline"
                className={health?.telegram ? 'ml-auto text-emerald-400 border-emerald-400/30' : 'ml-auto text-zinc-500 border-zinc-500/30'}
              >
                {health?.telegram ? 'active' : 'offline'}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium">@savetsai666bot</p>
                <p className="text-xs text-muted-foreground">群組偵測</p>
              </div>
              <Badge
                variant="outline"
                className={health?.telegram ? 'ml-auto text-emerald-400 border-emerald-400/30' : 'ml-auto text-zinc-500 border-zinc-500/30'}
              >
                {health?.telegram ? 'active' : 'offline'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 活動日誌 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          活動日誌
          {activityLog && (
            <span className="ml-2 text-xs font-normal">（共 {activityLog.total} 筆）</span>
          )}
        </h2>
        <Card>
          <ScrollArea className="h-60">
            <div className="p-4 space-y-2 font-mono text-xs">
              {activityLog?.lines.length ? (
                [...activityLog.lines].reverse().map((line, i) => {
                  const { time, source, action, message } = parseLogLine(line);
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-zinc-600 shrink-0 w-12">{time}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${sourceColors[source] || 'bg-zinc-500/20 text-zinc-400'}`}
                      >
                        {source}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${actionColors[action] || 'bg-zinc-500/20 text-zinc-400'}`}
                      >
                        {action}
                      </Badge>
                      <span className="text-zinc-300 break-all">{message}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-center py-8">暫無活動紀錄</p>
              )}
            </div>
          </ScrollArea>
        </Card>
      </section>

      {/* 快速指令 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">快速指令</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <Activity className="h-3.5 w-3.5 mr-1" /> 健康檢查
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetch('/api/openclaw/telegram/test-send', { method: 'POST' })}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> 測試 TG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetch('/api/openclaw/dispatch/toggle', { method: 'POST' }).then(refresh)}
          >
            <Square className="h-3.5 w-3.5 mr-1" /> 緊急停止
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <FileText className="h-3.5 w-3.5 mr-1" /> 刷新日誌
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              fetch('/api/openclaw/governance/reset-breaker', { method: 'POST' }).then(refresh)
            }
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> 重置斷路器
          </Button>
        </div>
      </section>
    </div>
  );
}
