import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useDebounce } from '@/hooks/useDebounce';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { SearchInput, FilterBar, EmptyState, type FilterConfig } from '@/components/common';
import { StatusBadge, PriorityBadge } from '@/components/common/Badges';
import { SectionErrorBoundary } from '@/components/common/ErrorBoundary';
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
  GripVertical,
  Trash2,
  CalendarClock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { getTasks, getTask, getRunsByTask, api, createTask, deleteTask, forceRefreshTasks, getSystemSchedules } from '@/services/api';
import { resetSeedAndReload } from '@/services/seed';
import type { Task, Run, TaskStatus, SystemSchedule } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { pollRunStatus } from '@/lib/pollRunStatus';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';

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
  /** Kanban 拖曳用（可選） */
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: (event: React.DragEvent) => void;
  isDragging?: boolean;
}

function TaskCard({ task, onClick, onRun, onEdit, onViewRuns, onDelete, draggable, onDragStart, onDragEnd, isDragging }: TaskCardProps) {
  const [isLocalDragging, setIsLocalDragging] = useState(false);
  
  const handleDragStart = (e: React.DragEvent) => {
    setIsLocalDragging(true);
    onDragStart?.(e);
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    setIsLocalDragging(false);
    onDragEnd?.(e);
  };
  
  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-card-hover transition-all duration-200 group",
        (isDragging || isLocalDragging) && "opacity-60 ring-2 ring-primary shadow-lg scale-[1.02]"
      )}
      onClick={onClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div 
              className={cn(
                "flex-shrink-0 p-1 rounded transition-all duration-150",
                draggable 
                  ? "cursor-grab active:cursor-grabbing hover:bg-muted hover:scale-110" 
                  : "cursor-not-allowed opacity-30"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical 
                className={cn(
                  "h-4 w-4 transition-colors",
                  (isDragging || isLocalDragging) 
                    ? "text-primary" 
                    : "text-muted-foreground/50 group-hover:text-muted-foreground"
                )} 
              />
            </div>
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
  onTaskUpdated?: (force?: boolean) => void;
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
                <Select value={editForm.owner ?? '小蔡'} onValueChange={(v) => setEditForm(f => ({ ...f, owner: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OWNERS.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>排程表達式</Label>
                <Input value={editForm.scheduleExpr ?? ''} onChange={(e) => setEditForm(f => ({ ...f, scheduleExpr: e.target.value }))} placeholder="例如 0 9 * * *" />
              </div>
            </div>
            <Button
              disabled={saving}
              onClick={async () => {
                if (!task) return;
                if (!editForm.name?.trim()) {
                  toast.error('請輸入任務名稱');
                  return;
                }
                setSaving(true);
                try {
                  const updated = await api.updateTask(task.id, {
                    name: editForm.name.trim(),
                    description: editForm.description?.trim() ?? '',
                    status: editForm.status,
                    priority: editForm.priority,
                    owner: editForm.owner,
                    scheduleExpr: editForm.scheduleExpr || undefined,
                  });
                  if (!updated) {
                    throw new Error('更新任務失敗，請稍後再試');
                  }
                  toast.success('已儲存');
                  // 重新載入任務列表（強制從後端刷新，避免 fallback 到 mock）
                  onTaskUpdated?.(true);
                  // 切換回總覽頁籤，讓用戶看到更新後的資料
                  setActiveTab('overview');
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : '儲存失敗'
                  );
                } finally {
                  setSaving(false);
                }
              }}
            >
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

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-base font-semibold">
                    確定要刪除這個任務嗎？
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    刪除後將無法復原，相關執行紀錄仍會保留於系統中。
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">任務名稱：</span>
              {task.name}
            </div>
            <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={() => {
                  if (task && onDelete) {
                    onDelete(task.id);
                    onClose();
                    setDeleteConfirmOpen(false);
                  }
                }}
              >
                刪除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

const OWNERS = ['小蔡', 'OpenClaw', 'Cursor', 'CoDEX', '老蔡'] as const;

const DEFAULT_NEW_TASK: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  status: 'draft',
  tags: [],
  owner: '小蔡',
  priority: 3,
  scheduleType: 'manual',
  scheduleExpr: '',
};

function NewTaskSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (force?: boolean) => void }) {
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
      onCreated(true);
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
            <Select value={form.owner} onValueChange={(v) => setForm(f => ({ ...f, owner: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OWNERS.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
              </SelectContent>
            </Select>
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({});
  
  // 搜尋防抖
  const { debouncedFn: debouncedSetSearch } = useDebounce(
    (value: string) => setDebouncedSearchQuery(value),
    { delay: 300 }
  );
  
  // 處理搜尋輸入變化
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    debouncedSetSearch(value);
  }, [debouncedSetSearch]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState('overview');
  const [newTaskSheetOpen, setNewTaskSheetOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [tasksLoading, setTasksLoading] = useState(true);
  
  // System Schedules（系統排程）
  const [systemSchedules, setSystemSchedules] = useState<SystemSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  
  const refreshTasks = (force = false) => {
    setTasksLoading(true);
    const fetchPromise = force ? forceRefreshTasks() : getTasks();
    fetchPromise
      .then((tasks) => {
        setTasks(tasks);
        if (selectedTask) {
          const updatedTask = tasks.find((t) => t.id === selectedTask.id);
          if (updatedTask) setSelectedTask(updatedTask);
        }
      })
      .catch((err) => {
        console.error('[TaskBoard] 載入任務失敗:', err);
        toast.error('載入任務失敗，請檢查後端連線');
      })
      .finally(() => setTasksLoading(false));
  };

  useEffect(() => {
    refreshTasks();
  }, []);
  
  // 載入系統排程
  useEffect(() => {
    if (!showSchedules) return;
    setSchedulesLoading(true);
    getSystemSchedules()
      .then((schedules) => {
        setSystemSchedules(schedules);
      })
      .catch((err) => {
        console.error('[TaskBoard] 載入系統排程失敗:', err);
      })
      .finally(() => setSchedulesLoading(false));
  }, [showSchedules]);

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
      refreshTasks(true);
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
      if (debouncedSearchQuery && !task.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) {
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
  }, [tasks, debouncedSearchQuery, activeFilters]);

  const handleFilterChange = (key: string, value: string | string[] | null) => {
    setActiveFilters(prev => {
      if (value === null) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  };

  const ws = useWebSocket();
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);

  // 監聽 WebSocket 進度，任務完成時重置
  useEffect(() => {
    if (ws.progress?.status === 'success' || ws.progress?.status === 'failed') {
      // 延遲 3 秒後重置，讓使用者看到完成狀態
      const timer = setTimeout(() => {
        setExecutingTaskId(null);
        ws.clearLogs();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [ws.progress?.status, ws]);

  const handleRunTask = async (taskId: string) => {
    try {
      setExecutingTaskId(taskId);
      const run = await api.runNow(taskId);
      getTasks().then(setTasks);
      toast.success('已加入執行佇列，正在執行…');
      
      // WebSocket: 訂閱該 run 的更新
      ws.subscribe(run.id);
      
      pollRunStatus(run.id, () => getTasks().then(setTasks));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '執行失敗');
      setExecutingTaskId(null);
    }
  };

  const handleTaskDropToColumn = async (targetStatus: TaskStatus) => {
    if (!draggingTaskId) return;
    const task = tasks.find((t) => t.id === draggingTaskId);
    if (!task || task.status === targetStatus) {
      setDraggingTaskId(null);
      setDragOverStatus(null);
      return;
    }

    // 先本地更新，提供即時反饋
    const originalStatus = task.status;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggingTaskId ? { ...t, status: targetStatus } : t
      )
    );
    
    try {
      const updated = await api.updateTask(draggingTaskId, {
        status: targetStatus,
      });
      if (!updated) {
        throw new Error('更新任務狀態失敗，請稍後再試');
      }
      // 強制刷新確保資料一致性
      await refreshTasks(true);
      toast.success(`已將「${task.name}」移至 ${KANBAN_COLUMNS.find(c => c.status === targetStatus)?.label}`);
    } catch (err) {
      // 發生錯誤時恢復原狀態
      setTasks((prev) =>
        prev.map((t) =>
          t.id === draggingTaskId ? { ...t, status: originalStatus } : t
        )
      );
      toast.error(
        err instanceof Error ? err.message : '更新任務狀態失敗'
      );
    } finally {
      setDraggingTaskId(null);
      setDragOverStatus(null);
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
          onChange={handleSearchChange}
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

      {/* WebSocket 即時進度顯示 */}
      {ws.progress && executingTaskId && (
        <Card className="mb-6 border-primary/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">🚀 即時執行進度</span>
              <span className={`text-xs ${ws.isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
                {ws.isConnected ? '🟢 即時連線' : '🟡 未連線'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{ws.progress.message}</span>
                  <span className="text-muted-foreground">{ws.progress.step}/{ws.progress.totalSteps}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(ws.progress.step / ws.progress.totalSteps) * 100}%` }}
                  />
                </div>
                {ws.progress.detail && (
                  <p className="text-xs text-muted-foreground mt-1">{ws.progress.detail}</p>
                )}
              </div>
            </div>
            {ws.logs.length > 0 && (
              <div className="mt-3 pt-3 border-t text-xs space-y-1 max-h-24 overflow-y-auto">
                {ws.logs.slice(-5).map((log) => (
                  <div key={log.id} className="flex items-center gap-2">
                    <span className={
                      log.level === 'error' ? 'text-red-500' :
                      log.level === 'success' ? 'text-green-500' :
                      log.level === 'warn' ? 'text-yellow-500' :
                      'text-blue-500'
                    }>
                      {log.level === 'error' ? '❌' : log.level === 'success' ? '✅' : log.level === 'warn' ? '⚠️' : 'ℹ️'}
                    </span>
                    <span className="text-muted-foreground truncate">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 載入中：顯示骨架，減少空白等待感 */}
      {tasksLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6 mb-6">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.status} className="space-y-2">
              <LoadingSkeleton className="h-9 w-full rounded-t-lg" />
              <div className="space-y-2 p-2 rounded-b-lg bg-muted/30 min-h-[200px]">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                    <LoadingSkeleton className="h-4 w-3/4" />
                    <LoadingSkeleton className="h-3 w-full" />
                    <LoadingSkeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Board - Responsive */}
      <SectionErrorBoundary sectionName="任務看板" onReset={() => refreshTasks(true)}>
        <TooltipProvider>
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6"
          style={{ display: tasksLoading || filteredTasks.length === 0 ? 'none' : undefined }}
        >
          {KANBAN_COLUMNS.map(column => {
            const columnTasks = filteredTasks.filter(t => t.status === column.status);
            const isActiveDrop = dragOverStatus === column.status;
            return (
              <div
                key={column.status}
                className="flex flex-col"
                onDragOver={(e) => {
                  if (!draggingTaskId) return;
                  e.preventDefault();
                  setDragOverStatus(column.status);
                }}
                onDragLeave={(e) => {
                  // 只有在離開整個欄位時才清除（避免子元素觸發）
                  if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
                  setDragOverStatus((prev) => (prev === column.status ? null : prev));
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  await handleTaskDropToColumn(column.status);
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-t-lg cursor-help transition-all duration-200',
                      column.color,
                      isActiveDrop && 'ring-2 ring-primary ring-offset-1'
                    )}>
                      <span className="text-sm font-medium">{column.label}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded transition-all duration-200",
                        isActiveDrop 
                          ? "bg-primary text-primary-foreground font-semibold" 
                          : "text-muted-foreground bg-background/50"
                      )}>
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
                  <div
                    className={cn(
                      'space-y-2 p-2 bg-muted/30 rounded-b-lg min-h-[200px] transition-all duration-200',
                      isActiveDrop && 'ring-2 ring-primary/50 bg-primary/10 shadow-inner'
                    )}
                  >
                    {columnTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onClick={() => handleTaskClick(task)}
                        onRun={() => handleRunTask(task.id)}
                        onEdit={() => handleTaskClick(task, true)}
                        onViewRuns={() => navigate(`/runs?task=${task.id}`)}
                        onDelete={() => setTaskToDelete(task)}
                        draggable
                        isDragging={draggingTaskId === task.id}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', task.id);
                          setDraggingTaskId(task.id);
                          // 設置拖曳時的視覺效果
                          if (e.dataTransfer.setDragImage) {
                            const el = e.currentTarget as HTMLElement;
                            e.dataTransfer.setDragImage(el, 20, 20);
                          }
                        }}
                        onDragEnd={() => {
                          setDraggingTaskId(null);
                          setDragOverStatus(null);
                        }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
        </TooltipProvider>
      </SectionErrorBoundary>

      {!tasksLoading && filteredTasks.length === 0 && (
        <EmptyState
          title="尚無任務"
          description={
            tasks.length === 0
              ? '點擊「新增任務」建立第一筆任務，或載入範例任務'
              : '沒有符合篩選條件的任務，可調整搜尋或篩選'
          }
          action={
            tasks.length === 0
              ? { label: '新增任務', onClick: handleNewTaskClick }
              : {
                  label: '清除篩選',
                  onClick: () => {
                    setSearchQuery('');
                    setDebouncedSearchQuery('');
                    setActiveFilters({});
                  },
                }
          }
          secondaryAction={
            tasks.length === 0
              ? { label: '載入範例任務', onClick: resetSeedAndReload }
              : undefined
          }
          className="py-16"
        />
      )}

      {/* 系統排程區塊 */}
      <Card className="mt-8 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">系統排程</h3>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {systemSchedules.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSchedules(!showSchedules)}
            >
              {showSchedules ? '收起' : '展開'}
            </Button>
          </div>
          
          {showSchedules && (
            <>
              {schedulesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <LoadingSkeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : systemSchedules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  尚無系統排程，或無法連線至 OpenClaw
                </p>
              ) : (
                <div className="space-y-2">
                  {systemSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {schedule.name}
                          </span>
                          {!schedule.enabled && (
                            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                              停用
                            </span>
                          )}
                          {schedule.lastStatus === 'ok' && (
                            <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                              正常
                            </span>
                          )}
                          {schedule.lastStatus === 'failed' && (
                            <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              失敗
                            </span>
                          )}
                        </div>
                        {schedule.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {schedule.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {schedule.scheduleExpr || '自定義'}
                          </span>
                          {schedule.timezone && (
                            <span>{schedule.timezone}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground ml-4">
                        {schedule.nextRunAt && (
                          <div>
                            <span className="block">下次執行</span>
                            <span className="font-medium">
                              {formatDate(schedule.nextRunAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <TaskDetailDrawer
        task={selectedTask}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        initialTab={drawerInitialTab}
        onTaskUpdated={refreshTasks}
        onDelete={handleDeleteTask}
      />

      <NewTaskSheet open={newTaskSheetOpen} onClose={closeNewTaskSheet} onCreated={refreshTasks} />

      <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除任務</DialogTitle>
            <DialogDescription>
              確定要刪除「{taskToDelete?.name}」嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskToDelete(null)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => taskToDelete && handleDeleteTask(taskToDelete.id)}
            >
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
