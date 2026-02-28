/**
 * 模型配置註冊表 — 集中管理所有 AI 模型的 provider、temperature、maxTokens
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
  // ── Google（指揮官級）──
  { id: 'gemini-3-flash-preview', label: '🔥 Gemini 3 Flash', provider: 'Google', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  { id: 'gemini-3-pro-preview', label: '🧠 Gemini 3 Pro', provider: 'Google', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  { id: 'gemini-2.5-flash', label: '⚡ Gemini 2.5 Flash', provider: 'Google', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'gemini-2.5-pro', label: '🏋️ Gemini 2.5 Pro', provider: 'Google', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  // ── Google（子代理級）──
  { id: 'gemini-2.5-flash-lite', label: '💨 Flash Lite 2.5', provider: 'Google', temperature: 0.85, maxOutputTokens: 8192, role: 'subagent' },
  // ── DeepSeek（指揮官級，temperature=1 官方建議）──
  { id: 'deepseek-chat', label: '🐋 DeepSeek V3', provider: 'DeepSeek', temperature: 1, maxOutputTokens: 8192, role: 'commander' },
  { id: 'deepseek-reasoner', label: '🧬 DeepSeek R1', provider: 'DeepSeek', temperature: 1, maxOutputTokens: 8192, role: 'commander' },
  // ── Kimi（指揮官級，K2 系列只接受 temperature=1）──
  { id: 'kimi-k2.5', label: '🌙 Kimi K2.5', provider: 'Kimi', temperature: 1, maxOutputTokens: 8192, role: 'commander' },
  { id: 'kimi-k2-turbo-preview', label: '🌀 Kimi K2 Turbo', provider: 'Kimi', temperature: 1, maxOutputTokens: 8192, role: 'commander' },
  // ── xAI（指揮官級）──
  { id: 'grok-4-1-fast', label: '🤖 Grok 4.1 Fast', provider: 'xAI', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  { id: 'grok-4-1-fast-reasoning', label: '🧩 Grok 4.1 Reasoning', provider: 'xAI', temperature: 0.85, maxOutputTokens: 16384, role: 'commander' },
  // ── OpenRouter 免費（指揮官級 — 大模型免費版）──
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', label: '🆓 Hermes 405B', provider: 'OpenRouter', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: '🆓 Llama 3.3 70B', provider: 'OpenRouter', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'qwen/qwen3-coder:free', label: '🆓 Qwen3 Coder', provider: 'OpenRouter', temperature: 0.85, maxOutputTokens: 8192, role: 'commander' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: '🆓 Mistral Small', provider: 'OpenRouter', temperature: 0.85, maxOutputTokens: 8192, role: 'subagent' },
  // ── Ollama 本地（子代理級 — 8B/14B 太弱不能指揮）──
  { id: 'qwen3:8b', label: '🖥️ Qwen3 8B', provider: 'Ollama', temperature: 0.85, maxOutputTokens: 4096, role: 'subagent' },
  { id: 'deepseek-r1:8b', label: '🖥️ DeepSeek R1 8B', provider: 'Ollama', temperature: 0.85, maxOutputTokens: 4096, role: 'subagent' },
  { id: 'qwen3:4b', label: '🖥️ Qwen3 4B', provider: 'Ollama', temperature: 0.85, maxOutputTokens: 4096, role: 'subagent' },
  { id: 'qwen2.5:14b', label: '🖥️ Qwen2.5 14B', provider: 'Ollama', temperature: 0.85, maxOutputTokens: 4096, role: 'subagent' },
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
export function getModelProvider(modelId: string): 'google' | 'kimi' | 'xai' | 'deepseek' | 'openrouter' | 'ollama' {
  // 先查 registry（最準確）
  const reg = MODEL_REGISTRY.find(m => m.id === modelId);
  if (reg) {
    const p = reg.provider.toLowerCase();
    if (p === 'google') return 'google';
    if (p === 'deepseek') return 'deepseek';
    if (p === 'kimi') return 'kimi';
    if (p === 'xai') return 'xai';
    if (p === 'openrouter') return 'openrouter';
    if (p === 'ollama') return 'ollama';
  }
  // fallback: 按 id prefix 判斷
  if (modelId.startsWith('kimi')) return 'kimi';
  if (modelId.startsWith('grok')) return 'xai';
  if (modelId.startsWith('deepseek') && !modelId.includes('/')) return 'deepseek';
  if (modelId.includes('/') && modelId.includes(':free')) return 'openrouter';
  if (modelId.startsWith('qwen') || modelId.startsWith('llama')) return 'ollama';
  return 'google';
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
