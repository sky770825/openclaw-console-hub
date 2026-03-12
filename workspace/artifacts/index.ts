/**
 * 新增 getSystemStatusSummary 函式
 * 用於從 SharedState 提取並格式化詳細的系統狀態字串。
 */
export function getSystemStatusSummary() {
  // 假設 SharedState 已經定義在範疇中或是全域變數
  // 這裡實作從 SharedState 提取數據的邏輯
  const state = (global as any).SharedState || {};
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  
  let summary = `🔍 *系統詳細技術數據*\n`;
  summary += `━━━━━━━━━━━━━━━━━━\n`;
  summary += `⏰ 報表時間：${now}\n`;
  summary += `📈 運作狀態：穩定運行中\n`;
  summary += `💻 記憶體使用：${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n`;
  
  if (state.totalProcessed) {
    summary += `📊 已處理請求：${state.totalProcessed}\n`;
  }
  
  if (state.lastErrorTime) {
    summary += `⚠️ 最後錯誤：${state.lastErrorTime}\n`;
  } else {
    summary += `✅ 無異常紀錄\n`;
  }
  
  return summary;
}
