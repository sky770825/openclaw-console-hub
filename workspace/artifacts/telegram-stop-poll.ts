import { getSystemStatusSummary } from './index';

/**
 * 處理 Telegram 訊息邏輯片段
 */
async function handleTelegramUpdate(update: any) {
  const chatId = update.message?.chat?.id;
  const text = update.message?.text;

  // 3. 修改 /status 指令的邏輯
  if (text === '/status') {
    const summaryText = "系統運作正常 🟢\n點擊下方按鈕查看詳細技術數據。";
    
    await sendTelegramMessageToChat(chatId, summaryText, {
      reply_markup: {
        inline_keyboard: [[
          { text: "📊 顯示詳細數據", callback_data: "show_detailed_status" }
        ]]
      }
    });
    return;
  }

  // 4. 新增對 callback_query 的處理
  if (update.callback_query) {
    const cbQuery = update.callback_query;
    const data = cbQuery.data;
    const msg = cbQuery.message;

    if (data === 'show_detailed_status' && msg) {
      // 5. 呼叫 getSystemStatusSummary() 並更新訊息
      const detailedStatus = getSystemStatusSummary();
      
      try {
        await editTelegramMessageText({
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          text: detailedStatus,
          parse_mode: 'Markdown'
        });
        
        // 通知 Telegram 回應已處理 (避免按鈕轉圈圈)
        await answerCallbackQuery(cbQuery.id);
      } catch (error) {
        console.error('Failed to update status message:', error);
      }
    }
    return;
  }
}

// 模擬用的 API 介面定義
async function sendTelegramMessageToChat(chatId: number, text: string, options: any) {
  console.log(`Sending message to ${chatId}: ${text}`);
}

async function editTelegramMessageText(params: any) {
  console.log(`Editing message ${params.message_id} in chat ${params.chat_id}`);
}

async function answerCallbackQuery(callbackQueryId: string) {
  console.log(`Answering callback query ${callbackQueryId}`);
}
