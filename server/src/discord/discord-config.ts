/**
 * Discord 頻道映射 + 常量
 * NEUXA帝國 Discord Server 設定
 */

export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim() || '';
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID?.trim() || '';

/** Discord 頻道 → Crew Bot 映射 */
export const DISCORD_CHANNEL_MAP: Record<string, { botId: string; label: string }> = {
  '1483436189745676289': { botId: 'agong',  label: '工程部' },
  '1483436191754883173': { botId: 'ayan',   label: '研究部' },
  '1483436194443558922': { botId: 'ace',    label: '策略部' },
  '1483436196775464960': { botId: 'ami',    label: '網站部' },
  '1483436198658838601': { botId: 'ashang', label: '監控部' },
  '1483436200621510676': { botId: 'ashu',   label: '學習部' },
};

/** Crew Bot → Discord 頻道 反向映射 */
export const BOT_TO_DISCORD_CHANNEL: Record<string, string> = Object.fromEntries(
  Object.entries(DISCORD_CHANNEL_MAP).map(([chId, { botId }]) => [botId, chId])
);

/** 特殊頻道 */
export const DISCORD_COMMAND_CENTER = '1483436187598323840';  // 指揮中心（達爾）
export const DISCORD_TASK_REPORT   = '1483436209354178701';  // 任務回報
export const DISCORD_ALERT         = '1483436211384225797';  // 警報

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
