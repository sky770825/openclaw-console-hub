import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { SearchInput, FilterBar, type FilterConfig } from '@/components/common';
import { StatusBadge, PriorityBadge } from '@/components/common/Badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Play, 
  Edit, 
  MoreHorizontal,
  Clock,
  User,
  GripVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getTasks, getRunsByTask, triggerRun } from '@/services/api';
import type { Task, Run, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

/** Kanban 六欄（固定）：Draft → Ready → Running → Review → Done → Blocked */
const KANBAN_COLUMNS: {
  status: TaskStatus;
  label: string;
  color: string;
  definition: string;
}[] = [
  {
    status: 'draft',
    label: 'Draft',
    color: 'bg-secondary',
    definition: '想法未成熟、還不能動手',
  },
  {
    status: 'ready',
    label: 'Ready',
    color: 'bg-info/10',
    definition: '規格清楚、OpenClaw 可以直接做',
  },
  {
    status: 'running',
    label: 'Running',
    color: 'bg-accent/10',
    definition: '一次最多 1–2 張（避免系統失控）',
  },
  {
    status: 'review',
    label: 'Review',
    color: 'bg-warning/10',
    definition: '等你驗收、補決策',
  },
  {
    status: 'done',
    label: 'Done',
    color: 'bg-success/10',
    definition: '完成且可複用（技術資產）',
  },
  {
    status: 'blocked',
    label: 'Blocked',
    color: 'bg-destructive/10',
    definition: '缺 key / 缺決策 / 外部依賴',
  },
];

const filterConfigs: FilterConfig[] = [
  {
    key: 'status',
    label: '狀態',
    options: KANBAN_COLUMNS.map(c => ({ value: c.status, label: c.label })),
  },
  {
    key: 'priority',
    label: '優先級',
    options: [
      { value: '1', label: 'P1 - 緊急' },
      { value: '2', label: 'P2 - 高' },
      { value: '3', label: 'P3 - 中' },
      { value: '4', label: 'P4 - 低' },
      { value: '5', label: 'P5 - 最低' },
    ],
  },
  {
    key: 'scheduleType',
    label: '排程類型',
    options: [
      { value: 'cron', label: 'Cron' },
      { value: 'interval', label: '間隔' },
      { value: 'webhook', label: 'Webhook' },
      { value: 'manual', label: '手動' },
    ],
  },
];

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onRun: () => void;
}

function TaskCard({ task, onClick, onRun }: TaskCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-card-hover transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab flex-shrink-0" />
            <h3 className="font-medium text-sm truncate">{task.name}</h3>
          </div>
          <PriorityBadge priority={task.priority} />
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 2).map(tag => (
            <span 
              key={tag} 
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-xs text-muted-foreground">+{task.tags.length - 2}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{task.owner}</span>
          </div>
          {task.lastRunStatus && (
            <StatusBadge status={task.lastRunStatus} />
          )}
        </div>

        {task.nextRunAt && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>下次執行：{formatDate(task.nextRunAt)}</span>
          </div>
        )}

        {/* Quick Actions - show on hover */}
        <div className="flex items-center gap-1 mt-3 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
          >
            <Play className="h-3 w-3 mr-1" />
            執行
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="h-3 w-3 mr-2" />
                編輯
              </DropdownMenuItem>
              <DropdownMenuItem>查看執行紀錄</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">刪除</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

function TaskDetailDrawer({ task, open, onClose }: TaskDetailDrawerProps) {
  const [runs, setRuns] = useState<Run[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (task) {
      getRunsByTask(task.id).then(setRuns);
    }
  }, [task]);

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {task.name}
            <StatusBadge status={task.status} />
          </SheetTitle>
          <SheetDescription>{task.description}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">總覽</TabsTrigger>
            <TabsTrigger value="runs">執行</TabsTrigger>
            <TabsTrigger value="config">設定</TabsTrigger>
            <TabsTrigger value="history">歷史</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">優先級</p>
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">負責人</p>
                <p className="text-sm font-medium">{task.owner}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">排程類型</p>
                <p className="text-sm font-medium">{({ cron: 'Cron', interval: '間隔', webhook: 'Webhook', manual: '手動' } as Record<string, string>)[task.scheduleType] ?? task.scheduleType}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">排程表達式</p>
                <p className="text-sm font-mono">{task.scheduleExpr || '—'}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">標籤</p>
              <div className="flex flex-wrap gap-1">
                {task.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {task.nextRunAt && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">下次執行</p>
                <p className="text-sm font-medium">{formatDate(task.nextRunAt)}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={() => triggerRun(task.id)}>
                <Play className="h-4 w-4 mr-2" />
                立即執行
              </Button>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                編輯
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="runs" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {runs.slice(0, 10).map(run => (
                  <div 
                    key={run.id}
                    className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/runs/${run.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono">{run.id}</span>
                      <StatusBadge status={run.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(run.startedAt)}
                      {run.durationMs && ` • ${(run.durationMs / 1000).toFixed(1)}s`}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <div className="rounded-lg bg-muted p-4">
              <pre className="text-xs font-mono overflow-auto">
{JSON.stringify({
  id: task.id,
  scheduleType: task.scheduleType,
  scheduleExpr: task.scheduleExpr,
  priority: task.priority,
  tags: task.tags,
}, null, 2)}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="text-sm text-muted-foreground text-center py-8">
              變更歷史即將推出...
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default function TaskBoard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    getTasks().then(setTasks);
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (activeFilters.status && task.status !== activeFilters.status) {
        return false;
      }
      if (activeFilters.priority && task.priority !== Number(activeFilters.priority)) {
        return false;
      }
      if (activeFilters.scheduleType && task.scheduleType !== activeFilters.scheduleType) {
        return false;
      }
      return true;
    });
  }, [tasks, searchQuery, activeFilters]);

  const handleFilterChange = (key: string, value: string | string[] | null) => {
    setActiveFilters(prev => {
      if (value === null) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleRunTask = async (taskId: string) => {
    await triggerRun(taskId);
    // Optionally show toast
  };

  return (
    <PageContainer>
      <SectionHeader
        title="任務看板"
        description="管理和監控您的自動化任務"
        action={
          <Button onClick={() => navigate('/tasks?new=true')}>
            <Plus className="h-4 w-4 mr-2" />
            新增任務
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="搜尋任務..."
          className="sm:w-64"
        />
        <FilterBar
          filters={filterConfigs}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={() => setActiveFilters({})}
        />
      </div>

      {/* Kanban Board - Desktop */}
      <TooltipProvider>
      <div className="hidden lg:grid grid-cols-6 gap-4">
        {KANBAN_COLUMNS.map(column => {
          const columnTasks = filteredTasks.filter(t => t.status === column.status);
          return (
            <div key={column.status} className="flex flex-col">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-t-lg cursor-help',
                    column.color
                  )}>
                    <span className="text-sm font-medium">{column.label}</span>
                    <span className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
                      {columnTasks.length}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium">{column.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{column.definition}</p>
                </TooltipContent>
              </Tooltip>
              <ScrollArea className="flex-1 max-h-[calc(100vh-280px)]">
                <div className="space-y-2 p-2 bg-muted/30 rounded-b-lg min-h-[200px]">
                  {columnTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onClick={() => handleTaskClick(task)}
                      onRun={() => handleRunTask(task.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
      </TooltipProvider>

      {/* Mobile/Tablet View - Cards */}
      <div className="lg:hidden space-y-4">
        {KANBAN_COLUMNS.map(column => {
          const columnTasks = filteredTasks.filter(t => t.status === column.status);
          if (columnTasks.length === 0) return null;
          
          return (
            <div key={column.status}>
              <div className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg mb-2',
                column.color
              )}>
                <div>
                  <span className="text-sm font-medium">{column.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{column.definition}</p>
                </div>
                <span className="text-xs text-muted-foreground">{columnTasks.length}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {columnTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onClick={() => handleTaskClick(task)}
                    onRun={() => handleRunTask(task.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TaskDetailDrawer
        task={selectedTask}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </PageContainer>
  );
}
