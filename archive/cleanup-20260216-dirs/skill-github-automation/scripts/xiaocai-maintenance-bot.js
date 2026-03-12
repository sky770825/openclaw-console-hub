#!/usr/bin/env node
/**
 * 小蔡維護助手 Telegram Bot
 * 透過 Telegram 隨時隨地維護小蔡系統
 *
 * 使用方法：
 * export XIAOCAI_BOT_TOKEN="你的Bot_Token"
 * export ADMIN_CHAT_ID="你的Chat_ID"
 * node xiaocai-maintenance-bot.js
 */

const https = require('https');
const http = require('http');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 設定
const BOT_TOKEN = process.env.XIAOCAI_BOT_TOKEN || process.env.SKILLFORGE_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '5819565005';
const WORKSPACE = process.env.HOME + '/.openclaw/workspace';

if (!BOT_TOKEN) {
  console.error('❌ 請設定環境變數 XIAOCAI_BOT_TOKEN 或 SKILLFORGE_BOT_TOKEN');
  process.exit(1);
}

// ============================================================================
// 工具函數
// ============================================================================

/**
 * 執行 shell 指令
 */
function executeCommand(command, cwd = WORKSPACE) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, output: stderr || error.message });
      } else {
        resolve({ success: true, output: stdout });
      }
    });
  });
}

/**
 * 執行腳本
 */
function executeScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(WORKSPACE, 'scripts', scriptPath);

    if (!fs.existsSync(fullPath)) {
      return resolve({ success: false, output: `腳本不存在: ${scriptPath}` });
    }

    let output = '';
    let errorOutput = '';

    const proc = spawn(fullPath, args, {
      cwd: WORKSPACE,
      env: { ...process.env, PATH: process.env.PATH }
    });

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      // 移除 ANSI 顏色碼
      const cleanOutput = (output + errorOutput).replace(/\x1b\[[0-9;]*m/g, '');

      resolve({
        success: code === 0,
        output: cleanOutput.trim(),
        exitCode: code
      });
    });

    proc.on('error', (err) => {
      resolve({ success: false, output: err.message });
    });

    // 超時保護
    setTimeout(() => {
      proc.kill();
      resolve({ success: false, output: '執行超時（60秒）' });
    }, 60000);
  });
}

// ============================================================================
// Ollama API 客戶端（用於一般對話）
// ============================================================================
class OllamaClient {
  constructor(host = 'localhost', port = 11434, model = 'llama3.2:latest') {
    this.host = host;
    this.port = port;
    this.model = model;
  }

  async generate(prompt, system = '') {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: this.model,
        prompt: prompt,
        system: system || '你是小蔡的維護助手。可以回答關於小蔡系統的問題。回答要簡潔友善。',
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 300
        }
      });

      const contentLength = Buffer.byteLength(postData, 'utf8');
      const options = {
        hostname: this.host,
        port: this.port,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': contentLength
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const response = json.response || json.text || '';

            if (!response || typeof response !== 'string' || response.trim().length === 0) {
              reject(new Error('Ollama 未返回有效回應'));
              return;
            }

            resolve(response);
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
}

// ============================================================================
// Telegram Bot 核心
// ============================================================================
class TelegramBot {
  constructor(token) {
    this.token = token;
    this.lastUpdateId = 0;
    this.ollama = new OllamaClient();
  }

  async api(method, params = {}) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(params);

      // Debug: log what we're sending
      if (method === 'sendMessage') {
        console.log('🔍 API 發送參數:', JSON.stringify({
          chat_id: params.chat_id,
          text_length: params.text ? params.text.length : 0,
          text_preview: params.text ? params.text.substring(0, 50) : 'null',
          parse_mode: params.parse_mode
        }));
        console.log('🔍 postData 字符長度:', postData.length);
        console.log('🔍 postData 字節長度:', Buffer.byteLength(postData));
        console.log('🔍 postData 內容 (前300字):', postData.substring(0, 300));
      }

      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.token}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(postData, 'utf8')
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
    if (!text || typeof text !== 'string') {
      console.error('sendMessage: 無效文字');
      return;
    }

    // 分段發送長訊息
    const maxLength = 4000;
    if (text.length > maxLength) {
      const parts = [];
      let current = '';
      const lines = text.split('\n');

      for (const line of lines) {
        if ((current + line + '\n').length > maxLength) {
          parts.push(current);
          current = line + '\n';
        } else {
          current += line + '\n';
        }
      }
      if (current) parts.push(current);

      for (const part of parts) {
        const params = {
          chat_id: chatId,
          text: part,
          ...options
        };
        if (part.includes('*') || part.includes('_') || part.includes('`')) {
          params.parse_mode = 'Markdown';
        }

        await this.api('sendMessage', params);
        await new Promise(r => setTimeout(r, 500));
      }
      return;
    }

    const params = {
      chat_id: chatId,
      text: text,
      ...options
    };
    if (text.includes('*') || text.includes('_') || text.includes('`')) {
      params.parse_mode = 'Markdown';
    }

    return await this.api('sendMessage', params);
  }

  // 權限檢查
  isAdmin(chatId) {
    return chatId.toString() === ADMIN_CHAT_ID.toString();
  }

  async handleUpdate(update) {
    if (!update.message) return;

    const msg = update.message;
    const chatId = msg.chat.id;
    const text = msg.text || '';
    const from = msg.from;

    // 記錄
    console.log(`📨 來自 ${from.username || from.first_name} (${chatId}): ${text.substring(0, 50)}`);

    // 權限檢查
    if (!this.isAdmin(chatId)) {
      await this.sendMessage(chatId, '❌ 你沒有權限使用此 Bot');
      return;
    }

    // 所有消息都直接用Ollama回答，不處理命令
    await this.handleChat(chatId, text);
  }

  async handleChat(chatId, text) {
    // 發送「思考中」提示
    await this.api('sendChatAction', {
      chat_id: chatId,
      action: 'typing'
    });

    try {
      // 使用 Ollama 生成回覆
      const response = await this.ollama.generate(text);

      if (!response || typeof response !== 'string') {
        throw new Error('Ollama 返回無效回應');
      }

      // 清理回應（移除思考過程標籤）
      const cleanResponse = response
        .replace(/<think>.*?<\/think>/gs, '')
        .replace(/\r/g, '')
        .trim();

      if (cleanResponse.length === 0) {
        throw new Error('Ollama 回應為空');
      }

      // 發送回覆
      await this.sendMessage(chatId, cleanResponse);
    } catch (err) {
      console.error('Ollama 錯誤:', err.message);
    }
  }

  async handleCommand(chatId, text, from) {
    const parts = text.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    try {
      switch (command) {
        case '/start':
          await this.cmdStart(chatId, from);
          break;
        case '/help':
          await this.cmdHelp(chatId);
          break;
        case '/health':
          await this.cmdHealth(chatId);
          break;
        case '/fix':
          await this.cmdFix(chatId, args);
          break;
        case '/memory':
          await this.cmdMemory(chatId, args);
          break;
        case '/tasks':
          await this.cmdTasks(chatId, args);
          break;
        case '/status':
          await this.cmdStatus(chatId, args);
          break;
        case '/bots':
          await this.cmdBots(chatId, args);
          break;
        case '/quick':
          await this.cmdQuick(chatId, args);
          break;
        default:
          await this.sendMessage(chatId,
            `❓ 未知指令: ${command}\n\n使用 /help 查看可用指令`
          );
      }
    } catch (err) {
      console.error('指令執行錯誤:', err);
      await this.sendMessage(chatId, `❌ 執行錯誤: ${err.message}`);
    }
  }

  // ============================================================================
  // 指令實現
  // ============================================================================

  async cmdStart(chatId, from) {
    // 創建按鈕式選單
    const keyboard = {
      keyboard: [
        [
          { text: '🏥 健康檢查' },
          { text: '📊 系統狀態' }
        ],
        [
          { text: '🔧 修復問題' },
          { text: '🧠 記憶系統' }
        ],
        [
          { text: '📝 查看任務' },
          { text: '🤖 Bot 管理' }
        ],
        [
          { text: '⚡ 快速操作' },
          { text: '📚 指令說明' }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };

    await this.sendMessage(chatId,
      `👋 你好 ${from.first_name}！\n\n` +
      `🤖 我是小蔡的 AI 助手 @ollama168bot\n\n` +
      `我有兩種模式：\n\n` +
      `💬 *聊天模式*\n` +
      `直接跟我說話，我會用本地 Ollama 回答你的問題。\n\n` +
      `🔧 *維護模式*\n` +
      `點擊下方按鈕快速執行維護功能！\n\n` +
      `🧠 由本地 Ollama 驅動，完全免費！`,
      { reply_markup: keyboard }
    );
  }

  async cmdHelp(chatId) {
    await this.sendMessage(chatId,
      `📚 小蔡維護助手 - 指令列表\n\n` +
      `🏥 *健康與狀態*\n` +
      `/health - 系統健康檢查\n` +
      `/status [all|ollama|memory|bots] - 查看系統狀態\n\n` +
      `🔧 *修復功能*\n` +
      `/fix bots - 修復 Telegram Bots\n` +
      `/fix memory - 修復記憶系統\n` +
      `/fix all - 全系統檢測修復\n\n` +
      `🧠 *記憶系統*\n` +
      `/memory status - 記憶系統狀態\n` +
      `/memory server [start|stop|status] - 記憶服務器管理\n` +
      `/memory index - 觸發向量索引\n` +
      `/memory search <關鍵字> - 智能召回搜尋\n\n` +
      `📝 *任務管理*\n` +
      `/tasks recent - 最近 10 筆任務\n` +
      `/tasks today - 今日任務\n` +
      `/tasks search <關鍵字> - 搜尋任務\n\n` +
      `🤖 *Bot 管理*\n` +
      `/bots list - 列出所有 Bot\n` +
      `/bots status - 檢查 Bot 狀態\n` +
      `/bots logs <name> - 查看 Bot 日誌\n\n` +
      `⚡ *快速指令*\n` +
      `/quick backup - 立即備份\n` +
      `/quick clean - 清理臨時檔案\n\n` +
      `💡 提示: 大部分指令支援子參數，試試看！`
    );
  }

  async cmdHealth(chatId) {
    await this.sendMessage(chatId, '🔍 正在檢查系統健康狀態...');

    let report = '🏥 *小蔡健康檢查報告*\n\n';
    let warnings = 0;
    let errors = 0;

    // 檢查 Ollama
    const ollama = await executeCommand('curl -s http://localhost:11434/api/tags');
    if (ollama.success) {
      try {
        const data = JSON.parse(ollama.output);
        const modelCount = data.models ? data.models.length : 0;
        report += `✅ *Ollama*: 正常 (${modelCount} 個模型)\n`;
      } catch (e) {
        report += `⚠️ *Ollama*: 運行中但回應異常\n`;
        warnings++;
      }
    } else {
      report += `❌ *Ollama*: 未運行\n`;
      errors++;
    }

    // 檢查 Qdrant
    const qdrant = await executeCommand('curl -s http://localhost:6333/collections/memory_smart_chunks');
    if (qdrant.success) {
      try {
        const data = JSON.parse(qdrant.output);
        const points = data.result?.points_count || 0;
        report += `✅ *Qdrant*: 正常 (${points} chunks)\n`;
      } catch (e) {
        report += `⚠️ *Qdrant*: 運行中但回應異常\n`;
        warnings++;
      }
    } else {
      report += `❌ *Qdrant*: 未運行\n`;
      errors++;
    }

    // 檢查 OpenClaw Gateway
    const gateway = await executeCommand('openclaw status');
    if (gateway.success && gateway.output.includes('Gateway: reachable')) {
      report += `✅ *OpenClaw Gateway*: 正常\n`;
    } else {
      report += `⚠️ *OpenClaw Gateway*: 異常\n`;
      warnings++;
    }

    // 檢查 PM2 ai-bot
    const pm2 = await executeCommand('pm2 jlist');
    if (pm2.success) {
      try {
        const processes = JSON.parse(pm2.output);
        const aiBot = processes.find(p => p.name === 'ai-bot');
        if (aiBot && aiBot.pm2_env.status === 'online') {
          report += `✅ *PM2 ai-bot*: 正常\n`;
        } else {
          report += `⚠️ *PM2 ai-bot*: 未運行或異常\n`;
          warnings++;
        }
      } catch (e) {
        report += `⚠️ *PM2*: 無法解析狀態\n`;
        warnings++;
      }
    } else {
      report += `❌ *PM2*: 未安裝或異常\n`;
      errors++;
    }

    // 檢查記憶記錄服務器
    const memoryServer = await executeCommand('curl -s http://localhost:8765/health');
    if (memoryServer.success) {
      report += `✅ *記憶記錄服務器*: 正常\n`;
    } else {
      report += `⚠️ *記憶記錄服務器*: 未運行\n`;
      warnings++;
    }

    // 檢查磁碟空間
    const disk = await executeCommand('df -h ~ | tail -1');
    if (disk.success) {
      const parts = disk.output.split(/\s+/);
      const available = parts[3];
      report += `✅ *磁碟空間*: ${available} 可用\n`;
    }

    // 總評
    report += '\n';
    if (errors === 0 && warnings === 0) {
      report += `📊 *總評*: 🎉 完美！所有系統正常\n`;
    } else if (errors === 0) {
      report += `📊 *總評*: ⚠️ 良好 (${warnings} 個警告)\n`;
    } else {
      report += `📊 *總評*: ❌ 需要注意 (${errors} 個錯誤, ${warnings} 個警告)\n`;
    }

    if (warnings > 0 || errors > 0) {
      report += `\n💡 *建議*: 使用 /fix all 自動修復`;
    }

    await this.sendMessage(chatId, report);
  }

  async cmdFix(chatId, args) {
    const target = args[0] || 'help';

    if (target === 'help' || !target) {
      await this.sendMessage(chatId,
        `🔧 *修復功能*\n\n` +
        `可用選項：\n` +
        `/fix bots - 修復 Telegram Bots\n` +
        `/fix memory - 修復記憶系統\n` +
        `/fix gateway - 修復 OpenClaw Gateway\n` +
        `/fix all - 全系統檢測修復`
      );
      return;
    }

    await this.sendMessage(chatId, `🔧 開始修復: ${target}...`);

    let result;
    switch (target) {
      case 'bots':
        result = await executeScript('recover-telegram-bots.sh');
        break;
      case 'memory':
        result = await executeScript('memory-record-ctl.sh', ['restart']);
        break;
      case 'gateway':
        result = await executeCommand('openclaw doctor --fix && openclaw restart');
        break;
      case 'all':
        await this.sendMessage(chatId, '📋 執行全系統檢測...\n這可能需要 1-2 分鐘');
        result = await executeScript('recover-telegram-bots.sh');
        const memResult = await executeScript('memory-record-ctl.sh', ['start']);
        result.output += '\n\n' + memResult.output;
        break;
      default:
        await this.sendMessage(chatId, `❌ 未知修復目標: ${target}`);
        return;
    }

    if (result.success) {
      await this.sendMessage(chatId,
        `✅ *修復完成*\n\n` +
        `\`\`\`\n${result.output.substring(0, 3000)}\`\`\``
      );
    } else {
      await this.sendMessage(chatId,
        `❌ *修復失敗*\n\n` +
        `\`\`\`\n${result.output.substring(0, 3000)}\`\`\``
      );
    }
  }

  async cmdMemory(chatId, args) {
    const action = args[0] || 'help';

    if (action === 'help' || !action) {
      await this.sendMessage(chatId,
        `🧠 *記憶系統管理*\n\n` +
        `可用選項：\n` +
        `/memory status - 記憶系統狀態\n` +
        `/memory server [start|stop|status] - 服務器管理\n` +
        `/memory index - 觸發向量索引\n` +
        `/memory search <關鍵字> - 智能召回\n`
      );
      return;
    }

    switch (action) {
      case 'status':
        await this.memoryStatus(chatId);
        break;
      case 'server':
        await this.memoryServer(chatId, args[1] || 'status');
        break;
      case 'index':
        await this.memoryIndex(chatId);
        break;
      case 'search':
        if (!args[1]) {
          await this.sendMessage(chatId, '❌ 請提供搜尋關鍵字\n\n用法: /memory search <關鍵字>');
          return;
        }
        await this.memorySearch(chatId, args.slice(1).join(' '));
        break;
      default:
        await this.sendMessage(chatId, `❌ 未知操作: ${action}`);
    }
  }

  async memoryStatus(chatId) {
    let report = '🧠 *記憶系統狀態*\n\n';

    // Qdrant 狀態
    const qdrant = await executeCommand('curl -s http://localhost:6333/collections/memory_smart_chunks');
    if (qdrant.success) {
      try {
        const data = JSON.parse(qdrant.output);
        const points = data.result?.points_count || 0;
        report += `📦 *向量資料庫*: ${points} chunks\n`;
      } catch (e) {
        report += `⚠️ *向量資料庫*: 回應異常\n`;
      }
    } else {
      report += `❌ *向量資料庫*: 未運行\n`;
    }

    // 索引歷史
    const historyPath = path.join(WORKSPACE, 'memory/autopilot-results/indexing-history.md');
    if (fs.existsSync(historyPath)) {
      const content = fs.readFileSync(historyPath, 'utf-8');
      const match = content.match(/### (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
      if (match) {
        report += `⏰ *上次索引*: ${match[1]}\n`;
      }
    }

    // 記憶服務器
    const server = await executeCommand('curl -s http://localhost:8765/health');
    if (server.success) {
      report += `✅ *記憶服務器*: 運行中\n`;
    } else {
      report += `⚠️ *記憶服務器*: 未運行\n`;
      report += `\n💡 使用 /memory server start 啟動`;
    }

    await this.sendMessage(chatId, report);
  }

  async memoryServer(chatId, action) {
    await this.sendMessage(chatId, `🔄 正在執行: ${action}...`);

    const result = await executeScript('memory-record-ctl.sh', [action]);

    if (result.success) {
      await this.sendMessage(chatId,
        `✅ *操作完成*\n\n` +
        `\`\`\`\n${result.output.substring(0, 2000)}\`\`\``
      );
    } else {
      await this.sendMessage(chatId,
        `❌ *操作失敗*\n\n` +
        `\`\`\`\n${result.output.substring(0, 2000)}\`\`\``
      );
    }
  }

  async memoryIndex(chatId) {
    await this.sendMessage(chatId,
      `🔍 檢查是否需要索引...\n` +
      `⏱️ 這可能需要 1-2 分鐘`
    );

    const result = await executeScript('auto-index-trigger.sh');

    if (result.success) {
      await this.sendMessage(chatId,
        `✅ *索引完成*\n\n` +
        `\`\`\`\n${result.output.substring(0, 2000)}\`\`\``
      );
    } else {
      await this.sendMessage(chatId,
        `❌ *索引失敗*\n\n` +
        `\`\`\`\n${result.output.substring(0, 2000)}\`\`\``
      );
    }
  }

  async memorySearch(chatId, query) {
    await this.sendMessage(chatId, `🔍 搜尋記憶: ${query}...`);

    const result = await executeScript('recall', [query]);

    if (result.success) {
      await this.sendMessage(chatId,
        `🧠 *智能召回結果*\n\n` +
        `查詢: \`${query}\`\n\n` +
        `${result.output.substring(0, 3500)}`
      );
    } else {
      await this.sendMessage(chatId,
        `❌ 搜尋失敗: ${result.output.substring(0, 1000)}`
      );
    }
  }

  async cmdTasks(chatId, args) {
    const action = args[0] || 'recent';
    const taskHistoryPath = path.join(WORKSPACE, 'memory/autopilot-results/task-history.md');

    if (!fs.existsSync(taskHistoryPath)) {
      await this.sendMessage(chatId, '❌ 找不到任務歷史檔案');
      return;
    }

    const content = fs.readFileSync(taskHistoryPath, 'utf-8');
    const tasks = content.match(/### \d{4}-\d{2}-\d{2}.*?(?=### |\n\n\n|$)/gs) || [];

    switch (action) {
      case 'recent':
        const recent = tasks.slice(0, 10);
        let report = `📝 *最近任務* (前 ${recent.length} 筆)\n\n`;

        recent.forEach((task, i) => {
          const lines = task.split('\n').filter(l => l.trim());
          const title = lines[0].replace(/^### /, '');
          const status = lines[1] || '';
          const summary = lines[2] || '';

          report += `${i + 1}. ${title}\n`;
          report += `   ${status}\n`;
          if (summary) report += `   ${summary}\n`;
          report += '\n';
        });

        await this.sendMessage(chatId, report);
        break;

      case 'today':
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = tasks.filter(t => t.includes(today));

        if (todayTasks.length === 0) {
          await this.sendMessage(chatId, '📝 今日無任務記錄');
        } else {
          let todayReport = `📝 *今日任務* (${todayTasks.length} 筆)\n\n`;
          todayTasks.forEach((task, i) => {
            const lines = task.split('\n').filter(l => l.trim());
            todayReport += `${i + 1}. ${lines[0].replace(/^### /, '')}\n`;
            todayReport += `   ${lines[1] || ''}\n\n`;
          });
          await this.sendMessage(chatId, todayReport);
        }
        break;

      case 'search':
        if (!args[1]) {
          await this.sendMessage(chatId, '❌ 請提供搜尋關鍵字');
          return;
        }
        const keyword = args.slice(1).join(' ');
        const matched = tasks.filter(t => t.toLowerCase().includes(keyword.toLowerCase()));

        if (matched.length === 0) {
          await this.sendMessage(chatId, `📝 找不到包含「${keyword}」的任務`);
        } else {
          let searchReport = `📝 *搜尋結果* (${matched.length} 筆)\n\n`;
          matched.slice(0, 10).forEach((task, i) => {
            const lines = task.split('\n').filter(l => l.trim());
            searchReport += `${i + 1}. ${lines[0].replace(/^### /, '')}\n`;
            searchReport += `   ${lines[1] || ''}\n\n`;
          });
          if (matched.length > 10) {
            searchReport += `\n... 還有 ${matched.length - 10} 筆結果`;
          }
          await this.sendMessage(chatId, searchReport);
        }
        break;

      default:
        await this.sendMessage(chatId,
          `📝 *任務管理*\n\n` +
          `可用選項：\n` +
          `/tasks recent - 最近 10 筆任務\n` +
          `/tasks today - 今日任務\n` +
          `/tasks search <關鍵字> - 搜尋任務`
        );
    }
  }

  async cmdStatus(chatId, args) {
    const target = args[0] || 'all';

    await this.sendMessage(chatId, `📊 查詢狀態: ${target}...`);

    let report = '';

    if (target === 'all' || target === 'ollama') {
      const ollama = await executeCommand('curl -s http://localhost:11434/api/tags');
      if (ollama.success) {
        try {
          const data = JSON.parse(ollama.output);
          report += `🤖 *Ollama*\n`;
          report += `├─ 狀態: ✅ 運行中\n`;
          report += `├─ 模型: ${data.models?.length || 0} 個\n`;

          if (data.models && data.models.length > 0) {
            report += `└─ 已載入:\n`;
            data.models.slice(0, 5).forEach(m => {
              const sizeGB = (m.size / 1024 / 1024 / 1024).toFixed(1);
              report += `   • ${m.name} (${sizeGB}GB)\n`;
            });
            if (data.models.length > 5) {
              report += `   ... 還有 ${data.models.length - 5} 個模型\n`;
            }
          }
          report += '\n';
        } catch (e) {
          report += `🤖 *Ollama*: ⚠️ 回應異常\n\n`;
        }
      } else {
        report += `🤖 *Ollama*: ❌ 未運行\n\n`;
      }
    }

    if (target === 'all' || target === 'bots') {
      report += `📡 *Telegram Bots*\n`;

      // 檢查 PM2
      const pm2 = await executeCommand('pm2 jlist');
      if (pm2.success) {
        try {
          const processes = JSON.parse(pm2.output);
          const aiBot = processes.find(p => p.name === 'ai-bot');
          if (aiBot) {
            const status = aiBot.pm2_env.status === 'online' ? '✅' : '❌';
            report += `├─ @caij_n8n_bot: ${status} ${aiBot.pm2_env.status}\n`;
          }
        } catch (e) {
          report += `├─ @caij_n8n_bot: ⚠️ 無法檢查\n`;
        }
      }

      // 檢查 Gateway
      const gateway = await executeCommand('openclaw status');
      if (gateway.success && gateway.output.includes('Gateway: reachable')) {
        report += `├─ @xiaoji_cai_bot: ✅ 正常\n`;
      } else {
        report += `├─ @xiaoji_cai_bot: ⚠️ 異常\n`;
      }

      report += `└─ @ollama168bot: ✅ 正常 (你在這裡)\n\n`;
    }

    if (report) {
      await this.sendMessage(chatId, report);
    } else {
      await this.sendMessage(chatId, `❌ 未知狀態目標: ${target}`);
    }
  }

  async cmdBots(chatId, args) {
    const action = args[0] || 'list';

    switch (action) {
      case 'list':
      case 'status':
        let report = '🤖 *Telegram Bots 列表*\n\n';

        // PM2 ai-bot
        const pm2 = await executeCommand('pm2 jlist');
        if (pm2.success) {
          try {
            const processes = JSON.parse(pm2.output);
            const aiBot = processes.find(p => p.name === 'ai-bot');
            if (aiBot) {
              const status = aiBot.pm2_env.status === 'online' ? '✅' : '❌';
              report += `1. *@caij_n8n_bot*\n`;
              report += `   └─ 狀態: ${status} ${aiBot.pm2_env.status}\n`;
              report += `   └─ 服務: PM2 ai-bot\n`;
              report += `   └─ Uptime: ${Math.floor(aiBot.pm2_env.pm_uptime / 1000 / 60)} 分鐘\n\n`;
            }
          } catch (e) {
            report += `1. *@caij_n8n_bot*: ⚠️ 無法檢查\n\n`;
          }
        }

        // Gateway
        const gateway = await executeCommand('openclaw status');
        if (gateway.success) {
          const status = gateway.output.includes('Gateway: reachable') ? '✅' : '⚠️';
          report += `2. *@xiaoji_cai_bot*\n`;
          report += `   └─ 狀態: ${status}\n`;
          report += `   └─ 服務: OpenClaw Gateway\n\n`;
        }

        report += `3. *@ollama168bot*\n`;
        report += `   └─ 狀態: ✅ 正常 (你在這裡)\n`;
        report += `   └─ 服務: PM2 xiaocai-bot\n\n`;

        report += `💡 使用 /bots logs <name> 查看日誌`;

        await this.sendMessage(chatId, report);
        break;

      case 'logs':
        const botName = args[1];
        if (!botName) {
          await this.sendMessage(chatId, '❌ 請指定 Bot 名稱\n\n用法: /bots logs ai-bot');
          return;
        }

        const logs = await executeCommand(`pm2 logs ${botName} --lines 20 --nostream`);
        if (logs.success) {
          await this.sendMessage(chatId,
            `📜 *${botName} 日誌*\n\n` +
            `\`\`\`\n${logs.output.substring(0, 3000)}\`\`\``
          );
        } else {
          await this.sendMessage(chatId, `❌ 無法取得日誌: ${logs.output}`);
        }
        break;

      default:
        await this.sendMessage(chatId,
          `🤖 *Bot 管理*\n\n` +
          `可用選項：\n` +
          `/bots list - 列出所有 Bot\n` +
          `/bots status - 檢查 Bot 狀態\n` +
          `/bots logs <name> - 查看日誌`
        );
    }
  }

  async cmdQuick(chatId, args) {
    const action = args[0] || 'help';

    if (action === 'help') {
      await this.sendMessage(chatId,
        `⚡ *快速指令*\n\n` +
        `可用選項：\n` +
        `/quick backup - 立即備份核心檔案\n` +
        `/quick clean - 清理臨時檔案\n` +
        `/quick restart - 重啟所有服務`
      );
      return;
    }

    switch (action) {
      case 'backup':
        await this.sendMessage(chatId, '💾 開始備份核心檔案...');

        const backupDir = path.join(process.env.HOME, 'Desktop/小蔡/backups',
          new Date().toISOString().split('T')[0] + '-' +
          new Date().toTimeString().split(' ')[0].replace(/:/g, '')
        );

        const backupCmd = `mkdir -p "${backupDir}" && ` +
          `cp ~/.openclaw/workspace/MEMORY.md "${backupDir}/" && ` +
          `cp ~/.openclaw/workspace/SOUL.md "${backupDir}/" && ` +
          `cp ~/.openclaw/workspace/BOOTSTRAP.md "${backupDir}/" && ` +
          `cp ~/.openclaw/workspace/memory/autopilot-results/task-history.md "${backupDir}/" && ` +
          `echo "✅ 備份完成: ${backupDir}"`;

        const result = await executeCommand(backupCmd);

        if (result.success) {
          await this.sendMessage(chatId,
            `✅ *備份完成*\n\n` +
            `📁 位置: ${backupDir}\n` +
            `📝 包含:\n` +
            `• MEMORY.md\n` +
            `• SOUL.md\n` +
            `• BOOTSTRAP.md\n` +
            `• task-history.md`
          );
        } else {
          await this.sendMessage(chatId, `❌ 備份失敗: ${result.output}`);
        }
        break;

      case 'clean':
        await this.sendMessage(chatId, '🧹 清理臨時檔案...');

        const cleanCmd =
          `find ~/.openclaw/logs -name "*.log" -mtime +7 -delete && ` +
          `find /tmp -name "*.tmp" -user $(whoami) -mtime +1 -delete && ` +
          `echo "✅ 清理完成"`;

        const cleanResult = await executeCommand(cleanCmd);

        if (cleanResult.success) {
          await this.sendMessage(chatId, `✅ 清理完成\n\n已清除 7 天前的日誌和臨時檔案`);
        } else {
          await this.sendMessage(chatId, `⚠️ 清理部分完成: ${cleanResult.output}`);
        }
        break;

      case 'restart':
        await this.sendMessage(chatId,
          `🔄 重啟所有服務...\n` +
          `⏱️ 這可能需要 30 秒`
        );

        const restartCmd =
          `pm2 restart ai-bot && ` +
          `openclaw restart && ` +
          `~/.openclaw/workspace/scripts/memory-record-ctl.sh restart && ` +
          `echo "✅ 所有服務已重啟"`;

        const restartResult = await executeCommand(restartCmd);

        if (restartResult.success) {
          await this.sendMessage(chatId,
            `✅ *重啟完成*\n\n` +
            `• PM2 ai-bot: ✅\n` +
            `• OpenClaw Gateway: ✅\n` +
            `• 記憶服務器: ✅`
          );
        } else {
          await this.sendMessage(chatId, `⚠️ 重啟部分完成: ${restartResult.output}`);
        }
        break;

      default:
        await this.sendMessage(chatId, `❌ 未知操作: ${action}`);
    }
  }

  async setupCommands() {
    // 清空命令選單
    try {
      const result = await this.api('setMyCommands', { commands: [] });
      if (result.ok) {
        console.log('✅ 命令選單已清空（純聊天模式）');
      }
    } catch (err) {
      console.error('⚠️ 命令選單設置失敗:', err.message);
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
    // 檢查 Bot Token
    const me = await this.api('getMe');
    if (!me.ok) {
      console.error('❌ Bot Token 無效');
      process.exit(1);
    }

    // 設置命令選單
    await this.setupCommands();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 小蔡維護助手 Telegram Bot');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Bot: @${me.result.username}`);
    console.log(`👤 管理員: ${ADMIN_CHAT_ID}`);
    console.log(`📂 工作區: ${WORKSPACE}`);
    console.log('📡 等待訊息...\n');

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
