import { lazy, Suspense } from "react";
import { useMDCI } from "@/hooks/useMDCI";
import MDCIRadarChart from "@/components/starship/MDCIRadarChart";
import MDCIProgressBars from "@/components/starship/MDCIProgressBars";
import MDCICompositeScore from "@/components/starship/MDCICompositeScore";
import { MotionPanel, CyberGradient, TelemetryChart } from "@/components/starship/fx";
import {
  Zap,
  Globe,
  Dna,
  Orbit,
  Brain,
  Shield,
} from "lucide-react";
import type { MDCIAxisKey } from "@/types/mdci";

const HoloGlobe = lazy(() => import("@/components/starship/fx/HoloGlobe"));

const AXIS_ICONS: Record<MDCIAxisKey, typeof Zap> = {
  E: Zap,
  I: Globe,
  V: Dna,
  S: Orbit,
  C: Brain,
  D: Shield,
};

export default function MDCIDashboard() {
  const { axes, getFrameworksByAxis } = useMDCI();

  return (
    <CyberGradient mode="normal" className="min-h-full">
      <div className="space-y-8 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <MotionPanel index={0} hover={false} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="sc-glow-text text-cyan-400">MDCI</span> 多維文明指數
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Multi-Dimensional Civilization Index — 地球 2026 基準
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="sc-beacon w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            <span className="text-xs text-muted-foreground">即時監測中</span>
          </div>
        </MotionPanel>

        {/* Top row: composite score + radar + holo globe */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MotionPanel index={1} holo className="p-6 flex flex-col items-center justify-center relative">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4">綜合文明分數</h2>
            <MDCICompositeScore />
          </MotionPanel>

          <MotionPanel index={2} holo className="p-6 flex flex-col items-center">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">六軸雷達圖</h2>
            <MDCIRadarChart size="md" />
            <div className="flex gap-4 mt-2 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block rounded" /> 現況
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-3 h-0.5 inline-block rounded"
                  style={{ borderTop: "1.5px dashed #fbbf24", background: "none" }}
                />{" "}
                目標
              </span>
            </div>
          </MotionPanel>

          <MotionPanel index={3} holo className="p-6 flex flex-col items-center overflow-hidden">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">星艦全息投影</h2>
            <Suspense
              fallback={
                <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">
                  載入 3D 引擎…
                </div>
              }
            >
              <HoloGlobe height={240} showStars={false} interactive />
            </Suspense>
          </MotionPanel>
        </div>

        {/* Progress bars — scroll-reveal */}
        <MotionPanel index={4} holo className="p-6 sc-scroll-reveal">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">六軸進度</h2>
          <MDCIProgressBars />
        </MotionPanel>

        {/* Telemetry chart — scroll-reveal */}
        <MotionPanel index={5} holo className="p-6 sc-scroll-reveal">
          <TelemetryChart
            title="星艦即時遙測"
            height={240}
            series={[
              { name: "護盾功率", color: "#22d3ee" },
              { name: "引擎輸出", color: "#fbbf24" },
              { name: "感測器靈敏度", color: "#a78bfa" },
            ]}
          />
        </MotionPanel>

        {/* Axis detail cards — Subgrid + Scroll-Driven */}
        <div className="sc-subgrid-cards">
          {axes.map((a, i) => {
            const Icon = AXIS_ICONS[a.key];
            const fwCount = getFrameworksByAxis(a.key).length;
            return (
              <MotionPanel key={a.key} index={i} holo className="p-4 space-y-2 sc-scroll-reveal">
                {/* Row 1: Header */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${a.color}15`, border: `1px solid ${a.color}30` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: a.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: a.color }}>
                      {a.key} — {a.label}
                    </h3>
                    <p className="text-[10px] text-muted-foreground sc-compact-hide">{a.labelEn}</p>
                  </div>
                </div>
                {/* Row 2: Description */}
                <p className="text-xs text-muted-foreground leading-relaxed sc-compact-hide">
                  {a.description}
                </p>
                {/* Row 3: Stats */}
                <div className="flex items-center justify-between text-xs">
                  <span className="tabular-nums sc-scroll-counter" style={{ color: a.color }}>
                    {a.current.toFixed(2)} → {a.target.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">{fwCount} 個框架</span>
                </div>
              </MotionPanel>
            );
          })}
        </div>
      </div>
    </CyberGradient>
  );
}
