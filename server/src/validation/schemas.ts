/**
 * API 请求验证 schemas (Zod)
 * 用于确保所有输入数据的类型安全和有效性
 */

import { z } from 'zod';

// ========== 基础类型 schemas ==========

export const taskStatusSchema = z.enum([
  'draft',
  'ready',
  'running',
  'review',
  'done',
  'blocked'
]);

export const scheduleTypeSchema = z.enum([
  'cron',
  'interval',
  'webhook',
  'manual'
]);

export const prioritySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5)
]);

export const taskComplexitySchema = z.enum(['S', 'M', 'L', 'XL']);

export const taskRiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const taskTypeSchema = z.enum([
  'research',
  'development',
  'ops',
  'review',
  'other'
]);

export const agentTypeSchema = z.enum(['cursor', 'codex', 'openclaw', 'auto']);

export const executionModeSchema = z.enum(['parallel', 'sequential']);

export const runStatusSchema = z.enum([
  'queued',
  'running',
  'success',
  'failed',
  'cancelled',
  'timeout',
  'retrying'
]);

export const alertSeveritySchema = z.enum([
  'info',
  'warning',
  'critical',
  'low',
  'medium',
  'high'
]);

// ========== 复杂类型 schemas ==========

export const modelConfigSchema = z.object({
  provider: z.enum(['openrouter', 'ollama', 'default']),
  primary: z.string().min(1),
  fallbacks: z.array(z.string()).optional()
}).optional();

export const agentConfigSchema = z.object({
  type: agentTypeSchema,
  config: z.record(z.string(), z.unknown()).optional()
}).optional();

export const timeoutConfigSchema = z.object({
  timeoutMinutes: z.number().min(1).max(1440), // 最多 24 小时
  maxRetries: z.number().min(0).max(10),
  fallbackStrategy: z.enum(['primary-to-next', 'claude-to-gemini', 'none']),
  notifyOnTimeout: z.boolean()
}).optional();

// ========== Task 验证 schemas ==========

/**
 * 创建任务的验证 schema
 * 注意: name 可以为空(用于 allowStub 逻辑),但如果提供则有长度限制
 */
export const createTaskSchema = z.object({
  name: z.string().max(255, '任务名称过长').default(''),
  description: z.string().max(10000, '描述过长').default(''),
  status: taskStatusSchema.default('draft'),
  tags: z.array(z.string()).default([]),
  owner: z.string().default('system'),
  priority: prioritySchema.default(3),
  scheduleType: scheduleTypeSchema.default('manual'),
  scheduleExpr: z.string().optional(),
  inputs: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
  acceptance: z.array(z.string()).optional(),
  taskType: taskTypeSchema.optional(),
  complexity: taskComplexitySchema.optional(),
  riskLevel: taskRiskLevelSchema.optional(),
  deadline: z.string().datetime().nullable().optional(),
  reviewer: z.string().optional(),
  rollbackPlan: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  evidenceLinks: z.array(z.string().url()).optional(),
  summary: z.string().max(5000).optional(),
  nextSteps: z.array(z.string()).optional(),
  reporterTarget: z.string().optional(),
  projectPath: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  runCommands: z.array(z.string()).optional(),
  modelPolicy: z.string().optional(),
  allowPaid: z.boolean().optional(),
  executionProvider: z.string().optional(),
  modelConfig: modelConfigSchema,
  agent: agentConfigSchema,
  dependsOn: z.array(z.string()).optional(),
  executionMode: executionModeSchema.optional(),
  timeoutConfig: timeoutConfigSchema,
  fromReviewId: z.string().optional()
});

/**
 * 更新任务的验证 schema (所有字段可选)
 */
export const updateTaskSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional(),
  status: taskStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  owner: z.string().optional(),
  priority: prioritySchema.optional(),
  scheduleType: scheduleTypeSchema.optional(),
  scheduleExpr: z.string().optional(),
  lastRunStatus: z.enum(['queued', 'running', 'success', 'failed', 'cancelled', 'timeout', 'retrying', 'none']).optional(),
  lastRunAt: z.string().datetime().nullable().optional(),
  nextRunAt: z.string().datetime().nullable().optional(),
  runPath: z.string().optional(),
  idempotencyKey: z.string().optional(),
  inputs: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
  acceptance: z.array(z.string()).optional(),
  taskType: taskTypeSchema.optional(),
  complexity: taskComplexitySchema.optional(),
  riskLevel: taskRiskLevelSchema.optional(),
  deadline: z.string().datetime().nullable().optional(),
  reviewer: z.string().optional(),
  rollbackPlan: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  evidenceLinks: z.array(z.string().url()).optional(),
  summary: z.string().max(5000).optional(),
  nextSteps: z.array(z.string()).optional(),
  reporterTarget: z.string().optional(),
  projectPath: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  runCommands: z.array(z.string()).optional(),
  modelPolicy: z.string().optional(),
  allowPaid: z.boolean().optional(),
  executionProvider: z.string().optional(),
  modelConfig: modelConfigSchema,
  agent: agentConfigSchema,
  dependsOn: z.array(z.string()).optional(),
  executionMode: executionModeSchema.optional(),
  timeoutConfig: timeoutConfigSchema,
  fromReviewId: z.string().optional()
}).strict(); // 不允许额外字段

/**
 * 运行任务的验证 schema
 */
export const runTaskSchema = z.object({
  idempotencyKey: z.string().optional(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  forceRun: z.boolean().optional().default(false)
});

// ========== Alert 验证 schemas ==========

/**
 * 更新告警的验证 schema
 */
export const updateAlertSchema = z.object({
  status: z.enum(['open', 'acked', 'snoozed']).optional(),
  severity: alertSeveritySchema.optional()
}).strict();

// ========== OpenClaw 特定 schemas ==========

/**
 * OpenClaw Task 创建
 */
export const createOpenClawTaskSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().default(''),
  status: taskStatusSchema.default('draft'),
  priority: prioritySchema.default(3),
  tags: z.array(z.string()).default([]),
  owner: z.string().default('system'),
  summary: z.string().optional(),
  nextSteps: z.array(z.string()).optional(),
  projectPath: z.string().optional(),
  allowStub: z.boolean().optional() // 允许创建存根任务
});

/**
 * 查询参数验证
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional()
});

export const taskFilterQuerySchema = paginationQuerySchema.extend({
  status: taskStatusSchema.optional(),
  owner: z.string().optional(),
  priority: prioritySchema.optional(),
  tags: z.string().optional(), // 逗号分隔
  search: z.string().optional()
});

/**
 * ID 参数验证
 */
export const idParamSchema = z.object({
  id: z.string().uuid('无效的 ID 格式')
});

// ========== 类型导出 ==========

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type RunTaskInput = z.infer<typeof runTaskSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
export type CreateOpenClawTaskInput = z.infer<typeof createOpenClawTaskSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type TaskFilterQuery = z.infer<typeof taskFilterQuerySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
