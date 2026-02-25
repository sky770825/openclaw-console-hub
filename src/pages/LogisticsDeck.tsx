/**
 * 後勤甲板 — Logistics Deck
 * 客戶管理 · 人力開發 · 營收分析 · 合作夥伴 · 知識庫 · 文件中心
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, Users, UserPlus, BarChart3,
  Handshake, BookOpen, FileText, TrendingUp, DollarSign,
  Star, CheckCircle, Clock, ExternalLink
} from 'lucide-react';

// ─── 客戶管理 ─────────────────────────────────────────────
function ClientsPage() {
  const clients = [
    { id: 'C001', name: '協作者 Alpha', level: 'L2', status: 'active', score: 95, joined: '2025-01', tasks: 42 },
    { id: 'C002', name: '協作者 Beta', level: 'L1', status: 'active', score: 88, joined: '2025-02', tasks: 18 },
    { id: 'C003', name: '新申請者 C', level: '申請中', status: 'pending', score: 0, joined: '2026-02', tasks: 0 },
    { id: 'C004', name: '合作夥伴 Delta', level: 'L3', status: 'active', score: 97, joined: '2024-11', tasks: 156 },
  ];
  const statusCfg: Record<string, { color: string; label: string }> = {
    active: { color: '#10b981', label: '活躍' },
    pending: { color: '#f59e0b', label: '待審' },
    inactive: { color: '#6b7280', label: '停用' },
  };
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3"><Users className="h-7 w-7 text-purple-400" /><div><h1 className="text-xl font-semibold">客戶管理</h1><p className="text-sm text-muted-foreground">客戶資料 · 狀態追蹤 · 信任分</p></div></div>
      <div className="grid grid-cols-3 gap-3">
        {[{ label: '總客戶', value: clients.length }, { label: '活躍', value: clients.filter(c => c.status === 'active').length }, { label: '待審', value: clients.filter(c => c.status === 'pending').length }].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center"><p className="text-2xl font-bold text-purple-400">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
        ))}
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30"><p className="text-xs font-medium">客戶清單</p></div>
        <div className="divide-y">
          {clients.map(c => {
            const cfg = statusCfg[c.status];
            return (
              <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">{c.name[0]}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.level} · 加入 {c.joined} · {c.tasks} 任務</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.color + '15' }}>{cfg.label}</span>
                  {c.score > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">信任分 {c.score}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 人力開發 ─────────────────────────────────────────────
function HRPage() {
  const roles = [
    { title: 'AI Agent 開發者', status: 'open', applicants: 3, priority: 'high' },
    { title: '前端工程師（React）', status: 'open', applicants: 7, priority: 'medium' },
    { title: 'DevOps 工程師', status: 'reviewing', applicants: 2, priority: 'high' },
    { title: '資安分析師', status: 'filled', applicants: 5, priority: 'low' },
  ];
  const statusCfg: Record<string, { color: string; label: string }> = {
    open: { color: '#22d3ee', label: '招募中' },
    reviewing: { color: '#f59e0b', label: '審核中' },
    filled: { color: '#10b981', label: '已填補' },
  };
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3"><UserPlus className="h-7 w-7 text-blue-400" /><div><h1 className="text-xl font-semibold">人力開發</h1><p className="text-sm text-muted-foreground">協作者招募 · 職位管理 · 審核流程</p></div></div>
      <div className="grid grid-cols-3 gap-3">
        {[{ label: '開放職位', value: roles.filter(r => r.status === 'open').length, color: '#22d3ee' }, { label: '審核中', value: roles.filter(r => r.status === 'reviewing').length, color: '#f59e0b' }, { label: '總申請', value: roles.reduce((s, r) => s + r.applicants, 0), color: '#a78bfa' }].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center"><p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
        ))}
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30"><p className="text-xs font-medium">職位清單</p></div>
        <div className="divide-y">
          {roles.map((role, i) => {
            const cfg = statusCfg[role.status];
            return (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1"><p className="text-sm font-medium">{role.title}</p><p className="text-[10px] text-muted-foreground">{role.applicants} 位申請者</p></div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium mr-2 ${role.priority === 'high' ? 'text-red-400 bg-red-500/10' : role.priority === 'medium' ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400 bg-gray-500/10'}`}>{role.priority}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.color + '15' }}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 營收分析 ─────────────────────────────────────────────
function RevenuePage() {
  const months = ['10月', '11月', '12月', '1月', '2月'];
  const revenue = [42000, 58000, 71000, 63000, 89000];
  const maxRev = Math.max(...revenue);
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3"><BarChart3 className="h-7 w-7 text-green-400" /><div><h1 className="text-xl font-semibold">營收分析</h1><p className="text-sm text-muted-foreground">商業數據 · 月度趨勢 · 收入來源</p></div></div>
      <div className="grid grid-cols-3 gap-3">
        {[{ label: '本月營收', value: 'NT$89,000', color: '#10b981' }, { label: '月成長', value: '+41%', color: '#22d3ee' }, { label: '累計今年', value: 'NT$323,000', color: '#f59e0b' }].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center"><p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium mb-4">月度趨勢</p>
        <div className="flex items-end gap-3 h-32">
          {months.map((m, i) => (
            <div key={m} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-green-400">{(revenue[i]/1000).toFixed(0)}k</span>
              <div className="w-full rounded-t bg-green-500/30 border-t-2 border-green-400 transition-all" style={{ height: `${(revenue[i] / maxRev) * 100}%` }} />
              <span className="text-[9px] text-muted-foreground">{m}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <p className="text-xs font-medium mb-3">收入來源</p>
        {[{ label: 'AI 顧問服務', pct: 45, color: '#10b981' }, { label: '系統整合專案', pct: 32, color: '#22d3ee' }, { label: '訓練與教學', pct: 15, color: '#a78bfa' }, { label: '其他', pct: 8, color: '#6b7280' }].map(s => (
          <div key={s.label} className="flex items-center gap-3 text-xs">
            <span className="w-24 text-muted-foreground">{s.label}</span>
            <div className="flex-1 bg-muted rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${s.pct}%`, background: s.color }} /></div>
            <span style={{ color: s.color }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 合作夥伴 ─────────────────────────────────────────────
function PartnershipsPage() {
  const partners = [
    { name: 'Anthropic', type: 'AI 基礎設施', status: 'active', since: '2024', tier: 'Strategic' },
    { name: 'Cloudflare', type: '網路基礎設施', status: 'active', since: '2024', tier: 'Technical' },
    { name: 'Railway', type: '雲端部署', status: 'active', since: '2025', tier: 'Technical' },
    { name: 'n8n', type: '工作流自動化', status: 'active', since: '2025', tier: 'Integration' },
    { name: 'Supabase', type: '資料庫服務', status: 'active', since: '2024', tier: 'Technical' },
  ];
  const tierColor: Record<string, string> = { Strategic: '#f59e0b', Technical: '#22d3ee', Integration: '#a78bfa' };
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3"><Handshake className="h-7 w-7 text-yellow-400" /><div><h1 className="text-xl font-semibold">合作夥伴</h1><p className="text-sm text-muted-foreground">策略合作 · 技術夥伴 · 整合生態</p></div></div>
      <div className="grid gap-3">
        {partners.map(p => (
          <div key={p.name} className="rounded-lg border bg-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg font-bold">{p.name[0]}</div>
            <div className="flex-1"><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.type} · 自 {p.since}</p></div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: tierColor[p.tier], background: tierColor[p.tier] + '15' }}>{p.tier}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 知識庫 ───────────────────────────────────────────────
function KnowledgePage() {
  const articles = [
    { title: 'OpenClaw 架構設計指南', category: '架構', views: 234, updated: '2d前' },
    { title: 'Agent 派工最佳實踐', category: 'Agent', views: 189, updated: '3d前' },
    { title: 'n8n Workflow 整合手冊', category: '自動化', views: 156, updated: '1w前' },
    { title: 'Telegram Bot Token 安全管理', category: '安全', views: 421, updated: '5d前' },
    { title: 'Supabase RLS 權限設計', category: '資料庫', views: 98, updated: '2w前' },
    { title: 'Cloudflare Tunnel 設定指南', category: '網路', views: 312, updated: '1w前' },
  ];
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3"><BookOpen className="h-7 w-7 text-orange-400" /><div><h1 className="text-xl font-semibold">知識庫</h1><p className="text-sm text-muted-foreground">核心概念 · 自動生成知識文件（131 篇）</p></div></div>
      <div className="grid gap-2">
        {articles.map((a, i) => (
          <div key={i} className="rounded-lg border bg-card p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors cursor-pointer">
            <BookOpen className="h-4 w-4 text-orange-400 flex-shrink-0" />
            <div className="flex-1"><p className="text-sm">{a.title}</p><p className="text-[10px] text-muted-foreground">{a.category} · {a.views} 次閱讀 · {a.updated}</p></div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
        ))}
        <p className="text-center text-xs text-muted-foreground pt-2">顯示 6 / 131 篇文章</p>
      </div>
    </div>
  );
}

// ─── 文件中心 ─────────────────────────────────────────────
function DocsPage() {
  const docs = [
    { title: 'API 參考文件', type: 'API', size: '2.4MB', updated: '今日' },
    { title: '操作手冊 v3.2', type: '手冊', size: '1.1MB', updated: '3d前' },
    { title: '系統事件紀錄', type: '記錄', size: '856KB', updated: '今日' },
    { title: '部署作業說明', type: '手冊', size: '340KB', updated: '1w前' },
    { title: '安全審計報告 Q1', type: '報告', size: '1.8MB', updated: '1m前' },
  ];
  const typeColor: Record<string, string> = { API: '#22d3ee', 手冊: '#10b981', 記錄: '#f59e0b', 報告: '#a78bfa' };
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3"><FileText className="h-7 w-7 text-sky-400" /><div><h1 className="text-xl font-semibold">文件中心</h1><p className="text-sm text-muted-foreground">API 文件 · 操作手冊 · 事件紀錄</p></div></div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="divide-y">
          {docs.map((d, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-accent/30 cursor-pointer">
              <FileText className="h-4 w-4 flex-shrink-0" style={{ color: typeColor[d.type] }} />
              <div className="flex-1"><p className="text-sm">{d.title}</p><p className="text-[10px] text-muted-foreground">{d.size} · 更新 {d.updated}</p></div>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: typeColor[d.type], background: typeColor[d.type] + '15' }}>{d.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 後勤甲板總覽 ─────────────────────────────────────────
function LogisticsOverview() {
  const modules = [
    { id: 'clients', label: '客戶管理', icon: Users, color: '#8b5cf6', desc: '客戶資料 · 狀態追蹤 · 信任分', route: '/center/commerce/clients', stat: '4 位客戶' },
    { id: 'hr', label: '人力開發', icon: UserPlus, color: '#3b82f6', desc: '協作者招募 · 職位管理', route: '/center/commerce/hr', stat: '3 開放職位' },
    { id: 'revenue', label: '營收分析', icon: DollarSign, color: '#10b981', desc: '商業數據 · 月度趨勢', route: '/center/commerce/revenue', stat: 'NT$89,000/月' },
    { id: 'partnerships', label: '合作夥伴', icon: Handshake, color: '#f59e0b', desc: '策略合作 · 技術夥伴', route: '/center/commerce/partnerships', stat: '5 個夥伴' },
    { id: 'knowledge', label: '知識庫', icon: BookOpen, color: '#f97316', desc: '131 篇知識文件', route: '/center/commerce/knowledge', stat: '131 篇' },
    { id: 'docs', label: '文件中心', icon: FileText, color: '#0ea5e9', desc: 'API 文件 · 操作手冊', route: '/center/commerce/docs', stat: '5 份文件' },
  ];
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link to="/center" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回甲板總覽</Link>
      <div><h1 className="text-xl font-semibold flex items-center gap-2"><Briefcase className="h-6 w-6 text-purple-400" />後勤甲板</h1><p className="text-sm text-muted-foreground mt-1">商業開發 · 人力規劃 · 客戶管理 · 知識庫</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(mod => {
          const Icon = mod.icon;
          return (
            <Link key={mod.id} to={mod.route} className="rounded-lg border bg-card p-4 hover:bg-accent/50 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: mod.color + '20', border: `1px solid ${mod.color}30` }}><Icon className="h-4 w-4" style={{ color: mod.color }} /></div>
                <div><p className="font-medium text-sm">{mod.label}</p><p className="text-[10px] text-muted-foreground">{mod.stat}</p></div>
              </div>
              <p className="text-xs text-muted-foreground">{mod.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function LogisticsDeck() {
  const { module } = useParams<{ module?: string }>();
  if (module === 'clients') return <ClientsPage />;
  if (module === 'hr') return <HRPage />;
  if (module === 'revenue') return <RevenuePage />;
  if (module === 'partnerships') return <PartnershipsPage />;
  if (module === 'knowledge') return <KnowledgePage />;
  if (module === 'docs') return <DocsPage />;
  return <LogisticsOverview />;
}
