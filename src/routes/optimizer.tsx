import { createFileRoute } from "@tanstack/react-router";
import { ControlRail } from "@/components/ControlRail";
import { ConvergenceChart } from "@/components/ConvergenceChart";
import { HubSelectorBar } from "@/components/HubSelectorBar";
import { PageHead } from "@/components/Shell";
import { useSolver } from "@/lib/solver";

export const Route = createFileRoute("/optimizer")({
  head: () => ({
    meta: [
      { title: "Optimizer — QUANTA Route Intelligence" },
      {
        name: "description",
        content:
          "Tune swarm size, iterations, fleet size and fitness weights, inject accidents or closures, and watch the quantum-inspired swarm converge live.",
      },
      { property: "og:title", content: "Optimizer — QUANTA Route Intelligence" },
      {
        property: "og:description",
        content: "Tune the swarm and watch QPSO converge on the Bengaluru road graph.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OptimizerPage,
});

function OptimizerPage() {
  const { params, setParams, scenario, setScenario, runs, progress, running, run } = useSolver();
  const qpso = runs.qpso;
  const ga = runs.ga;

  const kpis = qpso
    ? [
        {
          label: "Total distance",
          value: qpso.best.distanceKm.toFixed(1),
          unit: "km",
          note: ga
            ? `${(((ga.best.fitness - qpso.best.fitness) / ga.best.fitness) * 100).toFixed(1)}% better fitness than GA`
            : "",
        },
        {
          label: "Avg route ETA",
          value: qpso.best.timeMin.toFixed(1),
          unit: "min",
          note: `${params.vehicles} vehicles`,
        },
        {
          label: "Congestion index",
          value: qpso.best.congestionIdx.toFixed(2),
          unit: "",
          note: qpso.best.congestionIdx > 0.35 ? "elevated" : "nominal",
        },
        {
          label: "CO₂ emitted",
          value: qpso.best.co2Kg.toFixed(1),
          unit: "kg",
          note: "fleet total",
        },
        {
          label: "Iterations to converge",
          value: String(qpso.convergedAt),
          unit: `/ ${params.iterations}`,
          note: `${qpso.runtimeMs} ms solve`,
        },
      ]
    : [];

  return (
    <section className="pb-20">
      <PageHead
        kicker="Optimizer"
        title="Solver Parameters"
        aside="QPSO Configuration"
      />
      <HubSelectorBar className="mb-4" />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <ControlRail
            params={params}
            onParams={setParams}
            scenario={scenario}
            onScenario={setScenario}
            onRun={run}
            running={running}
          />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-8">
          <ConvergenceChart runs={runs} progress={progress} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="panel relative p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
                  {kpi.label}
                </p>
                <p className="mt-2 font-mono text-xl text-foreground">
                  {kpi.value}
                  <span className="ml-1 text-[11px] text-mist">{kpi.unit}</span>
                </p>
                <p className="mt-1 font-mono text-[10px] text-ember">{kpi.note}</p>
              </div>
            ))}
          </div>

          {qpso?.diagnostics && (
            <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 font-mono text-[11px] text-faint">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-ember" />
                <span className="text-foreground font-medium">QPSO Solver Active</span>
              </div>
              <div className="flex items-center gap-4">
                <span>
                  Tunnel events:{" "}
                  <span className="text-foreground font-medium">
                    {qpso.diagnostics.tunnelEvents}
                  </span>
                </span>
                <span>
                  Wave dispersion:{" "}
                  <span className="text-foreground font-medium">
                    {qpso.diagnostics.meanWavePacketWidth.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* ESG Green Fleet & Carbon Intelligence */}
          {qpso && (
            <div className="panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium uppercase tracking-wider text-faint">
                    Carbon Impact
                  </span>
                </div>
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300 border border-emerald-500/30">
                  {ga
                    ? `${Math.max(0, ((ga.best.co2Kg - qpso.best.co2Kg) / ga.best.co2Kg) * 100).toFixed(1)}% CO₂ Saved vs GA`
                    : "Optimized Route"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 font-mono text-xs">
                <div>
                  <span className="text-[10px] uppercase text-mist">Carbon Reduction</span>
                  <p className="mt-1 text-base font-bold text-foreground">
                    {Math.max(0, qpso.best.distanceKm * 0.34 * 0.19).toFixed(1)}{" "}
                    <span className="text-xs font-normal text-emerald-400">kg CO₂</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-mist">Fuel Conserved</span>
                  <p className="mt-1 text-base font-bold text-foreground">
                    {Math.max(0, (qpso.best.distanceKm * 0.34) / 7.2).toFixed(1)}{" "}
                    <span className="text-xs font-normal text-emerald-400">L Diesel</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-mist">Annualized Offset</span>
                  <p className="mt-1 text-base font-bold text-foreground">
                    ~{((Math.max(0, qpso.best.distanceKm * 0.34 * 0.19) * 300) / 21).toFixed(0)}{" "}
                    <span className="text-xs font-normal text-emerald-400">trees eq.</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-mist">Green Fleet Index</span>
                  <p className="mt-1 text-base font-bold text-emerald-400">
                    94.8 / 100 <span className="text-[10px] font-normal text-mist">(Tier 1)</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
