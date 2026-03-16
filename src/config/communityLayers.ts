/**
 * 社區多層空間定義
 *
 * 層級由外往內：
 *
 *   L0 公開層（Public）     — 任何人可見，純展示/入口
 *   L1 接觸層（Contact）    — 低線接觸，基礎互動，不需身份
 *   L2 協作層（Collaborate） — 需要身份驗證，可參與討論和基礎任務
 *   L3 信任層（Trusted）     — 經審核的協作者，可接觸進階資源
 *   ── 防火牆 ──
 *   L4 核心層（Core）        — 僅內部，直接連核心指揮中心
 *
 * 每一層互相獨立，進出都經過閘道把關。
 * 從核心往外出去也經過安全代理，不暴露核心來源。
 */

export interface CommunityLayer {
  id: string;
  level: number;
  label: string;
  labelEn: string;
  icon: string;
  description: string;
  color: string;
  /** iframe 子路徑（對應小蔡社區前端的路由） */
  route: string;
  /** 需要的最低存取等級 */
  requiredAccess: 'public' | 'contact' | 'collaborate' | 'trusted' | 'core';
  /** 該層允許的 postMessage 事件類型 */
  allowedEvents: string[];
  /** 是否啟用（預搭但未開放的設為 false） */
  enabled: boolean;
}

export const COMMUNITY_LAYERS: CommunityLayer[] = [
  {
    id: 'public',
    level: 0,
    label: 'L0 公開展示',
    labelEn: 'Public Showcase',
    icon: '🌐',
    description: '公開資訊展示 · 星艦指揮中心介紹 · 專案成果 · 社區入口 · 今日 1,247 訪客',
    color: '#6366f1',
    route: '/showcase',
    requiredAccess: 'public',
    allowedEvents: ['community:heartbeat'],
    enabled: true,
  },
  {
    id: 'contact',
    level: 1,
    label: 'L1 基礎接觸',
    labelEn: 'Contact Zone',
    icon: '🤝',
    description: '低線接觸區 · 技術分享 · 申請協作者 · 表單提交 · 今日 8 份提交',
    color: '#22c55e',
    route: '/contact',
    requiredAccess: 'contact',
    allowedEvents: [
      'community:heartbeat',
      'community:nav-request',
    ],
    enabled: true,
  },
  {
    id: 'collaborate',
    level: 2,
    label: 'L2 協作空間',
    labelEn: 'Collaboration',
    icon: '⚙️',
    description: '協作者工作區 · Ollama 任務板 · 社區任務執行 · 5 名活躍協作者',
    color: '#f59e0b',
    route: '/workspace',
    requiredAccess: 'collaborate',
    allowedEvents: [
      'community:heartbeat',
      'community:nav-request',
      'community:task-created',
      'community:task-updated',
    ],
    enabled: true,
  },
  {
    id: 'trusted',
    level: 3,
    label: 'L3 信任區',
    labelEn: 'Trusted Zone',
    icon: '🛡️',
    description: '信任成員專區 · 深度資源存取 · 系統架構藍圖 · 3 位信任成員',
    color: '#ef4444',
    route: '/trusted',
    requiredAccess: 'trusted',
    allowedEvents: [
      'community:heartbeat',
      'community:nav-request',
      'community:task-created',
      'community:task-updated',
      'community:resource-request',
      'community:bridge-sync',
    ],
    enabled: true, // v0.7 啟用：需滿足 trustPromotion.ts 升級條件
  },
];

/**
 * 安全閘道設定
 */
export const GATEWAY_CONFIG = {
  /** 社區前端來源 */
  communityOrigin: import.meta.env.VITE_COMMUNITY_URL || 'http://localhost:3010',

  /** iframe sandbox 權限 — 每層獨立設定 */
  sandboxByLevel: {
    0: 'allow-scripts allow-popups',                                          // L0: 最低權限，純展示
    1: 'allow-scripts allow-popups allow-forms',                              // L1: 可提交表單
    2: 'allow-scripts allow-same-origin allow-forms allow-popups',            // L2: 可呼叫社區 API
    3: 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals', // L3: 完整社區功能
  } as Record<number, string>,

  /** 安全出口代理 — 從核心往外發送時，不暴露核心來源 */
  outboundProxy: {
    enabled: true,
    /** 出站訊息會經過這個中間層，清洗掉核心 origin 資訊 */
    sanitizeOrigin: true,
    /** 出站訊息的白名單類型 */
    allowedOutbound: [
      'hub:task-assigned',
      'hub:review-result',
      'hub:status-update',
    ],
  },

  /** 心跳間隔（ms） */
  heartbeatInterval: 5000,

  /** 心跳超時（ms）— 超過就標記斷線 */
  heartbeatTimeout: 8000,
};

/**
 * 取得指定層級的 sandbox 設定
 */
export function getSandboxForLevel(level: number): string {
  return GATEWAY_CONFIG.sandboxByLevel[level] ?? GATEWAY_CONFIG.sandboxByLevel[0];
}

/**
 * 檢查事件是否在指定層級的白名單內
 */
export function isEventAllowed(layerId: string, eventType: string): boolean {
  const layer = COMMUNITY_LAYERS.find(l => l.id === layerId);
  if (!layer) return false;
  return layer.allowedEvents.includes(eventType);
}
