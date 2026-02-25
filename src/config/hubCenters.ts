/**
 * 星艦指揮中心 — 甲板架構
 *
 * 七大甲板 + 通訊甲板：
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                    星艦指揮中心 (L4)                          │
 *   │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
 *   │  │ 科技甲板   │ │ 護盾甲板   │ │ 防禦甲板   │ │ AI 甲板    │   │
 *   │  │ Tech Deck │ │ Shield   │ │ Defense   │ │ AI Deck   │   │
 *   │  │ 研發主體   │ │ 掃毒/個資  │ │ 防火牆/監控│ │ Bot/模型  │   │
 *   │  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
 *   │  ┌───────────┐ ┌───────────┐ ┌───────────┐                 │
 *   │  │ 工程甲板   │ │ 後勤甲板   │ │ 自動化甲板 │                 │
 *   │  │ Engineer  │ │ Logistics │ │ Automaton │                 │
 *   │  │ 基礎建設   │ │ 商業/人力  │ │ 工作流/排程│                 │
 *   │  └───────────┘ └───────────┘ └───────────┘                 │
 *   └─────────────────────────────────────────────────────────────┘
 *                          ║ 防火牆
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │              通訊甲板 — 社區多層空間 (L0-L3)                   │
 *   │     外部接觸 → 掃描掃毒 → 防護建立 → 進入社交圈                │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * 客戶上線流程：
 *   1. 外部第一線接觸
 *   2. 掃描掃毒（護盾甲板）
 *   3. 建立防護（個資安全閘道）
 *   4. 個資確認安全
 *   5. 進入 L1 社交圈
 *
 * 小蔡作品分類：
 *   科技甲板 → Agent 指揮板、任務系統、構想審核、專案製作
 *   護盾甲板 → 掃描掃毒、個資安全、客戶防護、安全上線
 *   防禦甲板 → 防火牆管理、威脅偵測、存取記錄、入侵防禦
 *   AI 甲板  → Ollama Bot、Ollama 監控、模型管理、AI 記憶庫
 *   工程甲板 → 系統架構、部署管理、資料庫、網路架構、腳本工具
 *   後勤甲板 → 客戶管理、人力開發、營收分析、合作夥伴、知識庫
 *   自動化甲板 → n8n 工作流、自動巡邏、排程引擎、控制腳本、備份還原
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
  // ─── 科技甲板（研發核心）───
  {
    id: 'tech',
    label: '科技甲板',
    labelEn: 'Tech Deck',
    icon: '🔬',
    description: '研發主體：Agent 指揮、任務系統、構想審核、專案管理',
    color: '#6366f1',
    route: '/center/tech',
    requiredLevel: 'operator',
    enabled: true,
    modules: [
      { id: 'agent', label: 'Agent 指揮板', icon: '🤖', description: '多 Agent 編排與監控（Cursor/Codex/OpenClaw）', route: '/cursor', enabled: true },
      { id: 'tasks', label: '任務系統', icon: '📋', description: '看板/列表任務管理（6欄模板 + Kanban）', route: '/tasks', enabled: true },
      { id: 'review', label: '構想審核', icon: '💡', description: '提案審核與轉任務（tool/skill/issue/learn）', route: '/review', enabled: true },
      { id: 'projects', label: '專案製作', icon: '📁', description: '專案建立與追蹤（OpenClaw/BatchA/BusinessPOC）', route: '/projects', enabled: true },
      { id: 'domains', label: '星域標記', icon: '🏷️', description: '領域分類與任務路由', route: '/domains', enabled: true },
      { id: 'runs', label: '航行日誌', icon: '▶️', description: '執行紀錄、步驟追蹤、Token 用量', route: '/runs', enabled: true },
    ],
  },

  // ─── 護盾甲板 ───
  {
    id: 'protection',
    label: '護盾甲板',
    labelEn: 'Shield Deck',
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
      { id: 'secret-redact', label: '機密過濾', icon: '🚫', description: '自動偵測並遮蔽敏感資訊（redact-secrets）', route: '/center/protection/secret-redact', enabled: true },
    ],
  },

  // ─── 防禦甲板 ───
  {
    id: 'defense',
    label: '防禦甲板',
    labelEn: 'Defense Deck',
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
      { id: 'emergency-stop', label: '緊急停機', icon: '🛑', description: '全系統緊急制動機制（emergency-stop）', route: '/center/defense/emergency-stop', enabled: true },
      { id: 'anti-stuck', label: '防死鎖引擎', icon: '🔄', description: '死鎖偵測、重試邏輯、逾時處理（anti-stuck）', route: '/center/defense/anti-stuck', enabled: true },
    ],
  },

  // ─── AI 甲板（小蔡的 Ollama 生態系）───
  {
    id: 'ai',
    label: 'AI 甲板',
    labelEn: 'AI Deck',
    icon: '🧠',
    description: 'Ollama Bot 生態系、本地模型管理、AI 記憶與對話',
    color: '#06b6d4',
    route: '/center/ai',
    requiredLevel: 'operator',
    enabled: true,
    modules: [
      { id: 'ollama-bot', label: 'Ollama Bot', icon: '🤖', description: 'Telegram 智慧助手（多模型串流、上下文記憶）', route: '/center/ai/ollama-bot', enabled: true },
      { id: 'ollama-monitor', label: 'Ollama 監控', icon: '💓', description: '服務健康監控 + 自動復原（ollama_monitor_bot）', route: '/center/ai/ollama-monitor', enabled: true },
      { id: 'model-manager', label: '模型管理', icon: '🎛️', description: '本地模型清單（Qwen3/Deepseek/Llama/Gemma）', route: '/center/ai/models', enabled: true },
      { id: 'ai-memory', label: 'AI 記憶庫', icon: '📝', description: 'Agent 對話歷史 + 共享狀態（aiMemoryStore）', route: '/center/ai/memory', enabled: true },
      { id: 'prompt-guard', label: '提示詞防護', icon: '🔒', description: '子 Agent 提示詞清洗與安全包裝', route: '/center/ai/prompt-guard', enabled: true },
    ],
  },

  // ─── 工程甲板 ───
  {
    id: 'infra',
    label: '工程甲板',
    labelEn: 'Engineering Deck',
    icon: '🏗️',
    description: '基礎建設、系統架構、部署管理、腳本工具',
    color: '#f59e0b',
    route: '/center/infra',
    requiredLevel: 'admin',
    enabled: true,
    modules: [
      { id: 'architecture', label: '系統架構', icon: '🏛️', description: '整體架構設計（Express + Supabase + WebSocket）', route: '/center/infra/architecture', enabled: true },
      { id: 'deployment', label: '部署管理', icon: '🚀', description: '服務部署（Vercel/Railway/Docker）', route: '/center/infra/deployment', enabled: true },
      { id: 'database', label: '資料庫', icon: '🗄️', description: 'Supabase PostgreSQL（9 張表 + RLS）', route: '/center/infra/database', enabled: true },
      { id: 'networking', label: '網路架構', icon: '🌐', description: '網路拓撲、WebSocket、雙後端 proxy', route: '/center/infra/networking', enabled: true },
      { id: 'scripts', label: '腳本工具', icon: '📜', description: '36+ 運維腳本（救援/備份/巡邏/Port 清理）', route: '/center/infra/scripts', enabled: true },
      { id: 'monitoring', label: '監控引擎', icon: '📊', description: '系統健康偵測 + HTTP 可用性（monitoring_engine）', route: '/center/infra/monitoring', enabled: true },
    ],
  },

  // ─── 後勤甲板 ───
  {
    id: 'commerce',
    label: '後勤甲板',
    labelEn: 'Logistics Deck',
    icon: '💼',
    description: '商業開發、人力規劃、客戶管理、知識庫',
    color: '#8b5cf6',
    route: '/center/commerce',
    requiredLevel: 'admin',
    enabled: true,
    modules: [
      { id: 'clients', label: '客戶管理', icon: '👥', description: '客戶資料與狀態追蹤', route: '/center/commerce/clients', enabled: true },
      { id: 'hr', label: '人力開發', icon: '🧑‍💻', description: '協作者招募與管理', route: '/center/commerce/hr', enabled: true },
      { id: 'revenue', label: '營收分析', icon: '📊', description: '商業數據與分析', route: '/center/commerce/revenue', enabled: true },
      { id: 'partnerships', label: '合作夥伴', icon: '🤝', description: '策略合作管理', route: '/center/commerce/partnerships', enabled: true },
      { id: 'knowledge', label: '知識庫', icon: '📚', description: '核心概念 + 自動生成知識文件（131 篇）', route: '/center/commerce/knowledge', enabled: true },
      { id: 'docs', label: '文件中心', icon: '📖', description: 'API 文件、操作手冊、事件紀錄', route: '/center/commerce/docs', enabled: true },
    ],
  },

  // ─── 通信甲板（社區多層空間 L0-L3）───
  {
    id: 'communication',
    label: '通信甲板',
    labelEn: 'Communication Deck',
    icon: '📡',
    description: '社區多層空間：外部接觸 → 掃描 → 協作 → 信任區，防火牆隔離',
    color: '#10b981',
    route: '/center/communication',
    requiredLevel: 'operator',
    enabled: true,
    modules: [
      { id: 'l0-public', label: 'L0 公開展示', icon: '🌐', description: '外部接觸第一線，純展示沙盒（最低權限）', route: '/center/communication/l0', enabled: true },
      { id: 'l1-contact', label: 'L1 基礎接觸', icon: '🤝', description: '可提交表單，低線接觸層級', route: '/center/communication/l1', enabled: true },
      { id: 'l2-collab', label: 'L2 協作空間', icon: '⚙️', description: '可呼叫社區 API，任務協作層', route: '/center/communication/l2', enabled: true },
      { id: 'l3-trusted', label: 'L3 信任區', icon: '🛡️', description: '完整社區功能，審核後開放', route: '/center/communication/l3', enabled: true },
      { id: 'firewall-gate', label: '防火牆閘道', icon: '🔥', description: '出入站訊息白名單、心跳偵測、連線監控', route: '/center/communication/firewall', enabled: true },
      { id: 'bridge-proxy', label: '安全橋接代理', icon: '🌉', description: '核心↔社區訊息清洗代理（postMessage 白名單）', route: '/center/communication/bridge', enabled: true },
    ],
  },

  // ─── 輪機艙（引擎動力系統）───
  {
    id: 'engine',
    label: '輪機艙',
    labelEn: 'Engine Room',
    icon: '⚡',
    description: '核心引擎群：治理引擎、工作流引擎、AutoExecutor、斷路器',
    color: '#f97316',
    route: '/center/engine',
    requiredLevel: 'admin',
    enabled: true,
    modules: [
      { id: 'governance', label: '治理引擎', icon: '🏛️', description: '斷路器、自動回滾、驗收驗證、信任分追蹤', route: '/center/engine/governance', enabled: true },
      { id: 'workflow', label: '工作流引擎', icon: '🔀', description: 'DAG 任務依賴執行、拓撲排序、循環偵測', route: '/center/engine/workflow', enabled: true },
      { id: 'auto-executor', label: '自動執行器', icon: '▶️', description: '自動派工、批次執行、任務輪詢引擎', route: '/center/engine/executor', enabled: true },
      { id: 'circuit-breaker', label: '斷路器', icon: '⚡', description: '連續失敗偵測、冷卻保護、手動重置', route: '/center/engine/circuit-breaker', enabled: true },
      { id: 'anti-stuck', label: '防死鎖引擎', icon: '🔄', description: '死鎖偵測、重試邏輯、逾時強制終止', route: '/center/engine/anti-stuck', enabled: true },
      { id: 'digest', label: '摘要引擎', icon: '📊', description: '定時派遣摘要報告、Telegram 推播', route: '/center/engine/digest', enabled: true },
    ],
  },

  // ─── 自動化甲板（n8n + 排程 + 控制）───
  {
    id: 'automation',
    label: '自動化甲板',
    labelEn: 'Automation Deck',
    icon: '⚙️',
    description: 'n8n 工作流、排程引擎、自動巡邏、控制腳本',
    color: '#ec4899',
    route: '/center/automation',
    requiredLevel: 'admin',
    enabled: true,
    modules: [
      { id: 'n8n', label: 'n8n 工作流', icon: '🔗', description: '5 個預建工作流（排程/Webhook/審核/通知）', route: '/center/automation/n8n', enabled: true },
      { id: 'executor', label: '自動執行器', icon: '▶️', description: '自動任務派發 + 批次執行', route: '/center/automation/executor', enabled: true },
      { id: 'patrol', label: '自動巡邏', icon: '🚁', description: '持續健康監控（openclaw-auto-patrol）', route: '/center/automation/patrol', enabled: true },
      { id: 'scripts', label: '控制腳本', icon: '🎮', description: '安全子程序執行 + 逾時處理（control_scripts）', route: '/center/automation/scripts', enabled: true },
      { id: 'backup', label: '備份還原', icon: '💾', description: '自動專案備份 + 記憶體同步', route: '/center/automation/backup', enabled: true },
      { id: 'telegram', label: 'Telegram 控制', icon: '📱', description: 'Telegram 審核/狀態/停止指令（4 個 workflow）', route: '/center/automation/telegram', enabled: true },
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
