/**
 * 模型配置註冊表 — 集中管理所有 AI 模型的 provider、temperature、maxTokens
 */

import fs from 'node:fs';
import path from 'node:path';

export interface ModelConfig {
  id: string;
  label: string;
  provider: string;
  temperature: number;
  maxOutputTokens: number;
}

export const MODEL_REGISTRY: ModelConfig[] = [
  // Google
  { id: 'gemini-2.5-flash', label: '⚡ Gemini 2.5 Flash', provider: 'Google', temperature: 0.85, maxOutputTokens: 8192 },
  { id: 'gemini-2.5-flash-lite', label: '💨 Gemini 2.5 Flash Lite', provider: 'Google', temperature: 0.85, maxOutputTokens: 8192 },
  { id: 'gemini-3-flash-preview', label: '🔥 Gemini 3 Flash', provider: 'Google', temperature: 0.85, maxOutputTokens: 8192 },
  { id: 'gemini-3-pro-preview', label: '🧠 Gemini 3 Pro', provider: 'Google', temperature: 0.85, maxOutputTokens: 8192 },
  { id: 'gemini-2.5-pro', label: '🏋️ Gemini 2.5 Pro', provider: 'Google', temperature: 0.85, maxOutputTokens: 8192 },
  { id: 'gemini-2.0-flash-lite', label: '⚙️ Gemini 2 Flash Lite', provider: 'Google', temperature: 0.85, maxOutputTokens: 8192 },
  // Kimi（K2 系列只接受 temperature=1）
  { id: 'kimi-k2.5', label: '🌙 Kimi K2.5', provider: 'Kimi', temperature: 1, maxOutputTokens: 8192 },
  { id: 'kimi-k2-turbo-preview', label: '🌀 Kimi K2 Turbo', provider: 'Kimi', temperature: 1, maxOutputTokens: 8192 },
  // xAI
  { id: 'grok-4-1-fast', label: '🤖 Grok 4.1 Fast', provider: 'xAI', temperature: 0.85, maxOutputTokens: 8192 },
  { id: 'grok-4-1-fast-reasoning', label: '🧩 Grok 4.1 Reasoning', provider: 'xAI', temperature: 0.85, maxOutputTokens: 8192 },
];

/** 查詢模型配置，找不到就用預設值 */
export function getModelConfig(modelId: string): ModelConfig {
  return MODEL_REGISTRY.find(m => m.id === modelId) || {
    id: modelId, label: modelId, provider: 'Google', temperature: 0.85, maxOutputTokens: 8192,
  };
}

/** 取得所有可用模型清單 */
export function getAvailableModels(): Array<{ id: string; label: string; provider: string }> {
  return MODEL_REGISTRY.map(m => ({ id: m.id, label: m.label, provider: m.provider }));
}

/** 從 openclaw.json 讀取 provider API key */
export function getProviderKey(provider: 'kimi' | 'xai'): string {
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
export function getModelProvider(modelId: string): 'google' | 'kimi' | 'xai' {
  if (modelId.startsWith('kimi')) return 'kimi';
  if (modelId.startsWith('grok')) return 'xai';
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
