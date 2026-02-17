/**
 * 核心認證系統 — Openclaw Core Auth
 *
 * 這是跨越防火牆進入核心指揮中心的唯一鑰匙。
 * 沒有這層認證，任何人都無法進入核心防線。
 *
 * 機制：
 * 1. 數位 Token（HMAC-SHA256 簽章）存在 sessionStorage
 * 2. Token 包含：使用者 ID、權限等級、簽發/到期時間
 * 3. 權限等級決定可存取的範圍和資料外帶權限
 *
 * 權限等級：
 *   viewer   — 可檢視核心面板（唯讀）
 *   operator — 可操作任務/審核
 *   admin    — 完整存取 + 可授權他人
 *   owner    — 最高權限（老蔡），可帶出任何資料
 */

// ─── 權限等級定義 ───

export type CoreAccessLevel = 'viewer' | 'operator' | 'admin' | 'owner';

export interface CoreToken {
  /** 使用者唯一識別碼 */
  uid: string;
  /** 顯示名稱 */
  name: string;
  /** 權限等級 */
  level: CoreAccessLevel;
  /** 簽發時間（Unix ms） */
  iat: number;
  /** 到期時間（Unix ms） */
  exp: number;
  /** 數位簽章（HMAC-SHA256 hex） */
  sig: string;
}

/** 權限等級數值（用於比較） */
const LEVEL_VALUE: Record<CoreAccessLevel, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
  owner: 4,
};

/** 權限等級 label */
export const LEVEL_LABEL: Record<CoreAccessLevel, string> = {
  viewer: '檢視者',
  operator: '操作員',
  admin: '管理者',
  owner: '擁有者',
};

/** 各權限可外帶的資料類型 */
export const DATA_EXPORT_POLICY: Record<CoreAccessLevel, {
  label: string;
  canExportTasks: boolean;
  canExportReviews: boolean;
  canExportLogs: boolean;
  canExportConfig: boolean;
  canExportAll: boolean;
}> = {
  viewer: {
    label: '不可外帶',
    canExportTasks: false,
    canExportReviews: false,
    canExportLogs: false,
    canExportConfig: false,
    canExportAll: false,
  },
  operator: {
    label: '僅限自身任務',
    canExportTasks: true,
    canExportReviews: false,
    canExportLogs: false,
    canExportConfig: false,
    canExportAll: false,
  },
  admin: {
    label: '任務 + 審核紀錄',
    canExportTasks: true,
    canExportReviews: true,
    canExportLogs: true,
    canExportConfig: false,
    canExportAll: false,
  },
  owner: {
    label: '完整存取',
    canExportTasks: true,
    canExportReviews: true,
    canExportLogs: true,
    canExportConfig: true,
    canExportAll: true,
  },
};

// ─── Token 操作 ───

const STORAGE_KEY = 'oc_core_token';

/** 簽章密鑰（正式環境應從 env 讀取，此為開發用） */
const SECRET = import.meta.env.VITE_CORE_AUTH_SECRET || 'openclaw-core-2024-default';

/**
 * 產生 HMAC-SHA256 簽章
 * 使用 Web Crypto API（瀏覽器原生，無需外部套件）
 */
async function hmacSign(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 簽發核心 Token
 */
export async function issueToken(
  uid: string,
  name: string,
  level: CoreAccessLevel,
  expiresInMs: number = 24 * 60 * 60 * 1000 // 預設 24 小時
): Promise<CoreToken> {
  const iat = Date.now();
  const exp = iat + expiresInMs;
  const payload = `${uid}:${name}:${level}:${iat}:${exp}`;
  const sig = await hmacSign(payload);
  const token: CoreToken = { uid, name, level, iat, exp, sig };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token));
  return token;
}

/**
 * 驗證 Token 簽章與有效期
 */
export async function verifyToken(token: CoreToken): Promise<boolean> {
  // 檢查到期
  if (Date.now() > token.exp) return false;

  // 驗證簽章
  const payload = `${token.uid}:${token.name}:${token.level}:${token.iat}:${token.exp}`;
  const expectedSig = await hmacSign(payload);
  return token.sig === expectedSig;
}

/**
 * 從 sessionStorage 讀取並驗證 Token
 */
export async function getValidToken(): Promise<CoreToken | null> {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const token: CoreToken = JSON.parse(raw);
    const valid = await verifyToken(token);
    if (!valid) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return token;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * 登出 — 清除 Token
 */
export function revokeToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * 檢查權限是否足夠
 */
export function hasAccess(current: CoreAccessLevel, required: CoreAccessLevel): boolean {
  return LEVEL_VALUE[current] >= LEVEL_VALUE[required];
}

/**
 * 檢查是否可以外帶指定類型的資料
 */
export function canExportData(
  level: CoreAccessLevel,
  dataType: 'tasks' | 'reviews' | 'logs' | 'config' | 'all'
): boolean {
  const policy = DATA_EXPORT_POLICY[level];
  switch (dataType) {
    case 'tasks': return policy.canExportTasks;
    case 'reviews': return policy.canExportReviews;
    case 'logs': return policy.canExportLogs;
    case 'config': return policy.canExportConfig;
    case 'all': return policy.canExportAll;
    default: return false;
  }
}
