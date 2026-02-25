/**
 * 後勤甲板 — Logistics Deck
 * 客戶管理 · 人力開發 · 營收分析 · 合作夥伴 · 知識庫 · 文件中心
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, Users, UserPlus, BarChart3,
  Handshake, BookOpen, FileText, TrendingUp, DollarSign,
  Star, CheckCircle, Clock, ExternalLink, Package, Truck,
  MapPin, Phone, Mail, Calendar, Award, Zap, Target
} from 'lucide-react';

// ─── 客戶管理 ─────────────────────────────────────────────
function ClientsPage() {
  const clients = [
    {
      id: 'C001', name: '協作者 Alpha', level: 'L2', status: 'active', score: 95,
      joined: '2025-01', tasks: 42, email: 'alpha@collab.io', role: 'AI 開發者',
      completedTasks: 38, failedTasks: 2, lastActive: '1h前', projects: ['星艦UI', 'n8n整合'],
    },
    {
      id: 'C002', name: '協作者 Beta', level: 'L1', status: 'active', score: 88,
      joined: '2025-02', tasks: 18, email: 'beta@collab.io', role: '前端工程師',
      completedTasks: 15, failedTasks: 1, lastActive: '30m前', projects: ['Dashboard優化'],
    },
    {
      id: 'C003', name: '新申請者 C', level: '申請中', status: 'pending', score: 0,
      joined: '2026-02', tasks: 0, email: 'applicant.c@mail.com', role: 'DevOps',
      completedTasks: 0, failedTasks: 0, lastActive: '剛才', projects: [],
    },
    {
      id: 'C004', name: '合作夥伴 Delta', level: 'L3', status: 'active', score: 97,
      joined: '2024-11', tasks: 156, email: 'delta@partner.dev', role: '技術主任',
      completedTasks: 149, failedTasks: 3, lastActive: '剛才', projects: ['星艦UI', '安全審計', '系統架構', 'API設計'],
    },
    {
      id: 'C005', name: '技術夥伴 Epsilon', level: 'L2', status: 'active', score: 89,
      joined: '2025-04', tasks: 27, email: 'epsilon@tech.dev', role: '系統架構師',
      completedTasks: 24, failedTasks: 1, lastActive: '2h前', projects: ['基礎架構', 'DB優化'],
    },
    {
      id: 'C006', name: '設計夥伴 Zeta', level: 'L1', status: 'inactive', score: 72,
      joined: '2025-06', tasks: 11, email: 'zeta@design.io', role: 'UI/UX 設計師',
      completedTasks: 9, failedTasks: 2, lastActive: '2w前', projects: ['Dashboard設計'],
    },
  ];

  const [selected, setSelected] = useState<string | null>(null);

  const statusCfg: Record<string, { color: string; label: string }> = {
    active: { color: '#10b981', label: '活躍' },
    pending: { color: '#f59e0b', label: '待審' },
    inactive: { color: '#6b7280', label: '停用' },
  };

  const selectedClient = clients.find(c => c.id === selected);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-purple-400" />
        <div><h1 className="text-xl font-semibold">客戶管理</h1><p className="text-sm text-muted-foreground">客戶資料 · 狀態追蹤 · 信任分 · 協作紀錄</p></div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '總協作者', value: clients.length, color: '#8b5cf6' },
          { label: '活躍', value: clients.filter(c => c.status === 'active').length, color: '#10b981' },
          { label: '待審', value: clients.filter(c => c.status === 'pending').length, color: '#f59e0b' },
          { label: '總任務完成', value: clients.reduce((s, c) => s + c.completedTasks, 0), color: '#22d3ee' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* 客戶清單 */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2 border-b bg-muted/30"><p className="text-xs font-medium">協作者清單</p></div>
          <div className="divide-y">
            {clients.map(c => {
              const cfg = statusCfg[c.status];
              return (
                <div
                  key={c.id}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-accent/30 transition-colors ${selected === c.id ? 'bg-accent/50' : ''}`}
                  onClick={() => setSelected(selected === c.id ? null : c.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">{c.name[3]}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.role} · {c.level} · {c.tasks} 任務</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.color + '15' }}>{cfg.label}</span>
                    {c.score > 0 && <p className="text-[10px] text-purple-400 mt-0.5 font-bold">{c.score}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 選中客戶詳情 */}
        {selectedClient ? (
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-lg font-bold text-purple-400">{selectedClient.name[3]}</div>
              <div>
                <p className="font-semibold">{selectedClient.name}</p>
                <p className="text-xs text-muted-foreground">{selectedClient.role} · 加入 {selectedClient.joined}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3 w-3" />{selectedClient.email}</div>
              <div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3 w-3" />最後活躍 {selectedClient.lastActive}</div>
              <div className="flex items-center gap-1.5 text-green-400"><CheckCircle className="h-3 w-3" />完成 {selectedClient.completedTasks}</div>
              <div className="flex items-center gap-1.5 text-purple-400"><Star className="h-3 w-3" />信任分 {selectedClient.score}</div>
            </div>
            {selectedClient.projects.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">參與專案</p>
                <div className="flex flex-wrap gap-1">
                  {selectedClient.projects.map(p => (
                    <span key={p} className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-card/50 p-4 flex items-center justify-center text-muted-foreground text-xs">
            點擊左側協作者查看詳情
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 人力開發 ─────────────────────────────────────────────
function HRPage() {
  const roles = [
    {
      title: 'AI Agent 開發者', status: 'open', applicants: 3, priority: 'high',
      skills: ['Python', 'LLM', 'n8n'], desc: '負責設計與實作 AI 自動化代理，整合 Ollama + Claude API',
      posted: '3d前', salary: 'NT$120K–180K/月',
    },
    {
      title: '前端工程師（React）', status: 'open', applicants: 7, priority: 'medium',
      skills: ['React', 'TypeScript', 'TailwindCSS'], desc: '參與星艦指揮中心前端開發，協助完善 9 甲板 UI',
      posted: '1w前', salary: 'NT$90K–130K/月',
    },
    {
      title: 'DevOps 工程師', status: 'reviewing', applicants: 2, priority: 'high',
      skills: ['Railway', 'Docker', 'Cloudflare'], desc: '負責 CI/CD 部署流程與雲端基礎架構維運',
      posted: '5d前', salary: 'NT$100K–150K/月',
    },
    {
      title: '資安分析師', status: 'filled', applicants: 5, priority: 'low',
      skills: ['滲透測試', 'OWASP', 'Supabase RLS'], desc: '定期安全審計、漏洞掃描與修復建議',
      posted: '3w前', salary: 'NT$110K–160K/月',
    },
    {
      title: '資料工程師', status: 'open', applicants: 1, priority: 'medium',
      skills: ['Supabase', 'PostgreSQL', 'ETL'], desc: '設計資料管線，優化查詢效能，建立分析報表',
      posted: '2d前', salary: 'NT$95K–140K/月',
    },
  ];

  const statusCfg: Record<string, { color: string; label: string }> = {
    open: { color: '#22d3ee', label: '招募中' },
    reviewing: { color: '#f59e0b', label: '審核中' },
    filled: { color: '#10b981', label: '已填補' },
  };

  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3">
        <UserPlus className="h-7 w-7 text-blue-400" />
        <div><h1 className="text-xl font-semibold">人力開發</h1><p className="text-sm text-muted-foreground">協作者招募 · 職位管理 · 審核流程</p></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '開放職位', value: roles.filter(r => r.status === 'open').length, color: '#22d3ee' },
          { label: '審核中', value: roles.filter(r => r.status === 'reviewing').length, color: '#f59e0b' },
          { label: '總申請', value: roles.reduce((s, r) => s + r.applicants, 0), color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30"><p className="text-xs font-medium">職位清單</p></div>
        <div className="divide-y">
          {roles.map((role, i) => {
            const cfg = statusCfg[role.status];
            return (
              <div key={i}>
                <div
                  className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-accent/20"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{role.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${role.priority === 'high' ? 'text-red-400 bg-red-500/10' : role.priority === 'medium' ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400 bg-gray-500/10'}`}>{role.priority}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{role.applicants} 位申請者 · 發布 {role.posted}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.color + '15' }}>{cfg.label}</span>
                </div>
                {expanded === i && (
                  <div className="px-4 pb-3 space-y-2 bg-muted/10">
                    <p className="text-xs text-muted-foreground">{role.desc}</p>
                    <p className="text-xs text-green-400 font-medium">{role.salary}</p>
                    <div className="flex flex-wrap gap-1">
                      {role.skills.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
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
  const months = ['9月', '10月', '11月', '12月', '1月', '2月'];
  const revenue = [31000, 42000, 58000, 71000, 63000, 89000];
  const maxRev = Math.max(...revenue);

  const projects = [
    { name: '星艦UI v2.1 開發', client: '自有', amount: 0, status: 'internal', month: '2月' },
    { name: 'AI 顧問服務 — 合作夥伴 Delta', client: 'Delta', amount: 45000, status: 'invoiced', month: '2月' },
    { name: 'n8n 整合專案', client: 'Alpha', amount: 28000, status: 'paid', month: '2月' },
    { name: '系統架構審查', client: 'Epsilon', amount: 16000, status: 'paid', month: '2月' },
    { name: 'Cloudflare 設定教學', client: 'Beta', amount: 8000, status: 'pending', month: '1月' },
    { name: '資安掃描報告 Q1', client: '自有', amount: 0, status: 'internal', month: '1月' },
  ];

  const statusCfg: Record<string, { color: string; label: string }> = {
    paid: { color: '#10b981', label: '已收款' },
    invoiced: { color: '#22d3ee', label: '已開票' },
    pending: { color: '#f59e0b', label: '待收款' },
    internal: { color: '#6b7280', label: '內部' },
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-green-400" />
        <div><h1 className="text-xl font-semibold">營收分析</h1><p className="text-sm text-muted-foreground">商業數據 · 月度趨勢 · 收入來源 · 專案清單</p></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '本月營收', value: 'NT$89,000', color: '#10b981' },
          { label: '月成長', value: '+41%', color: '#22d3ee' },
          { label: '累計今年', value: 'NT$323,000', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium mb-4">近 6 個月趨勢</p>
        <div className="flex items-end gap-2 h-32">
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
        {[
          { label: 'AI 顧問服務', pct: 45, color: '#10b981' },
          { label: '系統整合專案', pct: 32, color: '#22d3ee' },
          { label: '訓練與教學', pct: 15, color: '#a78bfa' },
          { label: '其他', pct: 8, color: '#6b7280' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 text-xs">
            <span className="w-24 text-muted-foreground">{s.label}</span>
            <div className="flex-1 bg-muted rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${s.pct}%`, background: s.color }} /></div>
            <span style={{ color: s.color }}>{s.pct}%</span>
          </div>
        ))}
      </div>
      {/* 專案清單 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30"><p className="text-xs font-medium">近期專案</p></div>
        <div className="divide-y">
          {projects.map((p, i) => {
            const cfg = statusCfg[p.status];
            return (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                <div className="flex-1">
                  <p className="text-sm text-foreground/90">{p.name}</p>
                  <p className="text-muted-foreground">{p.client} · {p.month}</p>
                </div>
                <p className="font-medium text-green-400">{p.amount > 0 ? `NT$${p.amount.toLocaleString()}` : '—'}</p>
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ color: cfg.color, background: cfg.color + '15' }}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 合作夥伴 ─────────────────────────────────────────────
function PartnershipsPage() {
  const partners = [
    {
      name: 'Anthropic', type: 'AI 基礎設施', status: 'active', since: '2024', tier: 'Strategic',
      desc: 'Claude API 核心供應商，提供 Claude Sonnet 4.6 AI 能力',
      contact: 'API Support', products: ['Claude API', 'Claude Code'],
    },
    {
      name: 'Cloudflare', type: '網路基礎設施', status: 'active', since: '2024', tier: 'Technical',
      desc: 'CDN、WAF、Tunnel 隧道安全訪問方案',
      contact: 'Technical', products: ['CDN', 'Tunnel', 'WAF', 'Zero Trust'],
    },
    {
      name: 'Railway', type: '雲端部署', status: 'active', since: '2025', tier: 'Technical',
      desc: '主要雲端部署平台，提供 server 自動部署和環境管理',
      contact: 'Deploy', products: ['Railway Hosting', 'PostgreSQL', 'Volume'],
    },
    {
      name: 'n8n', type: '工作流自動化', status: 'active', since: '2025', tier: 'Integration',
      desc: '工作流自動化引擎，週報、派工、巡邏等 12+ 個 workflow',
      contact: 'Self-hosted', products: ['n8n Cloud', 'Webhook', 'API'],
    },
    {
      name: 'Supabase', type: '資料庫服務', status: 'active', since: '2024', tier: 'Technical',
      desc: '主資料庫，提供 PostgreSQL + RLS + Realtime 功能',
      contact: 'DB Admin', products: ['PostgreSQL', 'Auth', 'Storage', 'Realtime'],
    },
    {
      name: 'Ollama', type: '本地 AI 模型', status: 'active', since: '2025', tier: 'Integration',
      desc: '本地 LLM 推理，支援 qwen3:8b、deepseek-r1 等模型',
      contact: 'Local', products: ['qwen3:8b', 'deepseek-r1:7b', 'llama3.2'],
    },
  ];

  const tierColor: Record<string, string> = { Strategic: '#f59e0b', Technical: '#22d3ee', Integration: '#a78bfa' };
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3">
        <Handshake className="h-7 w-7 text-yellow-400" />
        <div><h1 className="text-xl font-semibold">合作夥伴</h1><p className="text-sm text-muted-foreground">策略合作 · 技術夥伴 · 整合生態</p></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '策略夥伴', value: partners.filter(p => p.tier === 'Strategic').length, color: '#f59e0b' },
          { label: '技術夥伴', value: partners.filter(p => p.tier === 'Technical').length, color: '#22d3ee' },
          { label: '整合夥伴', value: partners.filter(p => p.tier === 'Integration').length, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3">
        {partners.map(p => (
          <div key={p.name}>
            <div
              className="rounded-lg border bg-card p-4 flex items-start gap-4 cursor-pointer hover:bg-accent/20"
              onClick={() => setExpanded(expanded === p.name ? null : p.name)}
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg font-bold shrink-0">{p.name[0]}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.type} · 自 {p.since}</p>
                {expanded === p.name && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {p.products.map(prod => (
                        <span key={prod} className="px-2 py-0.5 rounded text-[10px]" style={{ background: tierColor[p.tier] + '15', color: tierColor[p.tier] }}>{prod}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: tierColor[p.tier], background: tierColor[p.tier] + '15' }}>{p.tier}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 知識庫 ───────────────────────────────────────────────
function KnowledgePage() {
  const categories = ['全部', '架構', 'Agent', '自動化', '安全', '資料庫', '網路', '部署'];
  const [activeCategory, setActiveCategory] = useState('全部');

  const articles = [
    { title: 'OpenClaw 星艦架構設計指南 v2.1', category: '架構', views: 421, updated: '今日', readTime: '12分' },
    { title: 'Agent 派工最佳實踐 — 副手模式', category: 'Agent', views: 312, updated: '1d前', readTime: '8分' },
    { title: 'n8n Workflow 整合手冊 — 12 個場景', category: '自動化', views: 287, updated: '2d前', readTime: '15分' },
    { title: 'Telegram Bot Token 安全管理', category: '安全', views: 534, updated: '3d前', readTime: '6分' },
    { title: 'Supabase RLS 權限設計完整指南', category: '資料庫', views: 198, updated: '5d前', readTime: '10分' },
    { title: 'Cloudflare Tunnel + Zero Trust 設定', category: '網路', views: 445, updated: '1w前', readTime: '9分' },
    { title: 'Claude Code CLAUDE.md 撰寫規範', category: 'Agent', views: 367, updated: '1w前', readTime: '5分' },
    { title: 'Railway 部署流程 SOP', category: '部署', views: 156, updated: '2w前', readTime: '7分' },
    { title: '9 甲板 Hub Centers 設計說明', category: '架構', views: 234, updated: '1w前', readTime: '11分' },
    { title: 'PostgreSQL 慢查詢優化指南', category: '資料庫', views: 89, updated: '3w前', readTime: '8分' },
    { title: 'PostMessage 安全橋接架構', category: '安全', views: 123, updated: '2w前', readTime: '7分' },
    { title: 'MDCI 文明指數計算說明', category: '架構', views: 198, updated: '1w前', readTime: '4分' },
  ];

  const filtered = activeCategory === '全部' ? articles : articles.filter(a => a.category === activeCategory);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-orange-400" />
        <div><h1 className="text-xl font-semibold">知識庫</h1><p className="text-sm text-muted-foreground">核心概念 · 自動生成知識文件（131 篇）</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-[10px] transition-colors ${activeCategory === cat ? 'bg-orange-500/20 text-orange-400' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        {filtered.map((a, i) => (
          <div key={i} className="rounded-lg border bg-card p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors cursor-pointer">
            <BookOpen className="h-4 w-4 text-orange-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm">{a.title}</p>
              <p className="text-[10px] text-muted-foreground">{a.category} · {a.views} 次閱讀 · {a.updated} · {a.readTime}閱讀</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
        ))}
        <p className="text-center text-xs text-muted-foreground pt-2">顯示 {filtered.length} / 131 篇文章</p>
      </div>
    </div>
  );
}

// ─── 文件中心 ─────────────────────────────────────────────
function DocsPage() {
  const docs = [
    { title: 'API 參考文件 v2.1', type: 'API', size: '2.4MB', updated: '今日', desc: '完整 REST API 端點說明，含認證、請求格式、錯誤碼' },
    { title: '操作手冊 v3.2', type: '手冊', size: '1.1MB', updated: '3d前', desc: '系統日常操作 SOP，包含任務派工、審核、甲板管理' },
    { title: '系統事件紀錄 2026-02', type: '記錄', size: '856KB', updated: '今日', desc: '2 月份所有系統事件記錄，含部署、故障、修復時間線' },
    { title: '部署作業說明 v1.5', type: '手冊', size: '340KB', updated: '1w前', desc: 'Railway + Cloudflare 部署流程，含環境變數設定清單' },
    { title: '安全審計報告 Q1 2026', type: '報告', size: '1.8MB', updated: '1m前', desc: 'OWASP Top 10 審查、滲透測試結果、修復建議清單' },
    { title: '資料庫綱要說明', type: 'API', size: '512KB', updated: '5d前', desc: 'Supabase 所有資料表結構、RLS 規則、索引設計說明' },
    { title: '緊急應變程序 (IR Plan)', type: '報告', size: '234KB', updated: '2w前', desc: '資安事件、服務中斷、資料外洩的應對與復原 SOP' },
  ];

  const typeColor: Record<string, string> = { API: '#22d3ee', 手冊: '#10b981', 記錄: '#f59e0b', 報告: '#a78bfa' };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/commerce" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回後勤甲板</Link>
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-sky-400" />
        <div><h1 className="text-xl font-semibold">文件中心</h1><p className="text-sm text-muted-foreground">API 文件 · 操作手冊 · 事件紀錄 · 安全報告</p></div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {['API', '手冊', '記錄', '報告'].map(type => (
          <div key={type} className="rounded-lg border bg-card p-2 text-center">
            <p className="text-lg font-bold" style={{ color: typeColor[type] }}>{docs.filter(d => d.type === type).length}</p>
            <p className="text-[10px] text-muted-foreground">{type}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="divide-y">
          {docs.map((d, i) => (
            <div key={i} className="px-4 py-3 hover:bg-accent/30 cursor-pointer">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 flex-shrink-0" style={{ color: typeColor[d.type] }} />
                <div className="flex-1">
                  <p className="text-sm">{d.title}</p>
                  <p className="text-[10px] text-muted-foreground">{d.size} · 更新 {d.updated}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: typeColor[d.type], background: typeColor[d.type] + '15' }}>{d.type}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 ml-7">{d.desc}</p>
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
    { id: 'clients', label: '客戶管理', icon: Users, color: '#8b5cf6', desc: '6 位協作者 · 信任分 · 專案追蹤', route: '/center/commerce/clients', stat: '6 位協作者' },
    { id: 'hr', label: '人力開發', icon: UserPlus, color: '#3b82f6', desc: '招募中職位 · 申請審核', route: '/center/commerce/hr', stat: '3 開放職位' },
    { id: 'revenue', label: '營收分析', icon: DollarSign, color: '#10b981', desc: '月度趨勢 · 收入來源 · 專案', route: '/center/commerce/revenue', stat: 'NT$89,000/月' },
    { id: 'partnerships', label: '合作夥伴', icon: Handshake, color: '#f59e0b', desc: '6 個夥伴 · 技術生態', route: '/center/commerce/partnerships', stat: '6 個夥伴' },
    { id: 'knowledge', label: '知識庫', icon: BookOpen, color: '#f97316', desc: '131 篇知識文件 · 分類索引', route: '/center/commerce/knowledge', stat: '131 篇' },
    { id: 'docs', label: '文件中心', icon: FileText, color: '#0ea5e9', desc: '7 份文件 · API · 手冊 · 報告', route: '/center/commerce/docs', stat: '7 份文件' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link to="/center" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> 返回甲板總覽</Link>
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><Briefcase className="h-6 w-6 text-purple-400" />後勤甲板</h1>
        <p className="text-sm text-muted-foreground mt-1">商業開發 · 人力規劃 · 客戶管理 · 知識庫</p>
      </div>

      {/* 快速統計 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '活躍協作者', value: '5', icon: Users, color: '#8b5cf6' },
          { label: '本月營收', value: '89K', icon: TrendingUp, color: '#10b981' },
          { label: '知識文件', value: '131', icon: BookOpen, color: '#f97316' },
          { label: '合作夥伴', value: '6', icon: Handshake, color: '#f59e0b' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

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
