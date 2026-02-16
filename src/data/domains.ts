export type DomainOption = {
  slug: string;
  label: string;
  keywords: string[];
};

// Domain taxonomy (task tagging spec): use tags like `domain:<slug>`.
// Keep this list stable; change keywords/labels freely.
export const DOMAIN_OPTIONS: DomainOption[] = [
  {
    slug: 'network',
    label: '網路架設',
    keywords: ['網路', '網路架設', 'dns', '域名', 'vpc', 'cdn', 'waf', 'lb', '負載平衡', '反向代理'],
  },
  {
    slug: 'security',
    label: '資安',
    keywords: ['資安', 'security', 'owasp', 'auth', 'jwt', 'rbac', 'secrets', '漏洞', '權限', '密鑰', 'token'],
  },
  {
    slug: 'risk',
    label: '風控',
    keywords: ['風控', 'risk', 'fraud', '詐欺', 'abuse', '濫用', 'rate-limit', '限流', 'policy', '黑名單'],
  },
  {
    slug: 'sre',
    label: 'SRE / 可靠性',
    keywords: ['sre', '可靠性', 'slo', 'sla', 'error budget', 'incident', '事件', 'mttr', '故障', '復原'],
  },
  {
    slug: 'devops',
    label: 'DevOps / 平台工程',
    keywords: ['devops', 'ci', 'cd', 'pipeline', 'iac', 'terraform', '平台工程', '部署流程', '自動化部署'],
  },
  {
    slug: 'cloud',
    label: '雲端架構',
    keywords: ['雲端', 'cloud', 'aws', 'gcp', 'azure', 'k8s', 'kubernetes', '容器', 'cluster'],
  },
  {
    slug: 'database',
    label: '資料庫工程',
    keywords: ['資料庫', 'db', 'postgres', 'mysql', 'migration', '遷移', 'backup', '備份', '索引', 'schema'],
  },
  {
    slug: 'observability',
    label: '可觀測性',
    keywords: ['可觀測性', 'observability', 'logs', 'log', 'metrics', 'tracing', 'otel', 'dashboard', '監控'],
  },
  {
    slug: 'performance',
    label: '效能工程',
    keywords: ['效能', 'performance', 'perf', 'latency', '延遲', 'cache', '快取', 'profiling', 'load test', '壓測'],
  },
  {
    slug: 'release',
    label: '部署與版本治理',
    keywords: ['部署', 'release', 'rollback', '回滾', 'feature flag', 'canary', '灰度', '版本治理', 'hotfix'],
  },
  {
    slug: 'data-eng',
    label: '資料工程',
    keywords: ['資料工程', 'etl', 'pipeline', 'dq', 'data quality', 'lineage', 'scheduler', '排程', '數據管線'],
  },
  {
    slug: 'compliance',
    label: '隱私與合規',
    keywords: ['隱私', '合規', 'privacy', 'pii', 'gdpr', 'audit', '稽核', 'retention', '保存政策'],
  },
  {
    slug: 'finops',
    label: '成本治理 / FinOps',
    keywords: ['成本', '成本治理', 'finops', 'budget', '預算', 'cost', 'token', 'quota', '用量'],
  },
  {
    slug: 'supply-chain',
    label: '供應鏈安全',
    keywords: ['供應鏈', '供應鏈安全', 'sbom', 'slsa', 'dependency', '相依', 'cve', '漏洞掃描'],
  },
  {
    slug: 'qa',
    label: '品質工程 / 測試',
    keywords: ['測試', 'qa', 'test plan', '測試計畫', 'regression', '回歸', 'e2e', 'smoke', '驗收測試'],
  },
  {
    slug: 'product',
    label: '產品架構 / 需求工程',
    keywords: ['產品', 'prd', 'requirements', '需求', 'acceptance', '驗收標準', 'scope', '範疇', '用例'],
  },
  {
    slug: 'business',
    label: '商業模式 / 定價 / ROI',
    keywords: ['商業', '商業模式', 'roi', 'pricing', '定價', 'funnel', '漏斗', 'poc', '變現'],
  },
  {
    slug: 'knowledge',
    label: '知識管理 / 流程工程',
    keywords: ['知識管理', '流程', 'sop', 'runbook', 'adr', 'rfc', 'handoff', '交接', '索引'],
  },
  {
    slug: 'customer-ops',
    label: '客服與營運自動化',
    keywords: ['客服', 'support', 'ops', '營運', 'automation', '自動化', 'ticket', '工單', 'sla'],
  },
];

export function domainTag(slug: string): string {
  return `domain:${slug}`;
}
