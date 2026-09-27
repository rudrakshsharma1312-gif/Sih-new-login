import { createFileRoute } from "@tanstack/react-router";
import { ControlRail } from "@/components/ControlRail";
import { ConvergenceChart } from "@/components/ConvergenceChart";
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
        kicker="Control surface"
        title="Tune the swarm, watch it converge"
        aside="α β γ δ TUNABLE"
      />
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
        </div>
      </div>
    </section>
  );
}
