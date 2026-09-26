import { ALGORITHM_META, type AlgorithmId, type Run } from "@/lib/optimizer";

const ORDER: AlgorithmId[] = ["qpso", "ga", "aco", "qso", "sa"];

export function BenchmarkTable({ runs }: { runs: Partial<Record<AlgorithmId, Run>> }) {
  const base = runs.qpso;

  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ember">
            Benchmark engine
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">
            Head-to-head on the same instance
          </h3>
        </div>
        <span className="font-mono text-[10px] text-faint">
          {Object.keys(runs).length} algorithms · 25 nodes
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-line font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
              <th className="pb-2 text-left font-normal">Algorithm</th>
              <th className="pb-2 text-right font-normal">Fitness</th>
              <th className="pb-2 text-right font-normal">Distance</th>
              <th className="pb-2 text-right font-normal">Avg ETA</th>
              <th className="pb-2 text-right font-normal">Iter to conv.</th>
              <th className="pb-2 text-right font-normal">Runtime</th>
              <th className="pb-2 text-right font-normal">Δ vs QPSO</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[12px]">
            {ORDER.filter((id) => runs[id]).map((id) => {
              const run = runs[id]!;
              const delta =
                base && id !== "qpso"
                  ? ((run.best.fitness - base.best.fitness) / base.best.fitness) * 100
                  : 0;
              const isBest = id === "qpso";
              return (
                <tr
                  key={id}
                  className={`border-b border-line/60 ${isBest ? "text-foreground" : "text-mist"}`}
                >
                  <td className="py-2.5 text-left">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: ALGORITHM_META[id].color }}
                      />
                      {ALGORITHM_META[id].label}
                      <span className="font-body text-[11px] text-faint">
                        {ALGORITHM_META[id].full}
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right">{run.best.fitness.toFixed(3)}</td>
                  <td className="py-2.5 text-right">{run.best.distanceKm.toFixed(1)} km</td>
                  <td className="py-2.5 text-right">{run.best.timeMin.toFixed(1)} min</td>
                  <td className="py-2.5 text-right">{run.convergedAt}</td>
                  <td className="py-2.5 text-right">{run.runtimeMs} ms</td>
                  <td className="py-2.5 text-right">
                    {isBest ? (
                      <span className="text-ember">baseline</span>
                    ) : (
                      <span className="text-amber">+{delta.toFixed(1)}%</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
