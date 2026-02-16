/**
 * 輪詢 Run 狀態，直到 success/failed 或逾時，並顯示對應 toast
 * 回傳 cleanup 函數，元件 unmount 時呼叫以避免記憶體洩漏與異常 setState
 */
import { api } from '@/services/api';
import { toast } from 'sonner';

const INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 40; // ~60s 總時長，長時間任務不中斷

export function pollRunStatus(
  runId: string,
  onRefresh: () => void
): () => void {
  let attempts = 0;
  let cancelled = false;
  const timer = setInterval(async () => {
    if (cancelled) return;
    attempts += 1;
    const run = await api.getRun(runId);
    if (cancelled) return;
    onRefresh();
    if (!run) {
      clearInterval(timer);
      return;
    }
    if (run.status === 'success') {
      clearInterval(timer);
      toast.success('執行完成');
      return;
    }
    if (run.status === 'failed') {
      clearInterval(timer);
      toast.error(run.error?.message ?? '執行失敗');
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      clearInterval(timer);
      toast.info('執行逾時，請至執行紀錄查看');
    }
  }, INTERVAL_MS);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}
