import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  Play,
  Cpu,
  TrendingUp,
  AlertCircle,
  X,
  RefreshCw,
  DollarSign,
  Bell
} from 'lucide-react';

// 修復：使用靜態類名映射，而非動態模板字符串
const statCardStyles = {
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    icon: Activity
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    icon: Play
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    icon: CheckCircle
  },
  slate: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-500',
    icon: Clock
  }
};

const stats = [
  { label: '總任務數', value: '148', icon: 'blue' },
  { label: '執行中', value: '12', icon: 'amber' },
  { label: '已完成', value: '86', icon: 'emerald' },
  { label: '待處理', value: '50', icon: 'slate' },
];

const recentTasks = [
  { id: 1, name: 'Dashboard Web UI 開發', status: 'running', agent: 'Cursor', time: '2分鐘前' },
  { id: 2, name: 'Codex I/O 閉環測試', status: 'completed', agent: 'Codex', time: '15分鐘前' },
  { id: 3, name: '成本優化分析', status: 'completed', agent: 'Grok', time: '1小時前' },
  { id: 4, name: 'Morning Brief v2', status: 'pending', agent: 'Ollama', time: '2小時前' },
  { id: 5, name: '系統巡檢報告', status: 'ready', agent: 'Gemini', time: '3小時前' },
];

const modelStatus = [
  { name: 'Kimi K2.5', status: 'active', load: '45%' },
  { name: 'Grok 4.1', status: 'active', load: '23%' },
  { name: 'Gemini Flash', status: 'active', load: '12%' },
  { name: 'Codex', status: 'standby', load: '0%' },
  { name: 'Cursor', status: 'active', load: '67%' },
  { name: 'Ollama/Qwen3', status: 'active', load: '34%' },
  { name: 'Opus', status: 'standby', load: '0%' },
];

const getStatusColor = (status) => {
  const colors = {
    running: 'text-amber-400 bg-amber-400/10',
    completed: 'text-emerald-400 bg-emerald-400/10',
    pending: 'text-slate-400 bg-slate-400/10',
    ready: 'text-blue-400 bg-blue-400/10',
    active: 'text-emerald-400',
    standby: 'text-slate-400',
  };
  return colors[status] || colors.pending;
};

const getStatusDot = (status) => {
  const colors = {
    active: 'bg-emerald-500',
    standby: 'bg-slate-500',
    running: 'bg-amber-500',
    completed: 'bg-emerald-500',
    pending: 'bg-slate-500',
    ready: 'bg-blue-500',
  };
  return colors[status] || colors.pending;
};

// 系統巡檢項目
const systemChecks = [
  { name: 'Agent Pool 連線', status: 'ok', message: '所有 Agent 正常運作' },
  { name: 'API 金鑰狀態', status: 'ok', message: '7/7 服務商可用' },
  { name: '記憶體使用', status: 'warning', message: '使用率 78%' },
  { name: '磁碟空間', status: 'ok', message: '剩餘 45GB' },
  { name: '網路連線', status: 'ok', message: '延遲 12ms' },
  { name: 'n8n Webhook', status: 'ok', message: '接收正常' },
];

// 成本數據
const costData = [
  { service: 'Kimi K2.5', cost: '\$12.50', usage: '2.5M tokens' },
  { service: 'Grok 4.1', cost: '\$28.30', usage: '850K tokens' },
  { service: 'Gemini Flash', cost: '\$0.00', usage: '5.2M tokens (免費額度)' },
  { service: 'Codex', cost: '\$8.75', usage: '120 requests' },
  { service: 'Cursor', cost: '\$20.00', usage: '訂閱費用' },
  { service: '合計', cost: '\$69.55', usage: '本月總計', isTotal: true },
];

// 待處理警示
const pendingAlerts = [
  { id: 1, level: 'high', title: 'Codex API 快達到速率限制', time: '10分鐘前' },
  { id: 2, level: 'medium', title: 'Ollama 模型需要更新', time: '2小時前' },
  { id: 3, level: 'low', title: '儲存空間清理建議', time: '1天前' },
];

export default function Dashboard() {
  // 彈窗狀態
  const [modalType, setModalType] = useState(null);
  const [checkProgress, setCheckProgress] = useState(0);
  const [checkResults, setCheckResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  // 執行系統巡檢
  const runSystemCheck = () => {
    setModalType('systemCheck');
    setIsChecking(true);
    setCheckProgress(0);
    setCheckResults(null);
    
    // 模擬檢查進度
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setCheckProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsChecking(false);
        setCheckResults(systemChecks);
      }
    }, 300);
  };

  // 查看成本報告
  const viewCostReport = () => {
    setModalType('costReport');
  };

  // 查看待處理警示
  const viewAlerts = () => {
    setModalType('alerts');
  };

  // 關閉彈窗
  const closeModal = () => {
    setModalType(null);
    setCheckResults(null);
    setCheckProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">總覽儀表板</h1>
        <p className="text-slate-400 mt-1">OpenClaw 系統即時狀態</p>
      </div>

      {/* Stats Grid - 修復顏色問題 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => {
          const style = statCardStyles[stat.icon];
          const IconComponent = style.icon;
          return (
            <div key={stat.label} className="card p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-slate-400 text-xs sm:text-sm truncate">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${style.bg} flex-shrink-0 ml-2`}>
                  <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${style.text}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">最近任務</h2>
            <button className="text-sm text-blue-400 hover:text-blue-300">查看全部</button>
          </div>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2 sm:p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span className={`status-dot ${getStatusDot(task.status)} flex-shrink-0`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate">{task.name}</p>
                    <p className="text-xs text-slate-500">{task.agent} · {task.time}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)} flex-shrink-0 ml-2`}>
                  {task.status === 'running' ? '執行中' : 
                   task.status === 'completed' ? '已完成' : 
                   task.status === 'ready' ? '就緒' : '待處理'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Model Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">模型狀態</h2>
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <Cpu className="w-4 h-4" />
              5/7 運行中
            </div>
          </div>
          <div className="space-y-3">
            {modelStatus.map((model) => (
              <div key={model.name} className="flex items-center justify-between p-2 sm:p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span className={`status-dot ${model.status === 'active' ? 'active' : ''} ${model.status === 'standby' ? 'bg-slate-600' : ''} flex-shrink-0`} />
                  <span className="text-sm text-slate-200 truncate">{model.name}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  <div className="w-16 sm:w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${model.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600'}`}
                      style={{ width: model.load }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-8 sm:w-10 text-right">{model.load}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions - 添加點擊功能 */}
      <div className="card">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-4">快速操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <button 
            onClick={runSystemCheck}
            className="p-3 sm:p-4 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-blue-500/20 transition-colors">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            </div>
            <p className="text-sm font-medium text-slate-200">執行系統巡檢</p>
            <p className="text-xs text-slate-500 mt-1">檢查所有 Agent 狀態</p>
          </button>
          <button 
            onClick={viewCostReport}
            className="p-3 sm:p-4 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-emerald-500/20 transition-colors">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-200">查看成本報告</p>
            <p className="text-xs text-slate-500 mt-1">本月 API 使用統計</p>
          </button>
          <button 
            onClick={viewAlerts}
            className="p-3 sm:p-4 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-amber-500/20 transition-colors">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-slate-200">待處理警示</p>
            <p className="text-xs text-slate-500 mt-1">3 項需要關注</p>
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                {modalType === 'systemCheck' && <RefreshCw className="w-5 h-5 text-blue-500" />}
                {modalType === 'costReport' && <DollarSign className="w-5 h-5 text-emerald-500" />}
                {modalType === 'alerts' && <Bell className="w-5 h-5 text-amber-500" />}
                <h3 className="text-lg font-semibold text-white">
                  {modalType === 'systemCheck' && '系統巡檢'}
                  {modalType === 'costReport' && '成本報告'}
                  {modalType === 'alerts                  {modalType === 'alerts' && '待處理警示'}
                </h3>
              </div>
              <button 
                onClick={closeModal}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {/* 系統巡檢內容 */}
              {modalType === 'systemCheck' && (
                <div className="space-y-4">
                  {isChecking ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">檢查進度</span>
                          <span className="text-white">{checkProgress}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${checkProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : checkResults ? (
                    <div className="space-y-2">
                      {checkResults.map((check, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                          <div className={`w-2 h-2 rounded-full ${check.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <div className="flex-1">
                            <p className="text-sm text-white">{check.name}</p>
                            <p className="text-xs text-slate-400">{check.message}</p>
                          </div>
                          {check.status === 'ok' ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                      ))}
                      <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg">
                        <p className="text-sm text-emerald-400 text-center">✓ 系統巡檢完成，整體狀態良好</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* 成本報告內容 */}
              {modalType === 'costReport' && (
                <div className="space-y-3">
                  {costData.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-3 rounded-lg ${item.isTotal ? 'bg-slate-700/50 border border-slate-600' : 'bg-slate-800/50'}`}
                    >
                      <div>
                        <p className={`text-sm ${item.isTotal ? 'font-semibold text-white' : 'text-slate-200'}`}>{item.service}</p>
                        <p className="text-xs text-slate-500">{item.usage}</p>
                      </div>
                      <span className={`font-mono ${item.isTotal ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>{item.cost}</span>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
                    <p className="text-xs text-blue-400 text-center">💡 本月比上個月節省了 $15.30</p>
                  </div>
                </div>
              )}

              {/* 待處理警示內容 */}
              {modalType === 'alerts' && (
                <div className="space-y-3">
                  {pendingAlerts.map((alert) => (
                    <div key={alert.id} className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-l-amber-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${alert.level === 'high' ? 'bg-red-500/20 text-red-400' : alert.level === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                              {alert.level === 'high' ? '高' : alert.level === 'medium' ? '中' : '低'}
                            </span>
                            <p className="text-sm text-white">{alert.title}</p>
                          </div>
                          <p className="text-xs text-slate-500">{alert.time}</p>
                        </div>
                        <button className="text-xs text-blue-400 hover:text-blue-300 ml-2">處理</button>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
                      全部標記為已讀
                    </button>
                    <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
                      查看歷史記錄
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
