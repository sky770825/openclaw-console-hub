/**
 * Discord Slash Commands 處理器
 * /status /dispatch /report /standup /search /alert /deploy /health
 */

import { createLogger } from '../logger.js';
import { DISCORD_BOT_TOKEN } from './discord-config.js';
import type { DiscordInteraction } from './discord-gateway.js';

const log = createLogger('discord-cmd');
const DISCORD_API = 'https://discord.com/api/v10';

/** 回覆 Interaction（必須在 3 秒內） */
async function reply(interaction: DiscordInteraction, content: string): Promise<void> {
  try {
    await fetch(`${DISCORD_API}/interactions/${interaction.id}/${interaction.token}/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 4, data: { content } }),
    });
  } catch (err) {
    log.error({ err }, '[SlashCmd] reply failed');
  }
}

/** 延遲回覆（先回 ACK，再用 followup） */
async function deferReply(interaction: DiscordInteraction): Promise<void> {
  await fetch(`${DISCORD_API}/interactions/${interaction.id}/${interaction.token}/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 5 }),
  });
}

async function followUp(interaction: DiscordInteraction, content: string): Promise<void> {
  await fetch(`${DISCORD_API}/webhooks/${DISCORD_BOT_TOKEN && '1483431987690864830'}/${interaction.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

/** thinkFn 由外部注入 */
type ThinkFn = (botId: string, text: string, senderName: string) => Promise<string>;
let thinkFn: ThinkFn | null = null;

export function registerCommandThinkFn(fn: ThinkFn): void {
  thinkFn = fn;
}

/** 處理 Slash Command */
export async function handleInteraction(interaction: DiscordInteraction): Promise<void> {
  const { commandName, options, user } = interaction;
  log.info(`[SlashCmd] /${commandName} from=${user.username} opts=${JSON.stringify(options)}`);

  switch (commandName) {
    case 'status': {
      await deferReply(interaction);
      if (thinkFn) {
        const result = await thinkFn('xiaocai', '報告目前系統狀態、所有服務是否正常、蝦蝦團隊狀態', user.username);
        await followUp(interaction, result || '無法取得狀態');
      } else {
        await followUp(interaction, '🤖 **達爾** — NEUXA帝國 v9.2.0 運行中\n✅ Discord Bridge 已連線\n✅ Telegram 同步啟用');
      }
      break;
    }

    case 'dispatch': {
      const task = options.task || '';
      const bot = options.bot || '';
      await deferReply(interaction);
      if (thinkFn) {
        const prompt = bot
          ? `把這個任務派給${bot}：${task}`
          : `分析這個任務並派給最適合的蝦蝦：${task}`;
        const result = await thinkFn('xiaocai', prompt, user.username);
        await followUp(interaction, result || '派工失敗');
      } else {
        await followUp(interaction, `📤 任務已收到：${task}\n指定：${bot || '自動分配'}`);
      }
      break;
    }

    case 'report': {
      await deferReply(interaction);
      if (thinkFn) {
        const result = await thinkFn('xiaocai', '請各部門蝦蝦簡報目前的工作進度和狀態', user.username);
        await followUp(interaction, result || '無法取得報告');
      } else {
        await followUp(interaction, '📋 報告指令已發送，各蝦蝦將在各自頻道回報。');
      }
      break;
    }

    case 'standup': {
      await deferReply(interaction);
      if (thinkFn) {
        const result = await thinkFn('xiaocai', '觸發每日站會，請各蝦蝦回報：昨天做了什麼、今天做什麼、有什麼卡關', user.username);
        await followUp(interaction, result || '站會觸發失敗');
      } else {
        await followUp(interaction, '☀️ 每日站會已觸發！');
      }
      break;
    }

    case 'search': {
      const query = options.query || '';
      await deferReply(interaction);
      if (thinkFn) {
        const result = await thinkFn('ayan', `搜尋知識庫和網路：${query}`, user.username);
        await followUp(interaction, result || '搜尋無結果');
      } else {
        await followUp(interaction, `🔍 搜尋：${query}\n（知識庫搜尋功能載入中...）`);
      }
      break;
    }

    case 'alert': {
      const message = options.message || '';
      await reply(interaction, `🚨 **告警已發送**\n\n${message}\n\n— by ${user.username}`);
      break;
    }

    case 'deploy': {
      await deferReply(interaction);
      if (thinkFn) {
        const result = await thinkFn('xiaocai', '執行部署流程：build + deploy 到 Vercel，回報結果', user.username);
        await followUp(interaction, result || '部署指令已發送');
      } else {
        await followUp(interaction, '🚀 部署指令已發送，阿工將執行 build + deploy。');
      }
      break;
    }

    case 'health': {
      await deferReply(interaction);
      if (thinkFn) {
        const result = await thinkFn('xiaocai', '執行完整健康檢查：Server、Gateway、PostgreSQL、n8n、Docker、所有服務', user.username);
        await followUp(interaction, result || '健康檢查失敗');
      } else {
        await followUp(interaction, '💚 健康檢查指令已發送。');
      }
      break;
    }

    default:
      await reply(interaction, `❓ 未知指令：/${commandName}`);
  }
}
