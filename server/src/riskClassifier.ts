/**
 * 風險分類器 — 根據任務內容自動判斷風險等級
 * 🟢 none     = 自動通過（查資料、健康檢查）
 * 🟡 low      = Claude 審核（一般開發任務）
 * 🔴 medium   = Claude 審慎執行（刪檔、改 DB、改 auth）
 * 🟣 critical = 老蔡親審（部署、改密鑰、花錢）
 */

export type DispatchRiskLevel = 'none' | 'low' | 'medium' | 'critical';

// ========== 關鍵字規則 ==========

const CRITICAL_KEYWORDS = [
  'deploy', '部署', 'production', 'prod', '上線',
  '金鑰', 'key', 'secret', 'token', 'credential',
  '費用', 'cost', 'payment', '花費', 'billing',
  'infra', 'dns', 'domain', 'ssl', 'certificate',
  'npm publish', 'docker push',
];

const MEDIUM_KEYWORDS = [
  '刪除', 'delete', 'remove', 'rm ', 'drop',
  '資料庫', 'database', 'schema', 'migration', 'migrate',
  'auth', '權限', '認證', 'permission', 'rbac',
  'rollback', 'revert', 'reset',
  'truncate', 'alter table',
];

const GREEN_KEYWORDS = [
  '健康檢查', 'health', 'status', 'check',
  '報告', 'report', '統計', 'stats', 'statistics',
  '監控', 'monitor', 'ping', 'uptime',
  '查看', '列表', 'list', 'read', 'fetch', 'get',
  '測試', 'test', 'lint', 'typecheck',
];

// ========== 分類函式 ==========

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function getTextBlob(task: {
  name?: string;
  description?: string;
  tags?: string[];
  runCommands?: string[];
}): string {
  const parts = [
    task.name || '',
    task.description || '',
    ...(task.tags || []),
    ...(task.runCommands || []),
  ];
  return parts.join(' ');
}

export function classifyTaskRisk(task: {
  name?: string;
  description?: string;
  tags?: string[];
  runCommands?: string[];
  riskLevel?: string;
  allowPaid?: boolean;
}): DispatchRiskLevel {
  // 尊重手動設定
  if (task.riskLevel) {
    const manual = task.riskLevel.toLowerCase();
    if (manual === 'critical' || manual === 'high') return 'critical';
    if (manual === 'medium') return 'medium';
    if (manual === 'none') return 'none';
    if (manual === 'low') return 'low';
  }

  // 花錢操作 → 紫燈
  if (task.allowPaid) return 'critical';

  const blob = getTextBlob(task);

  // 紫燈
  if (matchesAny(blob, CRITICAL_KEYWORDS)) return 'critical';

  // 紅燈
  if (matchesAny(blob, MEDIUM_KEYWORDS)) return 'medium';

  // 綠燈
  if (matchesAny(blob, GREEN_KEYWORDS)) return 'none';

  // 預設黃燈
  return 'low';
}
