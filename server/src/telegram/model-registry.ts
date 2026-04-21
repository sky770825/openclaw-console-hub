/**
 * 模型配置註冊表 — 集中管理所有 AI 模型的 provider、temperature、maxTokens
 *
 * 指揮官規則：只有 Gemini 2.5 Flash 以上 + Claude Opus 4.6（緊急）
 * 子代理規則：訂閱制 CLI + 免費額度 + 本地，Anthropic API 付費不派子代理
 */

import fs from 'node:fs';
import path from 'node:path';

export type ModelRole = 'commander' | 'subagent';

export interface ModelConfig {
  id: string;
  label: string;
  provider: string;
  temperature: number;
  maxOutputTokens: number;
  role: ModelRole; // commander=可當指揮官大腦, subagent=只適合子代理/ask_ai
}

export const MODEL_REGISTRY: ModelConfig[] = [
  // ══════════════════════════════════════════
  // 指揮官級（Telegram /models 選單可切換）
  // 規則：只有 Gemini 2.5 Flash 以上 + Claude Opus 緊急用
  // ══════════════════════════════════════════
  { id: 'gemini-2.5-flash', label: '⚡ Gemini 2.5 Flash', provider: 'Google', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'gemini-2.5-pro', label: '🏋️ Gemini 2.5 Pro', provider: 'Google', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  { id: 'gemini-3-flash-preview', label: '🔥 Gemini 3 Flash', provider: 'Google', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  { id: 'gemini-3.1-pro-preview', label: '🧠 Gemini 3.1 Pro', provider: 'Google', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  { id: 'claude-opus-4-6', label: '🚨 Claude Opus 4.6 (1M)', provider: 'Anthropic', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  { id: 'claude-sonnet-4-6', label: '💎 Claude Sonnet 4.6 (1M)', provider: 'Anthropic', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  { id: 'claude-haiku-4-5-20251001', label: '⚡ Claude Haiku 4.5', provider: 'Anthropic', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  // ── MiniMax（OpenAI 相容，api.minimax.io/v1）──
  { id: 'MiniMax-M2.7', label: '🎯 MiniMax M2.7', provider: 'MiniMax', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'MiniMax-M2.7-highspeed', label: '⚡ MiniMax M2.7 HS', provider: 'MiniMax', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'MiniMax-M2.5', label: '🎯 MiniMax M2.5', provider: 'MiniMax', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'MiniMax-M2.5-highspeed', label: '⚡ MiniMax M2.5 HS', provider: 'MiniMax', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'MiniMax-M2.1', label: '🎯 MiniMax M2.1', provider: 'MiniMax', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'MiniMax-M2.1-highspeed', label: '⚡ MiniMax M2.1 HS', provider: 'MiniMax', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'MiniMax-M2', label: '🎯 MiniMax M2', provider: 'MiniMax', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  // ══════════════════════════════════════════
  // 子代理級（ask_ai 可派遣，全部免費/訂閱制）
  // 訂閱制 CLI：Claude Code、Codex、Cursor（不花 API 錢）
  // 免費額度：Gemini Lite、OpenRouter :free
  // 其他：xAI、Kimi、DeepSeek
  // ══════════════════════════════════════════
  // ── 訂閱制 CLI（Claude Code / Codex / Cursor）——可當指揮官 + 子代理 ──
  { id: 'claude-opus-cli', label: '🏆 Claude Opus (CLI 1M)', provider: 'Claude-CLI', temperature: 0.85, maxOutputTokens: 32768, role: 'commander' },
  { id: 'claude-sonnet-cli', label: '💎 Claude Sonnet (CLI 1M)', provider: 'Claude-CLI', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  { id: 'claude-haiku-cli', label: '⚡ Claude Haiku (CLI)', provider: 'Claude-CLI', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'codex-mini', label: '📦 Codex Mini (CLI)', provider: 'OpenAI-CLI', temperature: 0.85, maxOutputTokens: 8192, role: 'subagent' },
  // ── Google 免費額度 ──
  { id: 'gemini-2.5-flash-lite', label: '💨 Flash Lite 2.5', provider: 'Google', temperature: 0.85, maxOutputTokens: 8192, role: 'subagent' },
  // ── DeepSeek ──
  { id: 'deepseek-chat', label: '🐋 DeepSeek V3', provider: 'DeepSeek', temperature: 1, maxOutputTokens: 8192, role: 'subagent' },
  { id: 'deepseek-reasoner', label: '🧬 DeepSeek R1', provider: 'DeepSeek', temperature: 1, maxOutputTokens: 8192, role: 'subagent' },
  // ── Kimi ──
  { id: 'kimi-k2.5', label: '🌙 Kimi K2.5', provider: 'Kimi', temperature: 1, maxOutputTokens: 8192, role: 'subagent' },
  { id: 'kimi-k2-turbo-preview', label: '🌀 Kimi K2 Turbo', provider: 'Kimi', temperature: 1, maxOutputTokens: 8192, role: 'subagent' },
  // ── xAI（2M context window）──
  { id: 'grok-4-1-fast', label: '🤖 Grok 4.1 Fast', provider: 'xAI', temperature: 0.85, maxOutputTokens: 16384, role: 'subagent' },
  { id: 'grok-4-1-fast-reasoning', label: '🧩 Grok 4.1 Reasoning', provider: 'xAI', temperature: 0.85, maxOutputTokens: 16384, role: 'subagent' },
  { id: 'grok-code-fast-1', label: '💻 Grok Code Fast', provider: 'xAI', temperature: 0.85, maxOutputTokens: 16384, role: 'subagent' },
  // ── OpenRouter 免費 ──
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', label: '🆓 Hermes 405B', provider: 'OpenRouter', temperature: 0.85, maxOutputTokens: 8192, role: 'subagent' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: '🆓 Llama 3.3 70B', provider: 'OpenRouter', temperature: 0.85, maxOutputTokens: 8192, role: 'subagent' },
  { id: 'qwen/qwen3-coder:free', label: '🆓 Qwen3 Coder', provider: 'OpenRouter', temperature: 0.85, maxOutputTokens: 8192, role: 'subagent' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: '🆓 Mistral Small', provider: 'OpenRouter', temperature: 0.85, maxOutputTokens: 8192, role: 'subagent' },
];

/** 查詢模型配置，找不到就用預設值 */
export function getModelConfig(modelId: string): ModelConfig {
  return MODEL_REGISTRY.find(m => m.id === modelId) || {
    id: modelId, label: modelId, provider: 'Google', temperature: 0.85, maxOutputTokens: 8192, role: 'subagent' as ModelRole,
  };
}

/** 取得所有可用模型清單 */
export function getAvailableModels(): Array<{ id: string; label: string; provider: string }> {
  return MODEL_REGISTRY.map(m => ({ id: m.id, label: m.label, provider: m.provider }));
}

/** 按 provider 分組取得模型清單 */
export function getModelsGrouped(): Array<{ provider: string; models: Array<{ id: string; label: string; role: ModelRole }> }> {
  const groups = new Map<string, Array<{ id: string; label: string; role: ModelRole }>>();
  for (const m of MODEL_REGISTRY) {
    if (!groups.has(m.provider)) groups.set(m.provider, []);
    groups.get(m.provider)!.push({ id: m.id, label: m.label, role: m.role });
  }
  return Array.from(groups.entries()).map(([provider, models]) => ({ provider, models }));
}

/** 取得指揮官級模型（按 provider 分組） */
export function getCommanderModels(): Array<{ provider: string; models: Array<{ id: string; label: string }> }> {
  const all = getModelsGrouped();
  return all
    .map(g => ({ provider: g.provider, models: g.models.filter(m => m.role === 'commander') }))
    .filter(g => g.models.length > 0);
}

/** 取得子代理級模型（ask_ai / auto-executor 用） */
export function getSubagentModels(): Array<{ id: string; label: string; provider: string }> {
  return MODEL_REGISTRY.filter(m => m.role === 'subagent').map(m => ({ id: m.id, label: m.label, provider: m.provider }));
}

/** 從 openclaw.json 讀取 provider API key */
export function getProviderKey(provider: string): string {
  try {
    const ocPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json');
    if (!fs.existsSync(ocPath)) return '';
    const raw = fs.readFileSync(ocPath, 'utf8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
    const models = asObj(data.models);
    const providers = asObj(models.providers);
    const p = asObj(providers[provider]);
    return String(p.apiKey ?? '').trim();
  } catch { return ''; }
}

/** 根據模型 ID 判斷 provider */
export function getModelProvider(modelId: string): 'google' | 'anthropic' | 'claude-cli' | 'kimi' | 'xai' | 'deepseek' | 'openrouter' | 'minimax' {
  // 先查 registry（最準確）
  const reg = MODEL_REGISTRY.find(m => m.id === modelId);
  if (reg) {
    const p = reg.provider.toLowerCase();
    if (p === 'claude-cli') return 'claude-cli';
    if (p === 'google') return 'google';
    if (p === 'anthropic') return 'anthropic';
    if (p === 'deepseek') return 'deepseek';
    if (p === 'kimi') return 'kimi';
    if (p === 'xai') return 'xai';
    if (p === 'openrouter') return 'openrouter';
    if (p === 'minimax') return 'minimax';
  }
  // fallback: 按 id prefix 判斷
  if (modelId.endsWith('-cli')) return 'claude-cli';
  if (modelId.startsWith('claude')) return 'anthropic';
  if (modelId.startsWith('kimi')) return 'kimi';
  if (modelId.startsWith('grok')) return 'xai';
  if (modelId.startsWith('deepseek') && !modelId.includes('/')) return 'deepseek';
  if (modelId.includes('/') && modelId.includes(':free')) return 'openrouter';
  if (modelId.startsWith('MiniMax-')) return 'minimax';
  return 'google';
}

/** Reasoning effort 等級 — 對應 Anthropic thinking 參數 */
export type ReasoningEffort = 'adaptive' | 'low' | 'medium' | 'high';

/**
 * 判斷模型是否支援 extended thinking
 * 目前支援：claude-sonnet-4-5+（含 4.6）、claude-opus-4+（含 4.6）
 * 不支援：haiku、較舊版本
 */
function supportsThinking(modelId: string): boolean {
  const id = modelId.toLowerCase();
  if (id.includes('haiku')) return false;
  // claude-sonnet-4-5 / 4-6 / 4-7 / claude-opus-4 / 4-5 / 4-6 等
  if (/claude-(sonnet|opus)-4-[5-9]/.test(id)) return true;
  if (/claude-(sonnet|opus)-[5-9]/.test(id)) return true;
  return false;
}

/** 把 reasoningEffort 轉換成 Anthropic thinking 參數 */
function buildThinkingParam(effort: ReasoningEffort): Record<string, unknown> {
  if (effort === 'adaptive') return { type: 'adaptive' };
  const budgets: Record<Exclude<ReasoningEffort, 'adaptive'>, number> = {
    low: 1024,
    medium: 4096,
    high: 8192,
  };
  return { type: 'enabled', budget_tokens: budgets[effort] };
}

/** 呼叫 Anthropic API（Claude 系列） */
export async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  timeoutMs: number,
  reasoningEffort?: ReasoningEffort,
): Promise<string> {
  const cfg = getModelConfig(model);

  // 判斷是否可加 thinking 參數：需要指定 effort + 模型支援
  const wantThinking = reasoningEffort && supportsThinking(model);
  let effectiveMaxTokens = maxTokens;
  let thinking: Record<string, unknown> | undefined;

  if (wantThinking) {
    thinking = buildThinkingParam(reasoningEffort!);
    // budget_tokens 必須 < max_tokens；若 enabled 模式且不夠，動態放大 max_tokens
    if (thinking.type === 'enabled') {
      const budget = Number(thinking.budget_tokens || 0);
      // 預留至少 1024 token 給正式回覆
      const needed = budget + 1024;
      if (effectiveMaxTokens <= budget) {
        effectiveMaxTokens = Math.max(needed, effectiveMaxTokens);
      }
    }
  }

  const buildBody = (withThinking: boolean): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      model,
      max_tokens: effectiveMaxTokens,
      // 使用 thinking 時 temperature 必須是 1.0（Anthropic 要求）
      temperature: withThinking ? 1 : cfg.temperature,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content })),
    };
    if (withThinking && thinking) body.thinking = thinking;
    return body;
  };

  const doFetch = async (withThinking: boolean): Promise<Response> => {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(buildBody(withThinking)),
      signal: AbortSignal.timeout(timeoutMs),
    });
  };

  let resp = await doFetch(Boolean(wantThinking));
  // Gracefully 降級：若帶 thinking 被 4xx 拒絕（模型不支援/參數錯誤），去掉 thinking 重試一次
  if (!resp.ok && wantThinking && resp.status >= 400 && resp.status < 500) {
    effectiveMaxTokens = maxTokens; // 還原成原始 max_tokens
    resp = await doFetch(false);
  }
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Anthropic HTTP ${resp.status}: ${errText.slice(0, 300)}`);
  }
  const data = await resp.json() as Record<string, unknown>;
  const content = (data.content || []) as Array<Record<string, unknown>>;
  // 只取 text 區塊（忽略 thinking 區塊）
  return content.filter(c => c.type === 'text').map(c => String(c.text || '')).join('').trim();
}

/** 呼叫 OpenAI 相容 API（Kimi / xAI / MiniMax） */
export async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  timeoutMs: number,
): Promise<string> {
  const cfg = getModelConfig(model);
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: maxTokens,
    temperature: cfg.temperature,
  };
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 300)}`);
  }
  const data = await resp.json() as Record<string, unknown>;
  const choices = (data.choices || []) as Array<Record<string, unknown>>;
  const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
  const msg = asObj(choices[0]?.message);
  return String(msg.content ?? '').trim();
}

// ══════════════════════════════════════════════════════════════════════════
// 🆕 統一模型註冊表：MODEL_ALIASES + resolveModel + listModels + hasApiKey
// （純新增，不影響上方現有 export）
// 參考：hermes_cli/model_switch.py 的 MODEL_ALIASES + resolve_provider_full
// ══════════════════════════════════════════════════════════════════════════

/** 規範化後的 provider 標籤（給 ModelIdentity 使用） */
export type ResolvedProvider = 'google' | 'anthropic' | 'minimax' | 'kimi' | 'xai' | 'openrouter' | 'deepseek' | 'claude-cli' | 'openai-cli';

/** 統一模型身份 — 取代散落各處的 startsWith 判斷 */
export interface ModelIdentity {
  id: string;              // 規範化 model id
  provider: ResolvedProvider;
  vendor: string;          // 顯示名（對應 MODEL_REGISTRY.provider，如 'Google' / 'MiniMax'）
  family: string;          // e.g. 'gemini-flash' | 'gemini-pro' | 'claude-sonnet' | 'minimax-m27'
  baseUrl: string;         // OpenAI 相容端點；anthropic/google/cli 回 ''
  apiKeyEnv: string;       // e.g. 'MINIMAX_API_KEY'（provider key env 名稱）
  supportsThinking: boolean;
  supportsStreaming: boolean;
}

/** 短名 → 規範 model id（靈感來自 hermes_cli/model_switch.py） */
export const MODEL_ALIASES: Record<string, string> = {
  // Gemini
  'flash': 'gemini-2.5-flash',
  'gemini': 'gemini-2.5-flash',
  'gemini-flash': 'gemini-2.5-flash',
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'pro': 'gemini-2.5-pro',
  'gemini-pro': 'gemini-2.5-pro',
  'gemini-2.5-pro': 'gemini-2.5-pro',
  'gemini-3-flash': 'gemini-3-flash-preview',
  'gemini-3-pro': 'gemini-3.1-pro-preview',
  'flash-lite': 'gemini-2.5-flash-lite',

  // Claude（Anthropic API）
  'sonnet': 'claude-sonnet-4-6',
  'claude-sonnet': 'claude-sonnet-4-6',
  'haiku': 'claude-haiku-4-5-20251001',
  'claude-haiku': 'claude-haiku-4-5-20251001',
  'opus': 'claude-opus-4-7',
  'claude-opus': 'claude-opus-4-7',

  // Claude CLI
  'sonnet-cli': 'claude-sonnet-cli',
  'haiku-cli': 'claude-haiku-cli',
  'opus-cli': 'claude-opus-cli',

  // MiniMax
  'mm': 'MiniMax-M2.7-highspeed',
  'minimax': 'MiniMax-M2.7-highspeed',
  'minimax-hs': 'MiniMax-M2.7-highspeed',
  'MiniMax-M2.7-highspeed': 'MiniMax-M2.7-highspeed',
  'MiniMax-M2.7': 'MiniMax-M2.7',

  // Kimi / DeepSeek / xAI
  'kimi': 'kimi-k2.5',
  'deepseek': 'deepseek-chat',
  'deepseek-r1': 'deepseek-reasoner',
  'grok': 'grok-4-1-fast',
  'grok-reasoning': 'grok-4-1-fast-reasoning',
};

/** 依 registry provider 標籤判斷規範 provider */
function toResolvedProvider(registryProvider: string, modelId: string): ResolvedProvider {
  const p = registryProvider.toLowerCase();
  if (p === 'google') return 'google';
  if (p === 'anthropic') return 'anthropic';
  if (p === 'minimax') return 'minimax';
  if (p === 'kimi') return 'kimi';
  if (p === 'xai') return 'xai';
  if (p === 'deepseek') return 'deepseek';
  if (p === 'openrouter') return 'openrouter';
  if (p === 'claude-cli') return 'claude-cli';
  if (p === 'openai-cli') return 'openai-cli';
  // fallback：套舊的 getModelProvider 邏輯
  const legacy = getModelProvider(modelId);
  return legacy as ResolvedProvider;
}

/** 由 provider + id 推導 family tag */
function inferFamily(provider: ResolvedProvider, modelId: string): string {
  const id = modelId.toLowerCase();
  if (provider === 'google') {
    if (id.includes('flash-lite')) return 'gemini-flash-lite';
    if (id.includes('flash')) return 'gemini-flash';
    if (id.includes('pro')) return 'gemini-pro';
    return 'gemini';
  }
  if (provider === 'anthropic' || provider === 'claude-cli') {
    if (id.includes('opus')) return 'claude-opus';
    if (id.includes('sonnet')) return 'claude-sonnet';
    if (id.includes('haiku')) return 'claude-haiku';
    return 'claude';
  }
  if (provider === 'minimax') {
    if (id.includes('m2.7')) return 'minimax-m27';
    if (id.includes('m2.5')) return 'minimax-m25';
    if (id.includes('m2.1')) return 'minimax-m21';
    return 'minimax';
  }
  if (provider === 'kimi') return 'kimi-k2';
  if (provider === 'deepseek') return id.includes('reasoner') ? 'deepseek-r1' : 'deepseek-v3';
  if (provider === 'xai') {
    if (id.includes('code')) return 'grok-code';
    if (id.includes('reasoning')) return 'grok-reasoning';
    return 'grok';
  }
  if (provider === 'openrouter') return 'openrouter-free';
  if (provider === 'openai-cli') return 'codex';
  return 'unknown';
}

/** provider → base url（OpenAI 相容端點） */
function providerBaseUrl(provider: ResolvedProvider): string {
  switch (provider) {
    case 'minimax': return (process.env.MINIMAX_BASE_URL?.trim() || 'https://api.minimax.io/v1').replace(/\/+$/, '');
    case 'kimi': return 'https://api.moonshot.ai/v1';
    case 'deepseek': return 'https://api.deepseek.com/v1';
    case 'xai': return 'https://api.x.ai/v1';
    case 'openrouter': return 'https://openrouter.ai/api/v1';
    default: return '';
  }
}

/** provider → 對應 env 變數名 */
function providerApiKeyEnv(provider: ResolvedProvider): string {
  switch (provider) {
    case 'google': return 'GOOGLE_API_KEY';
    case 'anthropic': return 'ANTHROPIC_API_KEY';
    case 'minimax': return 'MINIMAX_API_KEY';
    case 'kimi': return 'KIMI_API_KEY';
    case 'deepseek': return 'DEEPSEEK_API_KEY';
    case 'xai': return 'XAI_API_KEY';
    case 'openrouter': return 'OPENROUTER_API_KEY';
    case 'claude-cli':
    case 'openai-cli': return ''; // 訂閱制 CLI，不需 env key
    default: return '';
  }
}

/** 判斷模型是否支援串流 */
function supportsStreamingForProvider(provider: ResolvedProvider): boolean {
  // OpenAI 相容 + Anthropic / Google 都支援串流；CLI 不支援
  return provider !== 'claude-cli' && provider !== 'openai-cli';
}

/**
 * 將 alias 或完整 model id 解析成 ModelIdentity。
 * 找不到回 null（保持 caller 可降級處理）。
 */
export function resolveModel(aliasOrId: string): ModelIdentity | null {
  if (!aliasOrId || typeof aliasOrId !== 'string') return null;
  const key = aliasOrId.trim();
  if (!key) return null;

  // 1. 先查 alias 表（大小寫敏感優先，再試 lowercase）
  const canonical = MODEL_ALIASES[key] ?? MODEL_ALIASES[key.toLowerCase()] ?? key;

  // 2. 在 MODEL_REGISTRY 找出對應條目
  const reg = MODEL_REGISTRY.find(m => m.id === canonical);
  const resolvedId = reg?.id ?? canonical;
  const vendor = reg?.provider ?? 'Unknown';
  const provider = toResolvedProvider(reg?.provider ?? '', resolvedId);

  return {
    id: resolvedId,
    provider,
    vendor,
    family: inferFamily(provider, resolvedId),
    baseUrl: providerBaseUrl(provider),
    apiKeyEnv: providerApiKeyEnv(provider),
    supportsThinking: supportsThinking(resolvedId),
    supportsStreaming: supportsStreamingForProvider(provider),
  };
}

/** 依條件過濾可用模型 — 便於 discovery / 選單生成 */
export function listModels(
  filter?: { provider?: ResolvedProvider; family?: string; role?: ModelRole },
): ModelIdentity[] {
  const out: ModelIdentity[] = [];
  for (const m of MODEL_REGISTRY) {
    if (filter?.role && m.role !== filter.role) continue;
    const ident = resolveModel(m.id);
    if (!ident) continue;
    if (filter?.provider && ident.provider !== filter.provider) continue;
    if (filter?.family && ident.family !== filter.family) continue;
    out.push(ident);
  }
  return out;
}

/**
 * 檢查 ModelIdentity 對應 provider 是否有可用的 API key
 * （先查 process.env[apiKeyEnv]，再 fallback 到 openclaw.json）
 */
export function hasApiKey(model: ModelIdentity): boolean {
  if (model.provider === 'claude-cli' || model.provider === 'openai-cli') return true; // 訂閱制 CLI
  const envKey = model.apiKeyEnv ? process.env[model.apiKeyEnv]?.trim() : '';
  if (envKey) return true;
  const jsonKey = getProviderKey(model.provider).trim();
  return Boolean(jsonKey);
}

/** 串流呼叫 OpenAI 相容 API — 回傳 async generator，每次 yield 一段增量文字 */
export async function* callOpenAICompatibleStream(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  timeoutMs: number,
): AsyncGenerator<string, void, unknown> {
  const cfg = getModelConfig(model);
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: maxTokens,
    temperature: cfg.temperature,
    stream: true,
  };
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 300)}`);
  }
  if (!resp.body) throw new Error('No response body for streaming');

  const decoder = new TextDecoder();
  let buffer = '';
  const reader = resp.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') return;
      try {
        const chunk = JSON.parse(payload) as Record<string, unknown>;
        const choices = (chunk.choices || []) as Array<Record<string, unknown>>;
        const delta = (choices[0]?.delta || {}) as Record<string, unknown>;
        const content = String(delta.content || '');
        if (content) yield content;
      } catch { /* skip malformed SSE lines */ }
    }
  }
}
