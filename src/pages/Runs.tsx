import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { SearchInput, EmptyState } from '@/components/common';
import { StatusBadge } from '@/components/common/Badges';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  RefreshCw,
  Copy,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Timer,
  Activity,
} from 'lucide-react';
import { getRuns, getRun, api } from '@/services/api';
import type { Run, RunStep } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { pollRunStatus } from '@/lib/pollRunStatus';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) : id;
}

/** 從 outputSummary 提取有意義的前兩行文字 */
function extractOutputPreview(output?: Record<string, unknown> | string | null): string | null {
  if (!output) return null;
  const text = typeof output === 'string' ? output : JSON.stringify(output);
  if (!text.trim()) return null;
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('{') && !l.startsWith('"source"'));
  return lines.slice(0, 2).join(' ').slice(0, 120) || null;
}

const statusIcon: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  running: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
  queued: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  cancelled: <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />,
};

function StepIcon({ status }: { status: RunStep['status'] }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'skipped':
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/50" />;
  }
}

const stepStatusLabel: Record<RunStep['status'], string> = {
  success: '成功',
  failed: '失敗',
  running: '執行中',
  skipped: '略過',
  pending: '待處理',
  queued: '佇列中',
};

/* ─── Run Detail Sheet ─── */
function RunDetail({ run, onRerun }: { run: Run; onRerun: () => void }) {
  const { toast } = useToast();

  const copyRunId = () => {
    navigator.clipboard.writeText(run.id);
    toast({ description: '已複製' });
  };

  const outputText = (() => {
    if (!run.outputSummary) return null;
    if (typeof run.outputSummary === 'string') {
      try {
        return JSON.stringify(JSON.parse(run.outputSummary), null, 2);
      } catch {
        return run.outputSummary;
      }
    }
    return JSON.stringify(run.outputSummary, null, 2);
  })();

  return (
    <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{shortId(run.id)}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyRunId}>
            <Copy className="h-3 w-3" />
          </Button>
          <StatusBadge status={run.status} />
        </SheetTitle>
        <SheetDescription>
          {run.taskId ? (
            <>
              任務：
              <Link to={`/tasks/${run.taskId}`} className="text-primary hover:underline">
                {run.taskName}
              </Link>
            </>
          ) : (
            `任務：${run.taskName}`
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-5">
        {/* Timing */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">開始</p>
            <p className="text-sm">{formatDate(run.startedAt)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">結束</p>
            <p className="text-sm">{run.endedAt ? formatDate(run.endedAt) : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">耗時</p>
            <p className="text-sm font-medium">
              {run.durationMs ? formatDuration(run.durationMs) : '—'}
            </p>
          </div>
        </div>

        {/* Output */}
        {outputText && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">執行輸出</p>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono max-h-64 overflow-y-auto whitespace-pre-wrap">
              {outputText}
            </pre>
          </div>
        )}

        {/* Steps */}
        {run.steps.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-2">步驟</p>
            <div className="relative pl-6 space-y-2.5">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
              {run.steps.map((step, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-0.5 bg-background p-0.5">
                    <StepIcon status={step.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{step.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {stepStatusLabel[step.status] ?? step.status}
                      </span>
                    </div>
                    {step.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {step.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {run.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-destructive flex items-center gap-1.5 mb-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {run.error.code}
            </p>
            <p className="text-xs text-muted-foreground">{run.error.message}</p>
            {run.error.stack && (
              <pre className="text-[10px] bg-destructive/10 p-2 rounded mt-2 overflow-x-auto font-mono max-h-32 overflow-y-auto">
                {run.error.stack}
              </pre>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t">
          <Button size="sm" onClick={onRerun}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            重新執行
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}

/* ─── Main Page ─── */
export default function Runs() {
  const navigate = useNavigate();
  const { runId } = useParams();
  const [searchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('task') ?? undefined;
  const { toast } = useToast();

  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const pollCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getRuns()
      .then((data) => {
        setRuns(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '載入失敗');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      pollCleanupRef.current?.();
      pollCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (runId) {
      getRun(runId).then((run) => {
        if (run) {
          setSelectedRun(run);
          setDrawerOpen(true);
        }
      });
    }
  }, [runId]);

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      if (taskIdFromUrl && run.taskId !== taskIdFromUrl) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !run.id.toLowerCase().includes(q) &&
          !run.taskName.toLowerCase().includes(q) &&
          !(run.error?.message ?? '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter && run.status !== statusFilter) return false;
      return true;
    });
  }, [runs, searchQuery, statusFilter, taskIdFromUrl]);

  // Stats
  const stats = useMemo(() => {
    const s = { total: runs.length, success: 0, failed: 0, running: 0 };
    for (const r of runs) {
      if (r.status === 'success') s.success++;
      else if (r.status === 'failed') s.failed++;
      else if (r.status === 'running' || r.status === 'queued') s.running++;
    }
    return s;
  }, [runs]);

  const handleRunClick = (run: Run) => {
    setSelectedRun(run);
    setDrawerOpen(true);
    navigate(`/runs/${run.id}`, { replace: true });
  };

  const handleRerun = async () => {
    if (!selectedRun) return;
    try {
      const run = await api.rerun(selectedRun.id);
      setRuns((prev) => [run, ...prev]);
      setSelectedRun(run);
      toast({ description: '已加入執行佇列' });
      const refresh = () => {
        getRuns().then(setRuns);
        getRun(run.id).then((r) => r && setSelectedRun((s) => (s?.id === run.id ? r : s)));
      };
      pollCleanupRef.current?.();
      pollCleanupRef.current = pollRunStatus(run.id, refresh);
    } catch (err) {
      toast({
        variant: 'destructive',
        description: err instanceof Error ? err.message : '重跑失敗',
      });
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    navigate('/runs', { replace: true });
  };

  const handleRefresh = () => {
    setLoading(true);
    getRuns()
      .then((data) => {
        setRuns(data);
        setLoading(false);
        toast({ description: `已載入 ${data.length} 筆紀錄` });
      })
      .catch(() => setLoading(false));
  };

  return (
    <PageContainer>
      <SectionHeader
        title="執行紀錄"
        icon="▶"
        description={
          taskIdFromUrl && filteredRuns[0]
            ? `任務「${filteredRuns[0].taskName}」的執行記錄`
            : `共 ${stats.total} 筆執行記錄`
        }
        action={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-1.5', loading && 'animate-spin')} />
            重新整理
          </Button>
        }
      />

      {/* Stats Bar */}
      {!loading && stats.total > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
              statusFilter === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            )}
            onClick={() => setStatusFilter(null)}
          >
            <Activity className="h-3.5 w-3.5" />
            全部 {stats.total}
          </button>
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
              statusFilter === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            )}
            onClick={() => setStatusFilter(statusFilter === 'success' ? null : 'success')}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            成功 {stats.success}
          </button>
          {stats.failed > 0 && (
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
                statusFilter === 'failed'
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
              onClick={() => setStatusFilter(statusFilter === 'failed' ? null : 'failed')}
            >
              <XCircle className="h-3.5 w-3.5" />
              失敗 {stats.failed}
            </button>
          )}
          {stats.running > 0 && (
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
                statusFilter === 'running'
                  ? 'bg-blue-500 text-white'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
              onClick={() => setStatusFilter(statusFilter === 'running' ? null : 'running')}
            >
              <Loader2 className="h-3.5 w-3.5" />
              執行中 {stats.running}
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="搜尋任務名稱..."
          className="max-w-sm"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          載入中...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-4">
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
            重試
          </Button>
        </div>
      )}

      {/* Run List */}
      {!loading && !error && (
        <div className="space-y-2">
          {filteredRuns.map((run) => {
            const preview = extractOutputPreview(run.outputSummary);
            return (
              <div
                key={run.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40 cursor-pointer transition-colors group"
                onClick={() => handleRunClick(run)}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {statusIcon[run.status] ?? <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {run.taskName || '(未命名)'}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 flex-shrink-0">
                      {shortId(run.id)}
                    </span>
                  </div>
                  {preview && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}</p>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                  {run.durationMs != null && (
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {formatDuration(run.durationMs)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(run.startedAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && filteredRuns.length === 0 && (
        <EmptyState
          title="沒有執行紀錄"
          description={
            searchQuery || statusFilter
              ? '嘗試調整搜尋或篩選條件'
              : '尚未有任何任務被執行過'
          }
        />
      )}

      {/* Run Detail Sheet */}
      <Sheet open={drawerOpen} onOpenChange={(open) => !open && handleDrawerClose()}>
        {selectedRun && <RunDetail run={selectedRun} onRerun={handleRerun} />}
      </Sheet>
    </PageContainer>
  );
}
