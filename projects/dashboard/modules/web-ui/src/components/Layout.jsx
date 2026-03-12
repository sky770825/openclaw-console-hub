import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Kanban, 
  Brain, 
  FolderKanban, 
  Settings,
  Zap,
  Menu,
  X,
  Code,
  MousePointer,
  Bot,
  Sparkles,
  BrainCircuit,
  Play
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '總覽儀表板' },
  { path: '/tasks', icon: Kanban, label: '任務板' },
  { path: '/models', icon: Brain, label: '模型監控' },
  { path: '/projects', icon: FolderKanban, label: '專案管理' },
];

const agentTypes = [
  { id: 'coder', name: 'Coder Agent', icon: Code, desc: '專注程式開發與修復', color: 'blue' },
  { id: 'researcher', name: 'Researcher', icon: BrainCircuit, desc: '深度研究與分析', color: 'purple' },
  { id: 'ui', name: 'UI Designer', icon: MousePointer, desc: '介面設計與優化', color: 'emerald' },
  { id: 'executor', name: 'Executor', icon: Zap, desc: '執行自動化任務', color: 'amber' },
  { id: 'reviewer', name: 'Reviewer', icon: Bot, desc: '代碼審查與檢查', color: 'slate' },
];

const colorMap = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  slate: { bg: 'bg-slate-500/10', text: 'text-slate-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Spawn Agent Modal */}
      {showSpawnModal && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowSpawnModal(false)}>
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

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 border-r border-slate-800
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-white">OpenClaw</h1>
                <p className="text-xs text-slate-400">中控台 v1.0</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={({ isActive }) => 
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800">
            <button className="sidebar-link w-full">
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span>設定</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 sm:h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-3 sm:px-4 lg:px-6">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="打開選單"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              系統運行中
            </div>
            <button 
              onClick={() => setShowSpawnModal(true)}
              className="btn-primary flex items-center gap-1.5 sm:gap-2 text-sm px-3 py-1.5 sm:px-4 sm:py-2"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Spawn Agent</span>
              <span className="sm:hidden">Spawn</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
