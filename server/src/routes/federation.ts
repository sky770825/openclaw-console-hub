/**
 * FADP — AI Agent 聯盟協防協議 (Federation Alliance Defense Protocol)
 *
 * Group A: 成員管理 (admin)
 * Group B: 握手流程 (handshake)
 * Group C: 攻擊廣播 (attack)
 * Group D: 封鎖清單 (blocklist)
 * Group E: 本地防護掛鉤 (local defense)
 * Group F: Webhook 接收器 (webhook receiver)
 */

import { Router, type Request, type Response } from 'express';
import { createLogger } from '../logger.js';
import { hasSupabase, supabase } from '../supabase.js';
import {
  generateChallenge,
  generateFederationApiKey,
  hashApiKey,
  verifyHmacSha256,
  verifyBroadcastSignature,
  signBroadcast,
} from '../utils/federationCrypto.js';
import {
  federationStore,
  blockIpHot,
  blockTokenHot,
  unblockIpHot,
  unblockTokenHot,
  extractClientIp,
} from '../middlewares/federationBlocker.js';
import { sendTelegramMessage } from '../utils/telegram.js';
import { wsManager } from '../websocket.js';
import type { Task } from '../types.js';

const log = createLogger('federation');
const router = Router();

// FADP challenge TTL（5 分鐘）
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
// 封鎖清單預設 TTL（24 小時）
const BLOCKLIST_TTL_MS = 24 * 60 * 60 * 1000;
// 廣播最大 TTL（防止 loop 轉傳超過 3 跳）
const MAX_BROADCAST_TTL = 3;
// 信任分數低於此值自動暫停
const MIN_TRUST_SCORE = 50;

// ─── 惡意任務注入關鍵字（用於 fadpScanTask）───
const MALICIOUS_TASK_PATTERNS = [
  /drop\s+table/i,
  /delete\s+from/i,
  /exec\s*\(/i,
  /system\s*\(/i,
  /eval\s*\(/i,
  /rm\s+-rf/i,
  /format\s+c:/i,
  /__import__/i,
  /subprocess\.call/i,
  /os\.system/i,
  /curl.*\|\s*(bash|sh)/i,
  /wget.*\|\s*(bash|sh)/i,
  /base64.*decode.*exec/i,
];

// ─── 類型定義 ───

interface FadpMember {
  id: string;
  node_id: string;
  node_type: 'local' | 'remote';
  label: string | null;
  endpoint_url: string | null;
  public_key: string;
  api_key_hash: string | null;
  status: 'pending_challenge' | 'pending_owner_approval' | 'active' | 'suspended' | 'rejected';
  trust_score: number;
  handshake_challenge: string | null;
  challenge_expires_at: string | null;
  joined_at: string | null;
  last_seen_at: string | null;
  created_at: string;
}

interface FadpAttackEvent {
  id: string;
  reporter_node_id: string;
  attack_type: 'ddos' | 'malicious_postmessage' | 'api_key_forgery' | 'task_injection' | 'self_defense';
  severity: 'low' | 'medium' | 'high' | 'critical';
  attacker_ip: string | null;
  attacker_token_hint: string | null;
  description: string | null;
  broadcast_signature: string | null;
  ttl: number;
  votes: Record<string, unknown>;
  created_at: string;
}

// ─── 輔助函式 ───

function requireSupabase(res: Response): boolean {
  if (!hasSupabase() || !supabase) {
    res.status(503).json({ ok: false, message: 'Supabase 未連線，FADP 功能不可用' });
    return false;
  }
  return true;
}

async function verifyFederationApiKey(req: Request): Promise<FadpMember | null> {
  const apiKey = (req.headers['x-fadp-key'] as string | undefined) || '';
  if (!apiKey.startsWith('fadp_')) return null;
  const keyHash = hashApiKey(apiKey);

  if (!hasSupabase() || !supabase) return null;
  const { data } = await supabase
    .from('fadp_members')
    .select('*')
    .eq('api_key_hash', keyHash)
    .eq('status', 'active')
    .maybeSingle();

  if (!data) return null;

  // 更新 last_seen_at
  await supabase
    .from('fadp_members')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', data.id);

  return data as FadpMember;
}

// ─── Group A：成員管理（admin）───

/**
 * GET /api/federation/members
 * 列出所有聯盟成員（管理員用）
 */
router.get('/members', async (req, res) => {
  if (!requireSupabase(res)) return;

  const { data, error } = await supabase!
    .from('fadp_members')
    .select('id, node_id, node_type, label, endpoint_url, status, trust_score, joined_at, last_seen_at, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ ok: false, message: error.message });
    return;
  }

  res.json({ ok: true, members: data || [] });
});

/**
 * GET /api/federation/members/:nodeId
 * 取得單一成員詳細資訊
 */
router.get('/members/:nodeId', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { nodeId } = req.params;

  const { data, error } = await supabase!
    .from('fadp_members')
    .select('id, node_id, node_type, label, endpoint_url, status, trust_score, joined_at, last_seen_at, created_at')
    .eq('node_id', nodeId)
    .maybeSingle();

  if (error || !data) {
    res.status(404).json({ ok: false, message: '成員不存在' });
    return;
  }

  res.json({ ok: true, member: data });
});

/**
 * DELETE /api/federation/members/:nodeId
 * 踢出成員（設為 suspended）
 */
router.delete('/members/:nodeId', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { nodeId } = req.params;

  const { data: member } = await supabase!
    .from('fadp_members')
    .select('id, node_id, api_key_hash')
    .eq('node_id', nodeId)
    .maybeSingle();

  if (!member) {
    res.status(404).json({ ok: false, message: '成員不存在' });
    return;
  }

  await supabase!
    .from('fadp_members')
    .update({ status: 'suspended' })
    .eq('node_id', nodeId);

  // 廣播成員被踢出事件
  wsManager.broadcast({
    type: 'fadp:member_suspended',
    nodeId,
    timestamp: new Date().toISOString(),
  });

  log.info(`[FADP] 成員 ${nodeId} 已被踢出`);
  res.json({ ok: true, message: `成員 ${nodeId} 已暫停` });
});

// ─── Group B：握手流程 ───

/**
 * POST /api/federation/handshake/init
 * 外部節點申請加入聯盟，發放 challenge
 * Body: { node_id, node_type, label?, endpoint_url?, public_key }
 */
router.post('/handshake/init', async (req, res) => {
  if (!requireSupabase(res)) return;

  const { node_id, node_type, label, endpoint_url, public_key } = req.body as {
    node_id?: string;
    node_type?: string;
    label?: string;
    endpoint_url?: string;
    public_key?: string;
  };

  if (!node_id || !node_type || !public_key) {
    res.status(400).json({ ok: false, message: '缺少必填欄位: node_id, node_type, public_key' });
    return;
  }

  if (node_type !== 'local' && node_type !== 'remote') {
    res.status(400).json({ ok: false, message: 'node_type 必須為 local 或 remote' });
    return;
  }

  const challenge = generateChallenge();
  const challengeExpiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const clientIp = extractClientIp(req);

  // Upsert 成員記錄（允許重新握手）
  const { error } = await supabase!
    .from('fadp_members')
    .upsert({
      node_id,
      node_type,
      label: label || null,
      endpoint_url: endpoint_url || null,
      public_key,
      status: 'pending_challenge',
      handshake_challenge: challenge,
      challenge_expires_at: challengeExpiresAt,
    }, { onConflict: 'node_id' });

  if (error) {
    res.status(500).json({ ok: false, message: error.message });
    return;
  }

  // 記錄握手日誌
  await supabase!.from('fadp_handshake_log').insert({
    node_id,
    step: 'challenge_issued',
    challenge,
    ip: clientIp,
  });

  log.info(`[FADP] 握手 challenge 已發送給節點 ${node_id} (${node_type})`);

  res.json({
    ok: true,
    challenge,
    expires_in: Math.floor(CHALLENGE_TTL_MS / 1000),
    instructions: '請用你的 public_key 對應私鑰，對 challenge 字串做 HMAC-SHA256 簽章（secret = public_key 前 32 chars），回傳至 /handshake/respond',
  });
});

/**
 * POST /api/federation/handshake/respond
 * 外部節點提交簽章，等待老蔡審核
 * Body: { node_id, signature }
 */
router.post('/handshake/respond', async (req, res) => {
  if (!requireSupabase(res)) return;

  const { node_id, signature } = req.body as { node_id?: string; signature?: string };

  if (!node_id || !signature) {
    res.status(400).json({ ok: false, message: '缺少必填欄位: node_id, signature' });
    return;
  }

  const { data: member } = await supabase!
    .from('fadp_members')
    .select('*')
    .eq('node_id', node_id)
    .eq('status', 'pending_challenge')
    .maybeSingle() as { data: FadpMember | null };

  if (!member) {
    res.status(404).json({ ok: false, message: '找不到等待驗證的節點，請先呼叫 /handshake/init' });
    return;
  }

  // 檢查 challenge 是否過期
  if (member.challenge_expires_at && new Date(member.challenge_expires_at) < new Date()) {
    res.status(400).json({ ok: false, message: 'Challenge 已過期，請重新呼叫 /handshake/init' });
    return;
  }

  const challenge = member.handshake_challenge!;
  const sharedSecret = member.public_key.slice(0, 32);
  const isValid = verifyHmacSha256(sharedSecret, challenge, signature);

  if (!isValid) {
    // 記錄失敗
    await supabase!.from('fadp_handshake_log').insert({
      node_id,
      step: 'signature_failed',
      challenge,
      response_hash: signature.slice(0, 16) + '...',
    });
    res.status(403).json({ ok: false, message: '簽章驗證失敗' });
    return;
  }

  // 簽章驗證通過 → 等待老蔡審核
  await supabase!
    .from('fadp_members')
    .update({ status: 'pending_owner_approval', handshake_challenge: null })
    .eq('node_id', node_id);

  await supabase!.from('fadp_handshake_log').insert({
    node_id,
    step: 'signature_verified_pending_approval',
    response_hash: hashApiKey(signature).slice(0, 16),
  });

  // 通知老蔡（Telegram）
  const nodeLabel = member.label || node_id;
  const approveUrl = `${process.env.OPENCLAW_API_BASE || 'http://localhost:3011'}/api/federation/handshake/approve/${node_id}?token=${process.env.FADP_ADMIN_TOKEN || 'change-me'}`;
  const rejectUrl = `${process.env.OPENCLAW_API_BASE || 'http://localhost:3011'}/api/federation/handshake/reject/${node_id}?token=${process.env.FADP_ADMIN_TOKEN || 'change-me'}`;

  await sendTelegramMessage(
    `🤝 <b>新節點申請加入聯盟協防</b>\n\n` +
    `<b>節點：</b>${nodeLabel}\n` +
    `<b>類型：</b>${member.node_type}\n` +
    `<b>端點：</b>${member.endpoint_url || '本地節點'}\n\n` +
    `簽章驗證 ✅ 通過，請老蔡決定是否批准：\n` +
    `✅ 批准：<a href="${approveUrl}">點此批准</a>\n` +
    `❌ 拒絕：<a href="${rejectUrl}">點此拒絕</a>`,
    { parseMode: 'HTML' }
  );

  log.info(`[FADP] 節點 ${node_id} 簽章驗證通過，等待老蔡審核`);
  res.json({
    ok: true,
    status: 'pending_owner_approval',
    message: '簽章驗證通過！等待管理員審核，審核後將發放聯盟 API Key',
  });
});

/**
 * GET /api/federation/handshake/approve/:nodeId
 * 老蔡批准節點加入（透過 Telegram 連結觸發）
 * Query: ?token=FADP_ADMIN_TOKEN
 */
router.get('/handshake/approve/:nodeId', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { nodeId } = req.params;
  const { token } = req.query as { token?: string };

  const adminToken = process.env.FADP_ADMIN_TOKEN || 'change-me';
  if (token !== adminToken) {
    res.status(403).json({ ok: false, message: '無效的管理員 token' });
    return;
  }

  const { data: member } = await supabase!
    .from('fadp_members')
    .select('*')
    .eq('node_id', nodeId)
    .maybeSingle() as { data: FadpMember | null };

  if (!member) {
    res.status(404).json({ ok: false, message: '成員不存在' });
    return;
  }

  if (member.status !== 'pending_owner_approval') {
    res.status(400).json({ ok: false, message: `成員狀態為 ${member.status}，無法批准` });
    return;
  }

  const federationApiKey = generateFederationApiKey();
  const keyHash = hashApiKey(federationApiKey);
  const now = new Date().toISOString();

  await supabase!
    .from('fadp_members')
    .update({
      status: 'active',
      api_key_hash: keyHash,
      joined_at: now,
      last_seen_at: now,
      trust_score: 100,
    })
    .eq('node_id', nodeId);

  await supabase!.from('fadp_handshake_log').insert({
    node_id: nodeId,
    step: 'approved',
  });

  // 廣播新成員加入
  wsManager.broadcast({
    type: 'fadp:member_joined',
    nodeId,
    label: member.label,
    nodeType: member.node_type,
    timestamp: now,
  });

  // 通知 Telegram
  await sendTelegramMessage(
    `✅ <b>聯盟成員批准成功</b>\n\n` +
    `<b>節點：</b>${member.label || nodeId}\n` +
    `<b>類型：</b>${member.node_type}\n` +
    `<b>加入時間：</b>${now.slice(0, 19).replace('T', ' ')} UTC\n\n` +
    `API Key 已發放（請透過安全通道告知節點）`,
    { parseMode: 'HTML' }
  );

  log.info(`[FADP] ✅ 節點 ${nodeId} 已批准加入聯盟`);

  // 回傳 HTML 方便老蔡直接在瀏覽器操作
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <html><body style="font-family:sans-serif;padding:2rem;background:#0a0a0a;color:#00ff88">
      <h2>✅ 節點 ${nodeId} 已批准加入聯盟</h2>
      <p>聯盟 API Key（請安全傳遞給節點）：</p>
      <code style="background:#111;padding:0.5rem;border-radius:4px;display:block;word-break:break-all">${federationApiKey}</code>
      <p style="margin-top:1rem;color:#666">此頁面關閉後 API Key 將無法再次取得</p>
    </body></html>
  `);
});

/**
 * GET /api/federation/handshake/reject/:nodeId
 * 老蔡拒絕節點加入
 */
router.get('/handshake/reject/:nodeId', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { nodeId } = req.params;
  const { token } = req.query as { token?: string };

  const adminToken = process.env.FADP_ADMIN_TOKEN || 'change-me';
  if (token !== adminToken) {
    res.status(403).json({ ok: false, message: '無效的管理員 token' });
    return;
  }

  await supabase!
    .from('fadp_members')
    .update({ status: 'rejected' })
    .eq('node_id', nodeId);

  await supabase!.from('fadp_handshake_log').insert({
    node_id: nodeId,
    step: 'rejected',
  });

  log.info(`[FADP] ❌ 節點 ${nodeId} 被拒絕加入聯盟`);

  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <html><body style="font-family:sans-serif;padding:2rem;background:#0a0a0a;color:#ff4444">
      <h2>❌ 節點 ${nodeId} 已被拒絕</h2>
    </body></html>
  `);
});

// ─── Group C：攻擊廣播 ───

/**
 * POST /api/federation/attack/broadcast
 * 聯盟成員廣播攻擊事件
 * Header: x-fadp-key: fadp_...
 * Body: { attack_type, severity, attacker_ip?, attacker_token_hint?, description? }
 */
router.post('/attack/broadcast', async (req, res) => {
  if (!requireSupabase(res)) return;

  const reporter = await verifyFederationApiKey(req);
  if (!reporter) {
    res.status(401).json({ ok: false, message: '需要有效的聯盟 API Key (x-fadp-key)' });
    return;
  }

  const {
    attack_type,
    severity,
    attacker_ip,
    attacker_token_hint,
    description,
  } = req.body as {
    attack_type?: string;
    severity?: string;
    attacker_ip?: string;
    attacker_token_hint?: string;
    description?: string;
  };

  const validAttackTypes = ['ddos', 'malicious_postmessage', 'api_key_forgery', 'task_injection', 'self_defense'];
  const validSeverities = ['low', 'medium', 'high', 'critical'];

  if (!attack_type || !validAttackTypes.includes(attack_type)) {
    res.status(400).json({ ok: false, message: `attack_type 必須為: ${validAttackTypes.join(', ')}` });
    return;
  }
  if (!severity || !validSeverities.includes(severity)) {
    res.status(400).json({ ok: false, message: `severity 必須為: ${validSeverities.join(', ')}` });
    return;
  }

  const payload = JSON.stringify({ reporter_node_id: reporter.node_id, attack_type, severity, attacker_ip, ts: Date.now() });
  const broadcastSignature = signBroadcast(payload, federationStore.broadcastSigningKey);

  const { data: event, error } = await supabase!
    .from('fadp_attack_events')
    .insert({
      reporter_node_id: reporter.node_id,
      attack_type,
      severity,
      attacker_ip: attacker_ip || null,
      attacker_token_hint: attacker_token_hint || null,
      description: description || null,
      broadcast_signature: broadcastSignature,
      ttl: MAX_BROADCAST_TTL,
      votes: { [reporter.node_id]: true },
    })
    .select()
    .single();

  if (error || !event) {
    res.status(500).json({ ok: false, message: error?.message || '建立攻擊事件失敗' });
    return;
  }

  // 根據嚴重程度決定是否立即封鎖
  if ((severity === 'high' || severity === 'critical') && attacker_ip) {
    // 高嚴重度：自動封鎖並寫入 DB
    await addToBlocklist('ip', attacker_ip, event.id, 'broadcast');
    blockIpHot(attacker_ip);
  }
  if ((severity === 'high' || severity === 'critical') && attacker_token_hint) {
    await addToBlocklist('token_hint', attacker_token_hint, event.id, 'broadcast');
    blockTokenHot(attacker_token_hint);
  }

  // WebSocket 廣播到前端
  wsManager.broadcast({
    type: 'fadp:attack',
    event: {
      id: event.id,
      reporter_node_id: reporter.node_id,
      attack_type,
      severity,
      attacker_ip,
      description,
      created_at: event.created_at,
    },
    timestamp: new Date().toISOString(),
  });

  // Telegram 通知（critical 攻擊才通知，避免噪音）
  if (severity === 'critical') {
    await sendTelegramMessage(
      `🚨 <b>聯盟協防警報</b>\n\n` +
      `<b>來源：</b>${reporter.label || reporter.node_id}\n` +
      `<b>攻擊類型：</b>${attack_type}\n` +
      `<b>嚴重程度：</b>${severity}\n` +
      `<b>攻擊 IP：</b>${attacker_ip || '未知'}\n` +
      `<b>說明：</b>${(description || '').slice(0, 200)}\n\n` +
      `已自動封鎖，廣播給所有聯盟成員`,
      { parseMode: 'HTML' }
    );
  }

  log.info(`[FADP] 攻擊廣播: ${reporter.node_id} 回報 ${attack_type} (${severity}), attacker: ${attacker_ip}`);
  res.json({ ok: true, event_id: event.id, auto_blocked: severity === 'high' || severity === 'critical' });
});

/**
 * GET /api/federation/attack/events
 * 列出攻擊事件記錄
 */
router.get('/attack/events', async (req, res) => {
  if (!requireSupabase(res)) return;

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const severity = req.query.severity as string | undefined;

  let query = supabase!
    .from('fadp_attack_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (severity) {
    query = query.eq('severity', severity);
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ ok: false, message: error.message });
    return;
  }

  res.json({ ok: true, events: data || [] });
});

// ─── Group D：封鎖清單 ───

/**
 * GET /api/federation/blocklist
 * 取得封鎖清單
 */
router.get('/blocklist', async (req, res) => {
  if (!requireSupabase(res)) return;

  const { data, error } = await supabase!
    .from('fadp_blocklist')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    res.status(500).json({ ok: false, message: error.message });
    return;
  }

  res.json({
    ok: true,
    blocklist: data || [],
    hot: {
      ips: Array.from(federationStore.hotBlocklist),
      tokens: Array.from(federationStore.hotTokenBlocklist),
    },
  });
});

/**
 * POST /api/federation/blocklist
 * 手動加入封鎖（admin）
 * Body: { block_type, block_value, expires_hours? }
 */
router.post('/blocklist', async (req, res) => {
  if (!requireSupabase(res)) return;

  const { block_type, block_value, expires_hours = 24 } = req.body as {
    block_type?: string;
    block_value?: string;
    expires_hours?: number;
  };

  if (!block_type || !block_value) {
    res.status(400).json({ ok: false, message: '缺少 block_type 或 block_value' });
    return;
  }

  const validTypes = ['ip', 'token_hint', 'node_id'];
  if (!validTypes.includes(block_type)) {
    res.status(400).json({ ok: false, message: `block_type 必須為: ${validTypes.join(', ')}` });
    return;
  }

  const expiresAt = new Date(Date.now() + expires_hours * 60 * 60 * 1000).toISOString();
  await addToBlocklist(block_type as 'ip' | 'token_hint' | 'node_id', block_value, null, 'manual', expiresAt);

  // 同步到熱封鎖清單
  if (block_type === 'ip') blockIpHot(block_value);
  if (block_type === 'token_hint') blockTokenHot(block_value);

  wsManager.broadcast({
    type: 'fadp:blocklist_update',
    action: 'add',
    block_type,
    block_value,
    timestamp: new Date().toISOString(),
  });

  res.json({ ok: true, message: `已封鎖 ${block_type}: ${block_value}` });
});

/**
 * DELETE /api/federation/blocklist/:id
 * 解除封鎖（admin）
 */
router.delete('/blocklist/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { id } = req.params;

  const { data: entry } = await supabase!
    .from('fadp_blocklist')
    .select('block_type, block_value')
    .eq('id', id)
    .maybeSingle();

  if (!entry) {
    res.status(404).json({ ok: false, message: '封鎖記錄不存在' });
    return;
  }

  await supabase!
    .from('fadp_blocklist')
    .update({ status: 'revoked' })
    .eq('id', id);

  // 從熱封鎖清單移除
  if (entry.block_type === 'ip') unblockIpHot(entry.block_value);
  if (entry.block_type === 'token_hint') unblockTokenHot(entry.block_value);

  wsManager.broadcast({
    type: 'fadp:blocklist_update',
    action: 'remove',
    block_type: entry.block_type,
    block_value: entry.block_value,
    timestamp: new Date().toISOString(),
  });

  res.json({ ok: true, message: `已解除封鎖 ${entry.block_type}: ${entry.block_value}` });
});

// ─── Group E：本地防護掛鉤（供 auto-executor 呼叫）───

/**
 * 掃描任務是否含惡意注入關鍵字
 * 供 auto-executor.ts dispatchTask() 在執行前呼叫
 */
export async function fadpScanTask(task: Task): Promise<{ isMalicious: boolean; reason?: string }> {
  const searchText = `${task.name || ''} ${task.description || ''} ${JSON.stringify(task.runCommands || [])}`;

  for (const pattern of MALICIOUS_TASK_PATTERNS) {
    if (pattern.test(searchText)) {
      const reason = `偵測到惡意關鍵字 pattern: ${pattern.source}`;
      log.warn(`[FADP] 🚫 惡意任務注入偵測: 任務「${task.name}」匹配 ${pattern.source}`);

      // 自動廣播攻擊事件（非同步，不阻塞任務判斷）
      if (hasSupabase() && supabase) {
        void supabase.from('fadp_attack_events').insert({
          reporter_node_id: 'openclaw-local',
          attack_type: 'task_injection',
          severity: 'high',
          description: `任務「${task.name}」(${task.id}) 含惡意 pattern: ${pattern.source}`,
          broadcast_signature: null,
          ttl: MAX_BROADCAST_TTL,
          votes: { 'openclaw-local': true },
        });
        wsManager.broadcast({
          type: 'fadp:attack',
          event: {
            reporter_node_id: 'openclaw-local',
            attack_type: 'task_injection',
            severity: 'high',
            description: reason,
            created_at: new Date().toISOString(),
          },
        });
      }

      return { isMalicious: true, reason };
    }
  }

  return { isMalicious: false };
}

/**
 * 檢查 IP 是否在封鎖清單中（O(1)）
 */
export function fadpCheckIp(ip: string): boolean {
  return federationStore.hotBlocklist.has(ip);
}

// ─── Group F：Webhook 接收器 ───

/**
 * POST /api/federation/webhook
 * 接收其他聯盟成員推送的攻擊廣播
 * Header: x-fadp-key: fadp_...
 * Header: x-fadp-signature: <HMAC-SHA256 of body>
 * Body: 攻擊事件 JSON
 */
router.post('/webhook', async (req, res) => {
  if (!requireSupabase(res)) return;

  const reporter = await verifyFederationApiKey(req);
  if (!reporter) {
    res.status(401).json({ ok: false, message: '需要有效的聯盟 API Key (x-fadp-key)' });
    return;
  }

  const signature = req.headers['x-fadp-signature'] as string | undefined;
  const bodyStr = JSON.stringify(req.body);

  // 驗證廣播簽章
  if (signature) {
    const isValid = verifyBroadcastSignature(bodyStr, signature, federationStore.broadcastSigningKey);
    if (!isValid) {
      // 信任分數扣分
      await supabase!
        .from('fadp_members')
        .update({ trust_score: supabase!.rpc('decrement_trust', { amount: 5 }) as never })
        .eq('node_id', reporter.node_id);

      res.status(403).json({ ok: false, message: '廣播簽章驗證失敗' });
      return;
    }
  }

  const {
    attack_type,
    severity,
    attacker_ip,
    attacker_token_hint,
    description,
    ttl = 0,
  } = req.body as {
    attack_type?: string;
    severity?: string;
    attacker_ip?: string;
    attacker_token_hint?: string;
    description?: string;
    ttl?: number;
  };

  if (!attack_type || !severity) {
    res.status(400).json({ ok: false, message: '缺少 attack_type 或 severity' });
    return;
  }

  // TTL 耗盡，停止轉傳
  if (ttl <= 0) {
    res.json({ ok: true, message: 'TTL 耗盡，不再轉傳' });
    return;
  }

  // 套用封鎖
  if ((severity === 'high' || severity === 'critical') && attacker_ip) {
    await addToBlocklist('ip', attacker_ip, null, 'broadcast');
    blockIpHot(attacker_ip);
  }
  if ((severity === 'high' || severity === 'critical') && attacker_token_hint) {
    await addToBlocklist('token_hint', attacker_token_hint, null, 'broadcast');
    blockTokenHot(attacker_token_hint);
  }

  // 記錄到攻擊事件表
  const payload = JSON.stringify({ reporter_node_id: reporter.node_id, attack_type, severity, attacker_ip, ts: Date.now() });
  const broadcastSignature = signBroadcast(payload, federationStore.broadcastSigningKey);

  await supabase!.from('fadp_attack_events').insert({
    reporter_node_id: reporter.node_id,
    attack_type,
    severity,
    attacker_ip: attacker_ip || null,
    attacker_token_hint: attacker_token_hint || null,
    description: `[轉傳] ${description || ''}`.slice(0, 500),
    broadcast_signature: broadcastSignature,
    ttl: ttl - 1,
    votes: { [reporter.node_id]: true },
  });

  // WebSocket 廣播
  wsManager.broadcast({
    type: 'fadp:attack',
    event: {
      reporter_node_id: reporter.node_id,
      attack_type,
      severity,
      attacker_ip,
      description,
      relayed: true,
      created_at: new Date().toISOString(),
    },
  });

  log.info(`[FADP] Webhook 廣播接收: ${reporter.node_id} 轉傳 ${attack_type} (${severity})`);
  res.json({ ok: true, message: '廣播已接收並套用' });
});

// ─── Group G：心跳監控 ───

/**
 * POST /api/federation/heartbeat
 * 橋接代理心跳 Ping（每分鐘由各成員呼叫）
 * Header: x-fadp-key: fadp_...
 * Body: { load?, tasks_running?, version? }
 */
router.post('/heartbeat', async (req, res) => {
  if (!requireSupabase(res)) return;

  const member = await verifyFederationApiKey(req);
  if (!member) {
    res.status(401).json({ ok: false, message: '需要有效的聯盟 API Key (x-fadp-key)' });
    return;
  }

  const now = new Date().toISOString();
  const { load, tasks_running, version } = req.body as {
    load?: number;
    tasks_running?: number;
    version?: string;
  };

  // 更新 last_seen_at
  await supabase!
    .from('fadp_members')
    .update({ last_seen_at: now })
    .eq('node_id', member.node_id);

  // 記錄心跳到 handshake_log（複用現有表，step = 'heartbeat'）
  await supabase!.from('fadp_handshake_log').insert({
    node_id: member.node_id,
    step: 'heartbeat',
    challenge: JSON.stringify({ load: load ?? null, tasks_running: tasks_running ?? null, version: version ?? null }),
    ip: extractClientIp(req),
  });

  // WebSocket 廣播心跳狀態
  wsManager.broadcast({
    type: 'fadp:heartbeat',
    nodeId: member.node_id,
    label: member.label,
    load: load ?? null,
    tasks_running: tasks_running ?? null,
    timestamp: now,
  });

  log.debug(`[FADP] 💓 心跳: ${member.label || member.node_id} (load=${load}, tasks=${tasks_running})`);
  res.json({ ok: true, ts: now, interval_hint: 60 });
});

/**
 * GET /api/federation/heartbeat/status
 * 查詢各成員最後心跳時間與離線狀態（超過 5 分鐘 = 離線）
 */
router.get('/heartbeat/status', async (req, res) => {
  if (!requireSupabase(res)) return;

  const { data, error } = await supabase!
    .from('fadp_members')
    .select('node_id, label, node_type, status, last_seen_at, trust_score')
    .eq('status', 'active')
    .order('last_seen_at', { ascending: false });

  if (error) {
    res.status(500).json({ ok: false, message: error.message });
    return;
  }

  const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000;
  const now = Date.now();

  const nodes = (data || []).map((m: {
    node_id: string; label: string | null; node_type: string;
    status: string; last_seen_at: string | null; trust_score: number;
  }) => {
    const lastSeen = m.last_seen_at ? new Date(m.last_seen_at).getTime() : 0;
    const msAgo = now - lastSeen;
    return {
      node_id: m.node_id,
      label: m.label,
      node_type: m.node_type,
      trust_score: m.trust_score,
      last_seen_at: m.last_seen_at,
      online: lastSeen > 0 && msAgo < OFFLINE_THRESHOLD_MS,
      ms_since_heartbeat: lastSeen > 0 ? msAgo : null,
    };
  });

  res.json({ ok: true, nodes, checked_at: new Date().toISOString() });
});

// ─── Group H：L3 信任區升級審核 ───

/**
 * POST /api/federation/trust/request-upgrade
 * 成員申請升入 L3 信任區（需達到信任分數門檻）
 * Header: x-fadp-key: fadp_...
 * Body: { reason? }
 */
router.post('/trust/request-upgrade', async (req, res) => {
  if (!requireSupabase(res)) return;

  const member = await verifyFederationApiKey(req);
  if (!member) {
    res.status(401).json({ ok: false, message: '需要有效的聯盟 API Key (x-fadp-key)' });
    return;
  }

  const L3_TRUST_THRESHOLD = 80;
  const { reason } = req.body as { reason?: string };

  if (member.trust_score < L3_TRUST_THRESHOLD) {
    res.status(403).json({
      ok: false,
      message: `信任分數不足（當前 ${member.trust_score}，需達 ${L3_TRUST_THRESHOLD}）`,
      current_score: member.trust_score,
      required_score: L3_TRUST_THRESHOLD,
    });
    return;
  }

  const approveUrl = `${process.env.OPENCLAW_API_BASE || 'http://localhost:3011'}/api/federation/trust/approve/${member.node_id}?token=${process.env.FADP_ADMIN_TOKEN || 'change-me'}`;
  const rejectUrl = `${process.env.OPENCLAW_API_BASE || 'http://localhost:3011'}/api/federation/trust/reject/${member.node_id}?token=${process.env.FADP_ADMIN_TOKEN || 'change-me'}`;

  await sendTelegramMessage(
    `🌟 <b>L3 信任區升級申請</b>\n\n` +
    `<b>節點：</b>${member.label || member.node_id}\n` +
    `<b>類型：</b>${member.node_type}\n` +
    `<b>信任分數：</b>${member.trust_score}/100\n` +
    `<b>理由：</b>${reason || '(未填寫)'}\n\n` +
    `✅ 批准：<a href="${approveUrl}">點此升級至 L3</a>\n` +
    `❌ 拒絕：<a href="${rejectUrl}">點此拒絕</a>`,
    { parseMode: 'HTML' }
  );

  await supabase!.from('fadp_handshake_log').insert({
    node_id: member.node_id,
    step: 'l3_upgrade_requested',
    challenge: JSON.stringify({ trust_score: member.trust_score, reason: reason || null }),
  });

  log.info(`[FADP] 🌟 節點 ${member.node_id} 申請 L3 升級（分數: ${member.trust_score}）`);
  res.json({ ok: true, message: 'L3 升級申請已送出，等待老蔡審核' });
});

/**
 * GET /api/federation/trust/approve/:nodeId
 * 老蔡批准 L3 升級（Telegram 連結觸發）
 * 批准後信任分數設為 100，並記錄
 */
router.get('/trust/approve/:nodeId', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { nodeId } = req.params;
  const { token } = req.query as { token?: string };

  const adminToken = process.env.FADP_ADMIN_TOKEN || 'change-me';
  if (token !== adminToken) {
    res.status(403).json({ ok: false, message: '無效的管理員 token' });
    return;
  }

  const { data: member } = await supabase!
    .from('fadp_members')
    .select('node_id, label, trust_score')
    .eq('node_id', nodeId)
    .maybeSingle();

  if (!member) {
    res.status(404).json({ ok: false, message: '成員不存在' });
    return;
  }

  await supabase!
    .from('fadp_members')
    .update({ trust_score: 100 })
    .eq('node_id', nodeId);

  await supabase!.from('fadp_handshake_log').insert({
    node_id: nodeId,
    step: 'l3_upgrade_approved',
  });

  wsManager.broadcast({
    type: 'fadp:trust_upgraded',
    nodeId,
    label: member.label,
    newTrustScore: 100,
    timestamp: new Date().toISOString(),
  });

  await sendTelegramMessage(
    `✅ <b>L3 升級批准</b>：${member.label || nodeId} 已升入 L3 信任區（分數重置至 100）`,
    { parseMode: 'HTML' }
  );

  log.info(`[FADP] ✅ 節點 ${nodeId} 已升入 L3 信任區`);

  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <html><body style="font-family:sans-serif;padding:2rem;background:#0a0a0a;color:#00ff88">
      <h2>✅ 節點 ${nodeId} 已升入 L3 信任區</h2>
      <p>信任分數已重置至 100</p>
    </body></html>
  `);
});

/**
 * GET /api/federation/trust/reject/:nodeId
 * 老蔡拒絕 L3 升級申請
 */
router.get('/trust/reject/:nodeId', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { nodeId } = req.params;
  const { token } = req.query as { token?: string };

  const adminToken = process.env.FADP_ADMIN_TOKEN || 'change-me';
  if (token !== adminToken) {
    res.status(403).json({ ok: false, message: '無效的管理員 token' });
    return;
  }

  await supabase!.from('fadp_handshake_log').insert({
    node_id: nodeId,
    step: 'l3_upgrade_rejected',
  });

  log.info(`[FADP] ❌ 節點 ${nodeId} L3 升級申請被拒`);

  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <html><body style="font-family:sans-serif;padding:2rem;background:#0a0a0a;color:#ff4444">
      <h2>❌ L3 升級申請已拒絕</h2>
    </body></html>
  `);
});

// ─── 其他端點 ───

/**
 * GET /api/federation/status
 * FADP 系統狀態（公開端點，不需 auth）
 */
router.get('/status', async (req, res) => {
  let memberCount = 0;
  let activeCount = 0;

  if (hasSupabase() && supabase) {
    const { data } = await supabase
      .from('fadp_members')
      .select('status');
    memberCount = data?.length || 0;
    activeCount = data?.filter((m: { status: string }) => m.status === 'active').length || 0;
  }

  res.json({
    ok: true,
    status: 'operational',
    hotBlocklistSize: federationStore.hotBlocklist.size,
    hotTokenBlocklistSize: federationStore.hotTokenBlocklist.size,
    totalMembers: memberCount,
    activeMembers: activeCount,
    timestamp: new Date().toISOString(),
  });
});

// ─── 內部工具函式 ───

async function addToBlocklist(
  blockType: 'ip' | 'token_hint' | 'node_id',
  blockValue: string,
  sourceEventId: string | null,
  consensusType: 'auto' | 'manual' | 'broadcast',
  expiresAt?: string
): Promise<void> {
  if (!hasSupabase() || !supabase) return;

  const defaultExpiresAt = expiresAt || new Date(Date.now() + BLOCKLIST_TTL_MS).toISOString();

  await supabase.from('fadp_blocklist').upsert({
    block_type: blockType,
    block_value: blockValue,
    source_event_id: sourceEventId,
    consensus_type: consensusType,
    status: 'active',
    expires_at: defaultExpiresAt,
  }, { onConflict: 'block_type,block_value' });
}

export default router;
