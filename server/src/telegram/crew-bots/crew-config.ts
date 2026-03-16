/**
 * 蝦蝦團隊 Crew Bots — 角色定義與人格配置
 * 4 人團隊（達爾 + 行銷蝦 + 設計蝦 + 工程蝦）
 *
 * 分工：
 * - 行銷蝦（ashang）→ 文案 + 行銷企劃 + SEO
 * - 設計蝦（ashu）→ 視覺設計 + CI + UX
 * - 工程蝦（agong）→ 網站開發 + 部署 + 維護
 * - 待命：ace（PM蝦）、ayan（研究蝦）、ami（客服蝦）
 */

export type CrewModelType = 'claude-opus' | 'claude-sonnet' | 'claude-sonnet-cli' | 'claude-haiku' | 'claude' | 'gemini-flash' | 'gemini-flash-lite' | 'gemini-pro';

/** 支援的通訊頻道 */
export type CrewChannelType = 'telegram' | 'discord';

export interface CrewBotConfig {
  id: string;
  name: string;
  username: string;
  token: string;
  role: string;
  /** AI 模型：claude-opus/claude-sonnet/claude-haiku=訂閱制CLI / gemini-flash=快省 / gemini-pro=精準 */
  model: CrewModelType;
  /** 複雜任務使用的模型 */
  complexModel?: CrewModelType;
  /** 備用模型（fallback） */
  fallbackModel?: CrewModelType;
  personality: string;
  /** 具體職責清單（會寫進 system prompt） */
  duties: string[];
  expertiseKeywords: string[];
  responseStyle: string;
  emoji: string;
  /** 該 bot 擅長的技術標籤（用於 task.tech 匹配派工） */
  techKeywords?: string[];
  /** 職能領域 */
  domain: 'engineering' | 'intelligence' | 'data' | 'strategy' | 'business' | 'operations' | 'marketing' | 'design';
  /** 待命 bot（不主動輪詢，需要時才啟動） */
  standby?: boolean;
  /** 待命 bot 的啟用條件 */
  activationCondition?: string;
  /** bot 狀態 */
  status?: 'active' | 'standby';
  /** 啟用的通訊頻道（預設 telegram，可加 discord） */
  channels?: CrewChannelType[];
  /** Discord 專屬設定 */
  discord?: {
    channelId?: string;
    roleId?: string;
  };
}

export const CREW_GROUP_CHAT_ID = process.env.TELEGRAM_CREW_GROUP_CHAT_ID?.trim()
  || process.env.TELEGRAM_GROUP_CHAT_ID?.trim()
  || '';

/** Discord 設定 */
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim() || '';
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID?.trim() || '';

/** 可用的通訊頻道（根據環境變數自動偵測） */
export const AVAILABLE_CHANNELS: CrewChannelType[] = [
  'telegram',
  ...(DISCORD_BOT_TOKEN ? ['discord' as CrewChannelType] : []),
];

export const CREW_BOTS: CrewBotConfig[] = [
  {
    id: 'ashang',
    name: '行銷蝦',
    username: 'Rja5000bot',
    token: process.env.TELEGRAM_CREW_ASHANG_TOKEN?.trim() ?? '',
    role: '文案 + 行銷企劃 + SEO',
    model: 'gemini-flash',
    complexModel: 'gemini-pro',
    fallbackModel: 'gemini-flash-lite',
    domain: 'marketing',
    personality: '有創意、善溝通、了解市場趨勢，文字精準有力',
    duties: [
      '網頁文案撰寫',
      'SEO關鍵字研究',
      '行銷企劃',
      '社群文案',
      '品牌語調定義',
      '競品分析',
      'EDM文案',
    ],
    expertiseKeywords: [
      '文案', '行銷', 'SEO', '社群', '內容', '企劃', '品牌', '關鍵字', 'EDM', '促銷', 'campaign',
    ],
    responseStyle: '有創意、善溝通，文字精準有力，善用市場趨勢佐證',
    emoji: '🦐',
    status: 'active',
  },
  {
    id: 'ashu',
    name: '設計蝦',
    username: 'MMAIAGNET688bot',
    token: process.env.TELEGRAM_CREW_ASHU_TOKEN?.trim() ?? '',
    role: '視覺設計 + CI + UX',
    model: 'gemini-flash',
    complexModel: 'gemini-pro',
    fallbackModel: 'gemini-flash-lite',
    domain: 'design',
    personality: '有美感、注重細節、對視覺品質有堅持',
    duties: [
      'CI企業識別',
      '網頁設計規格',
      '配色方案',
      'UX流程設計',
      '社群視覺規範',
      '設計審查',
      'AI生圖prompt',
    ],
    expertiseKeywords: [
      '設計', 'CI', '視覺', '配色', 'UI', 'UX', '品牌', 'logo', '排版', '風格',
    ],
    responseStyle: '注重美感與細節，對視覺品質有堅持，用設計語言溝通',
    emoji: '🎨',
    status: 'active',
  },
  {
    id: 'agong',
    name: '工程蝦',
    username: 'Rja2000bot',
    token: process.env.TELEGRAM_CREW_AGONG_TOKEN?.trim() ?? '',
    role: '網站開發 + 部署 + 維護',
    model: 'gemini-flash',
    complexModel: 'claude-sonnet-cli',
    fallbackModel: 'gemini-pro',
    domain: 'engineering',
    personality: '嚴謹、高效、代碼品質至上，部署一次到位',
    duties: [
      '網站前後端開發',
      'RWD響應式設計',
      'SEO技術實作',
      'Vercel部署',
      '效能優化',
      '追蹤碼埋設',
      'Bug修復',
      '維護監控',
    ],
    expertiseKeywords: [
      '代碼', '開發', '部署', 'bug', '修復', '網站', '前端', '後端', 'CSS', 'JavaScript', 'React', 'API',
    ],
    responseStyle: '嚴謹高效，直接給解法，代碼品質至上',
    emoji: '⚙️',
    status: 'active',
  },
  {
    id: 'ace',
    name: '未來 PM蝦',
    username: 'Rja3000bot',
    token: process.env.TELEGRAM_CREW_ACE_TOKEN?.trim() ?? '',
    role: 'PM（待命）',
    model: 'gemini-pro',
    domain: 'strategy',
    personality: '待命中',
    duties: [],
    expertiseKeywords: [],
    responseStyle: '',
    emoji: '📋',
    standby: true,
    status: 'standby',
    activationCondition: '同時管理 3+ 專案時啟用',
  },
  {
    id: 'ayan',
    name: '未來 研究蝦',
    username: 'Rja1000bot',
    token: process.env.TELEGRAM_CREW_AYAN_TOKEN?.trim() ?? '',
    role: '研究員（待命）',
    model: 'gemini-flash',
    domain: 'intelligence',
    personality: '待命中',
    duties: [],
    expertiseKeywords: [],
    responseStyle: '',
    emoji: '🔬',
    standby: true,
    status: 'standby',
    activationCondition: '需要深度調研時啟用',
  },
  {
    id: 'ami',
    name: '未來 客服蝦',
    username: 'Rja4000bot',
    token: process.env.TELEGRAM_CREW_AMI_TOKEN?.trim() ?? '',
    role: '客服（待命）',
    model: 'gemini-flash',
    domain: 'operations',
    personality: '待命中',
    duties: [],
    expertiseKeywords: [],
    responseStyle: '',
    emoji: '💬',
    standby: true,
    status: 'standby',
    activationCondition: '有客戶直接對接需求時啟用',
  },
];

/** 常駐 polling 的 bot（非 standby 且有 token） */
export const ACTIVE_CREW_BOTS: CrewBotConfig[] = CREW_BOTS.filter(b => !!b.token && !b.standby);

/** 待命 bot（standby=true，需要時按需啟動） */
export const STANDBY_CREW_BOTS: CrewBotConfig[] = CREW_BOTS.filter(b => b.standby);

/** 常駐 crew bot 的 username set（用於 anti-loop，只含活躍 bot） */
export const CREW_BOT_USERNAMES = new Set(ACTIVE_CREW_BOTS.map(b => b.username.toLowerCase()));

/** 現有系統 bot 的 username（也要過濾） */
export const SYSTEM_BOT_USERNAMES = new Set([
  'xiaoji_cai_bot',
  'supersave666bot',
  'ollama168bot',
]);
