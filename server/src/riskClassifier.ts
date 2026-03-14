/**
 * 風險分類器 — 根據任務內容自動判斷風險等級
 * 🟢 none     = 自動通過（查資料、健康檢查）
 * 🟡 low      = Claude 自動執行（一般開發任務）
 * 🔴 medium   = Claude 直接審核執行（刪檔、改 DB、改 auth）— 不需主人審核
 * 🟣 critical = 主人親審（部署、改密鑰、花錢）
 */

export type DispatchRiskLevel = 'none' | 'low' | 'medium' | 'critical';

// ========== 關鍵字規則 ==========

const CRITICAL_KEYWORDS = [
  'deploy', '部署', 'production', 'prod', '上線',
  '金鑰', 'secret', 'credential',
  '費用', 'cost', 'payment', '花費', 'billing',
  'dns', 'ssl', 'certificate',
  'npm publish', 'docker push',
];

// 這些詞在開發任務裡太常見（jwt token、跨域 domain、api key 欄位），
// 只有搭配危險動詞才算 critical
const CRITICAL_CONTEXT_KEYWORDS = [
  'api key', 'api_key', 'apikey',       // 真的在動 API key
  'token secret', 'token rotate',        // 真的在動 token 密鑰
  'domain registr', 'domain transfer',   // 真的在動網域
  'change key', 'replace key', 'rotate key', // 換密鑰
  'delete infra', 'destroy infra',       // 刪基礎設施
];

const MEDIUM_KEYWORDS = [
  '刪除', 'delete', 'remove', 'rm ', 'drop',
  '資料庫', 'database', 'schema', 'migration', 'migrate',
  'auth', '權限', '認證', 'permission', 'rbac',
  'rollback', 'revert', 'reset',
  'truncate', 'alter table',
];

// 規劃/設計類任務降為 low — 主人已批准自動執行（2026-03-07）
const LOW_KEYWORDS = [
  '規劃', '設計', 'landing page', '方案規劃', '技術方案',
  '架構設計', '實作規劃', '數據追蹤', 'kpi',
  '調研', '研究', 'research', '分析', 'analysis',
  '開發', 'develop', 'implement', '實作', '建置',
  '前端', '後端', 'frontend', 'backend', 'api',
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

  // 紫燈：精確匹配的危險關鍵字
  if (matchesAny(blob, CRITICAL_KEYWORDS)) return 'critical';

  // 紫燈：需要上下文的關鍵字（token/domain/key/infra 單獨出現不算）
  if (matchesAny(blob, CRITICAL_CONTEXT_KEYWORDS)) return 'critical';

  // 紅燈：真正危險的操作（刪資料、改權限等）
  if (matchesAny(blob, MEDIUM_KEYWORDS)) return 'medium';

  // 綠燈：純查詢/監控
  if (matchesAny(blob, GREEN_KEYWORDS)) return 'none';

  // 黃燈：規劃/開發/調研類（自動執行，Claude 審核）
  if (matchesAny(blob, LOW_KEYWORDS)) return 'low';

  // 預設黃燈
  return 'low';
}
