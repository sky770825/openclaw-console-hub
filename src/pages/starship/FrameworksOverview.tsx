import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMDCI } from "@/hooks/useMDCI";
import FrameworkCard from "@/components/starship/FrameworkCard";
import { CyberGradient, MotionPanel } from "@/components/starship/fx";
import type { MDCIAxisKey, FrameworkPhase } from "@/types/mdci";

type FilterKey = "all" | MDCIAxisKey;

const AXIS_FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "E", label: "E 能源" },
  { key: "I", label: "I 資訊" },
  { key: "V", label: "V 演化" },
  { key: "S", label: "S 時空" },
  { key: "C", label: "C 意識" },
  { key: "D", label: "D 防禦" },
];

const PHASE_LABELS: Record<FrameworkPhase, string> = {
  seed: "種子期",
  wave1: "第一波",
  wave2: "第二波",
  wave3: "第三波",
};

export default function FrameworksOverview() {
  const { frameworks, frameworkCountByPhase } = useMDCI();
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered =
    filter === "all"
      ? frameworks
      : frameworks.filter((f) => f.mdciAxes.includes(filter as MDCIAxisKey));

  return (
    <CyberGradient mode="normal" className="min-h-full">
      <div className="space-y-6 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <MotionPanel index={0} hover={false}>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="sc-glow-text text-cyan-400">14</span> 防線框架
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defense Frameworks — 行星防禦理論體系
          </p>
        </MotionPanel>

        {/* Filter pills */}
        <MotionPanel index={1} hover={false} className="flex flex-wrap gap-2">
          {AXIS_FILTERS.map((af) => (
            <motion.button
              key={af.key}
              onClick={() => setFilter(af.key)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === af.key
                  ? "bg-cyan-400/15 text-cyan-400 border-cyan-400/30"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:border-muted-foreground/20"
              }`}
            >
              {af.label}
            </motion.button>
          ))}
        </MotionPanel>

        {/* Stats row */}
        <MotionPanel index={2} hover={false} className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>{frameworks.length} 個框架</span>
          {(Object.entries(frameworkCountByPhase) as [FrameworkPhase, number][]).map(
            ([phase, count]) => (
              <span key={phase}>
                {PHASE_LABELS[phase]} {count}
              </span>
            )
          )}
          <span>顯示 {filtered.length}</span>
        </MotionPanel>

        {/* Cards grid — Subgrid + AnimatePresence + Scroll-Driven */}
        <motion.div
          layout
          className="sc-subgrid-cards"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((fw, i) => (
              <motion.div
                key={fw.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="sc-scroll-reveal"
              >
                <FrameworkCard fw={fw} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </CyberGradient>
  );
}
