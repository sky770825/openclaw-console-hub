/**
 * 任務排名算法 — 移植自 Moltbook Feed (@moltbook/feed)
 *
 * 5 種排序：Hot / Rising / Controversial / Top / New
 *
 * 適配對應：
 *   votes  → priority (1-5)，priority 越高 = 越重要 = 越多「票」
 *   age    → 距離 created_at 的小時數
 *   up     → priority（正向分數）
 *   down   → 6 - priority（反向分數，priority 1 = down 5）
 *   score  → priority（原始分數）
 */

export type RankingSortMode = 'hot' | 'rising' | 'controversial' | 'top' | 'new';

/** 所有排名函數需要的最小任務欄位 */
export interface RankableTask {
  priority?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  /** 也支持 camelCase（mapToBoard 輸出用 createdAt） */
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

// ── 工具函數 ──

/** 取得任務的優先級分數（預設 3） */
function getPriority(task: RankableTask): number {
  const p = task.priority;
  if (typeof p === 'number' && p >= 1 && p <= 5) return p;
  return 3;
}

/** 計算距離某時間點的小時數（最小 0.1 避免除零） */
function hoursAgo(isoDate: string | undefined | null, now: number): number {
  if (!isoDate) return 0.1;
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return 0.1;
  const diffMs = now - then;
  const hours = diffMs / (1000 * 60 * 60);
  return Math.max(hours, 0.1);
}

/** 取得任務的建立時間（同時支持 snake_case 和 camelCase） */
function getCreatedAt(task: RankableTask): string | undefined {
  return task.created_at ?? task.createdAt;
}

// ── 排名公式 ──

/**
 * Hot 排名
 * 公式：log10(max(|votes|, 1)) * sign(votes) + age_hours / 12.5
 *
 * 適配：votes = priority - 3（讓 priority 3 = 中性，5 = 最熱，1 = 最冷）
 *       age 用 created_at 計算；越新加分越多
 *
 * 結果：高分排前面
 */
function hotScore(task: RankableTask, now: number): number {
  const votes = getPriority(task) - 3; // 映射到 -2..+2
  const absVotes = Math.abs(votes);
  const sign = votes > 0 ? 1 : votes < 0 ? -1 : 0;
  const ageHours = hoursAgo(getCreatedAt(task), now);

  return Math.log10(Math.max(absVotes, 1)) * sign + ageHours / 12.5;
}

/**
 * Rising 排名
 * 公式：(score + 1) / hours_age^1.5
 *
 * 適配：score = priority
 *       分數高 + 越新 = 排名越前
 *
 * 結果：高分排前面
 */
function risingScore(task: RankableTask, now: number): number {
  const score = getPriority(task);
  const ageHours = hoursAgo(getCreatedAt(task), now);

  return (score + 1) / Math.pow(ageHours, 1.5);
}

/**
 * Controversial 排名
 * 公式：(up + down) * (1 - |up - down| / total)
 *
 * 適配：up = priority, down = 6 - priority
 *       priority 3 最具爭議性（up=3, down=3, 差異=0）
 *       priority 1 或 5 爭議最小（一面倒）
 *
 * 結果：高分排前面（priority 越接近 3 越有爭議）
 */
function controversialScore(task: RankableTask): number {
  const priority = getPriority(task);
  const up = priority;
  const down = 6 - priority;
  const total = up + down; // 恆為 6

  if (total === 0) return 0;
  return total * (1 - Math.abs(up - down) / total);
}

/**
 * Top 排名
 * 純分數排序，支持時間過濾
 *
 * 適配：score = priority
 *       timeFilter 可選：hour / day / week / month / year / all
 *
 * 結果：高分排前面
 */
function topScore(task: RankableTask): number {
  return getPriority(task);
}

/** Top 排名的時間過濾（回傳是否在時間區間內） */
function isWithinTimeFilter(
  task: RankableTask,
  timeFilter: string,
  now: number,
): boolean {
  if (timeFilter === 'all' || !timeFilter) return true;

  const created = getCreatedAt(task);
  if (!created) return true;

  const createdMs = new Date(created).getTime();
  if (Number.isNaN(createdMs)) return true;

  const diffMs = now - createdMs;
  const diffHours = diffMs / (1000 * 60 * 60);

  switch (timeFilter) {
    case 'hour':
      return diffHours <= 1;
    case 'day':
      return diffHours <= 24;
    case 'week':
      return diffHours <= 24 * 7;
    case 'month':
      return diffHours <= 24 * 30;
    case 'year':
      return diffHours <= 24 * 365;
    default:
      return true;
  }
}

// ── 排序入口 ──

/**
 * 對任務陣列進行排名排序
 *
 * @param tasks   - 任務列表（會被原地排序）
 * @param mode    - 排序模式：hot | rising | controversial | top | new
 * @param options - 可選：timeFilter（僅對 top 模式生效）
 * @returns 排序後的任務陣列（同一個引用）
 */
export function rankTasks<T extends RankableTask>(
  tasks: T[],
  mode: RankingSortMode,
  options?: { timeFilter?: string },
): T[] {
  const now = Date.now();

  switch (mode) {
    case 'hot':
      // Hot：分數高排前面（降序）
      return tasks.sort((a, b) => hotScore(b, now) - hotScore(a, now));

    case 'rising':
      // Rising：分數高排前面（降序）
      return tasks.sort((a, b) => risingScore(b, now) - risingScore(a, now));

    case 'controversial':
      // Controversial：爭議分數高排前面（降序），同分按時間新排前
      return tasks.sort((a, b) => {
        const diff = controversialScore(b) - controversialScore(a);
        if (Math.abs(diff) < 0.001) {
          // 同分時，newer first
          const aTime = new Date(getCreatedAt(a) ?? 0).getTime();
          const bTime = new Date(getCreatedAt(b) ?? 0).getTime();
          return bTime - aTime;
        }
        return diff;
      });

    case 'top': {
      // Top：先過濾時間區間，再按純分數降序
      const timeFilter = options?.timeFilter ?? 'all';
      const filtered = tasks.filter((t) => isWithinTimeFilter(t, timeFilter, now));
      // 將不在時間區間內的任務移到尾部（而非丟棄，保持完整列表）
      const excluded = tasks.filter((t) => !isWithinTimeFilter(t, timeFilter, now));
      filtered.sort((a, b) => {
        const diff = topScore(b) - topScore(a);
        if (diff !== 0) return diff;
        // 同分按時間新排前
        const aTime = new Date(getCreatedAt(a) ?? 0).getTime();
        const bTime = new Date(getCreatedAt(b) ?? 0).getTime();
        return bTime - aTime;
      });
      // 把 excluded 附加到尾部，也按分數排序
      excluded.sort((a, b) => topScore(b) - topScore(a));
      // 把結果寫回原陣列
      const result = [...filtered, ...excluded];
      tasks.length = 0;
      tasks.push(...result);
      return tasks;
    }

    case 'new':
      // New：純按建立時間倒序
      return tasks.sort((a, b) => {
        const aTime = new Date(getCreatedAt(a) ?? 0).getTime();
        const bTime = new Date(getCreatedAt(b) ?? 0).getTime();
        return bTime - aTime;
      });

    default:
      // 不認識的模式，不排序
      return tasks;
  }
}

/** 驗證是否為合法的排序模式 */
export function isValidSortMode(mode: unknown): mode is RankingSortMode {
  return (
    mode === 'hot' ||
    mode === 'rising' ||
    mode === 'controversial' ||
    mode === 'top' ||
    mode === 'new'
  );
}
