/**
 * GitHub Automation Skill - Type Definitions
 * 
 * 使用設計模式：
 * - Strategy Pattern: 不同操作策略的介面定義
 * - Builder Pattern: 配置物件的建構
 */

// ============================================================================
// 核心 Skill 介面（Abstract Factory Pattern）
// ============================================================================

export interface SkillPlugin {
  readonly name: string;
  readonly version: string;
  
  initialize(config: SkillConfig): Promise<void>;
  execute(input: SkillInput): Promise<SkillResult>;
  getSchema(): SkillSchema;
  dispose(): Promise<void>;
}

export interface SkillConfig {
  githubToken: string;
  defaultOwner?: string;
  defaultRepo?: string;
  features?: FeatureFlags;
}

export interface FeatureFlags {
  issueAutomation?: boolean;
  prAssistant?: boolean;
  releaseAutomation?: boolean;
  repoAnalytics?: boolean;
}

export interface SkillInput {
  action: SkillAction;
  params: Record<string, unknown>;
}

export type SkillAction = 
  | 'issue.create'
  | 'issue.list'
  | 'issue.update'
  | 'pr.analyze'
  | 'pr.review'
  | 'release.create'
  | 'repo.stats'
  | 'repo.health';

export interface SkillResult {
  success: boolean;
  data?: unknown;
  error?: SkillError;
  metadata?: ResultMetadata;
}

export interface SkillError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ResultMetadata {
  executedAt: string;
  duration: number;
  rateLimit?: RateLimitInfo;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string;
}

export interface SkillSchema {
  name: string;
  version: string;
  actions: ActionSchema[];
  config: ConfigSchema;
}

export interface ActionSchema {
  name: string;
  description: string;
  parameters: ParameterSchema[];
  returns: ReturnSchema;
}

export interface ParameterSchema {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ReturnSchema {
  type: string;
  description: string;
}

export interface ConfigSchema {
  properties: ConfigProperty[];
  required: string[];
}

export interface ConfigProperty {
  name: string;
  type: string;
  required: boolean;
  description: string;
  secret?: boolean;
}

// ============================================================================
// Strategy Pattern - 執行策略介面
// ============================================================================

export interface ExecutionStrategy {
  readonly name: string;
  execute(context: ExecutionContext): Promise<StrategyResult>;
  validate(params: unknown): ValidationResult;
}

export interface ExecutionContext {
  githubToken: string;
  owner: string;
  repo: string;
  params: Record<string, unknown>;
}

export interface StrategyResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// ============================================================================
// GitHub API 類型
// ============================================================================

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
  assignees: Array<{ login: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: { login: string };
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  changedFiles: number;
  additions: number;
  deletions: number;
}

export interface GitHubRelease {
  id: number;
  tagName: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  createdAt: string;
  publishedAt: string | null;
}

export interface RepoStats {
  stars: number;
  forks: number;
  openIssues: number;
  openPRs: number;
  watchers: number;
  healthScore: number;
}
