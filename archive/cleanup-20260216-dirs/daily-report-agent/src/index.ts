import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface OllamaResponse {
  response: string;
}

interface ReportData {
  timestamp: string;
  logs: string;
  summary: string;
}

class DailyReportAgent {
  private ollamaUrl = 'http://localhost:11434';
  private telegramBotToken: string = '';
  private telegramChatId: string = '';
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'logs', 'daily-reports');
    this.loadConfig();
    this.ensureDirectories();
  }

  private loadConfig(): void {
    // 讀取 Telegram 設定
    const configPath = path.join(os.homedir(), '.openclaw', 'config', 'telegram.env');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('BOT_TOKEN=')) {
          this.telegramBotToken = line.split('=')[1]?.trim() || '';
        }
        if (line.includes('CHAT_ID=')) {
          this.telegramChatId = line.split('=')[1]?.trim() || '';
        }
      }
    }
    // 如果沒有找到，使用環境變數
    this.telegramBotToken = this.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.telegramChatId = this.telegramChatId || process.env.TELEGRAM_CHAT_ID || '5819565005';
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async readLogs(): Promise<string> {
    try {
      // 方式 1: 執行 dashboard-monitor.sh 取得即時監控資訊
      const scriptsPath = path.join(process.cwd(), '..', 'scripts', 'dashboard-monitor.sh');
      if (fs.existsSync(scriptsPath)) {
        try {
          const { stdout } = await execAsync(`bash ${scriptsPath}`);
          return stdout;
        } catch (e) {
          console.log('Dashboard monitor failed, falling back to log files');
        }
      }

      // 方式 2: 讀取最近的日誌檔案
      const logsDir = path.join(process.cwd(), '..', 'logs');
      if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir)
          .filter(f => f.endsWith('.log'))
          .map(f => path.join(logsDir, f))
          .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime())
          .slice(0, 5);

        let content = '';
        for (const file of files) {
          const data = fs.readFileSync(file, 'utf-8');
          content += `\n=== ${path.basename(file)} ===\n${data}`;
        }
        return content || 'No logs found';
      }

      // 方式 3: 回退值
      return 'System is running normally. No critical issues detected.';
    } catch (error) {
      console.error('Error reading logs:', error);
      return 'Failed to read logs';
    }
  }

  async generateSummary(logContent: string): Promise<string> {
    try {
      console.log('Calling Ollama to generate summary...');

      const prompt = `你是一個系統監控助手。請根據以下日誌內容，用中文生成一份簡潔的每日監控報告摘要。

日誌內容：
${logContent.substring(0, 2000)} ${logContent.length > 2000 ? '...[日誌已截斷]' : ''}

請生成：
1. 系統健康狀態（正常/警告/異常）
2. 今日主要事件（3-5 項關鍵資訊）
3. 需要關注的問題（如果有）
4. 建議動作（如果需要）

格式簡潔，用 Markdown 列點。`;

      const response = await axios.post<OllamaResponse>(
        `${this.ollamaUrl}/api/generate`,
        {
          model: 'qwen3:8b',
          prompt: prompt,
          stream: false,
        },
        { timeout: 60000 }
      );

      return response.data.response || 'Failed to generate summary';
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Failed to generate summary from Ollama';
    }
  }

  async sendTelegram(summary: string): Promise<boolean> {
    if (!this.telegramBotToken) {
      console.warn('Telegram bot token not configured, skipping Telegram notification');
      return false;
    }

    try {
      const timestamp = new Date().toLocaleString('zh-TW');
      const message = `🤖 *每日監控報告*\n\n⏰ ${timestamp}\n\n${summary}`;

      const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.telegramChatId,
        text: message,
        parse_mode: 'Markdown',
      });

      console.log('✅ Telegram notification sent');
      return true;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }
  }

  async saveReport(logContent: string, summary: string): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `report-${timestamp}.json`;
    const filepath = path.join(this.reportsDir, filename);

    const report: ReportData = {
      timestamp: new Date().toISOString(),
      logs: logContent.substring(0, 5000), // 只保存前 5000 字
      summary: summary,
    };

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`✅ Report saved to ${filepath}`);
    return filepath;
  }

  async run(): Promise<void> {
    console.log('🚀 Daily Report Agent started...');

    try {
      console.log('📖 Reading logs...');
      const logs = await this.readLogs();

      console.log('🤖 Generating summary with Ollama...');
      const summary = await this.generateSummary(logs);

      console.log('📤 Sending to Telegram...');
      await this.sendTelegram(summary);

      console.log('💾 Saving report...');
      await this.saveReport(logs, summary);

      console.log('✅ Daily report generation completed!');
    } catch (error) {
      console.error('❌ Error in daily report generation:', error);
      throw error;
    }
  }
}

// 執行
async function main() {
  const agent = new DailyReportAgent();
  await agent.run();
}

main().catch(console.error);
