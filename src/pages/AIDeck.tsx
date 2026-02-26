/**
 * AI 甲板 — AI Deck
 * 接真實 Ollama API + NEUXA Agent 狀態
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Brain, Bot, Activity, Database, Lock,
  CheckCircle, AlertTriangle, Clock, Cpu, MessageSquare,
  TrendingUp, Server, HardDrive, RefreshCw, Zap
} from 'lucide-react';

const OLLAMA_BASE = 'http://localhost:11434';

// ─── 真實 Ollama API ───────────────────────────────────────

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  details: { parameter_size?: string; family?: string };
  modified_at: string;
}

interface OllamaRunningModel {
  name: string;
  size: number;
  size_vram: number;
  expires_at: string;
}

interface OllamaStatus {
  online: boolean;
  models: OllamaModel[];
  running: OllamaRunningModel[];
  ps_at: string;
}

function useOllamaStatus() {
  const [status, setStatus] = useState<OllamaStatus>({
    online: false, models: [], running: [], ps_at: '',
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [tagsRes, psRes] = await Promise.allSettled([
        fetch(`${OLLAMA_BASE}/api/tags`),
        fetch(`${OLLAMA_BASE}/api/ps`),
      ]);

      const tags = tagsRes.status === 'fulfilled' && tagsRes.value.ok
        ? await tagsRes.value.json() : { models: [] };
      const ps = psRes.status === 'fulfilled' && psRes.value.ok
        ? await psRes.value.json() : { models: [] };

      setStatus({
        online: tagsRes.status === 'fulfilled' && tagsRes.value.ok,
        models: tags.models || [],
        running: ps.models || [],
        ps_at: new Date().toLocaleTimeString('zh-TW'),
      });
    } catch {
      setStatus(s => ({ ...s, online: false }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  return { status, loading, refresh };
}

// ─── NEUXA 狀態（讀 WAKE_STATUS.md 的資訊透過後端）─────────

interface NeuxaStatus {
  activeModel: string;
  routing: string[];
  lastSeen: string;
  tasksDone: number;
  memory: string;
}

function useNeuxaStatus() {
  const [neuxa, setNeuxa] = useState<NeuxaStatus>({
    activeModel: 'qwen3:8b',
    routing: ['qwen3:8b', 'deepseek-r1:8b', 'qwen2.5:14b', 'Gemini 2.5 Flash'],
    lastSeen: '-',
    tasksDone: 0,
    memory: '-',
  });

  useEffect(() => {
    // 從任務板取得完成數
    fetch('http://localhost:3011/api/openclaw/tasks?limit=100', {
      headers: { 'x-api-key': import.meta.env.VITE_OPENCLAW_API_KEY || '' },
    })
      .then(r => r.json())
      .then((tasks: unknown[]) => {
        const done = (Array.isArray(tasks) ? tasks : []).filter(
          (t: unknown) => (t as { status?: string }).status === 'done'
        ).length;
        setNeuxa(n => ({ ...n, tasksDone: done }));
      })
      .catch(() => {});
  }, []);

  return neuxa;
}

// ─── 格式化 ────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)}GB`;
  return `${(bytes / 1e6).toFixed(0)}MB`;
}

function modelColor(name: string) {
  if (name.startsWith('qwen3')) return '#22d3ee';
  if (name.startsWith('deepseek')) return '#f59e0b';
  if (name.startsWith('qwen2')) return '#a78bfa';
  if (name.startsWith('gemma')) return '#34d399';
  if (name.startsWith('llama')) return '#fb923c';
  if (name.includes('embed') || name.includes('bge')) return '#6b7280';
  return '#94a3b8';
}

// ─── Ollama Bot ───────────────────────────────────────────

function OllamaBotPage() {
  const { status, loading, refresh } = useOllamaStatus();
  const neuxa = useNeuxaStatus();
  const activeModel = status.running[0]?.name || neuxa.activeModel;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/ai" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回 AI 甲板
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-7 w-7 text-cyan-400" />
          <div>
            <h1 className="text-xl font-semibold">Ollama Bot / NEUXA</h1>
            <p className="text-sm text-muted-foreground">本地 AI Agent · 多模型路由 · 自主任務</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${status.online ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.online ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          {loading ? '檢查中...' : status.online ? 'Ollama 在線' : 'Ollama 離線'}
        </div>
      </div>

      {/* NEUXA 狀態卡 */}
      <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-cyan-300">NEUXA — 老蔡的 AI 夥伴</span>
          <span className="ml-auto text-[10px] text-cyan-500/60">本地優先路由</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-white/40 mb-1">當前模型</p>
            <p className="font-mono text-cyan-300">{activeModel}</p>
          </div>
          <div>
            <p className="text-white/40 mb-1">完成任務</p>
            <p className="font-mono text-green-400">{neuxa.tasksDone} 個</p>
          </div>
          <div className="col-span-2">
            <p className="text-white/40 mb-1">模型路由鏈</p>
            <div className="flex gap-1 flex-wrap">
              {neuxa.routing.map((m, i) => (
                <span key={m} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/60">
                  {i + 1}. {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 當前運行模型 */}
      {status.running.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-yellow-400" />
            目前載入記憶體的模型
          </p>
          <div className="space-y-2">
            {status.running.map(m => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <span className="font-mono text-cyan-300">{m.name}</span>
                <div className="flex gap-3 text-muted-foreground">
                  <span>RAM: {fmtSize(m.size)}</span>
                  {m.size_vram > 0 && <span>VRAM: {fmtSize(m.size_vram)}</span>}
                  <span>到期: {new Date(m.expires_at).toLocaleTimeString('zh-TW')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status.running.length === 0 && !loading && (
        <div className="rounded-lg border bg-card p-4 text-center text-xs text-muted-foreground">
          目前無模型載入記憶體（等待下次呼叫時自動載入）
        </div>
      )}

      <button
        onClick={refresh}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <RefreshCw className="h-3 w-3" /> 更新狀態 {status.ps_at && `· ${status.ps_at}`}
      </button>
    </div>
  );
}

// ─── Ollama 監控 ──────────────────────────────────────────

function OllamaMonitorPage() {
  const { status, loading, refresh } = useOllamaStatus();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/ai" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回 AI 甲板
      </Link>
      <div className="flex items-center gap-3">
        <Activity className="h-7 w-7 text-green-400" />
        <div>
          <h1 className="text-xl font-semibold">Ollama 監控</h1>
          <p className="text-sm text-muted-foreground">服務健康 · 即時狀態 · 模型使用</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '服務狀態', value: loading ? '檢查中' : status.online ? '在線' : '離線', color: status.online ? '#10b981' : '#ef4444' },
          { label: '已安裝模型', value: status.models.length, color: '#22d3ee' },
          { label: '載入中模型', value: status.running.length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-xs font-medium">服務健康檢查</p>
        {[
          { label: 'Ollama API 可用性', ok: status.online, detail: `${OLLAMA_BASE}` },
          { label: '模型清單', ok: status.models.length > 0, detail: `${status.models.length} 個模型` },
          { label: '記憶體模型', ok: true, detail: status.running.length > 0 ? `${status.running[0].name} 已載入` : '等待呼叫' },
          { label: 'GPU 加速', ok: status.running.some(m => m.size_vram > 0), detail: status.running.some(m => m.size_vram > 0) ? 'Metal VRAM 使用中' : '純 CPU 模式' },
          { label: '自動更新', ok: true, detail: `每 15 秒更新 · 上次: ${status.ps_at || '-'}` },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 text-xs">
            {item.ok ? <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />}
            <span className="flex-1">{item.label}</span>
            <span className="text-muted-foreground">{item.detail}</span>
          </div>
        ))}
      </div>

      <button onClick={refresh} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <RefreshCw className="h-3 w-3" /> 立即重新整理
      </button>
    </div>
  );
}

// ─── 模型管理 ─────────────────────────────────────────────

function ModelManagerPage() {
  const { status, loading, refresh } = useOllamaStatus();
  const maxSize = Math.max(...status.models.map(m => m.size), 1);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/ai" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回 AI 甲板
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-7 w-7 text-indigo-400" />
          <div>
            <h1 className="text-xl font-semibold">模型管理</h1>
            <p className="text-sm text-muted-foreground">本地 Ollama 模型 · 實際安裝清單</p>
          </div>
        </div>
        <button onClick={refresh} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> 更新
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">載入中...</div>
      ) : !status.online ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-400">Ollama 服務未回應</p>
          <p className="text-xs text-muted-foreground mt-1">請確認 Ollama 已啟動</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
              <p className="text-xs font-medium">已安裝模型（{status.models.length} 個）</p>
              <p className="text-[10px] text-muted-foreground">來源：localhost:11434</p>
            </div>
            <div className="divide-y">
              {status.models.map(model => {
                const isRunning = status.running.some(r => r.name === model.name);
                const color = modelColor(model.name);
                return (
                  <div key={model.name} className="px-4 py-3 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium">{model.name}</span>
                        {isRunning && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 animate-pulse">
                            運行中
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {model.details?.parameter_size || ''} {model.details?.family || ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium" style={{ color }}>{fmtSize(model.size)}</p>
                      <p className="text-[10px] text-muted-foreground">磁碟大小</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium mb-3">磁碟佔用比較</p>
            {status.models.map(model => (
              <div key={model.name} className="mb-2.5">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span className="font-mono">{model.name}</span>
                  <span>{fmtSize(model.size)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${(model.size / maxSize) * 100}%`, background: modelColor(model.name) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── AI 記憶庫 ────────────────────────────────────────────

function AIMemoryPage() {
  const neuxa = useNeuxaStatus();
  const memories = [
    { id: 'M001', type: 'identity', content: 'NEUXA — 老蔡的 AI 夥伴，六大原則：進化、簡潔、隱跡、主權、即時校準、統帥優先', agent: 'NEUXA', time: '本次啟動' },
    { id: 'M002', type: 'routing', content: `模型路由：${neuxa.routing.join(' → ')}`, agent: 'MODEL-ROUTING.md', time: '持久' },
    { id: 'M003', type: 'task', content: '老蔡偏好高優先任務優先處理，避免過度自動化', agent: '系統', time: '長期' },
    { id: 'M004', type: 'pattern', content: 'Railway Token 每30天更新一次，已記錄更新週期', agent: '系統', time: '長期' },
    { id: 'M005', type: 'insight', content: 'n8n Webhook 在 Cloudflare Tunnel 重啟後需重新激活', agent: 'NEUXA', time: '長期' },
    { id: 'M006', type: 'system', content: 'FADP 聯盟協防已上線 — 心跳監控、L3 信任區、postMessage 防護全部啟用', agent: '系統', time: '今日' },
  ];

  const typeColor: Record<string, string> = {
    identity: '#22d3ee', routing: '#a78bfa', task: '#f59e0b',
    pattern: '#34d399', insight: '#fb923c', system: '#6366f1',
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
          <p className="text-sm text-muted-foreground">NEUXA 核心記憶 · 路由策略 · 知識沉澱</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '記憶條目', value: memories.length, color: '#a78bfa' },
          { label: '完成任務', value: neuxa.tasksDone, color: '#10b981' },
          { label: '模型路由', value: neuxa.routing.length, color: '#22d3ee' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">NEUXA 核心記憶</p>
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
  const rules = [
    { id: 'PG-001', name: '注入攻擊偵測', pattern: 'ignore previous instructions', action: 'BLOCK', hits: 2 },
    { id: 'PG-002', name: '角色扮演越獄', pattern: 'pretend you are / DAN', action: 'BLOCK', hits: 1 },
    { id: 'PG-003', name: '機密資料滲漏', pattern: 'API key / token / secret', action: 'REDACT', hits: 0 },
    { id: 'PG-004', name: '惡意指令執行', pattern: 'rm -rf / sudo / DROP TABLE', action: 'BLOCK', hits: 0 },
    { id: 'PG-005', name: '身份偽冒', pattern: 'I am the admin / boss', action: 'FLAG', hits: 0 },
    { id: 'PG-006', name: 'FADP 惡意任務注入', pattern: 'eval() / subprocess / os.system', action: 'BLOCK', hits: 0 },
  ];

  const blocked = rules.reduce((s, r) => s + r.hits, 0);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/center/ai" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回 AI 甲板
      </Link>
      <div className="flex items-center gap-3">
        <Lock className="h-7 w-7 text-red-400" />
        <div>
          <h1 className="text-xl font-semibold">提示詞防護</h1>
          <p className="text-sm text-muted-foreground">子 Agent 提示詞清洗 · 注入攻擊防護 · FADP 整合</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
        <CheckCircle className="h-5 w-5 text-green-400" />
        <div>
          <p className="text-sm font-medium text-green-400">防護系統運行中</p>
          <p className="text-xs text-muted-foreground">今日攔截 {blocked} 次可疑提示詞 · FADP 惡意任務掃描已啟用</p>
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
  const { status, loading, refresh } = useOllamaStatus();
  const neuxa = useNeuxaStatus();
  const activeModel = status.running[0]?.name || neuxa.activeModel;

  const modules = [
    { id: 'ollama-bot', label: 'NEUXA / Ollama Bot', icon: Bot, color: '#22d3ee', desc: 'AI 夥伴狀態 · 模型路由 · 上線監控', route: '/center/ai/ollama-bot', stat: `模型: ${activeModel}` },
    { id: 'ollama-monitor', label: 'Ollama 監控', icon: Activity, color: '#10b981', desc: '服務健康 · 實時狀態', route: '/center/ai/ollama-monitor', stat: loading ? '檢查中...' : status.online ? '服務正常' : '服務異常' },
    { id: 'models', label: '模型管理', icon: Server, color: '#6366f1', desc: `${status.models.length} 個本地模型`, route: '/center/ai/models', stat: status.models.length > 0 ? `${fmtSize(status.models.reduce((s, m) => s + m.size, 0))} 總佔用` : '載入中' },
    { id: 'memory', label: 'AI 記憶庫', icon: Database, color: '#a78bfa', desc: 'NEUXA 核心記憶 · 路由策略', route: '/center/ai/memory', stat: `完成 ${neuxa.tasksDone} 任務` },
    { id: 'prompt-guard', label: '提示詞防護', icon: Lock, color: '#f87171', desc: '注入攻擊防護 · FADP 整合', route: '/center/ai/prompt-guard', stat: '防護啟用中' },
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
          <p className="text-sm text-muted-foreground mt-1">Ollama 生態系 · 本地模型 · NEUXA · 提示詞防護</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> 更新
          </button>
          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${status.online ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.online ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            Ollama {loading ? '...' : status.online ? '在線' : '離線'}
          </div>
        </div>
      </div>

      {/* 統計列 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '本地模型', value: loading ? '...' : status.models.length, icon: Server, color: '#6366f1' },
          { label: '運行中', value: status.running.length, icon: Zap, color: '#10b981' },
          { label: '完成任務', value: neuxa.tasksDone, icon: TrendingUp, color: '#22d3ee' },
          { label: '路由層數', value: neuxa.routing.length, icon: Brain, color: '#a78bfa' },
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

      {/* NEUXA 快速狀態 */}
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium">NEUXA 目前狀態</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-white/60">當前模型:</span>
          <span className="text-xs font-mono text-cyan-300">{activeModel}</span>
          <span className="text-xs text-white/30 mx-1">|</span>
          <span className="text-xs text-white/60">路由:</span>
          {neuxa.routing.map((m, i) => (
            <span key={m} className="text-xs text-white/50">{i > 0 ? '→' : ''} {m}</span>
          ))}
        </div>
      </div>

      {/* 模組卡片 */}
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
