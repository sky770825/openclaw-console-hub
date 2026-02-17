/**
 * Openclaw 中心化基建架構
 *
 * 五大中心：
 *
 *   ┌─────────────────────────────────────────────────┐
 *   │                核心指揮中心 (L4)                  │
 *   │  ┌───────────┐ ┌───────────┐ ┌───────────┐      │
 *   │  │ 科技中心   │ │ 防護中心   │ │ 防衛中心   │      │
 *   │  │ R&D       │ │ Protection│ │ Defense   │      │
 *   │  │ 研發主體   │ │ 掃毒/個資  │ │ 防火牆/監控│      │
 *   │  └───────────┘ └───────────┘ └───────────┘      │
 *   │  ┌───────────┐ ┌───────────┐                    │
 *   │  │ 基建區     │ │ 商業中心   │                    │
 *   │  │ Infra     │ │ Commerce  │                    │
 *   │  │ 基礎建設   │ │ 商業/人力  │                    │
 *   │  └───────────┘ └───────────┘                    │
 *   └─────────────────────────────────────────────────┘
 *                        ║ 防火牆
 *   ┌─────────────────────────────────────────────────┐
 *   │         社區多層空間 (L0-L3)                      │
 *   │   外部接觸 → 掃描掃毒 → 防護建立 → 進入社交圈      │
 *   └─────────────────────────────────────────────────┘
 *
 * 客戶上線流程：
 *   1. 外部第一線接觸
 *   2. 掃描掃毒（防護中心）
 *   3. 建立防護（個資安全閘道）
 *   4. 個資確認安全
 *   5. 進入 L1 社交圈
 */

export interface HubCenter {
  id: string;
  label: string;
  labelEn: string;
  icon: string;
  description: string;
  color: string;
  route: string;
  /** 需要的最低權限 */
  requiredLevel: 'viewer' | 'operator' | 'admin' | 'owner';
  /** 是否啟用 */
  enabled: boolean;
  /** 子功能 */
  modules: CenterModule[];
}

export interface CenterModule {
  id: string;
  label: string;
  icon: string;
  description: string;
  route: string;
  enabled: boolean;
}

export const HUB_CENTERS: HubCenter[] = [
  // ─── 科技中心（現有的研發核心）───
  {
    id: 'tech',
    label: '科技中心',
    labelEn: 'Tech Center',
    icon: '🔬',
    description: '研發主體：Agent 指揮、任務系統、構想審核、專案管理',
    color: '#6366f1',
    route: '/center/tech',
    requiredLevel: 'operator',
    enabled: true,
    modules: [
      { id: 'agent', label: 'Agent 指揮板', icon: '🤖', description: '多 Agent 編排與監控', route: '/cursor', enabled: true },
      { id: 'tasks', label: '任務系統', icon: '📋', description: '看板/列表任務管理', route: '/tasks', enabled: true },
      { id: 'review', label: '構想審核', icon: '💡', description: '提案審核與轉任務', route: '/review', enabled: true },
      { id: 'projects', label: '專案製作', icon: '📁', description: '專案建立與追蹤', route: '/projects', enabled: true },
    ],
  },

  // ─── 防護中心 ───
  {
    id: 'protection',
    label: '防護中心',
    labelEn: 'Protection Center',
    icon: '🛡️',
    description: '掃毒掃描、客戶防護、個資安全閘道',
    color: '#22c55e',
    route: '/center/protection',
    requiredLevel: 'operator',
    enabled: true,
    modules: [
      { id: 'scanner', label: '掃描掃毒', icon: '🔍', description: '外部接觸第一線掃描，惡意偵測', route: '/center/protection/scanner', enabled: true },
      { id: 'privacy', label: '個資安全', icon: '🔐', description: '個資保護閘道，加密存儲驗證', route: '/center/protection/privacy', enabled: true },
      { id: 'client-shield', label: '客戶防護', icon: '👤', description: '客戶防火牆：上線即受保護', route: '/center/protection/client-shield', enabled: true },
      { id: 'onboarding', label: '安全上線', icon: '✅', description: '客戶上線流程：掃描→防護→准入', route: '/center/protection/onboarding', enabled: true },
    ],
  },

  // ─── 防衛中心 ───
  {
    id: 'defense',
    label: '防衛中心',
    labelEn: 'Defense Center',
    icon: '🏰',
    description: '防火牆管理、威脅偵測、安全監控、入侵防禦',
    color: '#ef4444',
    route: '/center/defense',
    requiredLevel: 'admin',
    enabled: true,
    modules: [
      { id: 'firewall', label: '防火牆管理', icon: '🧱', description: '多層防火牆狀態與規則管理', route: '/center/defense/firewall', enabled: true },
      { id: 'threat-monitor', label: '威脅偵測', icon: '📡', description: '即時威脅偵測與告警', route: '/center/defense/threats', enabled: true },
      { id: 'access-log', label: '存取記錄', icon: '📜', description: '所有進出防線的存取紀錄', route: '/center/defense/access-log', enabled: true },
      { id: 'intrusion', label: '入侵防禦', icon: '⚔️', description: '自動封鎖異常存取', route: '/center/defense/intrusion', enabled: true },
    ],
  },

  // ─── 基建區 ───
  {
    id: 'infra',
    label: '基建區',
    labelEn: 'Infrastructure',
    icon: '🏗️',
    description: '基礎建設開發、系統架構、部署管理',
    color: '#f59e0b',
    route: '/center/infra',
    requiredLevel: 'admin',
    enabled: true,
    modules: [
      { id: 'architecture', label: '系統架構', icon: '🏛️', description: '整體架構設計與管理', route: '/center/infra/architecture', enabled: true },
      { id: 'deployment', label: '部署管理', icon: '🚀', description: '服務部署與版本管理', route: '/center/infra/deployment', enabled: false },
      { id: 'database', label: '資料庫', icon: '🗄️', description: '資料存儲與備份', route: '/center/infra/database', enabled: false },
      { id: 'networking', label: '網路架構', icon: '🌐', description: '網路拓撲與流量管理', route: '/center/infra/networking', enabled: false },
    ],
  },

  // ─── 商業中心 ───
  {
    id: 'commerce',
    label: '商業中心',
    labelEn: 'Commerce Center',
    icon: '💼',
    description: '商業開發、人力規劃、客戶管理',
    color: '#8b5cf6',
    route: '/center/commerce',
    requiredLevel: 'admin',
    enabled: true,
    modules: [
      { id: 'clients', label: '客戶管理', icon: '👥', description: '客戶資料與狀態追蹤', route: '/center/commerce/clients', enabled: true },
      { id: 'hr', label: '人力開發', icon: '🧑‍💻', description: '協作者招募與管理', route: '/center/commerce/hr', enabled: false },
      { id: 'revenue', label: '營收分析', icon: '📊', description: '商業數據與分析', route: '/center/commerce/revenue', enabled: false },
      { id: 'partnerships', label: '合作夥伴', icon: '🤝', description: '策略合作管理', route: '/center/commerce/partnerships', enabled: false },
    ],
  },
];

/**
 * 客戶上線流程步驟
 *
 * 外部接觸 → 掃描掃毒 → 防護建立 → 個資確認 → 進入社交圈
 */
export interface OnboardingStep {
  id: string;
  order: number;
  label: string;
  icon: string;
  description: string;
  /** 該步驟的檢查狀態 */
  status: 'pending' | 'scanning' | 'passed' | 'failed' | 'skipped';
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'contact',
    order: 1,
    label: '外部接觸',
    icon: '📡',
    description: '第一線接觸登記，基本資訊收集',
    status: 'pending',
  },
  {
    id: 'scan',
    order: 2,
    label: '掃描掃毒',
    icon: '🔍',
    description: '對外部接觸進行安全掃描，確保無惡意行為',
    status: 'pending',
  },
  {
    id: 'protect',
    order: 3,
    label: '建立防護',
    icon: '🛡️',
    description: '為客戶建立防火牆保護，加密個資',
    status: 'pending',
  },
  {
    id: 'privacy-verify',
    order: 4,
    label: '個資安全確認',
    icon: '🔐',
    description: '確認個資已安全存儲，符合保護標準',
    status: 'pending',
  },
  {
    id: 'admit',
    order: 5,
    label: '進入社交圈',
    icon: '✅',
    description: '通過所有檢查，准入 L1 社交圈',
    status: 'pending',
  },
];

/** 取得中心by ID */
export function getCenterById(id: string): HubCenter | undefined {
  return HUB_CENTERS.find(c => c.id === id);
}
