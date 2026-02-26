/**
 * FADP — 聯盟協防協議 前端 API 服務
 */

import { dataConfig } from './config';

const base = dataConfig.apiBaseUrl.replace(/\/$/, '');
const apiKey =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env?.VITE_OPENCLAW_API_KEY === 'string'
    ? import.meta.env.VITE_OPENCLAW_API_KEY.trim()
    : '';

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
    ...(opts.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${base}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── 類型定義 ───

export interface FadpMember {
  id: string;
  node_id: string;
  node_type: 'local' | 'remote';
  label: string | null;
  endpoint_url: string | null;
  status: 'pending_challenge' | 'pending_owner_approval' | 'active' | 'suspended' | 'rejected';
  trust_score: number;
  joined_at: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface FadpAttackEvent {
  id: string;
  reporter_node_id: string;
  attack_type: 'ddos' | 'malicious_postmessage' | 'api_key_forgery' | 'task_injection' | 'self_defense';
  severity: 'low' | 'medium' | 'high' | 'critical';
  attacker_ip: string | null;
  attacker_token_hint: string | null;
  description: string | null;
  ttl: number;
  created_at: string;
}

export interface FadpBlocklistEntry {
  id: string;
  block_type: 'ip' | 'token_hint' | 'node_id';
  block_value: string;
  consensus_type: 'auto' | 'manual' | 'broadcast';
  status: 'active' | 'expired' | 'revoked';
  expires_at: string | null;
  enforcement_count: number;
  created_at: string;
}

export interface FadpStatus {
  ok: boolean;
  status: string;
  hotBlocklistSize: number;
  hotTokenBlocklistSize: number;
  totalMembers: number;
  activeMembers: number;
  timestamp: string;
}

// ─── Group A：成員管理 ───

export async function getFedMembers(): Promise<FadpMember[]> {
  const res = await apiFetch<{ ok: boolean; members: FadpMember[] }>('/api/federation/members');
  return res.members;
}

export async function suspendMember(nodeId: string): Promise<void> {
  await apiFetch(`/api/federation/members/${encodeURIComponent(nodeId)}`, { method: 'DELETE' });
}

// ─── Group B：握手流程（節點端使用）───

export interface HandshakeInitPayload {
  node_id: string;
  node_type: 'local' | 'remote';
  label?: string;
  endpoint_url?: string;
  public_key: string;
}

export async function handshakeInit(payload: HandshakeInitPayload): Promise<{ challenge: string; expires_in: number }> {
  const res = await apiFetch<{ ok: boolean; challenge: string; expires_in: number; instructions: string }>(
    '/api/federation/handshake/init',
    { method: 'POST', body: JSON.stringify(payload) }
  );
  return { challenge: res.challenge, expires_in: res.expires_in };
}

export async function handshakeRespond(nodeId: string, signature: string): Promise<{ status: string }> {
  const res = await apiFetch<{ ok: boolean; status: string; message: string }>(
    '/api/federation/handshake/respond',
    { method: 'POST', body: JSON.stringify({ node_id: nodeId, signature }) }
  );
  return { status: res.status };
}

// ─── Group C：攻擊廣播 ───

export interface BroadcastAttackPayload {
  attack_type: FadpAttackEvent['attack_type'];
  severity: FadpAttackEvent['severity'];
  attacker_ip?: string;
  attacker_token_hint?: string;
  description?: string;
  fadpKey: string; // x-fadp-key
}

export async function broadcastAttack(payload: BroadcastAttackPayload): Promise<{ event_id: string; auto_blocked: boolean }> {
  const { fadpKey, ...body } = payload;
  const res = await apiFetch<{ ok: boolean; event_id: string; auto_blocked: boolean }>(
    '/api/federation/attack/broadcast',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'x-fadp-key': fadpKey },
    }
  );
  return { event_id: res.event_id, auto_blocked: res.auto_blocked };
}

export async function getAttackEvents(limit = 50, severity?: string): Promise<FadpAttackEvent[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (severity) params.set('severity', severity);
  const res = await apiFetch<{ ok: boolean; events: FadpAttackEvent[] }>(
    `/api/federation/attack/events?${params}`
  );
  return res.events;
}

// ─── Group D：封鎖清單 ───

export interface FadpBlocklistResponse {
  blocklist: FadpBlocklistEntry[];
  hot: { ips: string[]; tokens: string[] };
}

export async function getBlocklist(): Promise<FadpBlocklistResponse> {
  const res = await apiFetch<{ ok: boolean } & FadpBlocklistResponse>('/api/federation/blocklist');
  return { blocklist: res.blocklist, hot: res.hot };
}

export async function addBlocklistEntry(
  blockType: 'ip' | 'token_hint' | 'node_id',
  blockValue: string,
  expiresHours = 24
): Promise<void> {
  await apiFetch('/api/federation/blocklist', {
    method: 'POST',
    body: JSON.stringify({ block_type: blockType, block_value: blockValue, expires_hours: expiresHours }),
  });
}

export async function removeBlocklistEntry(id: string): Promise<void> {
  await apiFetch(`/api/federation/blocklist/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ─── 狀態 ───

export async function getFedStatus(): Promise<FadpStatus> {
  return apiFetch<FadpStatus>('/api/federation/status');
}
