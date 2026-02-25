import { useMDCI } from "@/hooks/useMDCI";

export default function MDCICompositeScore() {
  const { composite } = useMDCI();

  const pct = (composite.current / 5) * 100;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={150}
        height={150}
        className="-rotate-90"
        role="img"
        aria-label={`MDCI 綜合分數 ${composite.current.toFixed(2)} / 5.00`}
      >
        {/* background arc */}
        <circle
          cx={75}
          cy={75}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={10}
        />
        {/* score arc */}
        <circle
          cx={75}
          cy={75}
          r={radius}
          fill="none"
          stroke="var(--oc-cyan, #22d3ee)"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: 150, height: 150 }}>
        <span className="text-2xl font-bold text-cyan-400 tabular-nums">
          {composite.current.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground">/ 5.00</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        目標 {composite.target.toFixed(2)}
      </p>
    </div>
  );
}
