/**
 * Discord 頻道映射 + 常量
 * NEUXA帝國 Discord Server 設定
 */

export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim() || '';
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID?.trim() || '';

/** Discord 頻道 → Crew Bot 映射 */
export const DISCORD_CHANNEL_MAP: Record<string, { botId: string; label: string }> = {
  // ── 蝦蝦團隊部門 ──
  '1483436189745676289': { botId: 'agong',  label: '工程部' },
  '1483436191754883173': { botId: 'ayan',   label: '研究部' },
  '1483436194443558922': { botId: 'ace',    label: '策略部' },
  '1483436196775464960': { botId: 'ami',    label: '網站部' },
  '1483436198658838601': { botId: 'ashang', label: '監控部' },
  '1483436200621510676': { botId: 'ashu',   label: '學習部' },
  // ── 知識庫（阿研 + 阿學 負責） ──
  '1483443472428957730': { botId: 'agong',  label: '技術文件' },
  '1483443474727702598': { botId: 'ayan',   label: '市場情報' },
  '1483443477009272893': { botId: 'ashu',   label: '學習資源' },
  '1483443478963687535': { botId: 'ace',    label: '決策紀錄' },
  '1483443481677529159': { botId: 'ace',    label: '靈感收集' },
  // ── 協作流程（阿策 主導） ──
  '1483443485376774225': { botId: 'ace',    label: '任務派工' },
  '1483443486979264533': { botId: 'ace',    label: '進度追蹤' },
  '1483443491097940019': { botId: 'ace',    label: '跨部門協作' },
  '1483443492855222334': { botId: 'ace',    label: '退回修正' },
  // ── 商業前線 ──
  '1483443496965640243': { botId: 'ace',    label: '產品規劃' },
  '1483443498878504991': { botId: 'ashu',   label: '行銷企劃' },
  '1483443501030047876': { botId: 'ayan',   label: '營收追蹤' },
  // ── 系統運維（阿工 + 阿監） ──
  '1483443503718727712': { botId: 'ashang', label: '服務狀態' },
  '1483443505731731461': { botId: 'agong',  label: '部署紀錄' },
  '1483443507812241408': { botId: 'ashang', label: '效能監控' },
  '1483443509603336242': { botId: 'agong',  label: '安全事件' },
};

/** Crew Bot → Discord 頻道 反向映射 */
export const BOT_TO_DISCORD_CHANNEL: Record<string, string> = Object.fromEntries(
  Object.entries(DISCORD_CHANNEL_MAP).map(([chId, { botId }]) => [botId, chId])
);

/** 特殊頻道（達爾直接回覆） */
export const DISCORD_COMMAND_CENTER = '1483436187598323840';  // 指揮中心
export const DISCORD_TASK_REPORT   = '1483436209354178701';  // 任務回報
export const DISCORD_ALERT         = '1483436211384225797';  // 警報
export const DISCORD_INTAKE        = '1483443483535478845';  // 需求收件
export const DISCORD_REVIEW        = '1483443489210499123';  // 審核交付
export const DISCORD_CUSTOMER      = '1483443494918951077';  // 客戶需求
export const DISCORD_STANDUP       = '1483443511612281033';  // 每日站會
export const DISCORD_WEEKLY        = '1483443513365626970';  // 週報總結
export const DISCORD_POSTMORTEM    = '1483443515303268484';  // 事件回顧

/** 達爾直管的頻道（不經過蝦蝦，直接 xiaocaiThink） */
export const DAR_CHANNELS = new Set([
  DISCORD_COMMAND_CENTER,
  DISCORD_TASK_REPORT,
  DISCORD_ALERT,
  DISCORD_INTAKE,
  DISCORD_REVIEW,
  DISCORD_CUSTOMER,
  DISCORD_STANDUP,
  DISCORD_WEEKLY,
  DISCORD_POSTMORTEM,
]);

/** Bot 表情前綴（在 Discord 顯示身份用） */
export const BOT_EMOJI: Record<string, string> = {
  agong:  '⚙️ 阿工',
  ayan:   '🔬 阿研',
  ace:    '🎯 阿策',
  ami:    '🌐 阿站',
  ashang: '📡 阿監',
  ashu:   '🎓 阿學',
  xiaocai: '🤖 達爾',
};
