#!/usr/bin/env node
/**
 * SkillForge 本地離線客服機器人
 * 完全不連網，從本地日誌檔案讀取和回覆
 * 
 * 使用方法：
 * node local-support-bot.js
 * 
 * 功能：
 * 1. 自動回覆常見問題
 * 2. 無法回答的問題記錄到待辦檔案
 * 3. 查看客服統計
 * 4. 管理待回覆問題
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================================================
// 設定
// ============================================================================
const CONFIG = {
  logDir: path.join(__dirname, '../logs'),
  pendingFile: path.join(__dirname, '../logs/pending-questions.txt'),
  statsFile: path.join(__dirname, '../logs/support-stats.json'),
  historyFile: path.join(__dirname, '../logs/conversation-history.txt')
};

// 確保目錄存在
if (!fs.existsSync(CONFIG.logDir)) {
  fs.mkdirSync(CONFIG.logDir, { recursive: true });
}

// ============================================================================
// 知識庫（完全離線）
// ============================================================================
const KNOWLEDGE_BASE = {
  // 購買相關
  "購買": `💳 **購買流程**
1️⃣ 選擇版本（Lite USDT 20 / Pro USDT 50 / Enterprise USDT 200）
2️⃣ 轉帳 USDT (TRC-20) 至
   TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD
3️⃣ 截圖付款記錄
4️⃣ 發送截圖 + Email 給 @gousmaaa
5️⃣ 24小時內收到 License Key

⚠️ 僅接受 TRC-20 網路！`,

  "付款": `💳 付款方式
• 僅接受 USDT (TRC-20)
• 錢包地址：TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD
• 手續費：免費
• 到帳時間：即時

⚠️ 請務必使用 TRC-20 網路！`,

  "價格": `💰 定價方案
• Lite：USDT 20（Issue + PR 基礎功能）
• Pro：USDT 50（完整功能 + Webhook）
• Enterprise：USDT 200（多 Repo + 自定義規則）`,

  // 產品功能
  "功能": `🚀 四大功能
1. Issue 自動化 - 建立、列出、更新 Issue
2. PR 審查輔助 - 分析變更、生成審查清單
3. Release 自動化 - 一鍵建立 Release
4. Repo 分析 - 健康度評分、統計數據`,

  "介紹": `這是 SkillForge GitHub Automation Skill
讓 AI 自動管理 GitHub 專案，支援 Issue、PR、Release 自動化。

使用設計模式：Builder、Strategy、Factory`,

  // 推薦分潤
  "推薦": `🎁 推薦有賞
推薦朋友購買，雙方各得 USDT 5！

✨ 無上限推薦：
• 推薦 4 人 = 免費 Lite 版
• 推薦 10 人 = 免費 Pro 版
• 推薦 40 人 = 免費 Enterprise 版

購買後會收到專屬推薦碼。`,

  "分潤": `推薦分潤機制：
• 推薦人：USDT 5
• 被推薦人：USDT 5
• 無上限，推薦越多賺越多

推薦 10 人 = 免費獲得 Pro 版！`,

  // 技術支援
  "安裝": `🛠️ 環境需求
• Node.js 18+
• GitHub Personal Access Token

安裝：
npm install @skillforge/github-automation`,

  "token": `🔑 申請 GitHub Token：
1. GitHub Settings
2. Developer settings
3. Personal access tokens
4. Generate new token (classic)
5. 勾選 repo 權限
6. 複製 Token 保存`,

  // 授權
  "license": `📜 授權說明
✅ 一次性購買，永久使用
✅ 終身免費更新
✅ 可綁定多台開發機器
❌ 不可轉讓給他人`,

  "過期": `License 不會過期！

一次性購買，永久使用，終身免費更新。`,

  // 聯繫
  "聯繫": `👨‍💼 聯繫方式
• Telegram：@gousmaaa
• 回覆時間：工作時間 1-2 小時`,

  "客服": `如需人工客服，請聯繫 @gousmaaa

工作時間：週一至週五 9:00-18:00`,

  // 錢包地址
  "地址": `USDT (TRC-20) 錢包地址：
TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD

⚠️ 僅限 TRC-20 網路！`,

  "錢包": `收款錢包（僅限 TRC-20）：
TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD`,
};

// 同義詞對照
const SYNONYMS = {
  "購買": ["買", "訂購", "下單", "怎麼買"],
  "付款": ["付錢", "轉帳", "支付", "usdt", "匯款"],
  "價格": ["多少錢", "費用", "價錢", "怎麼賣"],
  "功能": ["做什麼", "特色", "支援", "可以幹嘛"],
  "推薦": ["邀請", "分享", "推薦碼"],
  "安裝": ["怎麼用", "使用", "環境"],
  "token": ["api", "key", "密鑰"],
  "license": ["授權", "序號", "key"],
  "聯繫": ["找誰", "問", "幫助"],
};

// ============================================================================
// 本地客服機器人
// ============================================================================
class LocalSupportBot {
  constructor() {
    this.stats = this.loadStats();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * 載入統計
   */
  loadStats() {
    try {
      if (fs.existsSync(CONFIG.statsFile)) {
        return JSON.parse(fs.readFileSync(CONFIG.statsFile, 'utf8'));
      }
    } catch (e) {}
    return { total: 0, auto: 0, pending: 0 };
  }

  /**
   * 保存統計
   */
  saveStats() {
    fs.writeFileSync(CONFIG.statsFile, JSON.stringify(this.stats, null, 2));
  }

  /**
   * 記錄對話
   */
  logConversation(user, question, answer) {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] 👤 ${user}: ${question}\n🤖 回覆: ${answer}\n---\n`;
    fs.appendFileSync(CONFIG.historyFile, log);
  }

  /**
   * 添加到待辦
   */
  addToPending(question, user = 'Guest') {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] 👤 ${user}: ${question}\n`;
    fs.appendFileSync(CONFIG.pendingFile, entry);
    this.stats.pending++;
    this.saveStats();
  }

  /**
   * 查找答案
   */
  findAnswer(question) {
    const lowerQ = question.toLowerCase();
    
    // 直接匹配
    for (const [key, answer] of Object.entries(KNOWLEDGE_BASE)) {
      if (lowerQ.includes(key)) {
        return { found: true, answer, keyword: key };
      }
    }
    
    // 同義詞匹配
    for (const [key, synonyms] of Object.entries(SYNONYMS)) {
      for (const syn of synonyms) {
        if (lowerQ.includes(syn)) {
          return { 
            found: true, 
            answer: KNOWLEDGE_BASE[key], 
            keyword: key 
          };
        }
      }
    }
    
    return { found: false };
  }

  /**
   * 處理問題
   */
  async handleQuestion(question, user = 'Guest') {
    this.stats.total++;
    
    const result = this.findAnswer(question);
    
    if (result.found) {
      this.stats.auto++;
      this.saveStats();
      this.logConversation(user, question, `[自動] ${result.keyword}`);
      
      console.log(`\n🤖 客服:\n${result.answer}\n`);
      return true;
    } else {
      this.addToPending(question, user);
      
      console.log(`\n🤖 客服:\n`);
      console.log(`抱歉，這個問題我需要轉給人工處理。`);
      console.log(`已記錄到待辦清單，請稍後回覆客戶。\n`);
      console.log(`💡 你可以告訴客戶：`);
      console.log(`   「您的問題已轉交專人處理，請稍等。」`);
      console.log(`   「或聯繫 @gousmaaa 獲得即時幫助。」\n`);
      
      return false;
    }
  }

  /**
   * 顯示待辦
   */
  showPending() {
    console.log('\n📋 待回覆問題清單：\n');
    
    if (!fs.existsSync(CONFIG.pendingFile)) {
      console.log('   目前沒有待辦問題。\n');
      return;
    }
    
    const content = fs.readFileSync(CONFIG.pendingFile, 'utf8');
    if (!content.trim()) {
      console.log('   目前沒有待辦問題。\n');
      return;
    }
    
    console.log(content);
  }

  /**
   * 顯示統計
   */
  showStats() {
    console.log('\n📊 客服統計：\n');
    console.log(`   總問題數：${this.stats.total}`);
    console.log(`   自動回覆：${this.stats.auto} (${(this.stats.auto/this.stats.total*100).toFixed(1)}%)`);
    console.log(`   待人工處理：${this.stats.pending}`);
    console.log(`   待辦檔案：${CONFIG.pendingFile}\n`);
  }

  /**
   * 清除待辦
   */
  clearPending() {
    if (fs.existsSync(CONFIG.pendingFile)) {
      fs.writeFileSync(CONFIG.pendingFile, '');
      this.stats.pending = 0;
      this.saveStats();
    }
    console.log('\n✅ 已清除所有待辦問題。\n');
  }

  /**
   * 主選單
   */
  async showMenu() {
    console.log('\n╔════════════════════════════════╗');
    console.log('║  🤖 SkillForge 本地客服機器人   ║');
    console.log('║      (完全離線版)              ║');
    console.log('╚════════════════════════════════╝\n');
    console.log('請選擇功能：');
    console.log('  1️⃣  開始客服對話');
    console.log('  2️⃣  查看待辦清單');
    console.log('  3️⃣  查看統計報表');
    console.log('  4️⃣  清除待辦清單');
    console.log('  5️⃣  查看對話記錄');
    console.log('  0️⃣  離開\n');

    const choice = await this.ask('選擇 (0-5): ');
    
    switch(choice.trim()) {
      case '1':
        await this.chatMode();
        break;
      case '2':
        this.showPending();
        break;
      case '3':
        this.showStats();
        break;
      case '4':
        const confirm = await this.ask('確定要清除所有待辦？ (yes/no): ');
        if (confirm.toLowerCase() === 'yes') {
          this.clearPending();
        }
        break;
      case '5':
        this.showHistory();
        break;
      case '0':
        console.log('\n👋 再見！\n');
        this.rl.close();
        process.exit(0);
        break;
      default:
        console.log('\n❌ 無效選擇\n');
    }
    
    await this.showMenu();
  }

  /**
   * 對話模式
   */
  async chatMode() {
    console.log('\n💬 客服模式（輸入 exit 返回主選單）\n');
    
    while (true) {
      const question = await this.ask('👤 客戶: ');
      
      if (question.toLowerCase() === 'exit') {
        console.log('');
        break;
      }
      
      await this.handleQuestion(question);
    }
  }

  /**
   * 查看歷史
   */
  showHistory() {
    console.log('\n📜 對話記錄：\n');
    
    if (!fs.existsSync(CONFIG.historyFile)) {
      console.log('   目前沒有對話記錄。\n');
      return;
    }
    
    const content = fs.readFileSync(CONFIG.historyFile, 'utf8');
    if (!content.trim()) {
      console.log('   目前沒有對話記錄。\n');
      return;
    }
    
    // 只顯示最後 20 筆
    const lines = content.split('---').filter(l => l.trim());
    const recent = lines.slice(-20);
    console.log(recent.join('---\n'));
    console.log('');
  }

  /**
   * 問問題
   */
  ask(prompt) {
    return new Promise(resolve => {
      this.rl.question(prompt, resolve);
    });
  }

  /**
   * 啟動
   */
  async start() {
    await this.showMenu();
  }
}

// ============================================================================
// 主程式
// ============================================================================
async function main() {
  const bot = new LocalSupportBot();
  await bot.start();
}

main().catch(console.error);