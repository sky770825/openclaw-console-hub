import React from 'react';
import { 
  Brain, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const models = [
  { 
    name: 'Kimi K2.5', 
    status: 'active', 
    cost: '$12.50', 
    usage: '2,450',
    latency: '1.2s',
    availability: '99.8%',
    color: '#3b82f6'
  },
  { 
    name: 'Grok 4.1', 
    status: 'active', 
    cost: '$45.20', 
    usage: '890',
    latency: '2.1s',
    availability: '98.5%',
    color: '#a855f7'
  },
  { 
    name: 'Gemini Flash', 
    status: 'active', 
    cost: '$0.00', 
    usage: '3,200',
    latency: '0.8s',
    availability: '99.9%',
    color: '#10b981'
  },
  { 
    name: 'Codex', 
    status: 'standby', 
    cost: '$8.30', 
    usage: '156',
    latency: '3.5s',
    availability: '95.0%',
    color: '#f59e0b'
  },
  { 
    name: 'Cursor', 
    status: 'active', 
    cost: '$20.00', 
    usage: '1,800',
    latency: '1.5s',
    availability: '99.0%',
    color: '#06b6d4'
  },
  { 
    name: 'Ollama/Qwen3', 
    status: 'active', 
    cost: '$0.00', 
    usage: '5,600',
    latency: '2.8s',
    availability: '100%',
    color: '#6366f1'
  },
  { 
    name: 'Opus', 
    status: 'standby', 
    cost: '$0.00', 
    usage: '0',
    latency: '-',
    availability: 'N/A',
    color: '#ec4899'
  },
];

const costData = [
  { name: 'Kimi', cost: 12.50 },
  { name: 'Grok', cost: 45.20 },
  { name: 'Gemini', cost: 0 },
  { name: 'Codex', cost: 8.30 },
  { name: 'Cursor', cost: 20.00 },
  { name: 'Ollama', cost: 0 },
];

const usageData = [
  { name: 'Kimi', value: 2450, color: '#3b82f6' },
  { name: 'Grok', value: 890, color: '#a855f7' },
  { name: 'Gemini', value: 3200, color: '#10b981' },
  { name: 'Codex', value: 156, color: '#f59e0b' },
  { name: 'Cursor', value: 1800, color: '#06b6d4' },
  { name: 'Ollama', value: 5600, color: '#6366f1' },
];

const dailyCostData = [
  { day: '2/8', cost: 2.5 },
  { day: '2/9', cost: 3.2 },
  { day: '2/10', cost: 4.8 },
  { day: '2/11', cost: 3.5 },
  { day: '2/12', cost: 5.2 },
  { day: '2/13', cost: 4.1 },
  { day: '2/14', cost: 2.8 },
];

const getStatusColor = (status) => {
  return status === 'active' ? 'text-emerald-400' : 'text-slate-400';
};

const getStatusDot = (status) => {
  return status === 'active' ? 'bg-emerald-500' : 'bg-slate-500';
};

export default function Models() {
  const totalCost = 85.00;
  const totalUsage = 14106;
  const avgLatency = '1.8s';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">模型監控</h1>
          <p className="text-slate-400 mt-1">7 個模型狀態追蹤</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-xs sm:text-sm">本月總成本</p>
              <p className="text-xl sm:text-2xl font-bold text-white">${totalCost.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0 ml-2">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            </div>
          </div>
        </div>
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-xs sm:text-sm">總呼叫次數</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{totalUsage.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0 ml-2">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-xs sm:text-sm">平均延遲</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{avgLatency}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0 ml-2">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>
          </div>
        </div>
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-xs sm:text-sm">運行中模型</p>
              <p className="text-xl sm:text-2xl font-bold text-white">5/7</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0 ml-2">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Cost Chart */}
        <div className="card">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-4">各模型成本 ($)</h2>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{fontSize: 10}} interval={0} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Usage Pie Chart */}
        <div className="card">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-4">使用量分佈</h2>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={usageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {usageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {usageData.map((item) => (
              <div key={item.name} className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Cost Trend */}
      <div className="card">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-4">每日成本趨勢</h2>
        <div className="h-48 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyCostData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Status Table */}
      <div className="card">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-4">模型詳細狀態</h2>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-left text-xs sm:text-sm text-slate-400 border-b border-slate-700">
                <th className="pb-3 font-medium">模型</th>
                <th className="pb-3 font-medium">狀態</th>
                <th className="pb-3 font-medium">成本</th>
                <th className="pb-3 font-medium">使用量</th>
                <th className="pb-3 font-medium">延遲</th>
                <th className="pb-3 font-medium">可用性</th>
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm">
              {models.map((model) => (
                <tr key={model.name} className="border-b border-slate-800/50">
                  <td className="py-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${model.color}20` }}>
                        <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: model.color }} />
                      </div>
                      <span className="text-slate-200 font-medium truncate">{model.name}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className={`status-dot ${getStatusDot(model.status)} flex-shrink-0`} />
                      <span className={getStatusColor(model.status)}>
                        {model.status === 'active' ? '運行中' : '待機'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-300">{model.cost}</td>
                  <td className="py-3 text-slate-300">{model.usage}</td>
                  <td className="py-3 text-slate-300">{model.latency}</td>
                  <td className="py-3">
                    <span className={model.availability === 'N/A' ? 'text-slate-500' : 'text-emerald-400'}>
                      {model.availability}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
