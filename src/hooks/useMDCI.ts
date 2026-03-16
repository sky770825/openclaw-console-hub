import { useMemo } from "react";
import {
  MDCI_AXES,
  MDCI_COMPOSITE,
  DEFENSE_FRAMEWORKS,
  getFrameworksByAxis,
  getFrameworkById,
  getFrameworksByPhase,
} from "@/data/mdci";
import type { MDCIAxisKey, DefenseFramework } from "@/types/mdci";

export function useMDCI() {
  const axes = MDCI_AXES;
  const frameworks = DEFENSE_FRAMEWORKS;
  const composite = MDCI_COMPOSITE;

  const frameworkCountByPhase = useMemo(() => {
    const counts: Record<DefenseFramework["phase"], number> = {
      seed: 0,
      wave1: 0,
      wave2: 0,
      wave3: 0,
    };
    for (const f of frameworks) {
      counts[f.phase]++;
    }
    return counts;
  }, [frameworks]);

  return {
    axes,
    frameworks,
    composite,
    frameworkCountByPhase,
    getFrameworksByAxis: (key: MDCIAxisKey) => getFrameworksByAxis(key),
    getFrameworkById: (id: string) => getFrameworkById(id),
    getFrameworksByPhase: (phase: DefenseFramework["phase"]) =>
      getFrameworksByPhase(phase),
  };
}
