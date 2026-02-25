/**
 * AI 甲板 — AI Deck
 * Ollama Bot 生態系 · 本地模型管理 · AI 記憶庫 · 提示詞防護 · 監控
 */
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Brain, Bot, Activity, Database, Lock,
  CheckCircle, AlertTriangle, Clock, Cpu, MessageSquare,
  Zap, Eye, RefreshCw, TrendingUp, Server, HardDrive
} from 'lucide-react';

// ─── 模擬狀態 ─────────────────────────────────────────────

function useAIStatus() {
  const [status, setStatus] = useState({
    ollamaOnline: true,
    activeModel: 'qwen3:8b',
    models: [
      { name: 'qwen3:8b', size: '4.9GB', status: 'loaded', speed: 42 },
      { name: 'deepseek-r1:7b', size: '4.1GB', status: 'available', speed: 38 },
      { name: 'llama3.2:3b', size: '2.0GB', status: 'available', speed: 61 },
      { name: 'gemma3:4b', size: '2.5GB', status: 'available', speed: 55 },
      { name: 'phi4-mini:3.8b', size: '2.3GB', status: 'available', speed: 58 },
    ],
    memoryCount: 1847,
    memorySize: '128MB',
    todayRequests: 234,
    successRate: 98.7,
    avgLatency: 1240,
    promptBlocked: 3,
    contextMemory: 87,
  });

  useEffect(() => {
    const t = setInterval(() => {
      setStatus(s => ({
        ...s,
        todayRequests: s.todayRequests + (Math.random() > 0.6 ? 1 : 0),
        avgLatency: Math.max(800, Math.min(2000, s.avgLatency + (Math.random() - 0.5) * 100)),
      }));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return status;
}

// ─── Ollama Bot ───────────────────────────────────────────

function OllamaBotPage() {
  const status = useAIStatus();
  const [chatLog] = useState([
    { role: 'user', msg: '幫我分析任務板上的高優先任務', time: '20:15:02' },
    { role: 'bot', msg: '目前高優先任務共 4 項，建議先處理 T-042（部署阻斷）...', time: '20:15:04' },
    { role: 'user', msg: '好，幫我派給小蔡', time: '20:15:18' },
    { role: 'bot', msg: '已派發 T-042 給 Agent 小蔡，預計 15 分鐘完成', time: '20:15:19' },
    { role: 'user', msg: '今日執行摘要', time: '20:30:00' },
    { role: 'bot', msg: '今日完成 23 項任務，成功率 96%，最長任務耗時 8m12s', time: '20:30:01' },
  ]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/ai" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回 AI 甲板
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-7 w-7 text-cyan-400" />
          <div>
            <h1 className="text-xl font-semibold">Ollama Bot</h1>
            <p className="text-sm text-muted-foreground">Telegram 智慧助手 · 多模型串流 · 上下文記憶</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${status.ollamaOnline ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.ollamaOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          {status.ollamaOnline ? 'Ollama 在線' : 'Ollama 離線'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '今日請求', value: status.todayRequests, color: '#22d3ee' },
          { label: '成功率', value: `${status.successRate}%`, color: '#10b981' },
          { label: '平均延遲', value: `${(status.avgLatency/1000).toFixed(1)}s`, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-medium">對話記錄</p>
          <span className="text-[10px] text-muted-foreground">使用模型：{status.activeModel}</span>
        </div>
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {chatLog.map((log, i) => (
            <div key={i} className={`flex gap-2 ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${log.role === 'user' ? 'bg-cyan-500/20 text-cyan-100' : 'bg-muted text-foreground'}`}>
                <p>{log.msg}</p>
                <p className="text-[9px] opacity-50 mt-1">{log.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ollama 監控 ──────────────────────────────────────────

function OllamaMonitorPage() {
  const status = useAIStatus();
  const [cpuUsage, setCpuUsage] = useState(34);
  const [ramUsage, setRamUsage] = useState(62);

  useEffect(() => {
    const t = setInterval(() => {
      setCpuUsage(v => Math.max(10, Math.min(95, v + (Math.random() - 0.5) * 10)));
      setRamUsage(v => Math.max(40, Math.min(90, v + (Math.random() - 0.5) * 5)));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/ai" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回 AI 甲板
      </Link>
      <div className="flex items-center gap-3">
        <Activity className="h-7 w-7 text-green-400" />
        <div>
          <h1 className="text-xl font-semibold">Ollama 監控</h1>
          <p className="text-sm text-muted-foreground">服務健康監控 · 自動復原 · 資源使用</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Cpu className="h-3 w-3" />CPU 使用率</span>
            <span className="text-sm font-bold text-cyan-400">{cpuUsage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="h-2 rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${cpuUsage}%` }} />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><HardDrive className="h-3 w-3" />記憶體使用</span>
            <span className="text-sm font-bold text-purple-400">{ramUsage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="h-2 rounded-full bg-purple-400 transition-all duration-500" style={{ width: `${ramUsage}%` }} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-xs font-medium">服務健康檢查</p>
        {[
          { label: 'Ollama API 可用性', ok: true, detail: 'http://localhost:11434' },
          { label: '模型載入狀態', ok: true, detail: `${status.activeModel} 已就緒` },
          { label: '回應時間', ok: status.avgLatency < 1500, detail: `${status.avgLatency}ms` },
          { label: '自動復原機制', ok: true, detail: '監控中 (ollama_monitor_bot)' },
          { label: 'GPU 加速', ok: true, detail: 'Metal (Apple Silicon)' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 text-xs">
            {item.ok ? <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />}
            <span className="flex-1">{item.label}</span>
            <span className="text-muted-foreground">{item.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 模型管理 ─────────────────────────────────────────────

function ModelManagerPage() {
  const status = useAIStatus();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/ai" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回 AI 甲板
      </Link>
      <div className="flex items-center gap-3">
        <Server className="h-7 w-7 text-indigo-400" />
        <div>
          <h1 className="text-xl font-semibold">模型管理</h1>
          <p className="text-sm text-muted-foreground">本地模型清單 · Qwen3 / Deepseek / Llama / Gemma</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">已安裝模型（{status.models.length} 個）</p>
        </div>
        <div className="divide-y">
          {status.models.map(model => (
            <div key={model.name} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-medium">{model.name}</span>
                  {model.status === 'loaded' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">已載入</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{model.size}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-cyan-400">{model.speed} tok/s</p>
                <p className="text-[10px] text-muted-foreground">推理速度</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium mb-3">模型能力對比</p>
        {status.models.map(model => (
          <div key={model.name} className="mb-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span className="font-mono">{model.name}</span>
              <span>{model.speed} tok/s</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${(model.speed / 70) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI 記憶庫 ────────────────────────────────────────────

function AIMemoryPage() {
  const status = useAIStatus();
  const memories = [
    { id: 'M001', type: 'task', content: '老蔡偏好高優先任務優先處理，避免過度自動化', agent: '系統', time: '2h前' },
    { id: 'M002', type: 'pattern', content: 'Deploy 任務失敗率在週五下午最高，建議避開', agent: '小蔡', time: '1d前' },
    { id: 'M003', type: 'config', content: 'Railway Token 每30天更新一次，已記錄更新週期', agent: '系統', time: '3d前' },
    { id: 'M004', type: 'insight', content: 'n8n Webhook 在Cloudflare Tunnel重啟後需重新激活', agent: '小蔡', time: '5d前' },
    { id: 'M005', type: 'task', content: 'Telegram Bot Token 洩露後需立即在BotFather撤銷', agent: '系統', time: '1w前' },
  ];

  const typeColor: Record<string, string> = {
    task: '#22d3ee', pattern: '#f59e0b', config: '#a78bfa', insight: '#34d399',
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/ai" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回 AI 甲板
      </Link>
      <div className="flex items-center gap-3">
        <Database className="h-7 w-7 text-purple-400" />
        <div>
          <h1 className="text-xl font-semibold">AI 記憶庫</h1>
          <p className="text-sm text-muted-foreground">Agent 對話歷史 · 共享狀態 · 知識沉澱</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '記憶條目', value: status.memoryCount, color: '#a78bfa' },
          { label: '儲存大小', value: status.memorySize, color: '#22d3ee' },
          { label: '上下文覆蓋', value: `${status.contextMemory}%`, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">近期記憶</p>
        </div>
        <div className="divide-y">
          {memories.map(m => (
            <div key={m.id} className="px-4 py-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ color: typeColor[m.type], background: typeColor[m.type] + '15' }}>{m.type}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{m.agent} · {m.time}</span>
              </div>
              <p className="text-xs text-foreground/80">{m.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 提示詞防護 ───────────────────────────────────────────

function PromptGuardPage() {
  const status = useAIStatus();
  const rules = [
    { id: 'PG-001', name: '注入攻擊偵測', pattern: 'ignore previous instructions', action: 'BLOCK', hits: 2 },
    { id: 'PG-002', name: '角色扮演越獄', pattern: 'pretend you are / DAN', action: 'BLOCK', hits: 1 },
    { id: 'PG-003', name: '機密資料滲漏', pattern: 'API key / token / secret', action: 'REDACT', hits: 0 },
    { id: 'PG-004', name: '惡意指令執行', pattern: 'rm -rf / sudo / DROP TABLE', action: 'BLOCK', hits: 0 },
    { id: 'PG-005', name: '身份偽冒', pattern: 'I am the admin / boss', action: 'FLAG', hits: 0 },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/ai" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回 AI 甲板
      </Link>
      <div className="flex items-center gap-3">
        <Lock className="h-7 w-7 text-red-400" />
        <div>
          <h1 className="text-xl font-semibold">提示詞防護</h1>
          <p className="text-sm text-muted-foreground">子 Agent 提示詞清洗 · 注入攻擊防護 · 安全包裝</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
        <CheckCircle className="h-5 w-5 text-green-400" />
        <div>
          <p className="text-sm font-medium text-green-400">防護系統運行中</p>
          <p className="text-xs text-muted-foreground">今日攔截 {status.promptBlocked} 次可疑提示詞</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">防護規則（{rules.length} 條）</p>
        </div>
        <div className="divide-y">
          {rules.map(rule => (
            <div key={rule.id} className="px-4 py-3 flex items-start gap-3">
              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{rule.id}</span>
              <div className="flex-1">
                <p className="text-xs font-medium">{rule.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{rule.pattern}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${rule.action === 'BLOCK' ? 'bg-red-500/10 text-red-400' : rule.action === 'REDACT' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {rule.action}
                </span>
                {rule.hits > 0 && <span className="text-[10px] text-red-400">{rule.hits}次</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AI 甲板總覽 ──────────────────────────────────────────

function AIOverview() {
  const status = useAIStatus();

  const modules = [
    { id: 'ollama-bot', label: 'Ollama Bot', icon: Bot, color: '#22d3ee', desc: 'Telegram 智慧助手・多模型串流', route: '/center/ai/ollama-bot', stat: `${status.todayRequests} 今日請求` },
    { id: 'ollama-monitor', label: 'Ollama 監控', icon: Activity, color: '#10b981', desc: '服務健康・自動復原', route: '/center/ai/ollama-monitor', stat: status.ollamaOnline ? '服務正常' : '服務異常' },
    { id: 'models', label: '模型管理', icon: Server, color: '#6366f1', desc: `${status.models.length} 個本地模型`, route: '/center/ai/models', stat: `載入：${status.activeModel}` },
    { id: 'memory', label: 'AI 記憶庫', icon: Database, color: '#a78bfa', desc: 'Agent 共享狀態・知識沉澱', route: '/center/ai/memory', stat: `${status.memoryCount} 條記憶` },
    { id: 'prompt-guard', label: '提示詞防護', icon: Lock, color: '#f87171', desc: '注入攻擊防護・安全包裝', route: '/center/ai/prompt-guard', stat: `攔截 ${status.promptBlocked} 次` },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link to="/center" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回甲板總覽
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-6 w-6 text-cyan-400" /> AI 甲板
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ollama 生態系 · 本地模型 · AI 記憶 · 提示詞防護</p>
        </div>
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${status.ollamaOnline ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.ollamaOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          Ollama {status.ollamaOnline ? '在線' : '離線'}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '今日請求', value: status.todayRequests, icon: MessageSquare, color: '#22d3ee' },
          { label: '成功率', value: `${status.successRate}%`, icon: TrendingUp, color: '#10b981' },
          { label: '記憶條目', value: status.memoryCount, icon: Database, color: '#a78bfa' },
          { label: '本地模型', value: status.models.length, icon: Server, color: '#6366f1' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
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
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: mod.color + '20', border: `1px solid ${mod.color}30` }}>
                  <Icon className="h-4 w-4" style={{ color: mod.color }} />
                </div>
                <div>
                  <p className="font-medium text-sm">{mod.label}</p>
                  <p className="text-[10px] text-muted-foreground">{mod.stat}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{mod.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── 主路由 ───────────────────────────────────────────────

export default function AIDeck() {
  const { module } = useParams<{ module?: string }>();
  if (module === 'ollama-bot') return <OllamaBotPage />;
  if (module === 'ollama-monitor') return <OllamaMonitorPage />;
  if (module === 'models') return <ModelManagerPage />;
  if (module === 'memory') return <AIMemoryPage />;
  if (module === 'prompt-guard') return <PromptGuardPage />;
  return <AIOverview />;
}
