import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  MessageCircle, 
  Lightbulb, 
  FileText,
  Clock,
  ArrowRight,
  Search,
  CheckCheck,
  Loader2,
  Check,
  RefreshCw,
  ExternalLink,
  Trash2,
  ListTodo,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { listReviews, updateReview, deleteReview, getTasksByReviewId } from '@/services/api';
import { createTaskFromReview, createProjectFromReview } from '@/services/openclawBoardApi';
import { fetchIdeaContent } from '@/services/reviewService';
import type { Review } from '@/types';

// 狀態標籤配置
const statusConfig = {
  pending: { label: '待審核', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock },
  approved: { label: '已通過', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle },
  rejected: { label: '未通過', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle },
};

export default function ReviewCenter() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Review | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasksByReview, setTasksByReview] = useState<Record<string, { count: number }>>({});

  // 載入發想列表
  useEffect(() => {
    loadIdeas();
  }, []);

  // 對已批准的發想載入對應任務數量
  useEffect(() => {
    const approved = ideas.filter((i) => i.status === 'approved');
    if (approved.length === 0) return;
    const load = async () => {
      const map: Record<string, { count: number }> = {};
      for (const idea of approved) {
        try {
          const tasks = await getTasksByReviewId(idea.id);
          if (tasks.length > 0) {
            map[idea.id] = { count: tasks.length };
          }
        } catch {
          // 忽略單筆失敗
        }
      }
      setTasksByReview((prev) => ({ ...prev, ...map }));
    };
    load();
  }, [ideas]);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadIdeas = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await listReviews();
      // 正規化為 Review 形狀，避免後端回傳缺 summary/tags 時前端報錯（相容已映射與未映射格式）
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
      console.error('Failed to load reviews:', err);
      const msg = err instanceof Error ? err.message : '載入發想列表失敗';
      setLoadError(msg);
      toast.error('載入發想列表失敗，請確認後端已啟動');
    } finally {
      setLoading(false);
    }
  };

  // 統計數據
  const stats = {
    total: ideas.length,
    pending: ideas.filter(i => i.status === 'pending').length,
    approved: ideas.filter(i => i.status === 'approved').length,
    rejected: ideas.filter(i => i.status === 'rejected').length,
  };

  // 過濾發想（防呆：summary/tags 可能為 undefined，若後端回傳格式不一致）
  const filteredIdeas = ideas.filter(idea => {
    const matchesTab = activeTab === 'all' || idea.status === activeTab;
    const summary = idea.summary ?? '';
    const tags = idea.tags ?? [];
    const matchesSearch =
      (idea.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some((tag: string) => String(tag).toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  // 查看詳情
  const handleViewDetail = (idea: Review) => {
    setSelectedIdea(idea);
    setReviewNote(idea.reviewNote || '');
    setDetailOpen(true);
  };

  // 審核操作
  const handleReview = async (ideaId: string, newStatus: 'approved' | 'rejected') => {
    try {
      setSubmitting(true);
      
      // 呼叫 API 更新狀態
      const updated = await updateReview(ideaId, {
        status: newStatus,
        reviewNote: reviewNote,
        reviewedAt: new Date().toISOString().split('T')[0]
      });
      
      if (!updated) {
        throw new Error('更新失敗');
      }
      
      // 更新本地狀態
      setIdeas(prev => prev.map(idea => 
        idea.id === ideaId ? updated : idea
      ));
      
      toast.success(newStatus === 'approved' ? '已通過此發想' : '已拒絕此發想');
      setDetailOpen(false);
      setReviewNote('');
    } catch (err) {
      console.error('Failed to update review:', err);
      toast.error('審核操作失敗，請重試');
    } finally {
      setSubmitting(false);
    }
  };

  // 全部通過
  const handleApproveAll = async () => {
    const pendingIdeas = ideas.filter(i => i.status === 'pending');
    if (pendingIdeas.length === 0) {
      toast.info('沒有待審核的發想');
      return;
    }
    
    if (!confirm(`確定要一次通過全部 ${pendingIdeas.length} 個發想嗎？`)) {
      return;
    }
    
    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const idea of pendingIdeas) {
      try {
        await updateReview(idea.id, {
          status: 'approved',
          reviewNote: '批量審核通過',
          reviewedAt: new Date().toISOString().split('T')[0]
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to approve idea ${idea.id}:`, err);
        failCount++;
      }
    }
    
    // 重新載入列表
    await loadIdeas();
    
    if (failCount === 0) {
      toast.success(`✅ 全部 ${successCount} 個發想已通過！`);
    } else {
      toast.warning(`${successCount} 個通過，${failCount} 個失敗`);
    }
    
    setSubmitting(false);
  };

  // 通過並建立專案（不轉任務）
  const handleApproveAndCreateProject = async (idea: Review) => {
    try {
      setSubmitting(true);
      const result = await createProjectFromReview({
        title: idea.title,
        summary: idea.summary,
        tags: idea.tags,
      });
      if (result?.project) {
        const updated = await updateReview(idea.id, {
          status: 'approved',
          reviewNote: '審核通過並已建立專案',
          reviewedAt: new Date().toISOString().split('T')[0],
        });
        if (updated) {
          setIdeas((prev) => prev.map((i) => (i.id === idea.id ? updated : i)));
        }
        toast.success(`已通過並建立專案：${idea.title}`);
        setDetailOpen(false);
        navigate(`/projects`);
      } else {
        toast.error('建立專案失敗');
      }
    } catch (err) {
      console.error('Failed to approve and create project:', err);
      toast.error('審核或建立專案失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 通過並轉成任務 + 建立專案（聯動）
  const handleApproveAndCreateTaskAndProject = async (idea: Review) => {
    try {
      setSubmitting(true);
      const { ok, data: taskData } = await createTaskFromReview({
        id: idea.id,
        title: idea.title,
        type: idea.tags?.[0],
        desc: idea.summary,
      });
      const taskId = taskData?.id;
      const projResult = await createProjectFromReview({
        title: idea.title,
        summary: idea.summary,
        tags: idea.tags,
        linkedTaskIds: taskId ? [taskId] : [],
      });
      const updated = await updateReview(idea.id, {
        status: 'approved',
        reviewNote: '審核通過並已轉成任務與專案',
        reviewedAt: new Date().toISOString().split('T')[0],
      });
      if (updated) {
        setIdeas((prev) => prev.map((i) => (i.id === idea.id ? updated : i)));
      }
      const msg = taskId && projResult?.project
        ? '已通過、轉任務並建立專案'
        : ok
        ? '已通過並轉成任務'
        : '已通過';
      toast.success(msg);
      setDetailOpen(false);
      if (projResult?.project) {
        navigate(`/projects`);
      } else if (taskId) {
        navigate(`/tasks/${taskId}`);
      }
    } catch (err) {
      console.error('Failed to approve and create task+project:', err);
      toast.error('審核或建立失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 從已通過的發想建立專案（不更新審核狀態）
  const handleCreateProjectFromIdea = async (idea: Review) => {
    try {
      setSubmitting(true);
      const result = await createProjectFromReview({
        title: idea.title,
        summary: idea.summary,
        tags: idea.tags,
      });
      if (result?.project) {
        toast.success(`已從發想建立專案：${idea.title}`);
        setDetailOpen(false);
        navigate(`/projects`);
      } else {
        toast.error('建立專案失敗');
      }
    } catch (err) {
      console.error('Failed to create project from idea:', err);
      toast.error('建立專案失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 通過並轉成任務
  const handleApproveAndCreateTask = async (idea: Review) => {
    try {
      setSubmitting(true);
      const { ok, status, data: created } = await createTaskFromReview({
        id: idea.id,
        title: idea.title,
        type: idea.tags?.[0],
        desc: idea.summary,
      });
      if (!ok) {
        toast.error(status === 400 ? '建立任務失敗（需後端支援）' : '建立任務失敗');
        return;
      }
      const updated = await updateReview(idea.id, {
        status: 'approved',
        reviewNote: '審核通過並已轉成任務',
        reviewedAt: new Date().toISOString().split('T')[0],
      });
      if (updated) {
        setIdeas((prev) => prev.map((i) => (i.id === idea.id ? updated : i)));
      }
      const taskId = created?.id;
      toast.success(taskId ? `已通過並轉成任務：${idea.title}` : '已通過');
      setDetailOpen(false);
      if (taskId) navigate(`/tasks/${taskId}`);
    } catch (err) {
      console.error('Failed to approve and create task:', err);
      toast.error('審核或建立任務失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 快速審核（不通過詳情對話框）
  const handleQuickReview = async (ideaId: string, newStatus: 'approved' | 'rejected') => {
    try {
      setSubmitting(true);
      
      const updated = await updateReview(ideaId, {
        status: newStatus,
        reviewNote: newStatus === 'approved' ? '快速審核通過' : '快速審核未通過',
        reviewedAt: new Date().toISOString().split('T')[0]
      });
      
      if (!updated) {
        throw new Error('更新失敗');
      }
      
      // 更新本地狀態
      setIdeas(prev => prev.map(idea => 
        idea.id === ideaId ? updated : idea
      ));
      
      toast.success(newStatus === 'approved' ? '✓ 已通過' : '✗ 未通過');
    } catch (err) {
      console.error('Failed to quick review:', err);
      toast.error('審核失敗，請重試');
    } finally {
      setSubmitting(false);
    }
  };

  // 刪除單一發想
  const handleDeleteReview = async (ideaId: string) => {
    if (!confirm('確定要刪除此發想嗎？刪除後無法復原。')) return;
    try {
      setSubmitting(true);
      await deleteReview(ideaId);
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
      setTasksByReview((prev) => {
        const next = { ...prev };
        delete next[ideaId];
        return next;
      });
      toast.success('已刪除');
      if (selectedIdea?.id === ideaId) setDetailOpen(false);
    } catch (err) {
      toast.error('刪除失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 批次刪除已拒絕
  const handleBatchDeleteRejected = async () => {
    const rejected = ideas.filter((i) => i.status === 'rejected');
    if (rejected.length === 0) {
      toast.info('沒有可刪除的已拒絕發想');
      return;
    }
    if (!confirm(`確定要刪除全部 ${rejected.length} 個已拒絕發想嗎？`)) return;
    try {
      setSubmitting(true);
      let ok = 0;
      for (const idea of rejected) {
        try {
          await deleteReview(idea.id);
          ok++;
        } catch {
          // 繼續處理下一個
        }
      }
      await loadIdeas();
      toast.success(`已刪除 ${ok} 個已拒絕發想`);
    } catch (err) {
      toast.error('批次刪除失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 讀取文件內容
  const handleReadFile = async (filePath: string) => {
    if (!filePath?.trim()) {
      toast.info('無文件路徑');
      return;
    }
    try {
      const content = await fetchIdeaContent(filePath);
      if (content) {
        const win = window.open('', '_blank');
        if (win) {
          const escaped = content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');
          win.document.write(`<pre style="padding:16px;font-family:monospace;white-space:pre-wrap;font-size:12px">${escaped}</pre>`);
          win.document.close();
        } else {
          toast.info(content.slice(0, 150) + (content.length > 150 ? '...' : ''), { duration: 5000 });
        }
      } else {
        toast.info(`文件路徑: ${filePath}`);
      }
    } catch {
      toast.info(`文件路徑: ${filePath}（請直接開啟該路徑查看）`);
    }
  };

  if (loading && ideas.length === 0) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">載入發想列表中…</p>
      </div>
    );
  }

  if (loadError && ideas.length === 0) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button onClick={() => loadIdeas()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          重試載入
        </Button>
        <Button variant="outline" asChild>
          <Link to="/cursor">前往 OpenClaw 任務板</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Lightbulb className="h-8 w-8 text-yellow-500" />
            小蔡的發想審核中心
          </h1>
          <p className="text-muted-foreground mt-1">
            審核小蔡提出的優化建議，決定是否納入任務板執行
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadIdeas()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
            重新載入
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/cursor">
              <ExternalLink className="h-4 w-4 mr-1" />
              OpenClaw 任務板
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/projects">
              <FolderPlus className="h-4 w-4 mr-1" />
              專案製作
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/alerts">
              <ExternalLink className="h-4 w-4 mr-1" />
              警報
            </Link>
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>總發想數</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>待審核</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>已通過</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>未通過</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 搜尋與過濾 + 全部通過 / 批次刪除按鈕 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋發想標題、內容或標籤..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {stats.pending > 0 && (
          <Button 
            variant="default" 
            className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
            onClick={handleApproveAll}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-1" />
            )}
            全部通過 ({stats.pending})
          </Button>
        )}
        {stats.rejected > 0 && (
          <Button 
            variant="outline" 
            className="text-destructive hover:bg-destructive/10 whitespace-nowrap"
            onClick={handleBatchDeleteRejected}
            disabled={submitting}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            批次刪除已拒絕 ({stats.rejected})
          </Button>
        )}
      </div>

      {/* 發想列表 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="all">全部 ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">待審核 ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">已通過 ({stats.approved})</TabsTrigger>
          <TabsTrigger value="rejected">未通過 ({stats.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredIdeas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暫無發想</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIdeas.map((idea) => {
                const status = statusConfig[idea.status] ?? statusConfig.pending;
                const StatusIcon = status.icon;
                
                return (
                  <Card key={idea.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn('font-medium', status.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            #{String(idea.number).padStart(3, '0')}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {idea.createdAt}
                        </span>
                      </div>
                      <CardTitle className="text-lg mt-2">{idea.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {idea.summary ?? ''}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {(idea.tags ?? []).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 flex flex-wrap gap-2">
                      {idea.status === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="min-w-[70px] text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleQuickReview(idea.id, 'rejected')}
                            disabled={submitting}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            未通過
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="min-w-[70px] bg-green-600 hover:bg-green-700"
                            onClick={() => handleQuickReview(idea.id, 'approved')}
                            disabled={submitting}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            通過
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="min-w-[90px]"
                            onClick={() => handleApproveAndCreateTask(idea)}
                            disabled={submitting}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            轉任務
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="min-w-[85px]"
                            onClick={() => handleApproveAndCreateProject(idea)}
                            disabled={submitting}
                          >
                            <FolderPlus className="h-4 w-4 mr-1" />
                            建專案
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="min-w-[95px]"
                            onClick={() => handleApproveAndCreateTaskAndProject(idea)}
                            disabled={submitting}
                          >
                            <ListTodo className="h-4 w-4 mr-1" />
                            轉任務+專案
                          </Button>
                        </>
                      )}
                      {idea.status !== 'pending' && (
                        <div className="flex flex-wrap gap-2 w-full">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="min-w-[90px]"
                            onClick={() => handleViewDetail(idea)}
                          >
                            查看詳情
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="min-w-[95px]"
                            onClick={() => handleCreateProjectFromIdea(idea)}
                            disabled={submitting}
                          >
                            <FolderPlus className="h-4 w-4 mr-1" />
                            建立專案
                          </Button>
                          {tasksByReview[idea.id]?.count ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="min-w-[100px]"
                              onClick={() => navigate(`/tasks?fromReview=${encodeURIComponent(idea.id)}`)}
                            >
                              <ListTodo className="h-4 w-4 mr-1" />
                              對應任務 ({tasksByReview[idea.id].count})
                            </Button>
                          ) : null}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteReview(idea.id)}
                            disabled={submitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 詳情對話框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIdea && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={(statusConfig[selectedIdea.status] ?? statusConfig.pending).color}>
                    {(statusConfig[selectedIdea.status] ?? statusConfig.pending).label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    #{String(selectedIdea.number).padStart(3, '0')}
                  </span>
                </div>
                <DialogTitle className="text-xl">{selectedIdea.title}</DialogTitle>
                <DialogDescription>
                  建立於 {selectedIdea.createdAt}
                  {selectedIdea.reviewedAt && ` · 審核於 ${selectedIdea.reviewedAt}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* 摘要 */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    發想摘要
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedIdea.summary ?? ''}</p>
                </div>

                {/* 文件路徑 */}
                <div>
                  <h4 className="font-medium mb-2">文件位置</h4>
                  <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                    {selectedIdea.filePath ?? ''}
                  </code>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="mt-1 h-auto p-0"
                    onClick={() => handleReadFile(selectedIdea.filePath)}
                  >
                    讀取完整內容
                  </Button>
                </div>

                {/* 標籤 */}
                <div>
                  <h4 className="font-medium mb-2">標籤</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedIdea.tags ?? []).map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>

                {/* 審核備註 */}
                {selectedIdea.status === 'pending' && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      審核備註（選填）
                    </h4>
                    <Textarea
                      placeholder="輸入審核意見或修改建議..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={3}
                      disabled={submitting}
                    />
                  </div>
                )}

                {selectedIdea.reviewNote && (
                  <div className="bg-muted p-3 rounded-lg">
                    <h4 className="font-medium mb-1">審核備註</h4>
                    <p className="text-sm text-muted-foreground">{selectedIdea.reviewNote}</p>
                  </div>
                )}
              </div>

              {/* 審核按鈕（待審）或操作按鈕（已審） */}
              {selectedIdea.status === 'pending' ? (
                <DialogFooter className="gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => setDetailOpen(false)}
                    disabled={submitting}
                  >
                    取消
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReview(selectedIdea.id, 'rejected')}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    未通過
                  </Button>
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleReview(selectedIdea.id, 'approved')}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    通過
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleApproveAndCreateTask(selectedIdea)}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-1" />
                    )}
                    通過+轉任務
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleApproveAndCreateProject(selectedIdea)}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <FolderPlus className="h-4 w-4 mr-1" />
                    )}
                    通過+建專案
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleApproveAndCreateTaskAndProject(selectedIdea)}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <ListTodo className="h-4 w-4 mr-1" />
                    )}
                    通過+轉任務+專案
                  </Button>
                </DialogFooter>
              ) : (
                <DialogFooter className="gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => setDetailOpen(false)}
                    disabled={submitting}
                  >
                    關閉
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleCreateProjectFromIdea(selectedIdea)}
                    disabled={submitting}
                  >
                    <FolderPlus className="h-4 w-4 mr-1" />
                    從此發想建立專案
                  </Button>
                  {tasksByReview[selectedIdea.id]?.count ? (
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/tasks?fromReview=${encodeURIComponent(selectedIdea.id)}`)}
                    >
                      <ListTodo className="h-4 w-4 mr-1" />
                      查看對應任務 ({tasksByReview[selectedIdea.id].count})
                    </Button>
                  ) : null}
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteReview(selectedIdea.id)}
                    disabled={submitting}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    刪除此發想
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
