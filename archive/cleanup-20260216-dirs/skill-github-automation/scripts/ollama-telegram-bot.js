#!/usr/bin/env node
/**
 * SkillForge Ollama 本地模型客服機器人
 * 使用本地 Ollama 模型處理客戶問題，完全免費！
 * 
 * 使用方法：
 * export SKILLFORGE_BOT_TOKEN="你的Bot_Token"
 * node ollama-telegram-bot.js
 */

const https = require('https');
const http = require('http');

// 設定
const BOT_TOKEN = process.env.SKILLFORGE_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '5819565005';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'localhost';
const OLLAMA_PORT = process.env.OLLAMA_PORT || 11434;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:8b';

if (!BOT_TOKEN) {
  console.error('❌ 請設定環境變數 SKILLFORGE_BOT_TOKEN');
  process.exit(1);
}

// 產品知識庫（提供給 AI 的上下文）
const PRODUCT_CONTEXT = `
你是 SkillForge GitHub Automation Skill 的客服助理。

產品資訊：
- 這是一個 OpenClaw Skill，用於自動化管理 GitHub 專案
- 功能：Issue 自動化、PR 審查輔助、Release 自動化、Repo 分析
- 定價：Lite USDT 20、Pro USDT 50、Enterprise USDT 200
- 付款方式：僅接受 USDT (TRC-20)，錢包地址 TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD
- 購買流程：轉帳 → 截圖 → 發給 @gousmaaa → 24小時內收到 License Key
- 推薦分潤：推薦朋友購買，雙方各得 USDT 5

回答原則：
1. 簡潔有力，重點清晰
2. 語氣友善專業
3. 不確定時建議聯繫 @gousmaaa
4. 不要編造不確定的資訊
`;

// ============================================================================
// Ollama API 客戶端
// ============================================================================
class OllamaClient {
  constructor(host, port, model) {
    this.host = host;
    this.port = port;
    this.model = model;
  }

  async generate(prompt, system = '') {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: this.model,
        prompt: prompt,
        system: system || PRODUCT_CONTEXT,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 500
        }
      });

      const options = {
        hostname: this.host,
        port: this.port,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.response || json.text || '抱歉，我無法回答這個問題。');
          } catch (e) {
            reject(new Error('解析 Ollama 回應失敗'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('Ollama 請求超時'));
      });
      req.write(postData);
      req.end();
    });
  }

  async checkHealth() {
    return new Promise((resolve) => {
      http.get(`http://${this.host}:${this.port}/api/tags`, (res) => {
        resolve(res.statusCode === 200);
      }).on('error', () => resolve(false));
    });
  }
}

// ============================================================================
// Telegram Bot
// ============================================================================
class TelegramBot {
  constructor(token) {
    this.token = token;
    this.lastUpdateId = 0;
    this.ollama = new OllamaClient(OLLAMA_HOST, OLLAMA_PORT, OLLAMA_MODEL);
    this.stats = { total: 0, success: 0, failed: 0 };
  }

  async api(method, params = {}) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(params);
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.token}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async sendMessage(chatId, text, options = {}) {
    // 分段發送長訊息
    const maxLength = 4000;
    if (text.length > maxLength) {
      const parts = text.match(new RegExp(`.{1,${maxLength}}`, 'g'));
      for (const part of parts) {
        await this.api('sendMessage', {
          chat_id: chatId,
          text: part,
          parse_mode: 'Markdown',
          ...options
        });
      }
      return;
    }

    return this.api('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      ...options
    });
  }

  async generateReply(userQuestion) {
    try {
      const prompt = `客戶問題：${userQuestion}\n\n請以客服助理的身份回答這個問題。回答要簡潔、友善、專業。`;
      const response = await this.ollama.generate(prompt);
      
      // 清理回應
      return response
        .replace(/<think>.*?<\/think>/gs, '') // 移除 deepseek-r1 的思考過程
        .trim();
    } catch (err) {
      console.error('Ollama 錯誤:', err.message);
      return `🤔 抱歉，我暫時無法處理這個問題。\n\n請聯繫人工客服 @gousmaaa 獲得協助。`;
    }
  }

  async handleUpdate(update) {
    if (!update.message) return;

    const msg = update.message;
    const chatId = msg.chat.id;
    const text = msg.text || '';
    const from = msg.from;

    // 忽略指令
    if (text.startsWith('/')) {
      if (text === '/start') {
        await this.sendMessage(chatId, 
          `👋 歡迎來到 SkillForge！\n\n` +
          `我是你的客服助理，可以回答關於 GitHub Automation Skill 的問題。\n\n` +
          `💡 你可以問我：\n` +
          `• 產品有什麼功能？\n` +
          `• 怎麼購買？\n` +
          `• 推薦分潤是什麼？\n\n` +
          `🤖 由本地 AI 模型驅動，完全免費！`
        );
      }
      return;
    }

    this.stats.total++;
    console.log(`👤 ${from.username || from.first_name}: ${text.substring(0, 50)}`);

    // 發送「思考中」提示
    await this.api('sendChatAction', {
      chat_id: chatId,
      action: 'typing'
    });

    // 生成回覆
    const reply = await this.generateReply(text);
    
    // 發送回覆
    await this.sendMessage(chatId, reply);
    
    if (!reply.includes('無法處理')) {
      this.stats.success++;
      console.log(`🤖 AI 回覆成功`);
    } else {
      this.stats.failed++;
      console.log(`❌ 轉人工`);
    }
  }

  async getUpdates() {
    const data = await this.api('getUpdates', {
      offset: this.lastUpdateId + 1,
      limit: 100
    });

    if (data.ok && data.result) {
      for (const update of data.result) {
        this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
        await this.handleUpdate(update);
      }
    }
  }

  async start() {
    // 檢查 Ollama
    const isOllamaReady = await this.ollama.checkHealth();
    if (!isOllamaReady) {
      console.error('❌ Ollama 未啟動或無法連線');
      console.error(`   請確認 Ollama 正在運行: http://${OLLAMA_HOST}:${OLLAMA_PORT}`);
      process.exit(1);
    }

    // 檢查 Bot
    const me = await this.api('getMe');
    if (!me.ok) {
      console.error('❌ Bot Token 無效');
      process.exit(1);
    }

    console.log(`🤖 Ollama 客服機器人 @${me.result.username} 已啟動！`);
    console.log(`🧠 使用模型: ${OLLAMA_MODEL}`);
    console.log(`📡 等待訊息...\n`);

    // 主循環
    const loop = async () => {
      try {
        await this.getUpdates();
      } catch (err) {
        console.error('❌ 錯誤:', err.message);
      }
      setTimeout(loop, 1000);
    };

    loop();

    // 定期顯示統計
    setInterval(() => {
      if (this.stats.total > 0) {
        console.log(`\n📊 統計: 總${this.stats.total} | 成功${this.stats.success} | 失敗${this.stats.failed}\n`);
      }
    }, 60000);
  }
}

// ============================================================================
// 主程式
// ============================================================================
async function main() {
  const bot = new TelegramBot(BOT_TOKEN);
  await bot.start();
}

main().catch(console.error);