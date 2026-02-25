import type {
  MDCIAxisData,
  MDCIAxisKey,
  DefenseFramework,
  MDCIComposite,
} from "@/types/mdci";

// ── 6 軸資料 ──────────────────────────────────────────────

export const MDCI_AXES: MDCIAxisData[] = [
  {
    key: "E",
    label: "能源主權",
    labelEn: "Energy Sovereignty",
    description:
      "從化石燃料→核融合→戴森球→真空能量→熵逆轉→時空取能的升級路徑",
    current: 0.15,
    target: 3.0,
    color: "#f59e0b",
    icon: "Zap",
  },
  {
    key: "I",
    label: "資訊架構",
    labelEn: "Information Architecture",
    description:
      "從數位網路→量子原生→基質無關→哥德爾自指→超可計算→資訊即現實",
    current: 0.2,
    target: 4.0,
    color: "#22d3ee",
    icon: "Globe",
  },
  {
    key: "V",
    label: "演化速率",
    labelEn: "Evolution Velocity",
    description:
      "從人類節奏→AI加速→自我進化AI→物理層進化→本體論進化→即時適應",
    current: 0.05,
    target: 3.5,
    color: "#34d399",
    icon: "Dna",
  },
  {
    key: "S",
    label: "時空因果控制",
    labelEn: "Spatial-Causal Control",
    description:
      "從行星表面→內太陽系→恆星系→等效度規→選擇性因果→時空建構",
    current: 0.1,
    target: 4.0,
    color: "#818cf8",
    icon: "Orbit",
  },
  {
    key: "C",
    label: "意識整合",
    labelEn: "Consciousness Integration",
    description:
      "從孤立心智→腦機共生→網絡意識→意識武器→意識-物理耦合→普遍意識",
    current: 0.02,
    target: 3.0,
    color: "#c084fc",
    icon: "Brain",
  },
  {
    key: "D",
    label: "防禦超越",
    labelEn: "Defensive Transcendence",
    description:
      "從動能武器→分散自主→介質防禦→本體論防禦→邏輯防禦→因果防禦",
    current: 0.08,
    target: 4.5,
    color: "#f87171",
    icon: "Shield",
  },
];

// ── 14 防線框架 ───────────────────────────────────────────

export const DEFENSE_FRAMEWORKS: DefenseFramework[] = [
  {
    id: "IET",
    name: "免疫電磁拓撲",
    nameEn: "Immune Electromagnetic Topology",
    description:
      "將電磁防禦從「被動接收→偵測→反應」升級為「環境本身即免疫系統」",
    mdciAxes: ["D"],
    phase: "seed",
    timelineStart: 2030,
    timelineEnd: 2060,
    costLabel: "$25億–$500億",
  },
  {
    id: "CSDM",
    name: "意識結構防禦流形",
    nameEn: "Consciousness Structure Defense Manifold",
    description: "將意識場塑形為防禦幾何，使認知攻擊在結構層被消解",
    mdciAxes: ["C"],
    phase: "wave2",
    timelineStart: 2035,
    timelineEnd: 2060,
    costLabel: "$100億",
  },
  {
    id: "AEPE",
    name: "加速進化壓力引擎",
    nameEn: "Accelerated Evolution Pressure Engine",
    description: "對真空態施加進化壓力，誘導新物理效應自發湧現",
    mdciAxes: ["V", "E"],
    phase: "wave2",
    timelineStart: 2030,
    timelineEnd: 2080,
    costLabel: "$200億",
  },
  {
    id: "SOTP",
    name: "頻譜生物訓練協議",
    nameEn: "Spectrum-Organism Training Protocol",
    description: "訓練生物系統主動操控電磁頻譜，形成活體防禦網路",
    mdciAxes: ["D"],
    phase: "wave2",
    timelineStart: 2030,
    timelineEnd: 2050,
    costLabel: "$50億",
  },
  {
    id: "IKDP",
    name: "逆卡爾達肖夫威懾",
    nameEn: "Inverse Kardashev Deterrence Protocol",
    description: "透過不可理解性投射，使高等文明無法建立有效攻擊模型",
    mdciAxes: ["D"],
    phase: "wave1",
    timelineStart: 2028,
    timelineEnd: 2070,
    costLabel: "$10億–$200億",
  },
  {
    id: "EAW",
    name: "熵不對稱戰爭",
    nameEn: "Entropy Asymmetry Warfare",
    description: "操控局部熵梯度，使敵方系統加速退化而我方系統維持有序",
    mdciAxes: ["D"],
    phase: "wave1",
    timelineStart: 2030,
    timelineEnd: 2045,
    costLabel: "$5億",
  },
  {
    id: "CODE",
    name: "集體夢境發現引擎",
    nameEn: "Collective Oneiric Discovery Engine",
    description: "利用集體潛意識狀態加速科學突破與創意問題解決",
    mdciAxes: ["I"],
    phase: "wave1",
    timelineStart: 2028,
    timelineEnd: 2040,
    costLabel: "$20億",
  },
  {
    id: "AO",
    name: "對抗性個體發生",
    nameEn: "Adversarial Ontogenesis",
    description: "讓防禦系統在對抗中自主進化，敵方攻擊反而加速我方升級",
    mdciAxes: ["D"],
    phase: "seed",
    timelineStart: 2028,
    timelineEnd: 2035,
    costLabel: "$1億",
  },
  {
    id: "CHI",
    name: "認知地平線反轉",
    nameEn: "Cognitive Horizon Inversion",
    description: "反轉認知邊界，將敵方的資訊優勢轉化為認知陷阱",
    mdciAxes: ["I"],
    phase: "wave1",
    timelineStart: 2030,
    timelineEnd: 2050,
    costLabel: "$10億",
  },
  {
    id: "TS",
    name: "熱力學主權",
    nameEn: "Thermodynamic Sovereignty",
    description: "在局部區域建立熱力學主權，控制能量流向與熵的方向",
    mdciAxes: ["D"],
    phase: "wave2",
    timelineStart: 2040,
    timelineEnd: 2070,
    costLabel: "$300億",
  },
  {
    id: "RIA",
    name: "遞迴不完備性裝甲",
    nameEn: "Recursive Incompleteness Armor",
    description: "利用哥德爾不完備性定理構建邏輯層級不可攻破的防禦",
    mdciAxes: ["I", "D"],
    phase: "seed",
    timelineStart: 2028,
    timelineEnd: 2035,
    costLabel: "$2億",
  },
  {
    id: "PFC",
    name: "泛心場耦合",
    nameEn: "Panpsychic Field Coupling",
    description: "耦合意識場與物理場，實現意識直接影響物理現實的介面",
    mdciAxes: ["C"],
    phase: "wave2",
    timelineStart: 2035,
    timelineEnd: 2060,
    costLabel: "$100億",
  },
  {
    id: "MW",
    name: "形態發生戰爭",
    nameEn: "Morphogenetic Warfare",
    description: "操控形態發生場，使防禦結構自我繁殖、自我修復、自主擴展",
    mdciAxes: ["D"],
    phase: "wave2",
    timelineStart: 2040,
    timelineEnd: 2080,
    costLabel: "$500億",
  },
  {
    id: "CTD",
    name: "因果拓撲擾亂",
    nameEn: "Causal Topology Disruption",
    description: "選擇性工程因果結構，使敵方行動的因果鏈失效",
    mdciAxes: ["S"],
    phase: "wave3",
    timelineStart: 2050,
    timelineEnd: 2100,
    costLabel: "$1000億",
  },
];

// ── 計算函式 ──────────────────────────────────────────────

export function computeComposite(
  axes: MDCIAxisData[],
  field: "current" | "target" = "current"
): number {
  if (axes.length === 0) return 0;
  const sum = axes.reduce((acc, a) => acc + a[field], 0);
  return Math.round((sum / axes.length) * 100) / 100;
}

export function getFrameworksByAxis(axis: MDCIAxisKey): DefenseFramework[] {
  return DEFENSE_FRAMEWORKS.filter((f) => f.mdciAxes.includes(axis));
}

export function getFrameworkById(id: string): DefenseFramework | undefined {
  return DEFENSE_FRAMEWORKS.find((f) => f.id === id);
}

export function getFrameworksByPhase(
  phase: DefenseFramework["phase"]
): DefenseFramework[] {
  return DEFENSE_FRAMEWORKS.filter((f) => f.phase === phase);
}

export const MDCI_COMPOSITE: MDCIComposite = {
  current: computeComposite(MDCI_AXES, "current"),
  target: computeComposite(MDCI_AXES, "target"),
};
