# 任務歸檔實作計畫

## 1. 修改 server/src/types.ts
在 TaskStatus 加入 'archived'：
``typescript
export type TaskStatus = ... | 'done' | 'archived' | 'blocked';
`

## 2. 建立 server/src/services/taskArchiver.ts
`typescript
import { supabase } from '../supabase.js';
import { createLogger } from '../logger.js';
const logger = createLogger('task-archiver');
export async function archiveOldTasks() {
  const threshold = new Date(Date.now() - 24  60  60  1000).toISOString();
  const { data, error } = await supabase
    .from('openclaw_tasks')
    .update({ status: 'archived' })
    .in('status', ['done', 'failed'])
    .lt('updated_at', threshold);
  if (data) logger.info([Archiver] 已歸檔 ${data.length} 個舊任務。);
}
`

## 3. 修改 server/src/routes/auto-executor.ts
在啟動處加入：
`typescript
import { archiveOldTasks } from '../services/taskArchiver.js';
setInterval(archiveOldTasks, 60  60 * 1000); // 每小時跑一次
``