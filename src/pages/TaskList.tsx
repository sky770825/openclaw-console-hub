import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { SearchInput, FilterBar, type FilterConfig, EmptyState } from '@/components/common';
import { StatusBadge, PriorityBadge } from '@/components/common/Badges';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Play, 
  Pause, 
  Edit, 
  Trash2,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Clock,
  User,
  ArrowUpDown
} from 'lucide-react';
import { getTasks, api } from '@/services/api';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { pollRunStatus } from '@/lib/pollRunStatus';

const filterConfigs: FilterConfig[] = [
  {
    key: 'status',
    label: '狀態',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'ready', label: 'Ready' },
      { value: 'running', label: 'Running' },
      { value: 'review', label: 'Review' },
      { value: 'done', label: 'Done' },
      { value: 'blocked', label: 'Blocked' },
    ],
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

type SortField = 'name' | 'status' | 'nextRunAt' | 'priority';
type SortDirection = 'asc' | 'desc';

export default function TaskList() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromProject = (location.state as { projectId?: string; projectTitle?: string } | null) ?? {};
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    getTasks().then(setTasks);
  }, []);

  const filteredTasks = useMemo(() => {
    const result = tasks.filter(task => {
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

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'priority':
          comparison = a.priority - b.priority;
          break;
        case 'nextRunAt':
          if (!a.nextRunAt) return 1;
          if (!b.nextRunAt) return -1;
          comparison = new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tasks, searchQuery, activeFilters, sortField, sortDirection]);

  const paginatedTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredTasks.length / pageSize);

  const handleFilterChange = (key: string, value: string | string[] | null) => {
    setActiveFilters(prev => {
      if (value === null) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedTasks.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleRunNow = async (taskId: string) => {
    try {
      const run = await api.runNow(taskId);
      getTasks().then(setTasks);
      toast.success('已加入執行佇列，正在執行…');
      pollRunStatus(run.id, () => getTasks().then(setTasks));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '執行失敗');
    }
  };

  const handleBulkRun = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        const run = await api.runNow(id);
        pollRunStatus(run.id, () => getTasks().then(setTasks));
      } catch {
        toast.error(`任務 ${id} 執行失敗`);
      }
    }
    setTasks(await getTasks());
    setSelectedIds(new Set());
    toast.success(`已將 ${ids.length} 項加入執行佇列`);
  };

  const handleBulkBlocked = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await api.updateTask(id, { status: 'blocked' });
    }
    setTasks(await getTasks());
    setSelectedIds(new Set());
    toast.success(`已將 ${ids.length} 項移至 Blocked`);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await api.batchDeleteTasks(ids);
      setTasks(await getTasks());
      setSelectedIds(new Set());
      toast.success(`已刪除 ${ids.length} 項`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '批次刪除失敗');
    }
  };

  const handleToggleBlocked = async (task: Task) => {
    try {
      await api.updateTask(task.id, {
        status: task.status === 'blocked' ? 'ready' : 'blocked',
      });
      setTasks(await getTasks());
      toast.success(task.status === 'blocked' ? '已解除封鎖' : '已移至 Blocked');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失敗');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3" /> 
      : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <PageContainer>
      <SectionHeader
        title="任務列表"
        icon="📋"
        description={fromProject.projectTitle ? `專案「${fromProject.projectTitle}」的任務與執行紀錄` : '查看和管理所有自動化任務'}
        action={
          <Button onClick={() => navigate('/tasks?new=true')}>
            <Plus className="h-4 w-4 mr-2" />
            新增任務
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput
          value={searchQuery}
          onChange={(v) => { setSearchQuery(v); setPage(1); }}
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

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">已選擇 {selectedIds.size} 項</span>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
            清除
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkRun}>
            <Play className="h-3 w-3 mr-1" />
            執行選取項目
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkBlocked}>
            <Pause className="h-3 w-3 mr-1" />
            移至 Blocked
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3 mr-1" />
            批次刪除
          </Button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedIds.size === paginatedTasks.length && paginatedTasks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 -ml-3 font-medium"
                  onClick={() => handleSort('name')}
                >
                  名稱 <SortIcon field="name" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 -ml-3 font-medium"
                  onClick={() => handleSort('status')}
                >
                  狀態 <SortIcon field="status" />
                </Button>
              </TableHead>
              <TableHead>排程</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 -ml-3 font-medium"
                  onClick={() => handleSort('priority')}
                >
                  優先級 <SortIcon field="priority" />
                </Button>
              </TableHead>
              <TableHead>負責人</TableHead>
              <TableHead>上次執行</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 -ml-3 font-medium"
                  onClick={() => handleSort('nextRunAt')}
                >
                  下次執行 <SortIcon field="nextRunAt" />
                </Button>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTasks.map(task => (
              <TableRow 
                key={task.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedIds.has(task.id)}
                    onCheckedChange={(checked) => handleSelect(task.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell className="font-medium">{task.name}</TableCell>
                <TableCell><StatusBadge status={task.status} /></TableCell>
                <TableCell className="font-mono text-xs">
                  {task.scheduleExpr || task.scheduleType}
                </TableCell>
                <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                <TableCell className="text-muted-foreground">{task.owner}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {task.lastRunAt ? formatDate(task.lastRunAt) : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {task.nextRunAt ? formatDate(task.nextRunAt) : '—'}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRunNow(task.id)}>
                        <Play className="h-3 w-3 mr-2" />
                        立即執行
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/tasks/${task.id}`)}>
                        <Edit className="h-3 w-3 mr-2" />
                        編輯
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleBlocked(task)}>
                        {task.status === 'blocked' ? '解除封鎖' : '移至 Blocked'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/runs?task=${task.id}`)}>
                        查看執行紀錄
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedTasks.map(task => (
          <Card 
            key={task.id} 
            className="cursor-pointer hover:shadow-card-hover transition-all"
            onClick={() => navigate(`/tasks/${task.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium">{task.name}</h3>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {task.owner}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {task.scheduleExpr || task.scheduleType}
                </div>
              </div>

              {task.nextRunAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  下次執行：{formatDate(task.nextRunAt)}
                </p>
              )}

              <div className="flex gap-2 mt-3 pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRunNow(task.id);
                  }}
                >
                  <Play className="h-3 w-3 mr-1" />
                  執行
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/runs?task=${task.id}`);
                  }}
                >
                  查看執行紀錄
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <EmptyState
          title="找不到任務"
          description="請嘗試調整搜尋條件或篩選器"
          action={{
            label: '清除篩選',
            onClick: () => {
              setSearchQuery('');
              setActiveFilters({});
            }
          }}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            顯示第 {(page - 1) * pageSize + 1} 至 {Math.min(page * pageSize, filteredTasks.length)} 項，共 {filteredTasks.length} 項
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              上一頁
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
