import { useMDCI } from "@/hooks/useMDCI";

export default function MDCIProgressBars() {
  const { axes } = useMDCI();

  return (
    <div className="space-y-4">
      {axes.map((a) => {
        const pctCurrent = (a.current / 5) * 100;
        const pctTarget = (a.target / 5) * 100;

        return (
          <div key={a.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium" style={{ color: a.color }}>
                {a.key} — {a.label}
              </span>
              <span className="text-muted-foreground tabular-nums text-xs">
                {a.current.toFixed(2)} / {a.target.toFixed(1)}
              </span>
            </div>
            <div
              className="relative h-3 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-label={`${a.label} 文明指數`}
              aria-valuenow={a.current}
              aria-valuemin={0}
              aria-valuemax={5}
            >
              {/* current fill */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${pctCurrent}%`,
                  background: a.color,
                  opacity: 0.8,
                }}
              />
              {/* target marker */}
              <div
                className="absolute inset-y-0 w-0.5 bg-white/60"
                style={{ left: `${pctTarget}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
