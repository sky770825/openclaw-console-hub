import type { FrameworkPhase } from "@/types/mdci";

const PHASE_STYLE: Record<FrameworkPhase, { label: string; className: string }> = {
  seed: { label: "種子期", className: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  wave1: { label: "第一波", className: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  wave2: { label: "第二波", className: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  wave3: { label: "第三波", className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
};

export default function FrameworkStatusBadge({ phase }: { phase: FrameworkPhase }) {
  const s = PHASE_STYLE[phase];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.className}`}>
      {s.label}
    </span>
  );
}
