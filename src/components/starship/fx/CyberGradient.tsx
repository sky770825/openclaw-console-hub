/**
 * CyberGradient — 動態 CSS/Canvas 漸層背景
 *
 * 用 CSS 動畫模擬 shader 漸層效果（輕量替代 shadergradient 套件）。
 * 顏色依艦況切換：normal=青藍, alert=紅橙, warning=琥珀。
 */
import { cn } from "@/lib/utils";

type GradientMode = "normal" | "alert" | "warning";

const MODE_CONFIG: Record<GradientMode, { colors: string; animation: string }> = {
  normal: {
    colors: "from-cyan-900/20 via-indigo-900/15 to-violet-900/10",
    animation: "animate-gradient-shift",
  },
  alert: {
    colors: "from-red-900/25 via-orange-900/15 to-rose-900/10",
    animation: "animate-gradient-shift",
  },
  warning: {
    colors: "from-amber-900/20 via-yellow-900/15 to-orange-900/10",
    animation: "animate-gradient-shift",
  },
};

interface Props {
  mode?: GradientMode;
  className?: string;
  children?: React.ReactNode;
}

export default function CyberGradient({ mode = "normal", className, children }: Props) {
  const cfg = MODE_CONFIG[mode];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* 主漸層層 */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br transition-colors duration-1000",
          cfg.colors,
          cfg.animation,
        )}
      />
      {/* 掃描線覆蓋 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
        }}
      />
      {/* 內容 */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
