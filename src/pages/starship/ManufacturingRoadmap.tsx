import { useState } from "react";
import { motion } from "framer-motion";
import { useMDCI } from "@/hooks/useMDCI";
import ManufacturingTimeline from "@/components/starship/ManufacturingTimeline";
import { CyberGradient, MotionPanel } from "@/components/starship/fx";
import type { FrameworkPhase } from "@/types/mdci";

type TabKey = "all" | FrameworkPhase;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "seed", label: "種子期" },
  { key: "wave1", label: "第一波" },
  { key: "wave2", label: "第二波" },
  { key: "wave3", label: "第三波" },
];

const PHASE_ORDER: FrameworkPhase[] = ["seed", "wave1", "wave2", "wave3"];

export default function ManufacturingRoadmap() {
  const { getFrameworksByPhase } = useMDCI();
  const [tab, setTab] = useState<TabKey>("all");

  const phases: FrameworkPhase[] =
    tab === "all" ? PHASE_ORDER : [tab as FrameworkPhase];

  return (
    <CyberGradient mode="normal" className="min-h-full">
      <div className="space-y-6 p-6 max-w-4xl mx-auto">
        {/* Header */}
        <MotionPanel index={0} hover={false}>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="sc-glow-text text-cyan-400">製造路線圖</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manufacturing Roadmap — 14 框架分波實施時間軸
          </p>
        </MotionPanel>

        {/* Cost summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PHASE_ORDER.map((p, i) => {
            const fws = getFrameworksByPhase(p);
            return (
              <MotionPanel key={p} index={i + 1} holo className="p-3 text-center">
                <div className="text-lg font-bold tabular-nums">{fws.length}</div>
                <div className="text-[10px] text-muted-foreground">
                  {TABS.find((t) => t.key === p)?.label}
                </div>
              </MotionPanel>
            );
          })}
        </div>

        {/* Tabs */}
        <MotionPanel index={5} hover={false} className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <motion.button
              key={t.key}
              onClick={() => setTab(t.key)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                tab === t.key
                  ? "bg-cyan-400/15 text-cyan-400 border-cyan-400/30"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:border-muted-foreground/20"
              }`}
            >
              {t.label}
            </motion.button>
          ))}
        </MotionPanel>

        {/* Timelines — Scroll-Driven Animations */}
        <div className="space-y-8">
          {phases.map((p, i) => {
            const fws = getFrameworksByPhase(p);
            if (fws.length === 0) return null;
            return (
              <MotionPanel key={p} index={i + 6} hover={false} className="sc-scroll-reveal">
                <ManufacturingTimeline frameworks={fws} phase={p} />
              </MotionPanel>
            );
          })}
        </div>
      </div>
    </CyberGradient>
  );
}
