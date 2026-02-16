import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FolderKanban, Plus, Pencil, Trash2, Check, GripVertical, User, ListTodo, Calendar, Flag, Tag, Package } from 'lucide-react';
import { PageContainer, SectionHeader, Section } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Project, ProjectStatus, ProjectPhase } from '@/types/project';

const ASSIGNEE_OPTIONS = [
  { value: '', label: '未指派' },
  { value: 'openclaw', label: 'OpenClaw' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'codex', label: 'Codex' },
];
import { PROJECT_STATUS_LABELS } from '@/types/project';
import { cn } from '@/lib/utils';
import { fetchProjects, createProject, updateProject, deleteProject, getApiDisplayLabel } from '@/services/openclawBoardApi';

const STORAGE_KEY = 'openclaw_projects';

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function newPhase(name = ''): ProjectPhase {
  return { id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, name, done: false };
}

const PRIORITY_LABELS: Record<number, string> = { 1: 'P1 最高', 2: 'P2 高', 3: 'P3 中', 4: 'P4 低', 5: 'P5 最低' };

function newProject(overrides?: Partial<Project>): Project {
  const now = new Date().toISOString();
  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: '',
    description: '',
    status: 'planning',
    progress: 0,
    phases: [],
    notes: '',
    priority: 3,
    tags: [],
    linkedTaskIds: [],
    updatedAt: now,
    createdAt: now,
    ...overrides,
  };
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Project>(() => newProject());
  const [lastSaveSource, setLastSaveSource] = useState<'supabase' | 'local' | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchProjects();
    setProjects(data);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openCreate = () => {
    setForm(newProject());
    setEditingId(null);
    setLastSaveSource(null);
    setSheetOpen(true);
  };

  const openEdit = (p: Project) => {
    setForm({ ...p });
    setEditingId(p.id);
    setLastSaveSource(null);
    setSheetOpen(true);
  };

  const save = async () => {
    const now = new Date().toISOString();
    const toSave = { ...form, updatedAt: now };
    let usedApi = false;
    if (editingId) {
      const result = await updateProject(editingId, toSave);
      if (result?.project) {
        setProjects((prev) => prev.map((q) => (q.id === editingId ? result.project! : q)));
        usedApi = result.savedTo === 'supabase';
      }
    } else {
      const result = await createProject(toSave);
      if (result?.project) {
        setProjects((prev) => [result.project!, ...prev]);
        usedApi = result.savedTo === 'supabase';
      }
    }
    setLastSaveSource(usedApi ? 'supabase' : 'local');
    setSheetOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm('確定要刪除此專案？')) return;
    const ok = await deleteProject(id);
    if (ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
    if (editingId === id) setSheetOpen(false);
  };

  const updateForm = (patch: Partial<Project>) => {
    setForm((f) => ({ ...f, ...patch }));
  };

  const addPhase = () => {
    setForm((f) => ({ ...f, phases: [...f.phases, newPhase('新階段')] }));
  };

  const updatePhase = (phaseId: string, patch: Partial<ProjectPhase>) => {
    setForm((f) => ({
      ...f,
      phases: f.phases.map((ph) => (ph.id === phaseId ? { ...ph, ...patch } : ph)),
    }));
  };

  const openTaskListForProject = (projectId: string, title: string) => {
    navigate('/tasks/list', { state: { projectId, projectTitle: title } });
  };

  const removePhase = (phaseId: string) => {
    setForm((f) => ({ ...f, phases: f.phases.filter((ph) => ph.id !== phaseId) }));
  };

  const statusColor: Record<ProjectStatus, string> = {
    planning: 'bg-muted text-muted-foreground',
    in_progress: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    done: 'bg-green-500/15 text-green-600 dark:text-green-400',
    paused: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  };

  return (
    <PageContainer>
      <SectionHeader
        title="專案製作"
        description="記錄網站／專案處理進度與具體內容"
        icon="📁"
        count={projects.length}
        action={
          <Button onClick={openCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            新增專案
          </Button>
        }
      />

      {lastSaveSource && (
        <p className="text-xs text-muted-foreground mb-2">
          {lastSaveSource === 'supabase' ? '✓ 已寫入 Supabase（' + getApiDisplayLabel() + '）' : '✓ 已儲存至本地（後端未連線）'}
        </p>
      )}
      <Section>
        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">尚無專案，可新增一筆以記錄處理進度與說明</p>
              <Button onClick={openCreate} variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                新增專案
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
                onClick={() => openEdit(p)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold line-clamp-2">{p.title || '未命名專案'}</CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.priority != null && (
                        <Badge variant="outline" className="text-[10px]">
                          <Flag className="h-2.5 w-2.5 mr-0.5" />
                          {PRIORITY_LABELS[p.priority] ?? `P${p.priority}`}
                        </Badge>
                      )}
                      <Badge className={cn('text-[10px]', statusColor[p.status])}>
                        {PROJECT_STATUS_LABELS[p.status]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  )}
                  {/* 備註摘要：顯示 notes 的前幾行重點 */}
                  {p.notes && (() => {
                    const lines = p.notes.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
                    const preview = lines.slice(0, 5);
                    if (preview.length === 0) return null;
                    return (
                      <div className="rounded-md border bg-muted/30 px-2.5 py-2 space-y-0.5">
                        {preview.map((line, i) => (
                          <p key={i} className="text-[11px] text-muted-foreground leading-relaxed truncate">
                            {line.replace(/^[-*]\s*/, '').replace(/\[[ x]\]\s*/i, (m) => m.includes('x') ? '✅ ' : '⬜ ')}
                          </p>
                        ))}
                        {lines.length > 5 && (
                          <p className="text-[10px] text-muted-foreground/60">...還有 {lines.length - 5} 行</p>
                        )}
                      </div>
                    );
                  })()}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>進度</span>
                      <span>{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="h-1.5" />
                  </div>
                  {p.phases.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      階段 {p.phases.filter((ph) => ph.done).length}/{p.phases.length}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">更新：{formatDate(p.updatedAt)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>{editingId ? '編輯專案' : '新增專案'}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-5 py-4">
            <div className="space-y-2">
              <Label>專案名稱</Label>
              <Input
                placeholder="例如：官網改版、後台優化"
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>專案說明／具體內容</Label>
              <Textarea
                placeholder="說明這個專案的目標、範圍、技術要點等"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                rows={4}
                className="bg-background resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>指派執行對象</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={form.assigneeAgent ?? '_none'}
                  onValueChange={(v) => updateForm({ assigneeAgent: v === '_none' ? undefined : v })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="選擇 Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNEE_OPTIONS.map((o) => (
                      <SelectItem key={o.value || 'none'} value={o.value === '' ? '_none' : o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="顯示名稱（可選）"
                  value={form.assigneeLabel ?? ''}
                  onChange={(e) => updateForm({ assigneeLabel: e.target.value.trim() || undefined })}
                  className="bg-background"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">內容編排後可指定由 OpenClaw / Cursor / Codex 執行</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>截止日</Label>
                <Input
                  type="date"
                  value={form.deadline ?? ''}
                  onChange={(e) => updateForm({ deadline: e.target.value || undefined })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>優先級</Label>
                <Select
                  value={String(form.priority ?? 3)}
                  onValueChange={(v) => updateForm({ priority: Number(v) })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {PRIORITY_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>標籤（逗號分隔）</Label>
              <Input
                placeholder="例如：官網, 改版, 後台"
                value={(form.tags ?? []).join(', ')}
                onChange={(e) =>
                  updateForm({
                    tags: e.target.value
                      .split(/[,，]/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>交付物摘要</Label>
              <Textarea
                placeholder="預期交付內容、產出物說明"
                value={form.deliverablesSummary ?? ''}
                onChange={(e) => updateForm({ deliverablesSummary: e.target.value.trim() || undefined })}
                rows={2}
                className="bg-background resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>關聯任務 ID（逗號分隔，可選）</Label>
              <Input
                placeholder="例如：task-1, task-2"
                value={(form.linkedTaskIds ?? []).join(', ')}
                onChange={(e) =>
                  updateForm({
                    linkedTaskIds: e.target.value
                      .split(/[,，]/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>狀態</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => updateForm({ status: v as ProjectStatus })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {PROJECT_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>進度（0–100）</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(e) => updateForm({ progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>處理階段／里程碑</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addPhase} className="text-xs h-7">
                  + 新增階段
                </Button>
              </div>
              <div className="space-y-2">
                {form.phases.map((ph) => (
                  <div
                    key={ph.id}
                    className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
                  >
                    <GripVertical className="h-3.5 w-3 text-muted-foreground shrink-0" />
                    <input
                      type="checkbox"
                      checked={ph.done}
                      onChange={(e) => updatePhase(ph.id, { done: e.target.checked })}
                      className="rounded shrink-0"
                    />
                    <Input
                      value={ph.name}
                      onChange={(e) => updatePhase(ph.id, { name: e.target.value })}
                      placeholder="階段名稱"
                      className="h-8 border-0 bg-transparent text-sm flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removePhase(ph.id)}
                    >
                      <Trash2 className="h-3.5 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                {form.phases.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">可新增多個階段以追蹤處理過程</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>備註／更新紀錄</Label>
              <Textarea
                placeholder="記錄本次更新內容或待辦"
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                rows={3}
                className="bg-background resize-none"
              />
            </div>
          </div>

          <SheetFooter className="border-t pt-4 flex-row gap-2 sm:gap-0">
            {editingId && (
              <Button type="button" variant="destructive" size="sm" onClick={() => remove(editingId)}>
                刪除
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={save} className="gap-1">
              <Check className="h-4 w-4" />
              儲存
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
