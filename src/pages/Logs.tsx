import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { SearchInput, EmptyState, LoadingSkeleton } from '@/components/common';
import { LogLevelBadge } from '@/components/common/Badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, 
  Download,
  RefreshCw,
  FileText,
  Calendar,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { getLogs, getTasks } from '@/services/api';
import type { LogEntry, LogLevel, Task } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

function formatTimestamp(date: string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function formatDateHeader(date: string): string {
  return new Date(date).toLocaleDateString('zh-TW', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// 時間範圍選項
type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all';

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '過去 1 小時' },
  { value: '24h', label: '過去 24 小時' },
  { value: '7d', label: '過去 7 天' },
  { value: '30d', label: '過去 30 天' },
  { value: 'all', label: '全部' },
];

function getTimeRangeStart(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
}

export default function Logs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [newLogsCount, setNewLogsCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<LogEntry[]>([]);

  // 搜尋防抖
  const { debouncedFn: debouncedSetSearch } = useDebounce(
    (value: string) => setDebouncedSearchQuery(value),
    { delay: 300 }
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    debouncedSetSearch(value);
  }, [debouncedSetSearch]);

  // 載入日誌和任務
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [logsData, tasksData] = await Promise.all([getLogs(), getTasks()]);
      
      // 檢查是否有新日誌
      if (logsRef.current.length > 0 && logsData.length > logsRef.current.length) {
        const diff = logsData.length - logsRef.current.length;
        setNewLogsCount(prev => prev + diff);
      }
      
      logsRef.current = logsData;
      setLogs(logsData);
      setTasks(tasksData);
    } catch (error) {
      toast({
        title: '載入失敗',
        description: error instanceof Error ? error.message : '無法載入日誌',
        variant: 'destructive',
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 自動刷新
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const filteredLogs = useMemo(() => {
    const timeStart = getTimeRangeStart(timeRange);
    
    let result = logs.filter(log => {
      // 時間範圍篩選
      if (timeStart && new Date(log.timestamp) < timeStart) {
        return false;
      }
      
      // 搜尋篩選（使用防抖後的值）
      if (debouncedSearchQuery) {
        const q = debouncedSearchQuery.toLowerCase();
        if (!log.message.toLowerCase().includes(q) && 
            !log.source.toLowerCase().includes(q) &&
            !log.runId?.toLowerCase().includes(q)) {
          return false;
        }
      }
      
      // 層級篩選
      if (levelFilter !== 'all' && log.level !== levelFilter) {
        return false;
      }
      
      // 任務篩選
      if (taskFilter !== 'all' && log.taskId !== taskFilter) {
        return false;
      }
      
      return true;
    });
    
    // 排序
    result = result.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
    
    return result;
  }, [logs, debouncedSearchQuery, levelFilter, taskFilter, timeRange, sortOrder]);

  const copyLog = (log: LogEntry) => {
    navigator.clipboard.writeText(`[${log.timestamp}] [${log.level.toUpperCase()}] ${log.source}: ${log.message}`);
    toast({ description: '日誌已複製到剪貼簿' });
  };

  // 匯出日誌
  const exportLogs = () => {
    const content = filteredLogs
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.source}: ${log.message}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ description: `已匯出 ${filteredLogs.length} 筆日誌` });
  };

  // 匯出 JSON 格式
  const exportLogsJSON = () => {
    const content = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ description: `已匯出 ${filteredLogs.length} 筆日誌 (JSON)` });
  };

  // 清除新日誌提示
  const handleScrollToBottom = () => {
    setNewLogsCount(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // 清除所有篩選
  const clearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setLevelFilter('all');
    setTaskFilter('all');
    setTimeRange('24h');
  };

  return (
    <PageContainer>
      <SectionHeader
        title="日誌"
        description="瀏覽系統和任務執行日誌 · 與 OpenClaw evolution_log 對應"
        icon="📄"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', autoRefresh && 'animate-spin')} />
              {autoRefresh ? '即時' : '自動更新'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              匯出
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        {/* Filters Sidebar */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">篩選器</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">搜尋</label>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="關鍵字、執行 ID..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">層級</label>
              <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LogLevel | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有層級</SelectItem>
                  <SelectItem value="debug">除錯</SelectItem>
                  <SelectItem value="info">資訊</SelectItem>
                  <SelectItem value="warn">警告</SelectItem>
                  <SelectItem value="error">錯誤</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">時間範圍</label>
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">任務</label>
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有任務</SelectItem>
                  {tasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={clearAllFilters}
            >
              清除篩選
            </Button>
          </CardContent>
        </Card>

        {/* Log Stream */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm font-medium">
                日誌串流
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  ({filteredLogs.length} 筆)
                </span>
              </CardTitle>
              {/* 統計徽章 */}
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  {filteredLogs.filter(l => l.level === 'error').length} 錯誤
                </Badge>
                <Badge variant="outline" className="text-xs text-yellow-600">
                  {filteredLogs.filter(l => l.level === 'warn').length} 警告
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 排序切換 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              >
                {sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative">
            {/* 新日誌提示 */}
            {newLogsCount > 0 && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleScrollToBottom}
                  className="shadow-lg"
                >
                  {newLogsCount} 筆新日誌 ↓
                </Button>
              </div>
            )}
            
            <ScrollArea className="h-[calc(100vh-280px)]" ref={scrollRef}>
              <div className="font-mono text-sm">
                {loading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <LoadingSkeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <EmptyState
                    title="找不到日誌"
                    description="請嘗試調整篩選器或搜尋條件"
                    className="py-12"
                  />
                ) : (
                  filteredLogs.map((log, index) => {
                    // 檢查是否需要顯示日期分隔線
                    const prevLog = index > 0 ? filteredLogs[index - 1] : null;
                    const showDateHeader = !prevLog || 
                      new Date(log.timestamp).toDateString() !== new Date(prevLog.timestamp).toDateString();
                    
                    return (
                      <div key={log.id}>
                        {showDateHeader && (
                          <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-4 py-1 text-xs font-medium text-muted-foreground border-y">
                            {formatDateHeader(log.timestamp)}
                          </div>
                        )}
                        <div 
                          className={cn(
                            'flex items-start gap-3 px-4 py-2 hover:bg-muted/50 group transition-colors cursor-pointer border-b border-border/50',
                            log.level === 'error' && 'bg-destructive/5 hover:bg-destructive/10'
                          )}
                          onClick={() => setSelectedLog(log)}
                        >
                          <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          <LogLevelBadge level={log.level} className="w-14 flex-shrink-0 pt-0.5" />
                          <span className="text-xs text-muted-foreground w-20 flex-shrink-0 truncate pt-0.5">
                            {log.source}
                          </span>
                          <p className={cn(
                            'flex-1 break-all text-xs line-clamp-2',
                            log.level === 'error' && 'text-destructive'
                          )}>
                            {log.message}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyLog(log);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* 日誌詳情對話框 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              日誌詳情
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">時間</label>
                  <p className="text-sm font-mono">{selectedLog.timestamp}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">層級</label>
                  <div className="mt-1"><LogLevelBadge level={selectedLog.level} /></div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">來源</label>
                  <p className="text-sm">{selectedLog.source}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">執行 ID</label>
                  <p className="text-sm font-mono">{selectedLog.runId || '—'}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">訊息</label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <p className="text-sm font-mono whitespace-pre-wrap">{selectedLog.message}</p>
                </div>
              </div>
              {selectedLog.metadata && (
                <div>
                  <label className="text-xs text-muted-foreground">Metadata</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono overflow-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => copyLog(selectedLog)}>
                  <Copy className="h-4 w-4 mr-2" />
                  複製
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
