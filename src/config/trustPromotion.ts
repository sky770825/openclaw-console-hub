/**
 * 動態信任等級調整引擎
 *
 * 社區成員的信任等級可根據協作歷史自動升/降級：
 *
 *   L0 公開 → L1 接觸 → L2 協作 → L3 信任
 *   ↑                                  ↓
 *   └──── 降級（違規/長期不活動） ────┘
 *
 * 升級條件（基於累積的正向行為）
 * 降級條件（基於違規或不活動）
 */

export interface TrustCriteria {
  /** 從哪個等級升級 */
  fromLevel: number;
  /** 升級到哪個等級 */
  toLevel: number;
  /** 需要的條件 */
  requirements: TrustRequirement[];
  /** 自動升級或需要人工審核 */
  autoPromote: boolean;
}

export interface TrustRequirement {
  type:
    | 'min_tasks_completed'    // 完成的任務數
    | 'min_days_active'        // 活躍天數
    | 'min_success_rate'       // 成功率 (0-1)
    | 'no_violations_days'     // 無違規天數
    | 'min_reviews_approved'   // 審核通過的提案數
    | 'manual_approval';       // 需要管理者核准
  value: number;
  label: string;
}

/** 升級條件表 */
export const PROMOTION_CRITERIA: TrustCriteria[] = [
  // L0 → L1：基本門檻
  {
    fromLevel: 0,
    toLevel: 1,
    autoPromote: true,
    requirements: [
      { type: 'min_days_active', value: 1, label: '至少活躍 1 天' },
    ],
  },
  // L1 → L2：證明參與意願
  {
    fromLevel: 1,
    toLevel: 2,
    autoPromote: true,
    requirements: [
      { type: 'min_days_active', value: 7, label: '至少活躍 7 天' },
      { type: 'min_tasks_completed', value: 3, label: '完成至少 3 個任務' },
      { type: 'min_success_rate', value: 0.7, label: '任務成功率 ≥ 70%' },
      { type: 'no_violations_days', value: 7, label: '7 天內無違規' },
    ],
  },
  // L2 → L3：深度信任
  {
    fromLevel: 2,
    toLevel: 3,
    autoPromote: false, // 需要人工審核
    requirements: [
      { type: 'min_days_active', value: 30, label: '至少活躍 30 天' },
      { type: 'min_tasks_completed', value: 15, label: '完成至少 15 個任務' },
      { type: 'min_success_rate', value: 0.85, label: '任務成功率 ≥ 85%' },
      { type: 'min_reviews_approved', value: 5, label: '至少 5 個提案獲審核通過' },
      { type: 'no_violations_days', value: 30, label: '30 天內無違規' },
      { type: 'manual_approval', value: 1, label: '管理者核准' },
    ],
  },
];

/** 降級條件 */
export interface DemotionRule {
  condition: 'violation' | 'inactivity' | 'low_success_rate';
  /** 降幾個等級 */
  dropLevels: number;
  /** 觸發門檻 */
  threshold: number;
  label: string;
}

export const DEMOTION_RULES: DemotionRule[] = [
  { condition: 'violation', dropLevels: 1, threshold: 1, label: '任何違規行為 → 降 1 級' },
  { condition: 'inactivity', dropLevels: 1, threshold: 60, label: '60 天未活動 → 降 1 級' },
  { condition: 'low_success_rate', dropLevels: 1, threshold: 0.3, label: '成功率低於 30% → 降 1 級' },
];

/** 成員信任記錄 */
export interface MemberTrustRecord {
  uid: string;
  name: string;
  currentLevel: number;
  /** 加入時間 */
  joinedAt: string;
  /** 最後活動時間 */
  lastActiveAt: string;
  /** 總完成任務數 */
  tasksCompleted: number;
  /** 總失敗任務數 */
  tasksFailed: number;
  /** 提案被核准數 */
  reviewsApproved: number;
  /** 違規次數 */
  violationCount: number;
  /** 最後違規時間 */
  lastViolationAt: string | null;
  /** 升/降級歷史 */
  levelHistory: LevelChange[];
}

export interface LevelChange {
  fromLevel: number;
  toLevel: number;
  reason: string;
  changedAt: string;
  /** 自動或人工 */
  method: 'auto' | 'manual';
}

/**
 * 評估成員是否符合升級條件
 */
export function evaluatePromotion(
  record: MemberTrustRecord
): { eligible: boolean; criteria: TrustCriteria | null; unmet: TrustRequirement[] } {
  const criteria = PROMOTION_CRITERIA.find((c) => c.fromLevel === record.currentLevel);
  if (!criteria) return { eligible: false, criteria: null, unmet: [] };

  const unmet: TrustRequirement[] = [];
  const now = Date.now();
  const successRate =
    record.tasksCompleted + record.tasksFailed > 0
      ? record.tasksCompleted / (record.tasksCompleted + record.tasksFailed)
      : 0;
  const daysActive = Math.floor((now - new Date(record.joinedAt).getTime()) / (24 * 60 * 60 * 1000));
  const daysSinceViolation = record.lastViolationAt
    ? Math.floor((now - new Date(record.lastViolationAt).getTime()) / (24 * 60 * 60 * 1000))
    : Infinity;

  for (const req of criteria.requirements) {
    switch (req.type) {
      case 'min_tasks_completed':
        if (record.tasksCompleted < req.value) unmet.push(req);
        break;
      case 'min_days_active':
        if (daysActive < req.value) unmet.push(req);
        break;
      case 'min_success_rate':
        if (successRate < req.value) unmet.push(req);
        break;
      case 'no_violations_days':
        if (daysSinceViolation < req.value) unmet.push(req);
        break;
      case 'min_reviews_approved':
        if (record.reviewsApproved < req.value) unmet.push(req);
        break;
      case 'manual_approval':
        // 永遠不自動滿足，需人工核准
        unmet.push(req);
        break;
    }
  }

  return { eligible: unmet.length === 0, criteria, unmet };
}

/**
 * 評估成員是否應被降級
 */
export function evaluateDemotion(
  record: MemberTrustRecord
): { shouldDemote: boolean; rule: DemotionRule | null; newLevel: number } {
  if (record.currentLevel <= 0) return { shouldDemote: false, rule: null, newLevel: 0 };

  const now = Date.now();
  const successRate =
    record.tasksCompleted + record.tasksFailed > 0
      ? record.tasksCompleted / (record.tasksCompleted + record.tasksFailed)
      : 1;
  const daysSinceActive = Math.floor(
    (now - new Date(record.lastActiveAt).getTime()) / (24 * 60 * 60 * 1000)
  );

  for (const rule of DEMOTION_RULES) {
    let triggered = false;

    switch (rule.condition) {
      case 'violation':
        triggered = record.violationCount >= rule.threshold;
        break;
      case 'inactivity':
        triggered = daysSinceActive >= rule.threshold;
        break;
      case 'low_success_rate':
        triggered =
          record.tasksCompleted + record.tasksFailed >= 5 && successRate < rule.threshold;
        break;
    }

    if (triggered) {
      const newLevel = Math.max(0, record.currentLevel - rule.dropLevels);
      return { shouldDemote: true, rule, newLevel };
    }
  }

  return { shouldDemote: false, rule: null, newLevel: record.currentLevel };
}
