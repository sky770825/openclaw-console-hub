import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  X,
  Zap,
  Brain,
  Code,
  MousePointer,
  Bot,
  Sparkles
} from 'lucide-react';

const colorMap = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  slate: { bg: 'bg-slate-500/10', text: 'text-slate-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
};

const COLUMNS = [
  { id: 'pending', title: '待處理', icon: Clock, color: 'slate' },
  { id: 'ready', title: '就緒', icon: CheckCircle, color: 'blue' },
  { id: 'running', title: '執行中', icon: Play, color: 'amber' },
  { id: 'completed', title: '已完成', icon: CheckCircle, color: 'emerald' },
];

const agentTypes = [
  { id: 'coder', name: 'Coder Agent', icon: Code, desc: '專注程式開發與修復', color: 'blue' },
  { id: 'researcher', name: 'Researcher', icon: Brain, desc: '深度研究與分析', color: 'purple' },
  { id: 'ui', name: 'UI Designer', icon: MousePointer, desc: '介面設計與優化', color: 'emerald' },
  { id: 'executor', name: 'Executor', icon: Zap, desc: '執行自動化任務', color: 'amber' },
  { id: 'reviewer', name: 'Reviewer', icon: Bot, desc: '代碼審查與檢查', color: 'slate' },
];

const getPriorityColor = (priority) => {
  const colors = {
    high: 'text-red-400 bg-red-400/10',
    medium: 'text-amber-400 bg-amber-400/10',
    low: 'text-slate-400 bg-slate-400/10',
  };
  return colors[priority] || colors.low;
};

const getPriorityLabel = (priority) => {
  const labels = { high: '高', medium: '中', low: '低' };
  return labels[priority] || priority;
};

// Generate 148 mock tasks
const generateTasks = () => {
  const tasks = [];
  const agents = ['Kimi', 'Grok', 'Gemini', 'Codex', 'Cursor', 'Ollama', 'Opus'];
  const taskTypes = ['開發', '修復', '測試', '文件', '分析', '部署', '研究'];
  const projects = ['dashboard', 'api', 'agent-core', 'memory', 'skills', 'docs'];
  
  const statuses = ['pending', 'ready', 'running', 'completed'];
  const statusDistribution = [50, 30, 12, 56];
  
  let id = 1;
  statuses.forEach((status, idx) => {
    const count = statusDistribution[idx];
    for (let i = 0; i < count; i++) {
      tasks.push({
        id: id++,
        title: `${taskTypes[Math.floor(Math.random() * taskTypes.length)]}: ${projects[Math.floor(Math.random() * projects.length)]} 模組 ${Math.floor(Math.random() * 20) + 1}`,
        status,
        agent: agents[Math.floor(Math.random() * agents.length)],
        priority: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toLocaleDateString('zh-TW'),
        estimatedTime: `${Math.floor(Math.random() * 4) + 1}h`,
      });
    }
  });
  
  return tasks;
};

export default function Tasks() {
  const [tasks] = useState(generateTasks());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgent, setFilterAgent] = useState('all');
  const [showSpawnModal, setShowSpawnModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSpawnAgent = (agentType) => {
    setShowSpawnModal(false);
    showToast(`已啟動 ${agentType.name}`, 'success');
  };
  
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAgent = filterAgent === 'all' || task.agent === filterAgent;
      return matchesSearch && matchesAgent;
    });
  }, [tasks, searchQuery, filterAgent]);

  const tasksByColumn = useMemo(() => {
    return COLUMNS.reduce((acc, col) => {
      acc[col.id] = filteredTasks.filter(t => t.status === col.id);
      return acc;
    }, {});
  }, [filteredTasks]);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Spawn Agent Modal */}
      {showSpawnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowSpawnModal(false)}>
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                選擇 Agent 類型
              </h2>
              <button onClick={() => setShowSpawnModal(false)} className="p-1 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {agentTypes.map((agent) => {
                const colors = colorMap[agent.color];
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleSpawnAgent(agent)}
                    className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <agent.icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-200">{agent.name}</h3>
                        <p className="text-sm text-slate-500">{agent.desc}</p>
                      </div>
                      <Play className="w-4 h-4 text-slate-600 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">任務板</h1>
          <p className="text-slate-400 mt-1">共 {tasks.length} 個任務</p>
        </div>
        <button 
          onClick={() => setShowSpawnModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          Spawn Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜尋任務..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">所有 Agent</option>
          <option value="Kimi">Kimi</option>
          <option value="Grok">Grok</option>
          <option value="Gemini">Gemini</option>
          <option value="Codex">Codex</option>
          <option value="Cursor">Cursor</option>
          <option value="Ollama">Ollama</option>
          <option value="Opus">Opus</option>
        </select>
      </div>

      {/* Kanban Board - Mobile: Horizontal scroll, Desktop: Grid */}
      <div className="block md:grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Mobile: Horizontal scrolling columns */}
        <div className="flex md:hidden gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x">
          {COLUMNS.map((column) => {
            const columnTasks = tasksByColumn[column.id] || [];
            const colors = colorMap[column.color];
            return (
              <div key={column.id} className="card flex flex-col w-[85vw] flex-shrink-0 snap-start">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <column.icon className={`w-4 h-4 ${colors.text}`} />
                    <h3 className="font-semibold text-slate-200">{column.title}</h3>
                    <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[60vh]">
                  {columnTasks.slice(0, 10).map((task) => (
                    <div 
                      key={task.id} 
                      className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-slate-500">#{task.id}</span>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${getPriorityColor(task.priority)}`}>
                          {getPriorityLabel(task.priority)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 mb-3 line-clamp-2">{task.title}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.agent}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.estimatedTime}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Grid layout */}
        {COLUMNS.map((column) => {
          const columnTasks = tasksByColumn[column.id] || [];
          const colors = colorMap[column.color];
          return (
            <div key={`desktop-${column.id}`} className="hidden md:flex card flex-col min-h-[400px]">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <column.icon className={`w-4 h-4 ${colors.text}`} />
                  <h3 className="font-semibold text-slate-200">{column.title}</h3>
                  <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
                <button className="p-1 hover:bg-slate-700 rounded">
                  <MoreHorizontal className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Tasks */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px]">
                {columnTasks.map((task) => (
                  <div 
                    key={`desktop-task-${task.id}`} 
                    className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-slate-500">#{task.id}</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 mb-3 line-clamp-2">{task.title}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {task.agent}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimatedTime}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
