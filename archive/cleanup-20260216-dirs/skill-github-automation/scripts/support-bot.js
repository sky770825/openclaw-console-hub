#!/usr/bin/env node
/**
 * SkillForge 客服機器人
 * 使用 Ollama 本地模型處理常見問題，完全免費！
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// 知識庫 - 常見問題與回答
// ============================================================================
const KNOWLEDGE_BASE = {
  // 產品相關
  product: {
    "這是什麼": "這是 SkillForge GitHub Automation Skill，一個讓 AI 自動管理 GitHub 專案的工具，支援 Issue、PR、Release 自動化。",
    "有什麼功能": "四大功能：1) Issue 自動化 2) PR 審查輔助 3) Release 自動化 4) Repo 分析。詳見 https://skillforge.dev/github-automation",
    "支援哪些版本": "Lite (USDT 20)、Pro (USDT 50)、Enterprise (USDT 200)，功能逐級增加。",
    "怎麼使用": "安裝後用 SkillConfigBuilder 建立設定，然後呼叫 skill.execute() 執行動作。完整範例在 SKILL.md",
    "支援 GitHub Enterprise 嗎": "Enterprise 版支援 GitHub Enterprise Server，需額外設定 baseUrl。",
    "有試用版嗎": "目前沒有試用版，但 Lite 版 USDT 20 已經很划算，可以先買來體驗。",
  },
  
  // 購買相關
  purchase: {
    "怎麼購買": "1) 選擇版本 2) 轉帳 USDT (TRC-20) 到 TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD 3) 截圖付款記錄 4) 發給 @gousmaaa 5) 24小時內收到 License Key",
    "付款方式": "僅接受 USDT (TRC-20)，錢包地址：TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD。請務必使用 TRC-20 網路！",
    "轉帳地址": "USDT (TRC-20) 錢包地址：TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD。請務必確認使用 TRC-20 網路，否則資金可能遺失！",
    "USDT 地址": "TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD（僅限 TRC-20 網路）",
    "可以退費嗎": "數位產品售出後不接受退費，購買前請確認需求。如有重大問題請聯繫客服。",
    "多久收到 License": "通常在 24 小時內發送，工作時間（週一至週五 9:00-18:00）可能更快。",
    "沒收到 License": "請檢查垃圾郵件，或聯繫 @gousmaaa 提供付款截圖查詢。",
    "推薦碼怎麼用": "購買後會收到專屬推薦碼，朋友購買時提供你的推薦碼，雙方各得 USDT 5 回饋！",
    "推薦有上限嗎": "無上限！推薦 4 人=免費 Lite，推薦 10 人=免費 Pro，推薦 40 人=免費 Enterprise。",
    "推薦有什麼好處": "推薦朋友購買，你和你的朋友各得 USDT 5 回饋！無上限，推薦越多賺越多。",
    "分潤": "推薦成功後，推薦人和被推薦人各得 USDT 5。推薦 10 人就能免費獲得 Pro 版！",
  },
  
  // 技術相關
  technical: {
    "需要什麼環境": "Node.js 18+，支援 TypeScript。需要 GitHub Personal Access Token。",
    "Token 怎麼申請": "到 GitHub Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token，勾選 repo 權限。",
    "支援哪些語言": "核心使用 TypeScript，支援 JavaScript 專案。提供完整類型定義。",
    "會洩漏我的程式碼嗎": "不會。Token 只存在你的本地環境，所有 API 呼叫都使用 HTTPS。",
    "Rate Limit 會超過嗎": "GitHub API 有 Rate Limit，Skill 會自動節流並在接近限制時警告。",
    "遇到錯誤怎麼辦": "1) 確認 Token 權限 2) 檢查網路連線 3) 查看錯誤訊息 4) 聯繫客服提供錯誤截圖",
    "怎麼更新": "npm update @skillforge/github-automation，或重新安裝最新版本。",
  },
  
  // 授權相關
  license: {
    "License 可以轉讓嗎": "License 綁定購買時提供的 Email，不可轉讓。",
    "可以在多台機器使用嗎": "可以，同一個 License Key 可以在你的開發環境中使用。",
    "公司可以用嗎": "Enterprise 版支援團隊使用，Pro/Lite 為個人授權。",
    "License 會過期嗎": "一次性購買，永久使用，終身免費更新。",
  },
  
  // 聯繫方式
  contact: {
    "怎麼聯繫客服": "Telegram: @gousmaaa，工作時間內通常 1-2 小時回覆。",
    "有 Discord 嗎": "Enterprise 版提供專屬 Slack 頻道，一般支援請使用 Telegram。",
    "有電話嗎": "目前僅提供 Telegram 文字支援，無電話客服。",
  }
};

// ============================================================================
// 關鍵字匹配
// ============================================================================
const KEYWORDS = {
  "購買|付款|轉帳|USDT|錢包|怎麼買|多少錢|價格": "purchase",
  "功能|支援|什麼是|介紹|特色|做什麼|幹嘛": "product",
  "安裝|環境|Token|API|錯誤|技術|使用|怎麼用": "technical",
  "License|授權|轉讓|過期|key|序號": "license",
  "聯繫|客服|支援|幫助|問|找誰": "contact",
  "推薦|分潤|邀請|分享|推薦碼|回饋": "purchase",
};

// ============================================================================
// 客服機器人核心
// ============================================================================
class SkillForgeBot {
  constructor() {
    this.conversationHistory = [];
    this.stats = {
      totalQueries: 0,
      matchedQueries: 0,
      fallbackQueries: 0
    };
  }

  /**
   * 分析問題類別
   */
  categorizeQuestion(question) {
    const lowerQ = question.toLowerCase();
    
    for (const [pattern, category] of Object.entries(KEYWORDS)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(lowerQ)) {
        return category;
      }
    }
    
    return 'unknown';
  }

  /**
   * 查找最匹配的回答
   */
  findBestAnswer(question, category) {
    if (category === 'unknown' || !KNOWLEDGE_BASE[category]) {
      return null;
    }
    
    const qaPairs = KNOWLEDGE_BASE[category];
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [q, a] of Object.entries(qaPairs)) {
      const score = this.calculateSimilarity(question, q);
      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = { question: q, answer: a, score };
      }
    }
    
    return bestMatch;
  }

  /**
   * 簡易相似度計算（支援中文）
   */
  calculateSimilarity(q1, q2) {
    // 簡單的關鍵字匹配
    const keywords1 = this.extractKeywords(q1);
    const keywords2 = this.extractKeywords(q2);
    
    let matchCount = 0;
    for (const kw of keywords1) {
      if (keywords2.some(k => k.includes(kw) || kw.includes(k))) {
        matchCount++;
      }
    }
    
    return matchCount / Math.max(keywords1.length, keywords2.length);
  }

  /**
   * 提取關鍵字
   */
  extractKeywords(text) {
    // 移除標點，分段
    const cleaned = text.toLowerCase()
      .replace(/[?？.。,，!！]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // 中文以字為單位，但過濾單字
    const chars = cleaned.split('');
    const keywords = [];
    
    // 提取 2-4 字詞組
    for (let i = 0; i < chars.length - 1; i++) {
      if (/[\u4e00-\u9fa5]/.test(chars[i])) {
        keywords.push(chars[i] + chars[i+1]);
        if (i < chars.length - 2) keywords.push(chars[i] + chars[i+1] + chars[i+2]);
      }
    }
    
    // 也保留完整詞
    keywords.push(...cleaned.split(' ').filter(w => w.length >= 2));
    
    return [...new Set(keywords)];
  }

  /**
   * 生成回覆
   */
  async generateReply(userMessage) {
    this.stats.totalQueries++;
    
    const category = this.categorizeQuestion(userMessage);
    const match = this.findBestAnswer(userMessage, category);
    
    if (match) {
      this.stats.matchedQueries++;
      return {
        type: 'matched',
        answer: match.answer,
        confidence: match.score,
        category: category,
        matchedQuestion: match.question
      };
    }
    
    // 無匹配時的預設回覆
    this.stats.fallbackQueries++;
    return {
      type: 'fallback',
      answer: `抱歉，我可能沒完全理解您的問題 🤔\n\n您可以嘗試：\n1. 換個方式描述問題\n2. 查看完整文件：https://skillforge.dev/github-automation\n3. 聯繫人工客服：@gousmaaa\n\n常見問題關鍵字：購買、功能、安裝、License、推薦`,
      category: 'unknown'
    };
  }

  /**
   * 互動模式
   */
  async interactive() {
    console.log('\n🤖 SkillForge 客服機器人已啟動！');
    console.log('輸入問題，或輸入 "quit" 結束\n');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = () => {
      readline.question('👤 客戶: ', async (input) => {
        if (input.toLowerCase() === 'quit') {
          this.printStats();
          readline.close();
          return;
        }

        const reply = await this.generateReply(input);
        console.log(`\n🤖 客服: ${reply.answer}\n`);
        
        askQuestion();
      });
    };

    askQuestion();
  }

  /**
   * 批次處理問題清單
   */
  async batchProcess(questions) {
    console.log('\n🤖 批次處理模式\n');
    
    for (const question of questions) {
      console.log(`👤 客戶: ${question}`);
      const reply = await this.generateReply(question);
      console.log(`🤖 客服: ${reply.answer}`);
      console.log(`   [類別: ${reply.category}, 信心度: ${reply.confidence?.toFixed(2) || 'N/A'}]\n`);
    }
    
    this.printStats();
  }

  /**
   * 顯示統計
   */
  printStats() {
    console.log('\n📊 客服統計');
    console.log(`   總問題數: ${this.stats.totalQueries}`);
    console.log(`   自動回答: ${this.stats.matchedQueries} (${(this.stats.matchedQueries/this.stats.totalQueries*100).toFixed(1)}%)`);
    console.log(`   轉人工: ${this.stats.fallbackQueries} (${(this.stats.fallbackQueries/this.stats.totalQueries*100).toFixed(1)}%)`);
  }
}

// ============================================================================
// 主程式
// ============================================================================
async function main() {
  const bot = new SkillForgeBot();
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // 互動模式
    await bot.interactive();
  } else if (args[0] === '--test') {
    // 測試模式 - 使用預設問題
    const testQuestions = [
      "請問要怎麼購買？",
      "這個產品有什麼功能？",
      "USDT 要轉到哪裡？",
      "License 會過期嗎？",
      "推薦朋友有什麼好處？",
      "安裝需要什麼環境？",
      "這是什麼奇怪的問題機器人聽不懂"
    ];
    await bot.batchProcess(testQuestions);
  } else {
    // 單一問題模式
    const question = args.join(' ');
    const reply = await bot.generateReply(question);
    console.log(reply.answer);
  }
}

// 執行
main().catch(console.error);