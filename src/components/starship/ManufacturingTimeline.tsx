import type { DefenseFramework, FrameworkPhase } from "@/types/mdci";
import FrameworkStatusBadge from "./FrameworkStatusBadge";

const PHASE_CONFIG: Record<
  FrameworkPhase,
  { label: string; lineColor: string; dotColor: string }
> = {
  seed: { label: "種子期（立即啟動）", lineColor: "#60a5fa", dotColor: "#3b82f6" },
  wave1: { label: "第一波 2028–2035", lineColor: "#22d3ee", dotColor: "#06b6d4" },
  wave2: { label: "第二波 2035–2060", lineColor: "#fbbf24", dotColor: "#f59e0b" },
  wave3: { label: "第三波 2060–2100", lineColor: "#34d399", dotColor: "#10b981" },
};

interface Props {
  frameworks: DefenseFramework[];
  phase: FrameworkPhase;
}

export default function ManufacturingTimeline({ frameworks, phase }: Props) {
  const cfg = PHASE_CONFIG[phase];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: cfg.dotColor }}
        />
        {cfg.label}
        <span className="text-xs text-muted-foreground font-normal">
          ({frameworks.length} 項)
        </span>
      </h3>

      <div className="relative ml-3 border-l-2 space-y-4 pl-6 pb-2" style={{ borderColor: `${cfg.lineColor}40` }}>
        {frameworks.map((fw) => (
          <div key={fw.id} className="relative">
            {/* dot on timeline */}
            <div
              className="absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2"
              style={{ borderColor: cfg.dotColor, background: "var(--oc-bg, #06060a)" }}
            />
            <div className="sc-holo-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyan-400">{fw.id}</span>
                  <span className="text-sm font-medium">{fw.name}</span>
                </div>
                <FrameworkStatusBadge phase={fw.phase} />
              </div>
              <p className="text-xs text-muted-foreground">{fw.description}</p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{fw.timelineStart}–{fw.timelineEnd}</span>
                <span>{fw.costLabel}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
