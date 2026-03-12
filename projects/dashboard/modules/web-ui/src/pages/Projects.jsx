import React from 'react';
import { 
  FolderKanban, 
  CheckCircle2, 
  Circle,
  Clock,
  GitBranch,
  FileText,
  Users,
  MoreHorizontal,
  Plus
} from 'lucide-react';

const projects = [
  {
    id: 1,
    name: 'Dashboard Web UI',
    description: 'OpenClaw 中控台網頁界面開發',
    progress: 65,
    status: 'active',
    tasks: { total: 24, completed: 16 },
    agents: ['Cursor', 'Kimi'],
    lastActivity: '2分鐘前',
    tags: ['frontend', 'react', 'dashboard'],
  },
  {
    id: 2,
    name: 'Codex I/O Loop',
    description: '子 Agent I/O 閉環模式實作',
    progress: 90,
    status: 'active',
    tasks: { total: 18, completed: 16 },
    agents: ['Codex', 'Grok'],
    lastActivity: '15分鐘前',
    tags: ['backend', 'architecture'],
  },
  {
    id: 3,
    name: 'Cost Optimization',
    description: '模型路由與成本優化方案',
    progress: 100,
    status: 'completed',
    tasks: { total: 12, completed: 12 },
    agents: ['Grok', 'Kimi'],
    lastActivity: '1小時前',
    tags: ['analysis', 'cost'],
  },
  {
    id: 4,
    name: 'Memory System',
    description: '記憶召回與儲存系統優化',
    progress: 40,
    status: 'active',
    tasks: { total: 20, completed: 8 },
    agents: ['Ollama', 'Gemini'],
    lastActivity: '3小時前',
    tags: ['memory', 'ollama'],
  },
  {
    id: 5,
    name: 'Morning Brief v2',
    description: '自動化晨間報告生成系統',
    progress: 25,
    status: 'paused',
    tasks: { total: 15, completed: 4 },
    agents: ['Ollama'],
    lastActivity: '昨天',
    tags: ['automation', 'reporting'],
  },
  {
    id: 6,
    name: 'Multi-Agent Strategy',
    description: '多 Agent 協作策略文件',
    progress: 80,
    status: 'active',
    tasks: { total: 10, completed: 8 },
    agents: ['Kimi', 'Opus'],
    lastActivity: '2天前',
    tags: ['docs', 'strategy'],
  },
];

const recentActivities = [
  { id: 1, action: '完成', target: 'Dashboard Web UI', detail: 'Layout 組件開發', time: '2分鐘前' },
  { id: 2, action: '更新', target: 'Codex I/O Loop', detail: '新增驗收標準', time: '15分鐘前' },
  { id: 3, action: '建立', target: 'Cost Optimization', detail: '新專案建立', time: '1小時前' },
  { id: 4, action: '完成', target: 'Memory System', detail: 'QMD 索引實作', time: '3小時前' },
  { id: 5, action: '暫停', target: 'Morning Brief v2', detail: '等待模型修復', time: '昨天' },
];

const getStatusColor = (status) => {
  const colors = {
    active: 'text-emerald-400 bg-emerald-400/10',
    completed: 'text-blue-400 bg-blue-400/10',
    paused: 'text-amber-400 bg-amber-400/10',
  };
  return colors[status] || colors.paused;
};

const getStatusLabel = (status) => {
  const labels = { active: '進行中', completed: '已完成', paused: '暫停' };
  return labels[status] || status;
};

export default function Projects() {
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalTasks = projects.reduce((acc, p) => acc + p.tasks.total, 0);
  const completedTasks = projects.reduce((acc, p) => acc + p.tasks.completed, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">專案管理</h1>
          <p className="text-slate-400 mt-1">共 {projects.length} 個專案</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新增專案
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-3 sm:p-4">
          <p className="text-slate-400 text-xs sm:text-sm">進行中</p>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">{activeProjects}</p>
        </div>
        <div className="card p-3 sm:p-4">
          <p className="text-slate-400 text-xs sm:text-sm">已完成</p>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">{completedProjects}</p>
        </div>
        <div className="card p-3 sm:p-4">
          <p className="text-slate-400 text-xs sm:text-sm">總任務</p>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">{totalTasks}</p>
        </div>
        <div className="card p-3 sm:p-4">
          <p className="text-slate-400 text-xs sm:text-sm">完成率</p>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">
            {Math.round((completedTasks / totalTasks) * 100)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Projects Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card p-3 sm:p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <button className="p-1 hover:bg-slate-700 rounded">
                  <MoreHorizontal className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              
              <h3 className="font-semibold text-slate-200 text-sm sm:text-base mb-1">{project.name}</h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4">{project.description}</p>
              
              {/* Progress */}
              <div className="mb-3 sm:mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">進度</span>
                  <span className="text-slate-200">{project.progress}%</span>
                </div>
                <div className="h-1.5 sm:h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${project.status === 'completed' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                {project.tags.map((tag) => (
                  <span key={tag} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-900 text-slate-400 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <CheckCircle2 className="w-3 h-3" />
                    {project.tasks.completed}/{project.tasks.total}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {project.lastActivity}
                  </div>
                </div>
                <span className={`px-2 py-0.5 sm:py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                  {getStatusLabel(project.status)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Recent Activity */}
          <div className="card">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-4">最近活動</h2>
            <div className="space-y-3 sm:space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                    {activity.action === '完成' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                    ) : activity.action === '建立' ? (
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">
                      <span className="text-slate-400">{activity.action}</span>{' '}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-slate-500">{activity.detail}</p>
                    <p className="text-xs text-slate-600 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="card">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-4">快捷操作</h2>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-left">
                <GitBranch className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-sm text-slate-200">查看 Git 儲存庫</span>
              </button>
              <button className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-left">
                <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-slate-200">文件範本</span>
              </button>
              <button className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-left">
                <Users className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-sm text-slate-200">Agent 配置</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
