/**
 * CoreAuthProvider — 核心認證 Context
 *
 * 提供全域的認證狀態管理。
 * 任何需要判斷「是否可進入核心」的元件，都透過 useCoreAuth() 取得。
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { CoreToken, CoreAccessLevel } from '@/config/coreAuth';
import {
  getValidToken,
  issueToken,
  revokeToken,
  hasAccess,
  canExportData,
} from '@/config/coreAuth';

interface CoreAuthContextValue {
  /** 當前 Token（null = 未認證） */
  token: CoreToken | null;
  /** 是否正在驗證中 */
  loading: boolean;
  /** 是否已通過核心認證 */
  authenticated: boolean;
  /** 當前使用者的權限等級 */
  level: CoreAccessLevel | null;
  /** 登入核心 */
  login: (uid: string, name: string, passphrase: string) => Promise<boolean>;
  /** 登出核心 */
  logout: () => void;
  /** 檢查是否有指定權限 */
  checkAccess: (required: CoreAccessLevel) => boolean;
  /** 檢查是否可以外帶指定資料 */
  checkExport: (dataType: 'tasks' | 'reviews' | 'logs' | 'config' | 'all') => boolean;
}

const CoreAuthContext = createContext<CoreAuthContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useCoreAuth() {
  const ctx = useContext(CoreAuthContext);
  if (!ctx) throw new Error('useCoreAuth must be used within CoreAuthProvider');
  return ctx;
}

/**
 * 核心通行密語驗證
 * 正式環境應改為後端驗證（API call），這裡先用前端 hash 比對做 MVP
 */
async function verifyPassphrase(passphrase: string): Promise<CoreAccessLevel | null> {
  // 用 SHA-256 hash 比對，不在前端存明文
  const hash = await sha256(passphrase);

  // 預設密語 hash 對照表（正式環境應從後端取得）
  // 開發用密語：
  //   "openclaw-owner"    → owner 等級
  //   "openclaw-admin"    → admin 等級
  //   "openclaw-operator" → operator 等級
  //   "openclaw-viewer"   → viewer 等級
  const PASSPHRASE_HASHES: Record<string, CoreAccessLevel> = {
    // SHA-256("openclaw-owner")
    [await sha256('openclaw-owner')]: 'owner',
    // SHA-256("openclaw-admin")
    [await sha256('openclaw-admin')]: 'admin',
    // SHA-256("openclaw-operator")
    [await sha256('openclaw-operator')]: 'operator',
    // SHA-256("openclaw-viewer")
    [await sha256('openclaw-viewer')]: 'viewer',
  };

  return PASSPHRASE_HASHES[hash] ?? null;
}

async function sha256(text: string): Promise<string> {
  // crypto.subtle 僅在 secure context (HTTPS/localhost) 可用
  // 非 secure context 時 fallback 用簡易 hash（僅限開發環境）
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(text));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback: simple hash for non-secure contexts (dev only)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fallback-' + Math.abs(hash).toString(16);
}

export function CoreAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<CoreToken | null>(null);
  const [loading, setLoading] = useState(true);

  // 啟動時從 sessionStorage 恢復
  useEffect(() => {
    getValidToken().then(t => {
      setToken(t);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (uid: string, name: string, passphrase: string): Promise<boolean> => {
    const level = await verifyPassphrase(passphrase);
    if (!level) return false;

    const newToken = await issueToken(uid, name, level);
    setToken(newToken);
    return true;
  }, []);

  const logout = useCallback(() => {
    revokeToken();
    setToken(null);
  }, []);

  const checkAccess = useCallback((required: CoreAccessLevel): boolean => {
    if (!token) return false;
    return hasAccess(token.level, required);
  }, [token]);

  const checkExport = useCallback((dataType: 'tasks' | 'reviews' | 'logs' | 'config' | 'all'): boolean => {
    if (!token) return false;
    return canExportData(token.level, dataType);
  }, [token]);

  return (
    <CoreAuthContext.Provider value={{
      token,
      loading,
      authenticated: !!token,
      level: token?.level ?? null,
      login,
      logout,
      checkAccess,
      checkExport,
    }}>
      {children}
    </CoreAuthContext.Provider>
  );
}
