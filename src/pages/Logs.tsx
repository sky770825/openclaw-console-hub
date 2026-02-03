import { useState, useEffect, useMemo } from 'react';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { SearchInput, EmptyState } from '@/components/common';
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
  Copy, 
  Download,
  RefreshCw
} from 'lucide-react';
import { getLogs, getTasks } from '@/services/api';
import type { LogEntry, LogLevel, Task } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

export default function Logs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    Promise.all([getLogs(), getTasks()]).then(([logsData, tasksData]) => {
      setLogs(logsData);
      setTasks(tasksData);
    });
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      getLogs().then(setLogs);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!log.message.toLowerCase().includes(q) && 
            !log.source.toLowerCase().includes(q) &&
            !log.runId?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (levelFilter !== 'all' && log.level !== levelFilter) {
        return false;
      }
      if (taskFilter !== 'all' && log.taskId !== taskFilter) {
        return false;
      }
      return true;
    });
  }, [logs, searchQuery, levelFilter, taskFilter]);

  const copyLog = (log: LogEntry) => {
    navigator.clipboard.writeText(`[${log.timestamp}] [${log.level.toUpperCase()}] ${log.source}: ${log.message}`);
    toast({ description: '日誌已複製到剪貼簿' });
  };

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
    toast({ description: '日誌已匯出' });
  };

  return (
    <PageContainer>
      <SectionHeader
        title="日誌"
        description="瀏覽系統和任務執行日誌"
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
              onClick={() => {
                setSearchQuery('');
                setLevelFilter('all');
                setTaskFilter('all');
              }}
            >
              清除篩選
            </Button>
          </CardContent>
        </Card>

        {/* Log Stream */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              日誌串流
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                ({filteredLogs.length} 筆)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="font-mono text-sm divide-y">
                {filteredLogs.length === 0 ? (
                  <EmptyState
                    title="找不到日誌"
                    description="請嘗試調整篩選器或搜尋條件"
                    className="py-12"
                  />
                ) : (
                  filteredLogs.map((log) => (
                    <div 
                      key={log.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-2 hover:bg-muted/50 group transition-colors',
                        log.level === 'error' && 'bg-destructive/5 hover:bg-destructive/10'
                      )}
                    >
                      <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <LogLevelBadge level={log.level} className="w-14 flex-shrink-0 pt-0.5" />
                      <span className="text-xs text-muted-foreground w-20 flex-shrink-0 truncate pt-0.5">
                        {log.source}
                      </span>
                      <p className={cn(
                        'flex-1 break-all text-xs',
                        log.level === 'error' && 'text-destructive'
                      )}>
                        {log.message}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => copyLog(log)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
