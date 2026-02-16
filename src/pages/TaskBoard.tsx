import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useDebounce } from '@/hooks/useDebounce';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { SearchInput, FilterBar, EmptyState, type FilterConfig } from '@/components/common';
import { StatusBadge, PriorityBadge, AgentBadge, parseAgentTag } from '@/components/common/Badges';
import { SectionErrorBoundary } from '@/components/common/ErrorBoundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertTriangle,
  RefreshCw,
  Wrench,
  Copy,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  getTasks,
  getTask,
  getRuns,
  getRunsByTask,
  api,
  createTask,
  deleteTask,
  batchDeleteTasks,
  forceRefreshTasks,
  getSystemSchedules,
  getAutoExecutorStatus,
  reconcileMaintenance,
  getTaskIndexerStatus,
  rebuildTaskIndexMarkdown,
  getTaskIndexRecords,
  generateDeterministicHandoff,
} from '@/services/api';
import { resetSeedAndReload } from '@/services/seed';
import type { Task, Run, TaskStatus, SystemSchedule, TaskComplexity, TaskRiskLevel, TaskType, TaskExecutionAgent, TaskModelProvider } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { pollRunStatus } from '@/lib/pollRunStatus';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { DOMAIN_OPTIONS } from '@/data/domains';

const KB_ROOT = '/Users/caijunchang/Desktop/小蔡/知識庫/SOP-資訊庫';

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('已複製');
  } catch {
    toast.error('複製失敗');
  }
}

/** Kanban 六欄（固定）：草稿 → 待執行 → 執行中 → 審核中 → 完成 → 阻塞 */
const KANBAN_COLUMNS: {
  status: TaskStatus;
  label: string;
  color: string;
  definition: string;
}[] = [
  { status: 'draft', label: '草稿', color: 'bg-secondary', definition: '想法未成熟、還不能動手' },
  { status: 'ready', label: '待執行', color: 'bg-info/10', definition: '規格清楚、OpenClaw 可以直接做' },
  { status: 'running', label: '執行中', color: 'bg-accent/10', definition: '一次最多 1–2 張（避免系統失控）' },
  { status: 'review', label: '審核中', color: 'bg-warning/10', definition: '等你驗收、補決策' },
  { status: 'done', label: '完成', color: 'bg-success/10', definition: '完成且可複用（技術資產）' },
  { status: 'blocked', label: '阻塞', color: 'bg-destructive/10', definition: '缺 key / 缺決策 / 外部依賴' },
];

const filterConfigs: FilterConfig[] = [
  {
    key: 'status',
    label: '狀態',
    options: KANBAN_COLUMNS.map(c => ({ value: c.status, label: c.label })),
  },
  {
    key: 'domain',
    label: '領域',
    options: DOMAIN_OPTIONS.map((d) => ({ value: d.slug, label: d.label })),
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

function getDomainSlug(tags?: string[]): string | null {
  const t = (tags ?? []).find((x) => x.toLowerCase().startsWith('domain:'));
  if (!t) return null;
  const slug = t.split(':').slice(1).join(':').trim();
  return slug || null;
}

function setDomainTag(tags: string[] | undefined, slug: string | null): string[] {
  const cleaned = (tags ?? []).filter((t) => !t.toLowerCase().startsWith('domain:'));
  if (!slug) return cleaned;
  return [`domain:${slug}`, ...cleaned];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CONFLICT_TAGS = ['db', 'database', 'deploy', 'docker', 'migration', 'infra', 'backend', 'server'];

function isWriteLikeTask(task: Task): boolean {
  if (task.riskLevel === 'high' || task.riskLevel === 'critical') return true;
  if (task.taskType === 'ops') return true;
  const tags = (task.tags ?? []).map((x) => x.toLowerCase());
  return tags.some((tag) => CONFLICT_TAGS.includes(tag));
}

function conflictResourceKey(task: Task): string {
  const tags = (task.tags ?? []).map((x) => x.toLowerCase());
  const matched = CONFLICT_TAGS.find((tag) => tags.includes(tag));
  if (matched) return matched;
  if (task.taskType === 'ops') return 'ops';
  if (task.taskType === 'development') return 'dev-write';
  return 'write-global';
}

function parseListInput(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatListInput(items?: string[]): string {
  return Array.isArray(items) ? items.join('\n') : '';
}

function parseTagInput(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'research', label: 'Research' },
  { value: 'development', label: 'Development' },
  { value: 'ops', label: 'Ops' },
  { value: 'review', label: 'Review' },
  { value: 'other', label: 'Other' },
];

const COMPLEXITY_OPTIONS: { value: TaskComplexity; label: string }[] = [
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
];

const RISK_OPTIONS: { value: TaskRiskLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const EXECUTION_AGENT_OPTIONS: { value: TaskExecutionAgent; label: string; className: string }[] = [
  { value: 'auto', label: 'Auto', className: 'bg-slate-100 text-slate-800 border-slate-200' },
  { value: 'codex', label: 'Codex', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'cursor', label: 'Cursor', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  { value: 'openclaw', label: 'OpenClaw', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
];

const MODEL_PROVIDER_OPTIONS: { value: TaskModelProvider; label: string }[] = [
  { value: 'default', label: 'Default Policy' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'ollama', label: 'Ollama' },
];

const MODEL_OPTIONS: Record<TaskModelProvider, string[]> = {
  default: ['google/gemini-2.5-flash', 'anthropic/claude-haiku-4-5-20251001', 'kimi/kimi-k2.5'],
  openrouter: ['google/gemini-2.5-flash', 'anthropic/claude-haiku-4-5-20251001', 'kimi/kimi-k2.5'],
  ollama: ['ollama/qwen3:8b', 'ollama/deepseek-r1:8b', 'ollama/llama3.2:latest'],
};

function ExecutionAgentBadge({ agent }: { agent?: TaskExecutionAgent }) {
  if (!agent) return null;
  const item = EXECUTION_AGENT_OPTIONS.find((x) => x.value === agent);
  if (!item) return null;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', item.className)}>
      {item.label}
    </span>
  );
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onRun: () => void;
  onEdit: () => void;
  onViewRuns: () => void;
  onDelete: () => void;
  runInfo?: { status: Run['status']; startedAt: string; agentType?: Run['agentType']; modelUsed?: Run['modelUsed'] } | null;
  stateMismatch?: boolean;
  /** Kanban 拖曳用（可選） */
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: (event: React.DragEvent) => void;
  isDragging?: boolean;
  conflictHint?: string;
}

function TaskCard({ task, onClick, onRun, onEdit, onViewRuns, onDelete, runInfo, stateMismatch, draggable, onDragStart, onDragEnd, isDragging, conflictHint }: TaskCardProps) {
  const [isLocalDragging, setIsLocalDragging] = useState(false);
  const { agent, cleanName } = parseAgentTag(task.name);
  const executionAgent = task.agent?.type;
  const domainSlug = getDomainSlug(task.tags);
  const domainLabel = domainSlug ? (DOMAIN_OPTIONS.find((d) => d.slug === domainSlug)?.label ?? domainSlug) : null;
  const displayTags = useMemo(() => {
    const tags = task.tags ?? [];
    return tags.filter((t) => !t.toLowerCase().startsWith('domain:'));
  }, [task.tags]);

  const latestSummary = useMemo(() => {
    if (typeof task.summary === 'string' && task.summary.trim()) {
      const s = task.summary.trim().replace(/\s+/g, ' ');
      return s.length > 140 ? `${s.slice(0, 140)}…` : s;
    }
    const desc = task.description ?? '';
    if (typeof desc !== 'string' || !desc.includes('<!--RUN-SUMMARY:')) return null;
    // Grab the newest summary block's first "摘要" line if present.
    const blocks = desc.split(/<!--RUN-SUMMARY:/g);
    const last = blocks[blocks.length - 1];
    const m = last.match(/### 摘要\\n([\\s\\S]*?)(\\n### |\\n### 來源連結|\\n### 下一步|$)/);
    if (!m) return null;
    const s = m[1].trim().replace(/\\s+/g, ' ');
    if (!s) return null;
    return s.length > 140 ? `${s.slice(0, 140)}…` : s;
  }, [task.summary, task.description]);
  
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
        "cursor-pointer hover:shadow-card-hover transition-all duration-200 group min-w-0 overflow-hidden",
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
            <div className="min-w-0 flex-1">
              {executionAgent ? (
                <ExecutionAgentBadge agent={executionAgent} />
              ) : (
                agent && <AgentBadge agent={agent} className="mb-1" />
              )}
              <h3 className="font-medium text-sm break-words line-clamp-3">{cleanName}</h3>
            </div>
          </div>
          <PriorityBadge priority={task.priority} />
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {domainLabel && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary border border-primary/20">
              {domainLabel}
            </span>
          )}
          {displayTags.slice(0, 2).map(tag => (
            <span 
              key={tag} 
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
          {displayTags.length > 2 && (
            <span className="text-xs text-muted-foreground">+{displayTags.length - 2}</span>
          )}
        </div>

        {conflictHint && (
          <div className="flex items-center gap-1.5 mb-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            <span className="break-words line-clamp-2">{conflictHint}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1 min-w-0">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="break-words">{task.owner}</span>
          </div>
          {task.lastRunStatus && (
            <StatusBadge status={task.lastRunStatus} />
          )}
        </div>

        {latestSummary && (
          <div className="mt-2 text-[11px] text-muted-foreground line-clamp-2 break-words">
            {latestSummary}
          </div>
        )}

        {stateMismatch && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-destructive bg-destructive/5 border border-destructive/20 rounded px-2 py-1">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            <span className="break-words">狀態異常：任務顯示 running，但找不到 active run</span>
          </div>
        )}

        {runInfo?.startedAt && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground min-w-0">
            <CalendarClock className="h-3 w-3 flex-shrink-0" />
            <span className="break-words line-clamp-2">
              Run {runInfo.status} · {formatDate(runInfo.startedAt)}
              {runInfo.agentType ? ` · ${runInfo.agentType}` : executionAgent ? ` · ${executionAgent}` : ''}
              {runInfo.modelUsed ? ` · ${runInfo.modelUsed}` : task.modelConfig?.primary ? ` · ${task.modelConfig.primary}` : ''}
            </span>
          </div>
        )}

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
            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuItem
                onSelect={() => onEdit()}
                onClick={(e) => e.stopPropagation()}
              >
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
  const taskAgentInfo = task ? parseAgentTag(task.name) : { agent: null, cleanName: '' };
  const domainSlug = task ? getDomainSlug(task.tags) : null;
  const domainLabel = domainSlug ? (DOMAIN_OPTIONS.find((d) => d.slug === domainSlug)?.label ?? domainSlug) : null;
  const domainKeywords = domainSlug ? (DOMAIN_OPTIONS.find((d) => d.slug === domainSlug)?.keywords ?? []) : [];
  const [runs, setRuns] = useState<Run[]>([]);
  const [runNowLoading, setRunNowLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const navigate = useNavigate();
  const pollCleanupRef = useRef<(() => void) | null>(null);

  const editTaskPackageIssues = useMemo(() => {
    const status = editForm.status as TaskStatus | undefined;
    const isDev = editForm.taskType === 'development' && (status === 'ready' || status === 'running');
    if (!isDev) return [];
    const issues: string[] = [];
    if (!String(editForm.projectPath ?? '').trim()) issues.push('projectPath');
    if ((editForm.deliverables ?? []).filter(Boolean).length === 0) issues.push('deliverables');
    if ((editForm.runCommands ?? []).filter(Boolean).length === 0) issues.push('runCommands');
    if ((editForm.acceptanceCriteria ?? []).filter(Boolean).length === 0) issues.push('acceptanceCriteria');
    if (!String(editForm.rollbackPlan ?? '').trim()) issues.push('rollbackPlan');
    if (!editForm.riskLevel) issues.push('riskLevel');
    return issues;
  }, [editForm]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, task?.id]);

  useEffect(() => {
    if (task) {
      setEditForm({
        name: task.name,
        description: task.description,
        status: task.status,
        priority: task.priority,
        owner: task.owner,
        scheduleType: task.scheduleType,
        scheduleExpr: task.scheduleExpr ?? '',
        tags: task.tags,
        taskType: task.taskType,
        complexity: task.complexity,
        riskLevel: task.riskLevel,
        deadline: task.deadline ?? '',
        reviewer: task.reviewer ?? '',
        rollbackPlan: task.rollbackPlan ?? '',
        acceptanceCriteria: task.acceptanceCriteria ?? [],
        evidenceLinks: task.evidenceLinks ?? [],
        reporterTarget: task.reporterTarget ?? '',
        projectPath: task.projectPath ?? '',
        deliverables: task.deliverables ?? [],
        runCommands: task.runCommands ?? [],
        modelPolicy: task.modelPolicy ?? '',
        agent: task.agent ?? { type: 'auto' },
        modelConfig: task.modelConfig ?? {
          provider: 'default',
          primary: MODEL_OPTIONS.default[0],
          fallbacks: [],
        },
      });
    }
  }, [task]);

  const refreshRuns = useCallback(() => {
    if (task) getRunsByTask(task.id).then(setRuns);
  }, [task]);

  useEffect(() => {
    if (task) refreshRuns();
  }, [task, refreshRuns]);

  useEffect(() => {
    return () => {
      pollCleanupRef.current?.();
      pollCleanupRef.current = null;
    };
  }, []);

  const handleRunNow = async () => {
    if (!task) return;
    setRunNowLoading(true);
    toast.info('正在加入佇列…', { duration: 1500 });
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
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            {task.agent?.type ? (
              <ExecutionAgentBadge agent={task.agent.type} />
            ) : (
              taskAgentInfo.agent && <AgentBadge agent={taskAgentInfo.agent} />
            )}
            <span className="truncate">{taskAgentInfo.cleanName}</span>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">複雜度</p>
                <p className="text-sm font-medium">{task.complexity ?? '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">風險等級</p>
                <p className="text-sm font-medium">{task.riskLevel ?? '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">截止日</p>
                <p className="text-sm font-medium">{task.deadline || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">審核人</p>
                <p className="text-sm font-medium">{task.reviewer || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">執行代理</p>
                <ExecutionAgentBadge agent={task.agent?.type} />
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-xs text-muted-foreground">模型</p>
                <p className="text-sm font-medium">{task.modelConfig?.primary || 'default policy'}</p>
              </div>
            </div>

            {task.nextRunAt && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">下次執行</p>
                <p className="text-sm font-medium">{formatDate(task.nextRunAt)}</p>
              </div>
            )}

            {/* 串接：把「內容」放回任務卡，讓後續執行有抓手（索引級，避免爆卡） */}
            {(task.summary || (task.nextSteps && task.nextSteps.length > 0) || (task.evidenceLinks && task.evidenceLinks.length > 0)) && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">執行內容（索引級）</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.summary && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">摘要</p>
                      <p className="text-sm">{task.summary}</p>
                    </div>
                  )}
                  {task.nextSteps && task.nextSteps.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">下一步（可執行）</p>
                      <ul className="text-sm list-disc pl-5 space-y-1">
                        {task.nextSteps.slice(0, 8).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {task.evidenceLinks && task.evidenceLinks.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">來源連結</p>
                      <ul className="text-sm list-disc pl-5 space-y-1">
                        {task.evidenceLinks.slice(0, 6).map((s, i) => (
                          <li key={i} className="break-all">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(task.projectPath || task.runPath || task.idempotencyKey) && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">專案路徑（SSoT）</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {task.projectPath && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">projectPath</p>
                        <p className="text-sm font-mono break-all">{task.projectPath}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => copyToClipboard(task.projectPath!)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        複製
                      </Button>
                    </div>
                  )}
                  {task.runPath && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">runPath</p>
                        <p className="text-sm font-mono break-all">{task.runPath}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => copyToClipboard(task.runPath!)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        複製
                      </Button>
                    </div>
                  )}
                  {task.idempotencyKey && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">idempotencyKey</p>
                        <p className="text-sm font-mono break-all">{task.idempotencyKey}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => copyToClipboard(task.idempotencyKey!)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        複製
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">知識庫串接（本地免 Token）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">SOP 根目錄</p>
                    <p className="text-sm font-mono break-all">{KB_ROOT}</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => copyToClipboard(KB_ROOT)}>
                    <Copy className="h-3 w-3 mr-1" />
                    複製
                  </Button>
                </div>
                {domainLabel && (
                  <div className="space-y-2">
                    <div className="text-sm">
                      本任務領域：<span className="font-medium">{domainLabel}</span>
                    </div>
                    {domainKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {domainKeywords.slice(0, 10).map((k) => (
                          <span key={k} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(`${KB_ROOT}/DOMAINS.md`)}
                      >
                        複製 DOMAINS.md
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(`${KB_ROOT}/RESOURCES/RESOURCES.md`)}
                      >
                        複製 RESOURCES.md
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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
            <SectionErrorBoundary
              sectionName="編輯表單"
              onReset={() => setActiveTab('overview')}
            >
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
	              <div className="grid grid-cols-2 gap-4">
	                <div className="grid gap-2">
	                  <Label>排程類型</Label>
	                  <Select value={editForm.scheduleType ?? task.scheduleType} onValueChange={(v: Task['scheduleType']) => setEditForm(f => ({ ...f, scheduleType: v }))}>
	                    <SelectTrigger><SelectValue /></SelectTrigger>
	                    <SelectContent>
	                      <SelectItem value="manual">手動</SelectItem>
	                      <SelectItem value="cron">Cron</SelectItem>
	                      <SelectItem value="interval">間隔</SelectItem>
	                      <SelectItem value="webhook">Webhook</SelectItem>
	                    </SelectContent>
	                  </Select>
	                </div>
	                <div className="grid gap-2">
	                  <Label>領域（主分類）</Label>
	                  <Select
	                    value={getDomainSlug(editForm.tags ?? task.tags ?? []) ?? ''}
	                    onValueChange={(v) =>
	                      setEditForm((f) => ({
	                        ...f,
	                        tags: setDomainTag(f.tags ?? task.tags ?? [], v || null),
	                      }))
	                    }
	                  >
	                    <SelectTrigger><SelectValue placeholder="選擇領域（domain:）" /></SelectTrigger>
	                    <SelectContent>
	                      <SelectItem value="">（不指定）</SelectItem>
	                      {DOMAIN_OPTIONS.map((d) => (
	                        <SelectItem key={d.slug} value={d.slug}>{d.label}</SelectItem>
	                      ))}
	                    </SelectContent>
	                  </Select>
	                </div>
	              </div>
	              <div className="grid gap-2">
	                <Label>標籤（逗號分隔）</Label>
	                <Input
	                  value={(editForm.tags ?? task.tags ?? []).filter((t) => t != null && !String(t).toLowerCase().startsWith('domain:')).join(', ')}
	                  onChange={(e) =>
	                    setEditForm((f) => ({
	                      ...f,
	                      tags: setDomainTag(parseTagInput(e.target.value), getDomainSlug(f.tags ?? task.tags ?? [])),
	                    }))
	                  }
	                  placeholder="feature, backend"
	                />
	              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>任務類型</Label>
                  <Select value={editForm.taskType ?? 'other'} onValueChange={(v: TaskType) => setEditForm(f => ({ ...f, taskType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_TYPE_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>複雜度</Label>
                  <Select value={editForm.complexity ?? 'M'} onValueChange={(v: TaskComplexity) => setEditForm(f => ({ ...f, complexity: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPLEXITY_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>執行代理</Label>
                <Select
                  value={editForm.agent?.type ?? 'auto'}
                  onValueChange={(v: TaskExecutionAgent) => setEditForm(f => ({ ...f, agent: { type: v } }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXECUTION_AGENT_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>模型來源</Label>
                  <Select
                    value={MODEL_PROVIDER_OPTIONS.some((o) => o.value === (editForm.modelConfig?.provider ?? 'default')) ? (editForm.modelConfig?.provider ?? 'default') : 'default'}
                    onValueChange={(v: TaskModelProvider) => setEditForm((f) => {
                      const list = MODEL_OPTIONS[v] ?? MODEL_OPTIONS.default;
                      return {
                        ...f,
                        modelConfig: {
                          provider: v,
                          primary: list[0] ?? MODEL_OPTIONS.default[0],
                          fallbacks: [],
                        },
                      };
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODEL_PROVIDER_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>主模型</Label>
                  <Select
                    value={(() => {
                      const list = MODEL_OPTIONS[(editForm.modelConfig?.provider ?? 'default') as TaskModelProvider] ?? MODEL_OPTIONS.default;
                      const primary = editForm.modelConfig?.primary ?? MODEL_OPTIONS.default[0];
                      return list.includes(primary) ? primary : (list[0] ?? MODEL_OPTIONS.default[0]);
                    })()}
                    onValueChange={(v) => setEditForm((f) => ({
                      ...f,
                      modelConfig: {
                        provider: (f.modelConfig?.provider && MODEL_OPTIONS[f.modelConfig.provider]) ? f.modelConfig.provider : 'default',
                        primary: v,
                        fallbacks: f.modelConfig?.fallbacks ?? [],
                      },
                    }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(MODEL_OPTIONS[(editForm.modelConfig?.provider ?? 'default') as TaskModelProvider] ?? MODEL_OPTIONS.default).map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>備援模型（每行一個）</Label>
                <Textarea
                  value={formatListInput(editForm.modelConfig?.fallbacks)}
                  onChange={(e) => setEditForm((f) => ({
                    ...f,
                    modelConfig: {
                      provider: f.modelConfig?.provider ?? 'default',
                      primary: f.modelConfig?.primary ?? MODEL_OPTIONS.default[0],
                      fallbacks: parseListInput(e.target.value),
                    },
                  }))}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>風險等級</Label>
                  <Select value={editForm.riskLevel ?? 'medium'} onValueChange={(v: TaskRiskLevel) => setEditForm(f => ({ ...f, riskLevel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RISK_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>截止日</Label>
                  <Input type="date" value={String(editForm.deadline ?? '').slice(0, 10)} onChange={(e) => setEditForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>審核人</Label>
                  <Input value={editForm.reviewer ?? ''} onChange={(e) => setEditForm(f => ({ ...f, reviewer: e.target.value }))} placeholder="例如 老蔡" />
                </div>
                <div className="grid gap-2">
                  <Label>回報目標</Label>
                  <Input value={editForm.reporterTarget ?? ''} onChange={(e) => setEditForm(f => ({ ...f, reporterTarget: e.target.value }))} placeholder="例如 @ollama168bot" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Rollback 計畫</Label>
                <Textarea value={editForm.rollbackPlan ?? ''} onChange={(e) => setEditForm(f => ({ ...f, rollbackPlan: e.target.value }))} rows={2} />
              </div>
              <div className="grid gap-2 rounded-lg border border-dashed p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label>任務包（開發任務必填）</Label>
                  {(editForm.taskType === 'development' && (editForm.status === 'ready' || editForm.status === 'running')) && editTaskPackageIssues.length > 0 && (
                    <span className="text-xs text-destructive">缺少：{editTaskPackageIssues.join(', ')}</span>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">projectPath</Label>
                  <Input
                    value={editForm.projectPath ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, projectPath: e.target.value }))}
                    placeholder="projects/xxx/yyy"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">deliverables（每行一個）</Label>
                  <Textarea
                    value={formatListInput(editForm.deliverables)}
                    onChange={(e) => setEditForm((f) => ({ ...f, deliverables: parseListInput(e.target.value) }))}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">runCommands（每行一個）</Label>
                  <Textarea
                    value={formatListInput(editForm.runCommands)}
                    onChange={(e) => setEditForm((f) => ({ ...f, runCommands: parseListInput(e.target.value) }))}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">modelPolicy</Label>
                  <Input
                    value={editForm.modelPolicy ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, modelPolicy: e.target.value }))}
                    placeholder="subscription+ollama-only"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>驗收條件（每行一條）</Label>
                <Textarea value={formatListInput(editForm.acceptanceCriteria)} onChange={(e) => setEditForm(f => ({ ...f, acceptanceCriteria: parseListInput(e.target.value) }))} rows={3} />
              </div>
              <div className="grid gap-2">
                <Label>證據連結（每行一條）</Label>
                <Textarea value={formatListInput(editForm.evidenceLinks)} onChange={(e) => setEditForm(f => ({ ...f, evidenceLinks: parseListInput(e.target.value) }))} rows={3} />
              </div>
            </div>
            <Button
              disabled={saving || editTaskPackageIssues.length > 0}
              onClick={async () => {
                if (!task) return;
                if (!editForm.name?.trim()) {
                  toast.error('請輸入任務名稱');
                  return;
                }
                if (editTaskPackageIssues.length > 0) {
                  toast.error(`開發任務缺少必填欄位：${editTaskPackageIssues.join(', ')}`);
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
                    tags: editForm.tags,
                    scheduleType: editForm.scheduleType,
                    scheduleExpr: editForm.scheduleExpr || undefined,
                    taskType: editForm.taskType,
                    complexity: editForm.complexity,
                    riskLevel: editForm.riskLevel,
                    deadline: editForm.deadline || null,
                    reviewer: editForm.reviewer?.trim() || undefined,
                    reporterTarget: editForm.reporterTarget?.trim() || undefined,
                    rollbackPlan: editForm.rollbackPlan?.trim() || undefined,
                    acceptanceCriteria: editForm.acceptanceCriteria?.filter(Boolean) ?? [],
                    evidenceLinks: editForm.evidenceLinks?.filter(Boolean) ?? [],
                    projectPath: editForm.projectPath?.trim() || undefined,
                    deliverables: editForm.deliverables?.filter(Boolean) ?? [],
                    runCommands: editForm.runCommands?.filter(Boolean) ?? [],
                    modelPolicy: editForm.modelPolicy?.trim() || undefined,
                    agent: editForm.agent,
                    modelConfig: editForm.modelConfig?.primary
                      ? {
                          provider: editForm.modelConfig.provider,
                          primary: editForm.modelConfig.primary,
                          fallbacks: editForm.modelConfig.fallbacks?.filter(Boolean) ?? [],
                        }
                      : undefined,
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
            </SectionErrorBoundary>
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
                      <span className="text-sm font-medium truncate">{run.taskName}</span>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const candidate = run.agentType ?? [...(run.steps ?? [])].reverse().find((s) => s.agentType)?.agentType;
                          return candidate ? <ExecutionAgentBadge agent={candidate} /> : null;
                        })()}
                        <StatusBadge status={run.status} />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono">{run.id}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(run.startedAt)}
                      {run.durationMs && ` • ${(run.durationMs / 1000).toFixed(1)}s`}
                      {(run.modelUsed || [...(run.steps ?? [])].reverse().find((s) => s.modelUsed)?.modelUsed) &&
                        ` • ${run.modelUsed || [...(run.steps ?? [])].reverse().find((s) => s.modelUsed)?.modelUsed}`}
                      {typeof run.tokenUsage?.total === 'number' && ` • ${run.tokenUsage.total} tok(est)`}
                      {typeof run.costUsd === 'number' && ` • $${run.costUsd.toFixed(4)}`}
                    </p>
                    {typeof run.outputSummary === 'string' && run.outputSummary.trim() && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{run.outputSummary}</p>
                    )}
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
  agent: task.agent,
  modelConfig: task.modelConfig,
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
  taskType: 'other',
  complexity: 'M',
  riskLevel: 'medium',
  deadline: null,
  reviewer: '',
  rollbackPlan: '',
  acceptanceCriteria: [],
  evidenceLinks: [],
  reporterTarget: '@ollama168bot',
  projectPath: '',
  deliverables: [],
  runCommands: [],
  modelPolicy: 'subscription+ollama-only',
  // Global default policy: prefer Codex/Cursor as executors; avoid paid cloud models unless explicitly needed.
  agent: { type: 'codex' },
  modelConfig: {
    provider: 'ollama',
    primary: 'ollama/qwen3:8b',
    fallbacks: ['ollama/deepseek-r1:8b', 'ollama/llama3.2:latest'],
  },
};

type TaskTemplatePreset = {
  id: string;
  label: string;
  summary: string;
  preset: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>;
};

const TASK_TEMPLATE_PRESETS: TaskTemplatePreset[] = [
  {
    id: 'research-tech-radar',
    label: '技術掃描',
    summary: '追蹤官方文件、社群、release note',
    preset: {
      name: '技術掃描：本週新工具與新方案',
      description: '掃描官方文件、GitHub 與社群討論，整理可採用技術清單。',
      status: 'ready',
      scheduleType: 'interval',
      scheduleExpr: 'every 6h',
      taskType: 'research',
      complexity: 'M',
      riskLevel: 'low',
      tags: ['research', 'radar', 'weekly'],
      acceptanceCriteria: ['至少 3 個新資訊來源', '每個來源附摘要與連結', '提出 1 個可執行 POC 任務'],
      evidenceLinks: ['https://github.com/trending'],
      agent: { type: 'openclaw' },
      modelConfig: { provider: 'ollama', primary: 'ollama/qwen3:8b', fallbacks: ['ollama/deepseek-r1:8b', 'ollama/llama3.2:latest'] },
    },
  },
  {
    id: 'bug-triage',
    label: 'Bug Triage',
    summary: '彙整錯誤、分級、建立修復卡',
    preset: {
      name: 'Bug Triage：錯誤分級與修復指派',
      description: '收斂最近失敗 run 與錯誤日誌，輸出修復優先順序。',
      status: 'ready',
      taskType: 'ops',
      complexity: 'M',
      riskLevel: 'medium',
      tags: ['triage', 'ops', 'stability'],
      acceptanceCriteria: ['輸出 P1/P2/P3 清單', '每個問題包含重現線索', '建立對應修復任務'],
      agent: { type: 'codex' },
      modelConfig: { provider: 'ollama', primary: 'ollama/qwen3:8b', fallbacks: ['ollama/deepseek-r1:8b', 'ollama/llama3.2:latest'] },
    },
  },
  {
    id: 'architecture-review',
    label: '架構審查',
    summary: '針對瓶頸與衝突提出設計方案',
    preset: {
      name: '架構審查：效能與可維運性優化',
      description: '分析任務看板、排程器與執行器瓶頸，提出模組化方案。',
      status: 'draft',
      taskType: 'review',
      complexity: 'L',
      riskLevel: 'medium',
      tags: ['architecture', 'performance', 'refactor'],
      acceptanceCriteria: ['列出現況痛點', '提供 2 套可執行方案', '標明風險與回滾策略'],
      agent: { type: 'cursor' },
      modelConfig: { provider: 'ollama', primary: 'ollama/qwen3:8b', fallbacks: ['ollama/deepseek-r1:8b', 'ollama/llama3.2:latest'] },
    },
  },
	  {
	    id: 'automation-expansion',
	    label: '自動化擴展',
	    summary: '把新情報轉成可執行任務',
	    preset: {
	      name: '自動化擴展：情報轉任務流程',
	      description: '從資訊來源自動產生任務，並做去重與優先級排序。',
	      status: 'ready',
	      scheduleType: 'interval',
	      scheduleExpr: 'every 60m',
	      taskType: 'development',
	      complexity: 'L',
	      riskLevel: 'high',
	      tags: ['automation', 'pipeline', 'task-generation'],
	      projectPath: 'projects/openclaw-automation/task-generation',
	      deliverables: ['README.md', 'src/', 'docs/runbook.md', '.env.example'],
	      runCommands: ['npm i', 'npm run dev', 'curl -sS http://127.0.0.1:3011/health | jq .'],
	      modelPolicy: 'subscription+ollama-only',
	      rollbackPlan: '保留舊版建立流程，若誤判率升高則切回手動模式。',
	      acceptanceCriteria: ['來源去重成功率 > 95%', '每輪至少新增 1 張有效任務', '誤建立可追蹤與刪除'],
	      agent: { type: 'codex' },
	      modelConfig: { provider: 'ollama', primary: 'ollama/qwen3:8b', fallbacks: ['ollama/deepseek-r1:8b', 'ollama/llama3.2:latest'] },
	    },
	  },
  {
    id: 'knowledge-sync',
    label: '知識庫同步',
    summary: '完成任務後自動沉澱文件',
    preset: {
      name: '知識庫同步：任務產出文件化',
      description: '把完成任務輸出到知識庫，補齊 SOP 與決策紀錄。',
      status: 'review',
      taskType: 'other',
      complexity: 'S',
      riskLevel: 'low',
      tags: ['knowledge-base', 'docs', 'sop'],
      acceptanceCriteria: ['每張完成任務都有摘要', '關鍵指令可複製', '包含回滾與注意事項'],
      agent: { type: 'openclaw' },
      modelConfig: { provider: 'ollama', primary: 'ollama/qwen3:8b', fallbacks: ['ollama/deepseek-r1:8b', 'ollama/llama3.2:latest'] },
    },
  },
];

function NewTaskSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (force?: boolean) => void }) {
  const [form, setForm] = useState(DEFAULT_NEW_TASK);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');

  const taskPackageIssues = useMemo(() => {
    const isDev = form.taskType === 'development' && (form.status === 'ready' || form.status === 'running');
    if (!isDev) return [];
    const issues: string[] = [];
    if (!String(form.projectPath ?? '').trim()) issues.push('projectPath');
    if ((form.deliverables ?? []).filter(Boolean).length === 0) issues.push('deliverables');
    if ((form.runCommands ?? []).filter(Boolean).length === 0) issues.push('runCommands');
    if ((form.acceptanceCriteria ?? []).filter(Boolean).length === 0) issues.push('acceptanceCriteria');
    if (!String(form.rollbackPlan ?? '').trim()) issues.push('rollbackPlan');
    if (!form.riskLevel) issues.push('riskLevel');
    return issues;
  }, [form]);

  const applyTemplate = (templateId: string) => {
    if (templateId === 'none') return;
    const template = TASK_TEMPLATE_PRESETS.find((item) => item.id === templateId);
    if (!template) return;
    setForm((prev) => {
      const next = {
        ...prev,
        ...template.preset,
        tags: template.preset.tags ? [...template.preset.tags] : prev.tags,
        acceptanceCriteria: template.preset.acceptanceCriteria ? [...template.preset.acceptanceCriteria] : prev.acceptanceCriteria,
        evidenceLinks: template.preset.evidenceLinks ? [...template.preset.evidenceLinks] : prev.evidenceLinks,
        agent: template.preset.agent ? { ...template.preset.agent } : prev.agent,
        modelConfig: template.preset.modelConfig
          ? {
              provider: template.preset.modelConfig.provider,
              primary: template.preset.modelConfig.primary,
              fallbacks: [...(template.preset.modelConfig.fallbacks ?? [])],
            }
          : prev.modelConfig,
      };
      return next;
    });
    toast.success(`已套用模板：${template.label}`);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('請輸入任務名稱'); return; }
    if (taskPackageIssues.length > 0) {
      toast.error(`開發任務缺少必填欄位：${taskPackageIssues.join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      await createTask({
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() ?? '',
        reviewer: form.reviewer?.trim() ?? '',
        reporterTarget: form.reporterTarget?.trim() ?? '',
        rollbackPlan: form.rollbackPlan?.trim() ?? '',
        deadline: form.deadline || null,
        acceptanceCriteria: form.acceptanceCriteria?.filter(Boolean) ?? [],
        evidenceLinks: form.evidenceLinks?.filter(Boolean) ?? [],
        projectPath: form.projectPath?.trim() ?? '',
        deliverables: form.deliverables?.filter(Boolean) ?? [],
        runCommands: form.runCommands?.filter(Boolean) ?? [],
        modelPolicy: form.modelPolicy?.trim() ?? '',
        agent: form.agent,
        modelConfig: form.modelConfig?.primary
          ? {
              provider: form.modelConfig.provider,
              primary: form.modelConfig.primary,
              fallbacks: form.modelConfig.fallbacks?.filter(Boolean) ?? [],
            }
          : undefined,
      });
      toast.success('已新增任務');
      setForm(DEFAULT_NEW_TASK);
      setSelectedTemplateId('none');
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
          <div className="grid gap-2 rounded-lg border border-dashed p-3 bg-muted/20">
            <Label>快速模板（建議先套用）</Label>
            <div className="flex items-center gap-2">
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇一個模板" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不使用模板</SelectItem>
                  {TASK_TEMPLATE_PRESETS.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.label} · {tpl.summary}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="secondary"
                onClick={() => applyTemplate(selectedTemplateId)}
                disabled={selectedTemplateId === 'none'}
              >
                套用
              </Button>
            </div>
          </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>排程類型</Label>
              <Select value={form.scheduleType} onValueChange={(v: Task['scheduleType']) => setForm(f => ({ ...f, scheduleType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">手動</SelectItem>
                  <SelectItem value="cron">Cron</SelectItem>
                  <SelectItem value="interval">間隔</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>領域（主分類）</Label>
              <Select
                value={getDomainSlug(form.tags) ?? ''}
                onValueChange={(v) => setForm((f) => ({ ...f, tags: setDomainTag(f.tags, v || null) }))}
              >
                <SelectTrigger><SelectValue placeholder="選擇領域（domain:）" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">（不指定）</SelectItem>
                  {DOMAIN_OPTIONS.map((d) => (
                    <SelectItem key={d.slug} value={d.slug}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>標籤（逗號分隔）</Label>
            <Input
              value={form.tags.filter((t) => !t.toLowerCase().startsWith('domain:')).join(', ')}
              onChange={(e) => setForm((f) => ({ ...f, tags: setDomainTag(parseTagInput(e.target.value), getDomainSlug(f.tags)) }))}
              placeholder="feature, backend"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>任務類型</Label>
              <Select value={form.taskType ?? 'other'} onValueChange={(v: TaskType) => setForm(f => ({ ...f, taskType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPE_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>複雜度</Label>
              <Select value={form.complexity ?? 'M'} onValueChange={(v: TaskComplexity) => setForm(f => ({ ...f, complexity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPLEXITY_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>風險等級</Label>
              <Select value={form.riskLevel ?? 'medium'} onValueChange={(v: TaskRiskLevel) => setForm(f => ({ ...f, riskLevel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RISK_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>截止日</Label>
              <Input type="date" value={String(form.deadline ?? '').slice(0, 10)} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>執行代理</Label>
            <Select
              value={form.agent?.type ?? 'auto'}
              onValueChange={(v: TaskExecutionAgent) => setForm(f => ({ ...f, agent: { type: v } }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXECUTION_AGENT_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>模型來源</Label>
              <Select
                value={form.modelConfig?.provider ?? 'default'}
                onValueChange={(v: TaskModelProvider) => setForm((f) => {
                  const list = MODEL_OPTIONS[v];
                  return {
                    ...f,
                    modelConfig: {
                      provider: v,
                      primary: list[0],
                      fallbacks: [],
                    },
                  };
                })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_PROVIDER_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>主模型</Label>
              <Select
                value={form.modelConfig?.primary ?? MODEL_OPTIONS.default[0]}
                onValueChange={(v) => setForm((f) => ({
                  ...f,
                  modelConfig: {
                    provider: f.modelConfig?.provider ?? 'default',
                    primary: v,
                    fallbacks: f.modelConfig?.fallbacks ?? [],
                  },
                }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(MODEL_OPTIONS[form.modelConfig?.provider ?? 'default'] ?? MODEL_OPTIONS.default).map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>備援模型（每行一個）</Label>
            <Textarea
              value={formatListInput(form.modelConfig?.fallbacks)}
              onChange={(e) => setForm((f) => ({
                ...f,
                modelConfig: {
                  provider: f.modelConfig?.provider ?? 'default',
                  primary: f.modelConfig?.primary ?? MODEL_OPTIONS.default[0],
                  fallbacks: parseListInput(e.target.value),
                },
              }))}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>審核人</Label>
              <Input value={form.reviewer ?? ''} onChange={(e) => setForm(f => ({ ...f, reviewer: e.target.value }))} placeholder="例如 老蔡" />
            </div>
            <div className="grid gap-2">
              <Label>回報目標</Label>
              <Input value={form.reporterTarget ?? ''} onChange={(e) => setForm(f => ({ ...f, reporterTarget: e.target.value }))} placeholder="例如 @ollama168bot" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Rollback 計畫</Label>
            <Textarea value={form.rollbackPlan ?? ''} onChange={(e) => setForm(f => ({ ...f, rollbackPlan: e.target.value }))} rows={2} />
          </div>
          <div className="grid gap-2 rounded-lg border border-dashed p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label>任務包（開發任務必填）</Label>
              {(form.taskType === 'development' && (form.status === 'ready' || form.status === 'running')) && taskPackageIssues.length > 0 && (
                <span className="text-xs text-destructive">缺少：{taskPackageIssues.join(', ')}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">projectPath</Label>
              <Input
                value={form.projectPath ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, projectPath: e.target.value }))}
                placeholder="projects/xxx/yyy"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">deliverables（每行一個）</Label>
              <Textarea
                value={formatListInput(form.deliverables)}
                onChange={(e) => setForm((f) => ({ ...f, deliverables: parseListInput(e.target.value) }))}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">runCommands（每行一個）</Label>
              <Textarea
                value={formatListInput(form.runCommands)}
                onChange={(e) => setForm((f) => ({ ...f, runCommands: parseListInput(e.target.value) }))}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">modelPolicy</Label>
              <Input
                value={form.modelPolicy ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, modelPolicy: e.target.value }))}
                placeholder="subscription+ollama-only"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>驗收條件（每行一條）</Label>
            <Textarea value={formatListInput(form.acceptanceCriteria)} onChange={(e) => setForm(f => ({ ...f, acceptanceCriteria: parseListInput(e.target.value) }))} rows={3} />
          </div>
          <div className="grid gap-2">
            <Label>證據連結（每行一條）</Label>
            <Textarea value={formatListInput(form.evidenceLinks)} onChange={(e) => setForm(f => ({ ...f, evidenceLinks: parseListInput(e.target.value) }))} rows={3} />
          </div>
          <Button className="w-full" disabled={submitting || taskPackageIssues.length > 0} onClick={handleSubmit}>
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

  // 從 URL 參數 q 讀取初始搜尋（Topbar 搜尋 Enter 導向 /tasks?q=...）
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && typeof q === 'string') {
      const decoded = decodeURIComponent(q).trim();
      if (decoded) {
        setSearchQuery(decoded);
        setDebouncedSearchQuery(decoded);
      }
    }
  }, [searchParams]);

  // 發想審核「查看對應任務」導向 /tasks?fromReview=xxx
  const fromReviewId = searchParams.get('fromReview') ?? undefined;

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState('overview');
  const [newTaskSheetOpen, setNewTaskSheetOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [confirmClearDoneOpen, setConfirmClearDoneOpen] = useState(false);
  const [clearingDone, setClearingDone] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [autoExecutorStatus, setAutoExecutorStatus] = useState<{
    ok: boolean;
    isRunning: boolean;
    pollIntervalMs: number;
    maxTasksPerMinute?: number;
    lastPollAt: string | null;
    lastExecutedTaskId: string | null;
    lastExecutedAt: string | null;
    totalExecutedToday: number;
    nextPollAt: string | null;
  } | null>(null);
  const [reconciling, setReconciling] = useState(false);

  // Task Indexer（索引/記憶）
  const [indexerStatus, setIndexerStatus] = useState<{
    ok: boolean;
    dir: string;
    jsonlPath: string;
    mdPath: string;
    jsonlExists: boolean;
    mdExists: boolean;
  } | null>(null);
  const [indexRecords, setIndexRecords] = useState<Array<{
    timestamp: string;
    taskId: string;
    taskName: string;
    runId: string;
    runStatus: string;
    riskLevel: string;
    agentType: string | null;
    modelUsed: string | null;
  }>>([]);
  const [indexerLoading, setIndexerLoading] = useState(false);
  
  // System Schedules（系統排程）
  const [systemSchedules, setSystemSchedules] = useState<SystemSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [kanbanSelectedIds, setKanbanSelectedIds] = useState<Set<string>>(new Set());
  
  const refreshTasks = useCallback((force = false) => {
    setTasksLoading(true);
    const fetchPromise = force ? forceRefreshTasks() : getTasks();
    fetchPromise
      .then((tasks) => {
        setTasks(tasks);
        setSelectedTask((prev) => {
          if (!prev) return prev;
          const updatedTask = tasks.find((t) => t.id === prev.id);
          if (!updatedTask) return prev;
          // 避免無差異的引用替換造成重複重渲染
          if (
            prev.updatedAt === updatedTask.updatedAt &&
            prev.status === updatedTask.status &&
            prev.name === updatedTask.name
          ) {
            return prev;
          }
          return updatedTask;
        });
      })
      .catch((err) => {
        console.error('[TaskBoard] 載入任務失敗:', err);
        toast.error('載入任務失敗，請檢查後端連線');
      })
      .finally(() => setTasksLoading(false));
  }, []);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  useEffect(() => {
    let cancelled = false;
    const loadRuns = async () => {
      try {
        const list = await getRuns();
        if (!cancelled) setRecentRuns(list);
      } catch (e) {
        if (!cancelled) console.warn('[TaskBoard] load runs failed:', e);
      }
    };
    loadRuns();
    const timer = setInterval(loadRuns, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadAutoExecutor = async () => {
      try {
        const status = await getAutoExecutorStatus();
        if (!cancelled) setAutoExecutorStatus(status);
      } catch (e) {
        if (!cancelled) console.warn('[TaskBoard] load auto-executor status failed:', e);
      }
    };
    loadAutoExecutor();
    const timer = setInterval(loadAutoExecutor, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // 索引狀態（不輪詢，避免多餘請求；需要時手動刷新）
  const loadIndexer = useCallback(async () => {
    setIndexerLoading(true);
    try {
      const status = await getTaskIndexerStatus();
      const recordsRes = await getTaskIndexRecords(8);
      setIndexerStatus(status);
      if (recordsRes.ok) {
        setIndexRecords(
          recordsRes.records.map((r) => ({
            timestamp: r.timestamp,
            taskId: r.taskId,
            taskName: r.taskName,
            runId: r.runId,
            runStatus: r.runStatus,
            riskLevel: r.riskLevel,
            agentType: r.agentType,
            modelUsed: r.modelUsed,
          }))
        );
      }
    } catch (e) {
      console.warn('[TaskBoard] load indexer failed:', e);
    } finally {
      setIndexerLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIndexer();
  }, [loadIndexer]);
  
  // 載入系統排程
  useEffect(() => {
    if (!showSchedules) return;
    let cancelled = false;
    const retryDelays = [0, 1000, 3000];

    const loadSchedules = async () => {
      setSchedulesLoading(true);
      for (let attempt = 0; attempt < retryDelays.length; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
        }
        try {
          const schedules = await getSystemSchedules();
          if (!cancelled) {
            setSystemSchedules(schedules);
          }
          return;
        } catch (err) {
          console.error(`[TaskBoard] 載入系統排程失敗 (attempt ${attempt + 1}):`, err);
        }
      }
      if (!cancelled) {
        toast.warning('系統排程暫時無法更新，稍後會自動重試');
      }
    };

    loadSchedules().finally(() => {
      if (!cancelled) setSchedulesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [showSchedules]);

  // URL taskId → open drawer
  useEffect(() => {
    if (!taskIdParam) return;
    const t = tasks.find(x => x.id === taskIdParam);
    if (t) {
      setSelectedTask((prev) => (prev?.id === t.id ? prev : t));
      setDrawerOpen(true);
    } else {
      getTask(taskIdParam).then((task) => {
        if (task) {
          setSelectedTask((prev) => (prev?.id === task.id ? prev : (task as Task)));
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

  const handleKanbanBulkDelete = async () => {
    const ids = Array.from(kanbanSelectedIds);
    if (ids.length === 0) return;
    try {
      await batchDeleteTasks(ids);
      setKanbanSelectedIds(new Set());
      refreshTasks(true);
      toast.success(`已刪除 ${ids.length} 項`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '批次刪除失敗');
    }
  };

  const handleKanbanBulkMoveStatus = async (status: TaskStatus) => {
    const ids = Array.from(kanbanSelectedIds);
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        await api.updateTask(id, { status });
      }
      setKanbanSelectedIds(new Set());
      refreshTasks(true);
      toast.success(`已將 ${ids.length} 項移至 ${KANBAN_COLUMNS.find((c) => c.status === status)?.label ?? status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '批次更新失敗');
    }
  };

  const doneTasks = useMemo(() => tasks.filter((t) => t.status === 'done'), [tasks]);
  const handleClearDoneTasks = async () => {
    if (doneTasks.length === 0) return;
    setClearingDone(true);
    try {
      let ok = 0;
      let err = 0;
      for (const t of doneTasks) {
        try {
          await deleteTask(t.id);
          ok++;
        } catch {
          err++;
        }
      }
      setConfirmClearDoneOpen(false);
      refreshTasks(true);
      if (ok) toast.success(`已刪除 ${ok} 筆已完成任務`);
      if (err) toast.error(`${err} 筆刪除失敗`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '清除失敗');
    } finally {
      setClearingDone(false);
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
      if (fromReviewId && task.fromReviewId !== fromReviewId) {
        return false;
      }
      if (debouncedSearchQuery && !task.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) {
        return false;
      }
      if (activeFilters.status && task.status !== activeFilters.status) {
        return false;
      }
      if (activeFilters.domain) {
        const d = getDomainSlug(task.tags);
        if (d !== activeFilters.domain) return false;
      }
      if (activeFilters.priority && task.priority !== Number(activeFilters.priority)) {
        return false;
      }
      if (activeFilters.scheduleType && task.scheduleType !== activeFilters.scheduleType) {
        return false;
      }
      return true;
    });
  }, [tasks, debouncedSearchQuery, activeFilters, fromReviewId]);

  const upcomingTasks = useMemo(() => {
    const sortByDeadline = (a?: string | null, b?: string | null): number => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    };

    return tasks
      .filter((t) => t.status === 'ready')
      .sort((a, b) => {
        const p = (a.priority ?? 3) - (b.priority ?? 3);
        if (p !== 0) return p;
        const d = sortByDeadline(a.deadline, b.deadline);
        if (d !== 0) return d;
        return (a.updatedAt ?? '').localeCompare(b.updatedAt ?? '');
      })
      .slice(0, 5);
  }, [tasks]);

  const conflictHintMap = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.status === 'ready' || t.status === 'running');
    const groups = new Map<string, Task[]>();
    for (const task of activeTasks) {
      if (!isWriteLikeTask(task)) continue;
      const key = conflictResourceKey(task);
      const list = groups.get(key) ?? [];
      list.push(task);
      groups.set(key, list);
    }
    const hints = new Map<string, string>();
    for (const [key, list] of groups.entries()) {
      if (list.length <= 1) continue;
      for (const task of list) {
        hints.set(task.id, `資源衝突風險：${key} (${list.length} 筆並行候選)`);
      }
    }
    return hints;
  }, [tasks]);

  const activeRunByTaskId = useMemo(() => {
    const active = new Map<string, { status: Run['status']; startedAt: string; agentType?: Run['agentType']; modelUsed?: Run['modelUsed'] }>();
    for (const r of recentRuns) {
      if (r.status !== 'running' && r.status !== 'queued' && r.status !== 'retrying') continue;
      const prev = active.get(r.taskId);
      if (!prev) {
        active.set(r.taskId, { status: r.status, startedAt: r.startedAt, agentType: r.agentType, modelUsed: r.modelUsed });
        continue;
      }
      if ((r.startedAt || '') > (prev.startedAt || '')) {
        active.set(r.taskId, { status: r.status, startedAt: r.startedAt, agentType: r.agentType, modelUsed: r.modelUsed });
      }
    }
    return active;
  }, [recentRuns]);

  const runningStateMismatchCount = useMemo(() => {
    let n = 0;
    for (const t of tasks) {
      if (t.status !== 'running') continue;
      if (!activeRunByTaskId.has(t.id)) n++;
    }
    return n;
  }, [tasks, activeRunByTaskId]);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const result = await reconcileMaintenance();
      toast.success(
        `已校正狀態：ready +${result.fixedToReady} / done +${result.fixedToDone} / running +${result.fixedToRunning}`
      );
      await refreshTasks(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '校正失敗');
    } finally {
      setReconciling(false);
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
  }, [ws]);

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
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReconcile}
                    disabled={reconciling}
                    className={cn(runningStateMismatchCount > 0 && 'border-destructive text-destructive')}
                  >
                    <Wrench className="h-4 w-4 mr-1" />
                    校正狀態{runningStateMismatchCount > 0 ? ` (${runningStateMismatchCount})` : ''}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium">狀態校正</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    把「任務顯示 running，但沒有 active run」這類假狀態修回 ready/done，避免看板誤判。
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" onClick={() => refreshTasks(true)} className="text-muted-foreground">
              <RefreshCw className="h-4 w-4 mr-1" />
              刷新
            </Button>
            {doneTasks.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setConfirmClearDoneOpen(true)} className="text-muted-foreground">
                <Trash2 className="h-4 w-4 mr-1" />
                清除已完成 ({doneTasks.length})
              </Button>
            )}
            <Button onClick={handleNewTaskClick}>
              <Plus className="h-4 w-4 mr-2" />
              新增任務
            </Button>
          </div>
        }
      />

      {/* AutoExecutor 控制已移到 Dashboard，這裡不重複顯示 */}

      {/* 索引 / 記憶：暫時隱藏，等功能完善後再開放 */}

      {/* 清除已完成確認 */}
      <Dialog open={confirmClearDoneOpen} onOpenChange={setConfirmClearDoneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>清除已完成任務</DialogTitle>
            <DialogDescription>
              確定要刪除所有已完成的任務嗎？共 {doneTasks.length} 筆，刪除後無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmClearDoneOpen(false)} disabled={clearingDone}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleClearDoneTasks} disabled={clearingDone}>
              {clearingDone ? '刪除中…' : `刪除 ${doneTasks.length} 筆`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
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
        {fromReviewId && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium">
              篩選：發想轉出的任務 ({filteredTasks.length} 筆)
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('fromReview');
                setSearchParams(next);
              }}
            >
              清除篩選
            </Button>
          </div>
        )}
      </div>

      {/* 排程熱區 */}
      <Card className="mb-6 border-info/30 bg-info/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-info" />
              <span className="text-sm font-semibold">即將執行熱區</span>
            </div>
            <span className="text-xs text-muted-foreground">Ready Top {upcomingTasks.length}</span>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">目前沒有待執行任務</p>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((task, index) => (
                <div key={task.id} className="flex items-center justify-between gap-3 rounded border bg-background px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {index + 1}. {task.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      P{task.priority} · {task.agent?.type ?? 'auto'} · {task.modelConfig?.primary ?? 'default'}
                      {task.deadline ? ` · 截止 ${task.deadline}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleTaskClick(task)}>
                    查看
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
        <div className="grid gap-4 w-full min-w-0 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
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
          className="grid gap-4 w-full min-w-0"
          style={{
            display: tasksLoading || filteredTasks.length === 0 ? 'none' : undefined,
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {KANBAN_COLUMNS.map(column => {
            const columnTasks = filteredTasks.filter(t => t.status === column.status);
            const isActiveDrop = dragOverStatus === column.status;
            return (
              <div
                key={column.status}
                className="flex flex-col min-w-0"
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
                <ScrollArea className="flex-1 w-full min-h-0" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                  <div
                    className={cn(
                      'space-y-2 p-2 bg-muted/30 rounded-b-lg min-h-[200px] transition-all duration-200',
                      isActiveDrop && 'ring-2 ring-primary/50 bg-primary/10 shadow-inner'
                    )}
                  >
                    {columnTasks.map((task) => {
                      const runInfo = activeRunByTaskId.get(task.id) ?? null;
                      const stateMismatch = task.status === 'running' && !runInfo;
                      return (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          runInfo={runInfo}
                          stateMismatch={stateMismatch}
                          conflictHint={conflictHintMap.get(task.id)}
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
                      );
                    })}
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
                      className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
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
                          {schedule.sessionTarget && (
                            <span className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                              {schedule.sessionTarget}
                            </span>
                          )}
                          {schedule.payloadKind && (
                            <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              {schedule.payloadKind}
                            </span>
                          )}
                        </div>
                        {schedule.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {schedule.description}
                          </p>
                        )}
                        {schedule.lastError && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {schedule.lastError}
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
                          {typeof schedule.consecutiveErrors === 'number' && schedule.consecutiveErrors > 0 && (
                            <span className="text-red-600">連續錯誤 {schedule.consecutiveErrors}</span>
                          )}
                          {schedule.model && (
                            <span className="truncate max-w-[260px]">{schedule.model}</span>
                          )}
                          {typeof schedule.timeoutSeconds === 'number' && schedule.timeoutSeconds > 0 && (
                            <span>timeout {schedule.timeoutSeconds}s</span>
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
        key={selectedTask ? `${selectedTask.id}-${drawerInitialTab}` : 'closed'}
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
