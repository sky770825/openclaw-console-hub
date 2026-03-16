/**
 * FADP postMessage 防護 Hook
 * 監聽 window.message 事件，偵測惡意 postMessage 注入
 * 如發現惡意訊息，自動廣播攻擊事件
 */

import { useEffect, useCallback, useRef } from 'react';

interface GuardOptions {
  /** 聯盟 API Key，用於廣播攻擊事件 */
  fadpKey?: string;
  /** 允許的 origin 白名單（必填，空陣列=全擋）*/
  allowedOrigins: string[];
  /** 是否啟用（預設 true）*/
  enabled?: boolean;
  /** 偵測到攻擊時的 callback */
  onAttack?: (origin: string, reason: string) => void;
}

// 惡意 postMessage 關鍵字
const MALICIOUS_PATTERNS = [
  /eval\s*\(/i,
  /document\.cookie/i,
  /localStorage\./i,
  /sessionStorage\./i,
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /fetch\s*\(/i,
  /XMLHttpRequest/i,
  /window\.location\s*=/i,
  /document\.write/i,
];

const API_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : 'http://localhost:3011';

async function reportAttack(
  fadpKey: string,
  origin: string,
  reason: string
): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/federation/attack/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-fadp-key': fadpKey,
      },
      body: JSON.stringify({
        attack_type: 'malicious_postmessage',
        severity: 'high',
        attacker_ip: null,
        attacker_token_hint: origin.slice(0, 12) || null,
        description: `惡意 postMessage 來自 ${origin}: ${reason}`,
      }),
    });
  } catch {
    // 忽略廣播失敗，不影響正常防護
  }
}

export function useFederationPostMessageGuard({
  fadpKey,
  allowedOrigins,
  enabled = true,
  onAttack,
}: GuardOptions): { blockedCount: number } {
  const blockedCountRef = useRef(0);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!enabled) return;

      const origin = event.origin || '';

      // 檢查 origin 白名單
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*') return true;
        if (allowed.endsWith('*')) {
          return origin.startsWith(allowed.slice(0, -1));
        }
        return origin === allowed;
      });

      if (!isAllowed) {
        blockedCountRef.current++;
        const reason = `來源 origin ${origin} 不在白名單中`;
        onAttack?.(origin, reason);

        if (fadpKey) {
          reportAttack(fadpKey, origin, reason);
        }
        return;
      }

      // 檢查訊息內容是否含惡意 pattern
      let dataStr = '';
      try {
        dataStr = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
      } catch {
        dataStr = String(event.data || '');
      }

      for (const pattern of MALICIOUS_PATTERNS) {
        if (pattern.test(dataStr)) {
          blockedCountRef.current++;
          const reason = `訊息包含惡意 pattern: ${pattern.source}`;
          onAttack?.(origin, reason);

          if (fadpKey) {
            reportAttack(fadpKey, origin, reason);
          }
          return;
        }
      }
    },
    [enabled, fadpKey, allowedOrigins, onAttack]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [enabled, handleMessage]);

  return { blockedCount: blockedCountRef.current };
}
