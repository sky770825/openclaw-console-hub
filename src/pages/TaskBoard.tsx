import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { SearchInput, FilterBar, EmptyState, type FilterConfig } from '@/components/common';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getTasks, getTask, getRunsByTask, api, createTask, deleteTask } from '@/services/api';
import { resetSeedAndReload } from '@/services/seed';
import type { Task, Run, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { pollRunStatus } from '@/lib/pollRunStatus';

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
  onEdit: () => void;
  onViewRuns: () => void;
  onDelete: () => void;
}

function TaskCard({ task, onClick, onRun, onEdit, onViewRuns, onDelete }: TaskCardProps) {
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
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="h-3 w-3 mr-2" />
                編輯
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewRuns(); }}>
                查看執行紀錄
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                刪除
              </DropdownMenuItem>
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
  initialTab?: string;
  onTaskUpdated?: () => void;
  onDelete?: (taskId: string) => void;
}

function TaskDetailDrawer({ task, open, onClose, initialTab = 'overview', onTaskUpdated, onDelete }: TaskDetailDrawerProps) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [runNowLoading, setRunNowLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const navigate = useNavigate();
  const pollCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, task?.id]);

  useEffect(() => {
    if (task) setEditForm({ name: task.name, description: task.description, status: task.status, priority: task.priority, owner: task.owner, scheduleType: task.scheduleType, scheduleExpr: task.scheduleExpr ?? '', tags: task.tags });
  }, [task]);

  const refreshRuns = () => {
    if (task) getRunsByTask(task.id).then(setRuns);
  };

  useEffect(() => {
    if (task) refreshRuns();
  }, [task]);

  useEffect(() => {
    return () => {
      pollCleanupRef.current?.();
      pollCleanupRef.current = null;
    };
  }, []);

  const handleRunNow = async () => {
    if (!task) return;
    setRunNowLoading(true);
    try {
      const run = await api.runNow(task.id);
      refreshRuns();
      toast.success('已加入執行佇列，正在執行…');
      pollCleanupRef.current?.();
      pollCleanupRef.current = pollRunStatus(run.id, refreshRuns);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '執行失敗');
    } finally {
      setRunNowLoading(false);
    }
  };

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

        <Tabs value={activeTab} onValueChange={setActiveTab} key={task.id} className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">總覽</TabsTrigger>
            <TabsTrigger value="runs">執行</TabsTrigger>
            <TabsTrigger value="config">設定</TabsTrigger>
            <TabsTrigger value="edit">編輯</TabsTrigger>
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
              <Button
                className="flex-1"
                onClick={handleRunNow}
                disabled={runNowLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                {runNowLoading ? '執行中…' : '立即執行'}
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('edit')}>
                <Edit className="h-4 w-4 mr-2" />
                編輯
              </Button>
              {onDelete && (
                <Button variant="outline" className="text-destructive" onClick={() => setDeleteConfirmOpen(true)}>
                  刪除任務
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="edit" className="mt-4 space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>名稱</Label>
                <Input value={editForm.name ?? ''} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>說明</Label>
                <Textarea value={editForm.description ?? ''} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>狀態</Label>
                  <Select value={editForm.status ?? task.status} onValueChange={(v: TaskStatus) => setEditForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KANBAN_COLUMNS.map(c => (<SelectItem key={c.status} value={c.status}>{c.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>優先級</Label>
                  <Select value={String(editForm.priority ?? task.priority)} onValueChange={(v) => setEditForm(f => ({ ...f, priority: Number(v) as Task['priority'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map(p => (<SelectItem key={p} value={String(p)}>P{p}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>負責人</Label>
                <Input value={editForm.owner ?? ''} onChange={(e) => setEditForm(f => ({ ...f, owner: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>排程表達式</Label>
                <Input value={editForm.scheduleExpr ?? ''} onChange={(e) => setEditForm(f => ({ ...f, scheduleExpr: e.target.value }))} placeholder="例如 0 9 * * *" />
              </div>
            </div>
            <Button disabled={saving} onClick={async () => {
              if (!task) return;
              setSaving(true);
              try {
                await api.updateTask(task.id, { name: editForm.name, description: editForm.description, status: editForm.status, priority: editForm.priority, owner: editForm.owner, scheduleExpr: editForm.scheduleExpr || undefined });
                toast.success('已儲存');
                onTaskUpdated?.();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : '儲存失敗');
              } finally {
                setSaving(false);
              }
            }}>
              {saving ? '儲存中…' : '儲存'}
            </Button>
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

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>刪除任務</AlertDialogTitle>
            <AlertDialogDescription>確定要刪除「{task.name}」嗎？此操作無法復原。</AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (task && onDelete) { onDelete(task.id); onClose(); setDeleteConfirmOpen(false); } }}>
                刪除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

const DEFAULT_NEW_TASK: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  status: 'draft',
  tags: [],
  owner: '我',
  priority: 3,
  scheduleType: 'manual',
  scheduleExpr: '',
};

function NewTaskSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState(DEFAULT_NEW_TASK);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('請輸入任務名稱'); return; }
    setSubmitting(true);
    try {
      await createTask({ ...form, name: form.name.trim(), description: form.description?.trim() ?? '' });
      toast.success('已新增任務');
      setForm(DEFAULT_NEW_TASK);
      onClose();
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '新增失敗');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>新增任務</SheetTitle>
          <SheetDescription>建立一筆新的自動化任務</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="grid gap-2">
            <Label>名稱 *</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="任務名稱" />
          </div>
          <div className="grid gap-2">
            <Label>說明</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="任務說明" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>狀態</Label>
              <Select value={form.status} onValueChange={(v: TaskStatus) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KANBAN_COLUMNS.map(c => (<SelectItem key={c.status} value={c.status}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>優先級</Label>
              <Select value={String(form.priority)} onValueChange={(v) => setForm(f => ({ ...f, priority: Number(v) as Task['priority'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(p => (<SelectItem key={p} value={String(p)}>P{p}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>負責人</Label>
            <Input value={form.owner} onChange={(e) => setForm(f => ({ ...f, owner: e.target.value }))} />
          </div>
          <Button className="w-full" disabled={submitting} onClick={handleSubmit}>
            {submitting ? '建立中…' : '建立任務'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function TaskBoard() {
  const navigate = useNavigate();
  const { taskId: taskIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState('overview');
  const [newTaskSheetOpen, setNewTaskSheetOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const refreshTasks = () => getTasks().then(setTasks);

  useEffect(() => {
    refreshTasks();
  }, []);

  // URL taskId → open drawer
  useEffect(() => {
    if (!taskIdParam) return;
    const t = tasks.find(x => x.id === taskIdParam);
    if (t) {
      setSelectedTask(t);
      setDrawerOpen(true);
    } else {
      getTask(taskIdParam).then((task) => {
        if (task) {
          setSelectedTask(task as Task);
          setDrawerOpen(true);
        }
      });
    }
  }, [taskIdParam, tasks]);

  // ?new=true → open new task sheet
  useEffect(() => {
    if (searchParams.get('new') === 'true') setNewTaskSheetOpen(true);
  }, [searchParams]);

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedTask(null);
    if (taskIdParam) navigate('/tasks');
  };

  const handleTaskClick = (task: Task, openEditTab = false) => {
    setSelectedTask(task);
    setDrawerInitialTab(openEditTab ? 'edit' : 'overview');
    setDrawerOpen(true);
    navigate(`/tasks/${task.id}`);
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      refreshTasks();
      setTaskToDelete(null);
      setDrawerOpen(false);
      setSelectedTask(null);
      navigate('/tasks');
      toast.success('已刪除任務');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '刪除失敗');
    }
  };

  const handleNewTaskClick = () => {
    setSearchParams({ new: 'true' });
    setNewTaskSheetOpen(true);
  };

  const closeNewTaskSheet = () => {
    setNewTaskSheetOpen(false);
    setSearchParams({});
  };

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

  const handleRunTask = async (taskId: string) => {
    try {
      const run = await api.runNow(taskId);
      getTasks().then(setTasks);
      toast.success('已加入執行佇列，正在執行…');
      pollRunStatus(run.id, () => getTasks().then(setTasks));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '執行失敗');
    }
  };

  return (
    <PageContainer>
      <SectionHeader
        title="任務看板"
        description="管理和監控您的自動化任務 · 與 OpenClaw Agent 板同步"
        icon="📊"
        action={
          <Button onClick={handleNewTaskClick}>
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
      <div className="hidden lg:grid grid-cols-6 gap-4" style={{ display: filteredTasks.length === 0 ? 'none' : undefined }}>
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
                      onEdit={() => handleTaskClick(task, true)}
                      onViewRuns={() => navigate(`/runs?task=${task.id}`)}
                      onDelete={() => setTaskToDelete(task)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
      </TooltipProvider>

      {filteredTasks.length === 0 && (
        <EmptyState
          title="尚無任務"
          description={tasks.length === 0 ? '點擊「新增任務」建立第一筆任務，或載入範例任務' : '沒有符合篩選條件的任務，可調整搜尋或篩選'}
          action={tasks.length === 0 ? { label: '新增任務', onClick: handleNewTaskClick } : { label: '清除篩選', onClick: () => { setSearchQuery(''); setActiveFilters({}); } }}
          secondaryAction={tasks.length === 0 ? { label: '載入範例任務', onClick: resetSeedAndReload } : undefined}
          className="py-16"
        />
      )}

      {/* Mobile/Tablet View - Cards */}
      <div className="lg:hidden space-y-4" style={{ display: filteredTasks.length === 0 ? 'none' : undefined }}>
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
                    onEdit={() => handleTaskClick(task, true)}
                    onViewRuns={() => navigate(`/runs?task=${task.id}`)}
                    onDelete={() => setTaskToDelete(task)}
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
        onClose={handleCloseDrawer}
        initialTab={drawerInitialTab}
        onTaskUpdated={refreshTasks}
        onDelete={handleDeleteTask}
      />

      <NewTaskSheet open={newTaskSheetOpen} onClose={closeNewTaskSheet} onCreated={refreshTasks} />

      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>刪除任務</AlertDialogTitle>
          <AlertDialogDescription>
            確定要刪除「{taskToDelete?.name}」嗎？此操作無法復原。
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => taskToDelete && handleDeleteTask(taskToDelete.id)}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
