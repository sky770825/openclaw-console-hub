import type { DefenseFramework } from "@/types/mdci";
import { MDCI_AXES } from "@/data/mdci";
import FrameworkStatusBadge from "./FrameworkStatusBadge";

export default function FrameworkCard({ fw }: { fw: DefenseFramework }) {
  const axisColors = fw.mdciAxes.map((k) => {
    const axis = MDCI_AXES.find((a) => a.key === k);
    return { key: k, color: axis?.color ?? "#888", label: axis?.label ?? k };
  });

  return (
    <div className="sc-holo-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-mono text-cyan-400">{fw.id}</span>
          <h3 className="text-sm font-semibold mt-0.5">{fw.name}</h3>
          <p className="text-[11px] text-muted-foreground">{fw.nameEn}</p>
        </div>
        <FrameworkStatusBadge phase={fw.phase} />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{fw.description}</p>

      <div className="flex items-center justify-between text-[11px]">
        <div className="flex gap-1.5">
          {axisColors.map((ac) => (
            <span
              key={ac.key}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{
                color: ac.color,
                background: `${ac.color}15`,
                border: `1px solid ${ac.color}30`,
              }}
            >
              {ac.key} {ac.label}
            </span>
          ))}
        </div>
        <span className="text-muted-foreground">{fw.costLabel}</span>
      </div>

      <div className="text-[10px] text-muted-foreground">
        {fw.timelineStart}–{fw.timelineEnd}
      </div>
    </div>
  );
}
