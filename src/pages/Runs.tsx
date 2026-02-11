import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { SearchInput, FilterBar, type FilterConfig, EmptyState } from '@/components/common';
import { StatusBadge } from '@/components/common/Badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  RefreshCw, 
  Copy, 
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Play,
  XCircle,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { getRuns, getRun, api } from '@/services/api';
import type { Run, RunStep } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { pollRunStatus } from '@/lib/pollRunStatus';

const filterConfigs: FilterConfig[] = [
  {
    key: 'status',
    label: '狀態',
    options: [
      { value: 'queued', label: '佇列中' },
      { value: 'running', label: '執行中' },
      { value: 'success', label: '成功' },
      { value: 'failed', label: '失敗' },
      { value: 'cancelled', label: '已取消' },
    ],
  },
];

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} 毫秒`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} 秒`;
  return `${(ms / 60000).toFixed(1)} 分鐘`;
}

const stepStatusLabel: Record<RunStep['status'], string> = {
  success: '成功',
  failed: '失敗',
  running: '執行中',
  skipped: '略過',
  pending: '待處理',
  queued: '佇列中',
};

function StepIcon({ status }: { status: RunStep['status'] }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-accent animate-spin" />;
    case 'skipped':
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/50" />;
  }
}

interface RunDetailProps {
  run: Run;
  onRerun: () => void;
  onClose: () => void;
}

function RunDetail({ run, onRerun, onClose }: RunDetailProps) {
  const { toast } = useToast();
  const [inputOpen, setInputOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideJson, setOverrideJson] = useState('{}');

  const copyRunId = () => {
    navigator.clipboard.writeText(run.id);
    toast({ description: '執行 ID 已複製到剪貼簿' });
  };

  return (
    <>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono text-sm">{run.id}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyRunId}>
              <Copy className="h-3 w-3" />
            </Button>
          </SheetTitle>
          <SheetDescription>
            任務：{run.taskName}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status and timing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">狀態</p>
              <StatusBadge status={run.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">耗時</p>
              <p className="text-sm font-medium">
                {run.durationMs ? formatDuration(run.durationMs) : '執行中...'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">開始時間</p>
              <p className="text-sm">{formatDate(run.startedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">結束時間</p>
              <p className="text-sm">{run.endedAt ? formatDate(run.endedAt) : '—'}</p>
            </div>
          </div>

          {/* Input/Output */}
          <div className="space-y-2">
            <Collapsible open={inputOpen} onOpenChange={setInputOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium p-2 rounded hover:bg-muted">
                {inputOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                輸入摘要
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono">
                  {typeof run.inputSummary === 'string'
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(run.inputSummary), null, 2);
                        } catch {
                          return run.inputSummary;
                        }
                      })()
                    : JSON.stringify(run.inputSummary, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>

            {run.outputSummary && (
              <Collapsible open={outputOpen} onOpenChange={setOutputOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium p-2 rounded hover:bg-muted">
                  {outputOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  輸出摘要
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono">
                    {typeof run.outputSummary === 'string'
                      ? (run.outputSummary
                          ? (() => {
                              try {
                                return JSON.stringify(JSON.parse(run.outputSummary), null, 2);
                              } catch {
                                return run.outputSummary;
                              }
                            })()
                          : '—')
                      : JSON.stringify(run.outputSummary, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Steps Timeline */}
          <div>
            <h3 className="text-sm font-medium mb-3">步驟時間軸</h3>
            <div className="relative pl-6 space-y-3">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
              {run.steps.map((step, index) => (
                <div key={index} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-0.5 bg-background p-0.5">
                    <StepIcon status={step.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{step.name}</span>
                      <span className="text-xs text-muted-foreground">{stepStatusLabel[step.status]}</span>
                    </div>
                    {step.message && (
                      <p className="text-xs text-muted-foreground mt-0.5">{step.message}</p>
                    )}
                    {step.startedAt && (
                      <p className="text-xs text-muted-foreground">{formatDate(step.startedAt)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error Panel */}
          {run.error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  錯誤：{run.error.code}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">{run.error.message}</p>
                {run.error.stack && (
                  <pre className="text-xs bg-destructive/10 p-2 rounded overflow-x-auto font-mono">
                    {run.error.stack}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button className="flex-1" onClick={onRerun}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重新執行
            </Button>
            <Button variant="outline" onClick={() => setOverrideOpen(true)}>
              <Play className="h-4 w-4 mr-2" />
              自訂輸入執行
            </Button>
          </div>
        </div>
      </SheetContent>

      {/* Override JSON Modal */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>自訂輸入執行</DialogTitle>
            <DialogDescription className="sr-only">
              輸入自訂 JSON 參數後可觸發任務執行
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">輸入 JSON（自訂參數）</label>
            <Textarea
              value={overrideJson}
              onChange={(e) => setOverrideJson(e.target.value)}
              className="font-mono text-sm min-h-[200px]"
              placeholder='{"key": "value"}'
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>
              取消
            </Button>
            <Button onClick={() => {
              // Mock run with override
              setOverrideOpen(false);
              toast({ description: '已使用自訂輸入觸發任務' });
            }}>
              執行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Runs() {
  const navigate = useNavigate();
  const { runId } = useParams();
  const { toast } = useToast();
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({});
  const [selectedFailedRuns, setSelectedFailedRuns] = useState<Set<string>>(new Set());
  const [batchRerunLoading, setBatchRerunLoading] = useState(false);
  const [showBatchRerunConfirm, setShowBatchRerunConfirm] = useState(false);
  const pollCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    getRuns().then(setRuns);
  }, []);

  useEffect(() => {
    return () => {
      pollCleanupRef.current?.();
      pollCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (runId) {
      getRun(runId).then(run => {
        if (run) {
          setSelectedRun(run);
          setDrawerOpen(true);
        }
      });
    }
  }, [runId]);

  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!run.id.toLowerCase().includes(q) && 
            !run.taskName.toLowerCase().includes(q) &&
            !run.error?.message.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (activeFilters.status && run.status !== activeFilters.status) {
        return false;
      }
      return true;
    });
  }, [runs, searchQuery, activeFilters]);

  // 獲取失敗的任務列表
  const failedRuns = useMemo(() => {
    return runs.filter(run => run.status === 'failed');
  }, [runs]);

  // 切換選擇失敗任務
  const toggleFailedRunSelection = (runId: string) => {
    setSelectedFailedRuns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(runId)) {
        newSet.delete(runId);
      } else {
        newSet.add(runId);
      }
      return newSet;
    });
  };

  // 全選/取消全選失敗任務
  const toggleSelectAllFailed = () => {
    if (selectedFailedRuns.size === failedRuns.length) {
      setSelectedFailedRuns(new Set());
    } else {
      setSelectedFailedRuns(new Set(failedRuns.map(r => r.id)));
    }
  };

  // 批量重跑失敗任務
  const handleBatchRerun = async () => {
    if (selectedFailedRuns.size === 0) return;
    
    setBatchRerunLoading(true);
    const runIds = Array.from(selectedFailedRuns);
    const results = { success: 0, failed: 0 };
    
    try {
      // 串行執行避免壓垮後端
      for (const id of runIds) {
        try {
          await api.rerun(id);
          results.success++;
        } catch {
          results.failed++;
        }
      }
      
      // 刷新列表
      await getRuns().then(setRuns);
      
      toast({
        description: `批量重跑完成：${results.success} 成功, ${results.failed} 失敗`,
      });
      
      // 清空選擇
      setSelectedFailedRuns(new Set());
      setShowBatchRerunConfirm(false);
    } catch (err) {
      toast({ 
        variant: 'destructive', 
        description: err instanceof Error ? err.message : '批量重跑失敗' 
      });
    } finally {
      setBatchRerunLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | string[] | null) => {
    setActiveFilters(prev => {
      if (value === null) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  };

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
      toast({ description: '已加入執行佇列，正在執行…' });
      const refresh = () => {
        getRuns().then(setRuns);
        getRun(run.id).then((r) => r && setSelectedRun((s) => (s?.id === run.id ? r : s)));
      };
      pollCleanupRef.current?.();
      pollCleanupRef.current = pollRunStatus(run.id, refresh);
    } catch (err) {
      toast({ variant: 'destructive', description: err instanceof Error ? err.message : '重跑失敗' });
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    navigate('/runs', { replace: true });
  };

  return (
    <PageContainer>
      <SectionHeader
        title="執行紀錄"
        icon="▶"
        description="所有任務的執行歷史 · 與 OpenClaw evolution_log 對應"
      />

      {/* 批量重跑失敗任務提示 */}
      {failedRuns.length > 0 && (
        <Card className="mb-4 border-warning/50 bg-warning/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium">
                    有 {failedRuns.length} 個失敗的執行
                  </p>
                  <p className="text-xs text-muted-foreground">
                    選擇任務後可一鍵重跑
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedFailedRuns.size > 0 && (
                  <>
                    <span className="text-sm text-muted-foreground">
                      已選 {selectedFailedRuns.size} 個
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowBatchRerunConfirm(true)}
                      disabled={batchRerunLoading}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      一鍵重跑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFailedRuns(new Set())}
                    >
                      清除選擇
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="依執行 ID、任務或錯誤搜尋..."
          className="sm:w-80"
        />
        <FilterBar
          filters={filterConfigs}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={() => setActiveFilters({})}
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {failedRuns.length > 0 && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedFailedRuns.size === failedRuns.length && failedRuns.length > 0}
                    onChange={toggleSelectAllFailed}
                    className="rounded border-gray-300"
                  />
                </TableHead>
              )}
              <TableHead>執行 ID</TableHead>
              <TableHead>任務</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>開始時間</TableHead>
              <TableHead>耗時</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRuns.slice(0, 20).map(run => (
              <TableRow 
                key={run.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRunClick(run)}
              >
                {failedRuns.length > 0 && (
                  <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                    {run.status === 'failed' && (
                      <input
                        type="checkbox"
                        checked={selectedFailedRuns.has(run.id)}
                        onChange={() => toggleFailedRunSelection(run.id)}
                        className="rounded border-gray-300"
                      />
                    )}
                  </TableCell>
                )}
                <TableCell className="font-mono text-sm">{run.id}</TableCell>
                <TableCell className="font-medium">{run.taskName}</TableCell>
                <TableCell><StatusBadge status={run.status} /></TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(run.startedAt)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {run.durationMs ? formatDuration(run.durationMs) : '—'}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(run.id);
                      toast({ description: '執行 ID 已複製' });
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredRuns.slice(0, 20).map(run => (
          <Card 
            key={run.id}
            className="cursor-pointer hover:shadow-card-hover transition-all"
            onClick={() => handleRunClick(run)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{run.id}</p>
                  <p className="font-medium">{run.taskName}</p>
                </div>
                <StatusBadge status={run.status} />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(run.startedAt)}
                </div>
                {run.durationMs && (
                  <span>{formatDuration(run.durationMs)}</span>
                )}
              </div>
              {run.error && (
                <p className="text-xs text-destructive mt-2 truncate">
                  {run.error.message}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRuns.length === 0 && (
        <EmptyState
          title="找不到執行紀錄"
          description="請嘗試調整搜尋條件或篩選器"
        />
      )}

      {/* Run Detail Sheet */}
      <Sheet open={drawerOpen} onOpenChange={(open) => !open && handleDrawerClose()}>
        {selectedRun && (
          <RunDetail 
            run={selectedRun} 
            onRerun={handleRerun}
            onClose={handleDrawerClose}
          />
        )}
      </Sheet>

      {/* 批量重跑確認對話框 */}
      <Dialog open={showBatchRerunConfirm} onOpenChange={setShowBatchRerunConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              確認批量重跑
            </DialogTitle>
            <DialogDescription>
              即將重跑 {selectedFailedRuns.size} 個失敗的執行。此操作無法撤銷。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              選擇的執行將按順序重新執行，請確保後端有足夠資源處理。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchRerunConfirm(false)}>
              取消
            </Button>
            <Button 
              onClick={handleBatchRerun}
              disabled={batchRerunLoading}
            >
              {batchRerunLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  執行中...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  確認重跑
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
