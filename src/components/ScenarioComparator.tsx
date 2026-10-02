import { useState, useCallback } from "react";
import { useSolver } from "@/lib/solver";
import type { Run } from "@/lib/optimizer";

export interface ScenarioSnapshot {
  id: string;
  label: string;
  timestamp: Date;
  qpso: Run | null;
  scenarioDesc: string;
  params: { vehicles: number; swarm: number; iterations: number };
  networkLabel: string;
  color: string;
}

const SNAPSHOT_COLORS = ["#ff6b35", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b"];

interface ScenarioComparatorProps {
  className?: string;
}

export function ScenarioComparator({ className = "" }: ScenarioComparatorProps) {
  const { runs, scenario, params, networkConfig } = useSolver();
  const [snapshots, setSnapshots] = useState<ScenarioSnapshot[]>([]);
  const [labelDraft, setLabelDraft] = useState("");

  const saveSnapshot = useCallback(() => {
    const label =
      labelDraft.trim() ||
      `Run #${snapshots.length + 1} — ${scenario.accident ? "Accident" : scenario.closure ? "Closure" : "Nominal"}`;
    const snap: ScenarioSnapshot = {
      id: `snap-${Date.now()}`,
      label,
      timestamp: new Date(),
      qpso: runs.qpso ?? null,
      scenarioDesc: [
        scenario.accident ? "Accident active" : null,
        scenario.closure ? "MG Road closure" : null,
        !scenario.accident && !scenario.closure ? "Nominal network" : null,
      ]
        .filter(Boolean)
        .join(", "),
      params: {
        vehicles: params.vehicles,
        swarm: params.swarm,
        iterations: params.iterations,
      },
      networkLabel: networkConfig.pickupHub.name,
      color: SNAPSHOT_COLORS[snapshots.length % SNAPSHOT_COLORS.length]!,
    };
    setSnapshots((prev) => [...prev, snap]);
    setLabelDraft("");
  }, [runs, scenario, params, networkConfig, snapshots.length, labelDraft]);

  const removeSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  const metrics = [
    { key: "distanceKm", label: "Total Distance", unit: "km", lowerBetter: true },
    { key: "timeMin", label: "Avg ETA", unit: "min", lowerBetter: true },
    { key: "fitness", label: "Fitness Score", unit: "", lowerBetter: true },
    { key: "co2Kg", label: "CO₂ Emitted", unit: "kg", lowerBetter: true },
    { key: "congestionIdx", label: "Congestion Idx", unit: "", lowerBetter: true },
  ] as const;

  const bestPerMetric: Record<string, number> = {};
  for (const metric of metrics) {
    const values = snapshots
      .filter((s) => s.qpso)
      .map((s) => (s.qpso!.best as unknown as Record<string, number>)[metric.key] as number);
    if (values.length > 0) {
      bestPerMetric[metric.key] = metric.lowerBetter ? Math.min(...values) : Math.max(...values);
    }
  }

  return (
    <div className={`panel p-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              Scenario Snapshot Comparator
            </p>
            <p className="font-mono text-[10px] text-faint">
              Save and compare solver runs across different configurations
            </p>
          </div>
        </div>
        <span className="rounded bg-ember/20 px-2 py-0.5 font-mono text-[9px] font-bold text-ember border border-ember/30">
          {snapshots.length} / 5 saved
        </span>
      </div>

      {/* Save Control */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          placeholder="Label this run (optional)..."
          className="flex-1 rounded-lg border border-line bg-obsidian px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && saveSnapshot()}
        />
        <button
          onClick={saveSnapshot}
          disabled={!runs.qpso || snapshots.length >= 5}
          className="rounded-lg bg-ember px-4 py-2 font-mono text-[11px] font-bold text-void transition hover:bg-foreground hover:text-background disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save ↓
        </button>
      </div>

      {snapshots.length === 0 && (
        <div className="mt-6 py-6 text-center">
          <p className="text-2xl">💾</p>
          <p className="mt-2 font-mono text-xs text-mist">
            Run the optimizer, then save snapshots to compare across accident/closure/normal scenarios
          </p>
        </div>
      )}

      {/* Comparison Table */}
      {snapshots.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full font-mono text-[11px]">
            <thead>
              <tr className="border-b border-line/60">
                <th className="pb-2 text-left text-[9px] uppercase tracking-widest text-faint">
                  Metric
                </th>
                {snapshots.map((s) => (
                  <th key={s.id} className="pb-2 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-[10px] font-bold text-foreground truncate max-w-[80px]">
                          {s.label}
                        </span>
                        <button
                          onClick={() => removeSnapshot(s.id)}
                          className="text-[9px] text-faint hover:text-red-400 transition"
                          title="Remove snapshot"
                        >
                          ✕
                        </button>
                      </div>
                      <span className="text-[8px] text-faint">{s.scenarioDesc}</span>
                      <span className="text-[8px] text-faint">
                        V{s.params.vehicles} · SW{s.params.swarm}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.key} className="border-b border-line/30">
                  <td className="py-2 text-[9px] uppercase tracking-wider text-mist">
                    {metric.label}
                  </td>
                  {snapshots.map((s) => {
                    if (!s.qpso) {
                      return (
                        <td key={s.id} className="py-2 text-right text-faint">
                          —
                        </td>
                      );
                    }
                    const val = (s.qpso.best as unknown as Record<string, number>)[metric.key] as number;
                    const isBest = bestPerMetric[metric.key] === val;
                    return (
                      <td key={s.id} className="py-2 text-right">
                        <span
                          className={`${
                            isBest && snapshots.length > 1
                              ? "font-bold text-emerald-400"
                              : "text-foreground"
                          }`}
                        >
                          {val.toFixed(metric.key === "congestionIdx" ? 3 : 1)}
                          {metric.unit && (
                            <span className="ml-0.5 text-[9px] text-mist">{metric.unit}</span>
                          )}
                          {isBest && snapshots.length > 1 && (
                            <span className="ml-1 text-[8px] text-emerald-400">★</span>
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Runtime row */}
              <tr className="border-b border-line/30">
                <td className="py-2 text-[9px] uppercase tracking-wider text-mist">
                  Solve Time
                </td>
                {snapshots.map((s) => (
                  <td key={s.id} className="py-2 text-right text-foreground">
                    {s.qpso ? `${s.qpso.runtimeMs}ms` : "—"}
                  </td>
                ))}
              </tr>
              {/* Convergence row */}
              <tr>
                <td className="py-2 text-[9px] uppercase tracking-wider text-mist">
                  Converged At
                </td>
                {snapshots.map((s) => (
                  <td key={s.id} className="py-2 text-right text-foreground">
                    {s.qpso ? `it.${s.qpso.convergedAt}` : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
