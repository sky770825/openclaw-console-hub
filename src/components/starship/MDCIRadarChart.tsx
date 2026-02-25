import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useMDCI } from "@/hooks/useMDCI";

interface Props {
  size?: "sm" | "md" | "lg";
}

export default function MDCIRadarChart({ size = "md" }: Props) {
  const { axes } = useMDCI();

  const data = axes.map((a) => ({
    axis: a.label,
    current: a.current,
    target: a.target,
  }));

  const dim = size === "sm" ? 200 : size === "md" ? 320 : 400;

  return (
    <div
      style={{ width: dim, height: dim }}
      className="mx-auto"
      role="img"
      aria-label="MDCI 六軸雷達圖：能源主權、資訊架構、演化速率、時空因果控制、意識整合、防禦超越"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--oc-t2, #9d9daa)", fontSize: size === "sm" ? 10 : 12 }}
          />
          <Radar
            name="目標"
            dataKey="target"
            stroke="var(--oc-amber, #fbbf24)"
            fill="transparent"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
          <Radar
            name="現況"
            dataKey="current"
            stroke="var(--oc-cyan, #22d3ee)"
            fill="var(--oc-cyan, #22d3ee)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              background: "var(--oc-s2, #13131b)",
              border: "1px solid var(--oc-border-h, rgba(255,255,255,0.1))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => v.toFixed(2)}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
