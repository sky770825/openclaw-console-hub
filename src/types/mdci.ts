// MDCI (Multi-Dimensional Civilization Index) 多維文明指數型別定義

export type MDCIAxisKey = "E" | "I" | "V" | "S" | "C" | "D";

export interface MDCIAxisData {
  key: MDCIAxisKey;
  label: string;
  labelEn: string;
  description: string;
  current: number; // 0.00 – 5.00
  target: number;
  color: string;
  icon: string;
}

export type FrameworkPhase = "seed" | "wave1" | "wave2" | "wave3";

export interface DefenseFramework {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  mdciAxes: MDCIAxisKey[];
  phase: FrameworkPhase;
  timelineStart: number; // year
  timelineEnd: number;
  costLabel: string;
}

export interface MDCIComposite {
  current: number;
  target: number;
}
