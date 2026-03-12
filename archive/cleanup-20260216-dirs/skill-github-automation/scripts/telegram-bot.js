#!/usr/bin/env node
/**
 * SkillForge Telegram 客服機器人
 * 自動回覆常見問題，複雜問題轉人工
 * 
 * 使用方法：
 * 1. 設定環境變數 BOT_TOKEN（從 @BotFather 取得）
 * 2. 執行：node telegram-bot.js
 * 3. 機器人會自動回覆私訊和群組中被 @ 的問題
 */

const https = require('https');

// 從環境變數讀取 Bot Token
const BOT_TOKEN = process.env.SKILLFORGE_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // 你的 Telegram ID

if (!BOT_TOKEN) {
  console.error('❌ 請設定環境變數 SKILLFORGE_BOT_TOKEN');
  console.error('   export SKILLFORGE_BOT_TOKEN=your_bot_token_here');
  process.exit(1);
}

// ============================================================================
// 知識庫
// ============================================================================
const KNOWLEDGE_BASE = {
  purchase: {
    keywords: ['購買', '付款', '轉帳', 'USDT', '錢包', '怎麼買', '多少錢', '價格', '轉帳地址'],
    responses: [
      "💳 **購買流程**\n1️⃣ 選擇版本（Lite USDT 20 / Pro USDT 50 / Enterprise USDT 200）\n2️⃣ 轉帳 USDT (TRC-20) 至\n`TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD`\n3️⃣ 截圖付款記錄\n4️⃣ 發送截圖 + Email 給 @gousmaaa\n5️⃣ 24小時內收到 License Key",
      "⚠️ **重要提醒**：僅接受 TRC-20 網路，使用其他網路可能導致資金遺失！"
    ]
  },
  
  product: {
    keywords: ['功能', '支援', '什麼是', '介紹', '特色', '做什麼', '幹嘛'],
    responses: [
      "🚀 **四大功能**\n• Issue 自動化 - 建立、列出、更新 Issue\n• PR 審查輔助 - 分析變更、生成審查清單\n• Release 自動化 - 一鍵建立 Release\n• Repo 分析 - 健康度評分、統計數據\n\n📖 詳細文件：https://skillforge.dev/github-automation"
    ]
  },
  
  referral: {
    keywords: ['推薦', '分潤', '邀請', '分享', '推薦碼', '回饋'],
    responses: [
      "🎁 **推薦有賞**\n推薦朋友購買，雙方各得 **USDT 5**！\n\n✨ 無上限推薦：\n• 推薦 4 人 = 免費 Lite 版\n• 推薦 10 人 = 免費 Pro 版\n• 推薦 40 人 = 免費 Enterprise 版\n\n購買後會收到專屬推薦碼，朋友購買時提供即可。"
    ]
  },
  
  technical: {
    keywords: ['安裝', '環境', 'Token', 'API', '錯誤', '技術', '使用', '怎麼用'],
    responses: [
      "🛠️ **環境需求**\n• Node.js 18+\n• GitHub Personal Access Token\n\n**快速開始**：\n```bash\nnpm install @skillforge/github-automation\n```\n\n📖 完整範例見 SKILL.md",
      "🔑 **申請 GitHub Token**：\nSettings → Developer settings → Personal access tokens → Generate new token → 勾選 repo 權限"
    ]
  },
  
  license: {
    keywords: ['License', '授權', '轉讓', '過期', 'key', '序號'],
    responses: [
      "📜 **授權說明**\n✅ 一次性購買，永久使用\n✅ 終身免費更新\n✅ 可綁定多台開發機器\n❌ 不可轉讓給他人\n\n沒收到 License？請檢查垃圾郵件或聯繫 @gousmaaa"
    ]
  },
  
  contact: {
    keywords: ['聯繫', '客服', '支援', '幫助', '問', '找誰'],
    responses: [
      "👨‍💼 **聯繫方式**\n• Telegram：@gousmaaa\n• 回覆時間：工作時間 1-2 小時\n• 緊急問題請標註【緊急】"
    ]
  }
};

// ============================================================================
// 機器人核心
// ============================================================================
class TelegramBot {
  constructor(token) {
    this.token = token;
    this.lastUpdateId = 0;
    this.stats = {
      totalMessages: 0,
      autoReplied: 0,
      forwardedToHuman: 0
    };
  }

  /**
   * 發送 Telegram API 請求
   */
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
            const json = JSON.parse(data);
            resolve(json);
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

  /**
   * 發送訊息
   */
  async sendMessage(chatId, text, options = {}) {
    return this.api('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      ...options
    });
  }

  /**
   * 分析問題類別
   */
  categorizeQuestion(text) {
    const lowerText = text.toLowerCase();
    
    for (const [category, data] of Object.entries(KNOWLEDGE_BASE)) {
      for (const keyword of data.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }
    
    return 'unknown';
  }

  /**
   * 生成回覆
   */
  generateReply(text) {
    const category = this.categorizeQuestion(text);
    
    if (category !== 'unknown' && KNOWLEDGE_BASE[category]) {
      const responses = KNOWLEDGE_BASE[category].responses;
      return {
        type: 'auto',
        text: responses[Math.floor(Math.random() * responses.length)],
        category
      };
    }
    
    return {
      type: 'fallback',
      text: `🤔 這個問題我需要轉給人工客服處理\n\n請稍等，或聯繫 @gousmaaa\n\n---\n💡 你可以問我：\n• 怎麼購買？\n• 有什麼功能？\n• 推薦有什麼好處？\n• License 會過期嗎？`,
      category: 'unknown'
    };
  }

  /**
   * 處理更新
   */
  async handleUpdate(update) {
    if (!update.message) return;

    const msg = update.message;
    const chatId = msg.chat.id;
    const text = msg.text || '';
    const from = msg.from;

    this.stats.totalMessages++;

    // 只處理私訊或在群組中被 @ 的訊息
    const isPrivate = msg.chat.type === 'private';
    const isMentioned = text.includes(`@${(await this.getMe()).result.username}`);
    
    if (!isPrivate && !isMentioned) return;

    console.log(`👤 ${from.username || from.first_name}: ${text.substring(0, 50)}`);

    // 生成回覆
    const reply = this.generateReply(text);
    
    // 發送回覆
    await this.sendMessage(chatId, reply.text);
    
    if (reply.type === 'auto') {
      this.stats.autoReplied++;
      console.log(`🤖 自動回覆 [${reply.category}]`);
    } else {
      this.stats.forwardedToHuman++;
      console.log(`📨 轉人工處理`);
      
      // 通知管理員
      if (ADMIN_CHAT_ID) {
        await this.sendMessage(ADMIN_CHAT_ID, 
          `📨 新客戶問題需人工處理\n\n` +
          `👤 用戶: ${from.username || from.first_name} (${from.id})\n` +
          `💬 問題: ${text}\n\n` +
          `回覆此訊息即可回覆客戶`
        );
      }
    }
  }

  /**
   * 取得機器人資訊
   */
  async getMe() {
    if (!this._me) {
      this._me = await this.api('getMe');
    }
    return this._me;
  }

  /**
   * 取得更新
   */
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

  /**
   * 顯示統計
   */
  printStats() {
    console.log('\n📊 客服統計');
    console.log(`   總訊息: ${this.stats.totalMessages}`);
    console.log(`   自動回覆: ${this.stats.autoReplied} (${(this.stats.autoReplied/this.stats.totalMessages*100).toFixed(1)}%)`);
    console.log(`   轉人工: ${this.stats.forwardedToHuman} (${(this.stats.forwardedToHuman/this.stats.totalMessages*100).toFixed(1)}%)`);
  }

  /**
   * 啟動機器人
   */
  async start() {
    const me = await this.getMe();
    if (!me.ok) {
      console.error('❌ 無法啟動機器人，請檢查 Token');
      process.exit(1);
    }

    console.log(`🤖 客服機器人 @${me.result.username} 已啟動！`);
    console.log('📡 等待訊息... (按 Ctrl+C 停止)\n');

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
      if (this.stats.totalMessages > 0) {
        this.printStats();
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