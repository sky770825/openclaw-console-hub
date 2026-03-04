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
  { id: 'gemini-3-pro-preview', label: '🧠 Gemini 3 Pro', provider: 'Google', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  { id: 'claude-opus-4-6', label: '🚨 Claude Opus 4.6', provider: 'Anthropic', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'claude-sonnet-4-6', label: '💎 Claude Sonnet 4.6', provider: 'Anthropic', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'claude-haiku-4-5-20251001', label: '⚡ Claude Haiku 4.5', provider: 'Anthropic', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  // ══════════════════════════════════════════
  // 子代理級（ask_ai 可派遣，全部免費/訂閱制）
  // 訂閱制 CLI：Claude Code、Codex、Cursor（不花 API 錢）
  // 免費額度：Gemini Lite、OpenRouter :free
  // 其他：xAI、Kimi、DeepSeek
  // ══════════════════════════════════════════
  // ── 訂閱制 CLI（Claude Code / Codex / Cursor）——可當指揮官 + 子代理 ──
  { id: 'claude-opus-cli', label: '🏆 Claude Opus (CLI 訂閱)', provider: 'Claude-CLI', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  { id: 'claude-sonnet-cli', label: '💎 Claude Sonnet (CLI 訂閱)', provider: 'Claude-CLI', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'claude-haiku-cli', label: '⚡ Claude Haiku (CLI 訂閱)', provider: 'Claude-CLI', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'codex-mini', label: '📦 Codex Mini (CLI)', provider: 'OpenAI-CLI', temperature: 0.85, maxOutputTokens: 8192, role: 'subagent' },
  // ── Google 免費額度 ──
  { id: 'gemini-2.5-flash-lite', label: '💨 Flash Lite 2.5', provider: 'Google', temperature: 0.85, maxOutputTokens: 8192, role: 'subagent' },
  // ── DeepSeek ──
  { id: 'deepseek-chat', label: '🐋 DeepSeek V3', provider: 'DeepSeek', temperature: 1, maxOutputTokens: 8192, role: 'subagent' },
  { id: 'deepseek-reasoner', label: '🧬 DeepSeek R1', provider: 'DeepSeek', temperature: 1, maxOutputTokens: 8192, role: 'subagent' },
  // ── Kimi ──
  { id: 'kimi-k2.5', label: '🌙 Kimi K2.5', provider: 'Kimi', temperature: 1, maxOutputTokens: 8192, role: 'subagent' },
  { id: 'kimi-k2-turbo-preview', label: '🌀 Kimi K2 Turbo', provider: 'Kimi', temperature: 1, maxOutputTokens: 8192, role: 'subagent' },
  // ── xAI ──
  { id: 'grok-4-1-fast', label: '🤖 Grok 4.1 Fast', provider: 'xAI', temperature: 0.85, maxOutputTokens: 16384, role: 'subagent' },
  { id: 'grok-4-1-fast-reasoning', label: '🧩 Grok 4.1 Reasoning', provider: 'xAI', temperature: 0.85, maxOutputTokens: 16384, role: 'subagent' },
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
export function getModelProvider(modelId: string): 'google' | 'anthropic' | 'claude-cli' | 'kimi' | 'xai' | 'deepseek' | 'openrouter' {
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
  }
  // fallback: 按 id prefix 判斷
  if (modelId.endsWith('-cli')) return 'claude-cli';
  if (modelId.startsWith('claude')) return 'anthropic';
  if (modelId.startsWith('kimi')) return 'kimi';
  if (modelId.startsWith('grok')) return 'xai';
  if (modelId.startsWith('deepseek') && !modelId.includes('/')) return 'deepseek';
  if (modelId.includes('/') && modelId.includes(':free')) return 'openrouter';
  return 'google';
}

/** 呼叫 Anthropic API（Claude 系列） */
export async function callAnthropic(
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
    max_tokens: maxTokens,
    temperature: cfg.temperature,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content })),
  };
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Anthropic HTTP ${resp.status}: ${errText.slice(0, 300)}`);
  }
  const data = await resp.json() as Record<string, unknown>;
  const content = (data.content || []) as Array<Record<string, unknown>>;
  return content.filter(c => c.type === 'text').map(c => String(c.text || '')).join('').trim();
}

/** 呼叫 OpenAI 相容 API（Kimi / xAI） */
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
