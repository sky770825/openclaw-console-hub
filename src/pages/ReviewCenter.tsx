import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  ArrowRight,
  Loader2,
  RefreshCw,
  Trash2,
  FolderPlus,
  ListTodo,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { listReviews, updateReview, deleteReview } from '@/services/api';
import { createTaskFromReview, createProjectFromReview } from '@/services/openclawBoardApi';
import type { Review } from '@/types';

const statusStyle: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: '待審核', icon: Clock, className: 'text-yellow-600 bg-yellow-500/10' },
  approved: { label: '已通過', icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-500/10' },
  rejected: { label: '已拒絕', icon: XCircle, className: 'text-red-500 bg-red-500/10' },
};

export default function ReviewCenter() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Review | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const loadIdeas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listReviews();
      const normalized: Review[] = Array.isArray(data)
        ? data.map((r: Record<string, unknown>) => ({
            id: String(r.id ?? ''),
            number: Number(r.number ?? 0),
            title: String(r.title ?? ''),
            summary: String(r.summary ?? (r.desc as string) ?? ''),
            filePath: String(r.filePath ?? r.src ?? ''),
            status: (r.status as Review['status']) ?? 'pending',
            createdAt: String(r.createdAt ?? r.created_at ?? ''),
            reviewedAt: r.reviewedAt != null ? String(r.reviewedAt) : undefined,
            reviewNote: r.reviewNote != null ? String(r.reviewNote) : (r.reasoning != null ? String(r.reasoning) : undefined),
            tags: Array.isArray(r.tags) ? r.tags.map(String) : [r.type, r.pri].filter(Boolean).map(String),
          }))
        : [];
      setIdeas(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdeas();
  }, []);

  // Stats
  const stats = {
    total: ideas.length,
    pending: ideas.filter((i) => i.status === 'pending').length,
    approved: ideas.filter((i) => i.status === 'approved').length,
    rejected: ideas.filter((i) => i.status === 'rejected').length,
  };

  const filtered = ideas.filter((i) => !statusFilter || i.status === statusFilter);

  // 打開詳情
  const openDetail = (idea: Review) => {
    setSelectedIdea(idea);
    setReviewNote(idea.reviewNote || '');
    setSheetOpen(true);
  };

  // 審核（通過 / 拒絕）
  const handleReview = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      setSubmitting(true);
      const updated = await updateReview(id, {
        status: newStatus,
        reviewNote: reviewNote || (newStatus === 'approved' ? '通過' : '不採納'),
        reviewedAt: new Date().toISOString().split('T')[0],
      });
      if (updated) {
        setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
        if (selectedIdea?.id === id) setSelectedIdea(updated);
      }
      toast.success(newStatus === 'approved' ? '已通過' : '已拒絕');
    } catch {
      toast.error('操作失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 通過 + 轉任務
  const handleApproveAndTask = async (idea: Review) => {
    try {
      setSubmitting(true);
      const { ok, data: created } = await createTaskFromReview({
        id: idea.id,
        title: idea.title,
        type: idea.tags?.[0],
        desc: idea.summary,
      });
      await updateReview(idea.id, {
        status: 'approved',
        reviewNote: '通過並轉任務',
        reviewedAt: new Date().toISOString().split('T')[0],
      });
      await loadIdeas();
      setSheetOpen(false);
      toast.success('已通過並建立任務');
      if (ok && created?.id) navigate(`/tasks/${created.id}`);
    } catch {
      toast.error('操作失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 通過 + 建專案
  const handleApproveAndProject = async (idea: Review) => {
    try {
      setSubmitting(true);
      const result = await createProjectFromReview({
        title: idea.title,
        summary: idea.summary,
        tags: idea.tags,
      });
      await updateReview(idea.id, {
        status: 'approved',
        reviewNote: '通過並建專案',
        reviewedAt: new Date().toISOString().split('T')[0],
      });
      await loadIdeas();
      setSheetOpen(false);
      toast.success('已通過並建立專案');
      if (result?.project) navigate('/projects');
    } catch {
      toast.error('操作失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 全部通過
  const handleApproveAll = async () => {
    const pending = ideas.filter((i) => i.status === 'pending');
    if (pending.length === 0) return;
    if (!confirm(`確定全部通過 ${pending.length} 個發想？`)) return;
    setSubmitting(true);
    let ok = 0;
    for (const idea of pending) {
      try {
        await updateReview(idea.id, {
          status: 'approved',
          reviewNote: '批量通過',
          reviewedAt: new Date().toISOString().split('T')[0],
        });
        ok++;
      } catch { /* continue */ }
    }
    await loadIdeas();
    setSubmitting(false);
    toast.success(`已通過 ${ok} 個`);
  };

  // 刪除
  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除？')) return;
    try {
      setSubmitting(true);
      await deleteReview(id);
      setIdeas((prev) => prev.filter((i) => i.id !== id));
      if (selectedIdea?.id === id) setSheetOpen(false);
      toast.success('已刪除');
    } catch {
      toast.error('刪除失敗');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <SectionHeader
        title="發想審核"
        icon="💡"
        description="AI 提出的主題建議，老蔡審核決定要不要做"
        action={
          <div className="flex items-center gap-2">
            {stats.pending > 0 && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleApproveAll}
                disabled={submitting}
              >
                <Check className="h-4 w-4 mr-1" />
                全部通過 ({stats.pending})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => loadIdeas()} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        }
      />

      {/* Filter Pills */}
      {!loading && stats.total > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            className={cn(
              'px-3 py-1.5 rounded-full text-sm transition-colors',
              !statusFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
            onClick={() => setStatusFilter(null)}
          >
            全部 {stats.total}
          </button>
          <button
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors',
              statusFilter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? null : 'pending')}
          >
            <Clock className="h-3 w-3" />
            待審 {stats.pending}
          </button>
          <button
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors',
              statusFilter === 'approved' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
            onClick={() => setStatusFilter(statusFilter === 'approved' ? null : 'approved')}
          >
            <CheckCircle2 className="h-3 w-3" />
            已通過 {stats.approved}
          </button>
          {stats.rejected > 0 && (
            <button
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors',
                statusFilter === 'rejected' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              onClick={() => setStatusFilter(statusFilter === 'rejected' ? null : 'rejected')}
            >
              <XCircle className="h-3 w-3" />
              已拒絕 {stats.rejected}
            </button>
          )}
        </div>
      )}

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
          <Button variant="outline" size="sm" className="mt-2" onClick={() => loadIdeas()}>
            重試
          </Button>
        </div>
      )}

      {/* Idea List */}
      {!loading && !error && (
        <div className="space-y-2">
          {filtered.map((idea) => {
            const s = statusStyle[idea.status] ?? statusStyle.pending;
            const Icon = s.icon;
            const isPending = idea.status === 'pending';

            return (
              <div
                key={idea.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                  isPending ? 'border-yellow-500/20 bg-yellow-500/[0.03]' : 'hover:bg-muted/40'
                )}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className={cn('h-4 w-4', s.className.split(' ')[0])} />
                </div>

                {/* Content — 點擊開詳情 */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => openDetail(idea)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{idea.title}</span>
                    {idea.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {idea.summary && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {idea.summary}
                    </p>
                  )}
                  {idea.reviewNote && !isPending && (
                    <p className="text-[11px] text-muted-foreground/70 mt-1 italic">
                      {idea.reviewNote}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isPending ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleReview(idea.id, 'rejected')}
                        disabled={submitting}
                        title="不要"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleReview(idea.id, 'approved')}
                        disabled={submitting}
                        title="通過"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground"
                        onClick={() => openDetail(idea)}
                        title="看詳情"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground"
                        onClick={() => openDetail(idea)}
                      >
                        詳情
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground/50 hover:text-destructive"
                        onClick={() => handleDelete(idea.id)}
                        disabled={submitting}
                        title="刪除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          title="沒有發想"
          description={statusFilter ? '此分類下沒有項目' : '等待 AI 提出新主題'}
        />
      )}

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        {selectedIdea && (
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedIdea.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-xs', (statusStyle[selectedIdea.status] ?? statusStyle.pending).className)}>
                  {(statusStyle[selectedIdea.status] ?? statusStyle.pending).label}
                </Badge>
                <span className="text-xs">{selectedIdea.createdAt}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-4">
              {/* Summary */}
              {selectedIdea.summary && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">摘要</p>
                  <p className="text-sm leading-relaxed">{selectedIdea.summary}</p>
                </div>
              )}

              {/* Tags */}
              {selectedIdea.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedIdea.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Existing review note */}
              {selectedIdea.reviewNote && selectedIdea.status !== 'pending' && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">審核備註</p>
                  <p className="text-sm">{selectedIdea.reviewNote}</p>
                </div>
              )}

              {/* Review actions for pending */}
              {selectedIdea.status === 'pending' && (
                <>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5">備註（選填）</p>
                    <Textarea
                      placeholder="審核意見..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={2}
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleReview(selectedIdea.id, 'approved')}
                        disabled={submitting}
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        通過
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleReview(selectedIdea.id, 'rejected')}
                        disabled={submitting}
                      >
                        <X className="h-4 w-4 mr-1.5" />
                        不要
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleApproveAndTask(selectedIdea)}
                        disabled={submitting}
                      >
                        <ListTodo className="h-4 w-4 mr-1.5" />
                        通過 + 轉任務
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleApproveAndProject(selectedIdea)}
                        disabled={submitting}
                      >
                        <FolderPlus className="h-4 w-4 mr-1.5" />
                        通過 + 建專案
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Actions for non-pending */}
              {selectedIdea.status !== 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApproveAndProject(selectedIdea)}
                    disabled={submitting}
                  >
                    <FolderPlus className="h-4 w-4 mr-1.5" />
                    建專案
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApproveAndTask(selectedIdea)}
                    disabled={submitting}
                  >
                    <ListTodo className="h-4 w-4 mr-1.5" />
                    轉任務
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(selectedIdea.id)}
                    disabled={submitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        )}
      </Sheet>
    </PageContainer>
  );
}
