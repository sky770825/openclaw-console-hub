import { supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';

export async function generateDailyReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  try {
    // 1. Fetch tasks stats
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('status')
      .gte('updated_at', yesterdayStr);

    if (tasksError) throw tasksError;

    const taskStats = (tasks || []).reduce((acc: any, task: any) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      acc.total = (acc.total || 0) + 1;
      return acc;
    }, { total: 0 });

    // 2. Fetch audit/review stats
    const { data: reviews, error: reviewsError } = await supabase
      .from('openclaw_reviews')
      .select('status')
      .gte('created_at', yesterdayStr);
    
    if (reviewsError && reviewsError.code !== 'PGRST116') { // Ignore if table doesn't exist yet for demo
       logger.warn({ error: reviewsError.message, category: 'report' }, 'Reviews table fetch error');
    }

    const reviewStats = (reviews || []).reduce((acc: any, review: any) => {
      acc[review.status] = (acc[review.status] || 0) + 1;
      acc.total = (acc.total || 0) + 1;
      return acc;
    }, { total: 0 });

    // 3. Compile report
    const report = `
📊 *OpenClaw 每日報告 (${yesterdayStr})*

✅ *任務統計:*
- 總數: ${taskStats.total}
- 已完成: ${taskStats.completed || 0}
- 進行中: ${taskStats.in_progress || 0}
- 待處理: ${taskStats.todo || 0}

🔍 *審核統計:*
- 總數: ${reviewStats.total}
- 待審核: ${reviewStats.pending || 0}
- 已批准: ${reviewStats.approved || 0}
- 已駁回: ${reviewStats.rejected || 0}

🚀 *系統狀態:*
- 正常運行中
    `.trim();

    return report;

  } catch (error) {
    logger.error({ error, component: 'reportService', operation: 'generateDailyReport' }, 'Failed to generate daily report');
    return '❌ 每日報告生成失敗';
  }
}

export async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    logger.warn({ category: 'notification' }, 'Telegram configuration missing, skipping notification');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      throw new Error(`Telegram API responded with ${response.status}`);
    }
  } catch (error) {
    logger.error({ error, component: 'reportService', operation: 'sendTelegramNotification' }, 'Failed to send Telegram notification');
  }
}
