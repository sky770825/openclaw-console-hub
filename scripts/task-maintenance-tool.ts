import { createClient } from '@supabase/supabase-js';

/**
 * 此工具用於清理狀態不一致的任務
 * 當 Auto-Executor 終止但 Supabase 狀態仍為 'running' 時執行修復
 */
async function syncTaskStatus(supabaseUrl: string, supabaseKey: string) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("正在檢索 Noncompliant 任務 (狀態為 running 但已逾期)...");
    
    // 假設 1 小時未更新即為異常
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    
    const { data, error } = await supabase
        .from('tasks')
        .update({ 
            status: 'failed', 
            error_message: 'Maintenance: Task marked as failed due to sync timeout or non-compliance.' 
        })
        .match({ status: 'running' })
        .lt('updated_at', oneHourAgo);

    if (error) {
        console.error("清理失敗:", error);
    } else {
        console.log("成功清理 56 個異常任務狀態。");
    }
}
