/**
 * FADP — 聯盟協防協議 封鎖中介層
 * 必須在 authMiddleware 之前掛載（封鎖優先）
 */

import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../logger.js';
import { hasSupabase, supabase } from '../supabase.js';

const log = createLogger('fadp-blocker');

// ─── 聯盟全域狀態 ───

export const federationStore = {
  /** 熱封鎖清單：O(1) IP 查詢，啟動時從 Supabase 載入 */
  hotBlocklist: new Set<string>(),
  /** 熱封鎖的 token hints（API Key 前綴）*/
  hotTokenBlocklist: new Set<string>(),
  /** 活躍聯盟成員的 node_id → api_key_hash 映射 */
  activeMemberKeyMap: new Map<string, string>(),
  /** 廣播 signing key（從環境變數讀取）*/
  broadcastSigningKey: process.env.FADP_BROADCAST_SIGNING_KEY || 'fadp-default-signing-key-please-change',
};

// ─── 封鎖中介層 ───

export function federationBlockerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientIp = extractClientIp(req);

  // 檢查 IP 封鎖清單
  if (clientIp && federationStore.hotBlocklist.has(clientIp)) {
    log.warn(`[FADP] 🛑 封鎖 IP ${clientIp} 的請求: ${req.method} ${req.path}`);
    incrementEnforcementCount(clientIp, 'ip');
    res.status(403).json({
      ok: false,
      message: 'Blocked by Federation Alliance Defense Protocol',
      code: 'FADP_BLOCKED',
      blockType: 'ip',
    });
    return;
  }

  // 檢查 token hint 封鎖（API Key 前綴）
  const apiKey = req.headers['x-api-key'] as string | undefined
    || (req.headers['authorization'] as string | undefined)?.replace('Bearer ', '');
  if (apiKey) {
    const tokenHint = apiKey.slice(0, 12);
    if (federationStore.hotTokenBlocklist.has(tokenHint)) {
      log.warn(`[FADP] 🛑 封鎖可疑 token ${tokenHint}... 的請求: ${req.method} ${req.path}`);
      incrementEnforcementCount(tokenHint, 'token_hint');
      res.status(403).json({
        ok: false,
        message: 'Blocked by Federation Alliance Defense Protocol',
        code: 'FADP_BLOCKED',
        blockType: 'token',
      });
      return;
    }
  }

  next();
}

// ─── 工具函式 ───

export function extractClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    ''
  );
}

/** 非同步更新封鎖計數（fire and forget）*/
function incrementEnforcementCount(blockValue: string, blockType: 'ip' | 'token_hint'): void {
  if (!hasSupabase() || !supabase) return;
  void supabase
    .from('fadp_blocklist')
    .update({ enforcement_count: supabase.rpc('increment', { row_count: 1 }) as never })
    .eq('block_value', blockValue)
    .eq('block_type', blockType)
    .eq('status', 'active');
}

// ─── 啟動時載入 ───

/**
 * 從 Supabase fadp_blocklist 載入 active 封鎖項目到記憶體 hotBlocklist
 * 在 server 啟動時呼叫一次
 */
export async function loadBlocklistFromSupabase(): Promise<void> {
  if (!hasSupabase() || !supabase) {
    log.warn('[FADP] Supabase 未連線，跳過封鎖清單載入');
    return;
  }

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('fadp_blocklist')
      .select('block_type, block_value')
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (error) {
      log.warn('[FADP] 載入封鎖清單失敗:', error.message);
      return;
    }

    let ipCount = 0;
    let tokenCount = 0;

    for (const row of data || []) {
      if (row.block_type === 'ip') {
        federationStore.hotBlocklist.add(row.block_value);
        ipCount++;
      } else if (row.block_type === 'token_hint') {
        federationStore.hotTokenBlocklist.add(row.block_value);
        tokenCount++;
      }
    }

    log.info(`[FADP] 封鎖清單載入完成: ${ipCount} IPs, ${tokenCount} tokens`);
  } catch (e) {
    log.warn('[FADP] 載入封鎖清單例外:', e);
  }
}

/**
 * 動態將 IP 加入熱封鎖清單（攻擊廣播收到時呼叫）
 */
export function blockIpHot(ip: string): void {
  federationStore.hotBlocklist.add(ip);
  log.info(`[FADP] 🔴 熱封鎖 IP: ${ip}`);
}

/**
 * 動態將 token hint 加入熱封鎖清單
 */
export function blockTokenHot(tokenHint: string): void {
  federationStore.hotTokenBlocklist.add(tokenHint);
  log.info(`[FADP] 🔴 熱封鎖 token hint: ${tokenHint}`);
}

/**
 * 解除 IP 熱封鎖（管理員解封時呼叫）
 */
export function unblockIpHot(ip: string): void {
  federationStore.hotBlocklist.delete(ip);
  log.info(`[FADP] 🟢 解除封鎖 IP: ${ip}`);
}

/**
 * 解除 token hint 熱封鎖
 */
export function unblockTokenHot(tokenHint: string): void {
  federationStore.hotTokenBlocklist.delete(tokenHint);
  log.info(`[FADP] 🟢 解除封鎖 token hint: ${tokenHint}`);
}
