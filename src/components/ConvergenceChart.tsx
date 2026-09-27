import { ALGORITHM_META, type AlgorithmId, type Run } from "@/lib/optimizer";

type Props = {
  runs: Partial<Record<AlgorithmId, Run>>;
  progress: number;
};

const ORDER: AlgorithmId[] = ["sa", "qso", "aco", "ga", "qpso"];

export function ConvergenceChart({ runs, progress }: Props) {
  const series = ORDER.map((id) => ({ id, run: runs[id] })).filter((s) => s.run);
  const allValues = series.flatMap((s) => s.run!.history);
  const rawMax = Math.max(...allValues);
  const rawMin = Math.min(...allValues);
  const pad = (rawMax - rawMin || 1) * 0.12;
  const max = rawMax + pad;
  const min = rawMin - pad;
  const span = max - min;
  const width = 640;
  const height = 200;

  const pathFor = (history: number[]) => {
    const shown = Math.max(2, Math.round(history.length * progress));
    return history
      .slice(0, shown)
      .map((v, i) => {
        const x = (i / Math.max(history.length - 1, 1)) * width;
        const y = height - ((v - min) / span) * (height - 16) - 8;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const qpso = runs.qpso;

  return (
    <div className="panel relative flex flex-col p-4">
      <div className="flex items-start justify-between">
        <h3 className="font-display text-sm font-semibold">
          Convergence
        </h3>
        {qpso && (
          <div className="text-right">
            <p className="font-mono text-[10px] text-faint">
              Best fitness
            </p>
            <p className="font-mono text-sm text-foreground">{qpso.best.fitness.toFixed(3)}</p>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-4 h-[200px] w-full"
        preserveAspectRatio="none"
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={width}
            y1={height * f}
            y2={height * f}
            stroke="oklch(0.303 0.016 285)"
            strokeDasharray="2 4"
          />
        ))}
        {series.map(({ id, run }) => (
          <path
            key={id}
            d={pathFor(run!.history)}
            fill="none"
            stroke={ALGORITHM_META[id].color}
            strokeWidth={id === "qpso" ? 2.6 : 1.2}
            strokeOpacity={id === "qpso" ? 1 : 0.55}
            style={
              id === "qpso"
                ? {
                    filter:
                      "drop-shadow(0 0 6px color-mix(in oklab, var(--ember) 60%, transparent))",
                  }
                : undefined
            }
          />
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          {ORDER.slice()
            .reverse()
            .map((id) => (
              <span key={id} className="flex items-center gap-2 font-mono text-[10px] text-mist">
                <span className="h-0.5 w-4" style={{ background: ALGORITHM_META[id].color }} />
                {ALGORITHM_META[id].label}
              </span>
            ))}
        </div>
        <span className="font-mono text-[10px] text-faint">
          iteration 0 → {qpso?.history.length ?? 0} · lower fitness is better
        </span>
      </div>
    </div>
  );
}
