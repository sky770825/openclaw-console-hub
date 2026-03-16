/**
 * 多任務看板分組邏輯
 * 純工具函式，不含 React
 */

export const GROUP_DIMENSIONS = {
  all: {
    label: "全部",
    icon: "\u{1F4CB}",
    accessor: () => "all",
    groups: [{ key: "all", label: "全部任務", icon: "\u{1F4CB}", color: "#818cf8" }],
    fallback: "all",
  },
  taskType: {
    label: "依類型",
    icon: "\u{1F3F7}\uFE0F",
    accessor: (t) => t.taskType,
    groups: [
      { key: "development", label: "開發", icon: "\u{1F528}", color: "#818cf8" },
      { key: "research", label: "研究", icon: "\u{1F50D}", color: "#c084fc" },
      { key: "ops", label: "維運", icon: "\u2699\uFE0F", color: "#34d399" },
      { key: "review", label: "審核", icon: "\u{1F4CB}", color: "#fbbf24" },
      { key: "other", label: "其他", icon: "\u{1F4E5}", color: "#9d9daa" },
    ],
    fallback: "other",
  },
  cat: {
    label: "依分類",
    icon: "\u{1F4C2}",
    accessor: (t) => t.cat,
    groups: [
      { key: "feature", label: "功能", icon: "\u{1F680}", color: "#818cf8" },
      { key: "bugfix", label: "修復", icon: "\u{1F41B}", color: "#f87171" },
      { key: "learn", label: "學習", icon: "\u{1F4DA}", color: "#c084fc" },
      { key: "improve", label: "改進", icon: "\u2728", color: "#34d399" },
    ],
    fallback: "feature",
  },
  riskLevel: {
    label: "依風險",
    icon: "\u{1F6E1}\uFE0F",
    accessor: (t) => t.riskLevel,
    groups: [
      { key: "critical", label: "需老蔡", icon: "\u{1F7E3}", color: "#c084fc" },
      { key: "high", label: "高風險", icon: "\u{1F534}", color: "#f87171" },
      { key: "medium", label: "中風險", icon: "\u{1F7E1}", color: "#fbbf24" },
      { key: "low", label: "低風險", icon: "\u{1F7E2}", color: "#34d399" },
    ],
    fallback: "low",
  },
  owner: {
    label: "依負責人",
    icon: "\u{1F464}",
    accessor: (t) => t.owner,
    groups: [], // dynamic — discovered from task data
    fallback: "_未指派",
  },
};

/**
 * 依指定維度將 tasks 分組
 * @param {Array} tasks
 * @param {string} dimensionKey — GROUP_DIMENSIONS 的 key
 * @returns {Array<{groupKey: string, groupMeta: {key,label,icon,color}, tasks: Array}>}
 */
export function groupTasksBy(tasks, dimensionKey) {
  const dim = GROUP_DIMENSIONS[dimensionKey];
  if (!dim) {
    return [{ groupKey: "all", groupMeta: GROUP_DIMENSIONS.all.groups[0], tasks }];
  }

  if (dimensionKey === "all") {
    return [{ groupKey: "all", groupMeta: dim.groups[0], tasks }];
  }

  const buckets = new Map();

  // Pre-populate with static groups (preserves defined order)
  for (const g of dim.groups) {
    buckets.set(g.key, { groupKey: g.key, groupMeta: g, tasks: [] });
  }

  for (const task of tasks) {
    let key = dim.accessor(task);
    if (key === undefined || key === null || key === "") {
      key = dim.fallback;
    }
    if (!buckets.has(key)) {
      // Dynamic group (e.g., owner dimension or unknown value)
      buckets.set(key, {
        groupKey: key,
        groupMeta: { key, label: key, icon: "\u{1F4CC}", color: "#9d9daa" },
        tasks: [],
      });
    }
    buckets.get(key).tasks.push(task);
  }

  return Array.from(buckets.values());
}
