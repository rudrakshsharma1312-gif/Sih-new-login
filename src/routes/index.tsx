import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CityMap } from "@/components/CityMap";
import { DriverPerformanceChart } from "@/components/DriverPerformanceChart";
import { HubSelectorBar } from "@/components/HubSelectorBar";
import { routeLabel } from "@/lib/optimizer";
import { useSolver } from "@/lib/solver";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QUANTA — Fleet Route Optimization" },
      {
        name: "description",
        content:
          "Multi-vehicle route optimization on the Bengaluru road network using QPSO, benchmarked against GA, ACO and PSO.",
      },
      {
        property: "og:title",
        content: "QUANTA — Fleet Route Optimization",
      },
      {
        property: "og:description",
        content: "Fleet routing with QPSO on the Bengaluru road graph.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { runs, progress, params, clock } = useSolver();
  const [pinMode, setPinMode] = useState<"pickup" | "destination" | null>(null);
  const qpso = runs.qpso;
  const ga = runs.ga;

  const revealedRoutes = useMemo(() => {
    if (!qpso) return [];
    const count = Math.max(1, Math.ceil(qpso.best.routes.length * progress));
    return qpso.best.routes.slice(0, count);
  }, [qpso, progress]);

  return (
    <section className="space-y-6 pb-12 pt-1">
      <HubSelectorBar
        activePinMode={pinMode}
        onStartMapPinPick={(target) => setPinMode(target)}
        onCancelPinMode={() => setPinMode(null)}
      />

      {/* Overview grid */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Left: summary + quick actions */}
        <div className="lg:col-span-5 space-y-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Fleet Overview
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
              Route dispatch
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-mist">
              Multi-vehicle route optimization across the Bengaluru road network. QPSO solver
              compared against GA, ACO and PSO baselines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/optimizer"
              className="rounded-md bg-ember px-4 py-2 text-xs font-semibold text-void transition hover:bg-emberdim"
            >
              Optimizer
            </Link>
            <Link
              to="/benchmark"
              className="rounded-md border border-line px-4 py-2 text-xs font-medium text-foreground transition hover:border-foreground/40"
            >
              Benchmark
            </Link>
            <Link
              to="/intelligence"
              className="rounded-md border border-line px-4 py-2 text-xs font-medium text-mist transition hover:text-foreground hover:border-foreground/40"
            >
              Intelligence
            </Link>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-3">
            <div className="panel p-3">
              <p className="font-mono text-xl font-bold text-foreground">25</p>
              <p className="mt-0.5 font-mono text-[10px] text-faint">Nodes</p>
            </div>
            <div className="panel p-3">
              <p className="font-mono text-xl font-bold text-foreground">{params.vehicles}</p>
              <p className="mt-0.5 font-mono text-[10px] text-faint">Vehicles</p>
            </div>
            <div className="panel p-3">
              <p className="font-mono text-xl font-bold text-foreground">
                {qpso ? qpso.convergedAt : "—"}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-faint">Iterations</p>
            </div>
          </div>
        </div>

        {/* Right: live map */}
        <div className="lg:col-span-7">
          <div className="panel p-2">
            <div className="mb-2 flex items-center justify-between px-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-ember" />
                <span className="font-mono text-[10px] text-faint">Bengaluru · {clock} IST</span>
              </div>
              <span className="badge-move-transit">In Transit</span>
            </div>

            <CityMap
              routes={revealedRoutes}
              {...(ga ? { ghostRoutes: ga.best.routes } : {})}
              pinMode={pinMode}
              onPinModeChange={setPinMode}
              className="aspect-[4/3] w-full rounded-md"
            />

            <div className="mt-2 flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-5 items-center justify-center rounded-md bg-ember text-void text-[10px] font-bold">
                  1
                </span>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {qpso ? routeLabel(qpso.best.routes[0]!) : "Computing routes…"}
                  </p>
                  <p className="font-mono text-[10px] text-faint">Vehicle 01 · QPSO optimal path</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Performance */}
      <DriverPerformanceChart />
    </section>
  );
}
