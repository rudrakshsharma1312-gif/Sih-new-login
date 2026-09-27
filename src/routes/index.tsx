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
      { title: "QUANTA — Quantum-Inspired Traffic Route Optimization, Bengaluru" },
      {
        name: "description",
        content:
          "QUANTA solves multi-vehicle routing across the Bengaluru road network with Quantum-behaved Particle Swarm Optimization (QPSO), benchmarked live against GA, ACO and PSO.",
      },
      {
        property: "og:title",
        content: "QUANTA — Quantum-Inspired Traffic Route Optimization",
      },
      {
        property: "og:description",
        content:
          "Live fleet routing command centre: QPSO vs GA, ACO and PSO on the Bengaluru road graph.",
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
    <section className="space-y-8 pb-16 pt-2">
      {/* Dynamic Pick-up Base & Destination Manager Bar */}
      <HubSelectorBar
        activePinMode={pinMode}
        onStartMapPinPick={(target) => setPinMode(target)}
        onCancelPinMode={() => setPinMode(null)}
      />

      {/* Top Banner / Hero Grid - Move. styled */}
      <div className="grid items-center gap-8 lg:grid-cols-12">
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 shadow-xs">
            <span className="flex size-5 items-center justify-center rounded-full bg-ember text-void text-[10px] font-bold">
              ↗
            </span>
            <span className="font-display text-xs font-bold text-foreground">Move.QUANTA</span>
            <span className="text-faint">·</span>
            <span className="font-mono text-[10px] text-mist">Quantum Fleet Intelligence</span>
          </div>

          <h1 className="font-display text-[clamp(2.5rem,5.5vw,4.2rem)] font-extrabold leading-[1] tracking-tight text-foreground">
            The fleet,
            <span className="text-mist"> routed</span>{" "}
            <span className="relative inline-block text-foreground">
              <span className="relative z-10">in live</span>
              <span className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-sm bg-ember/40" />
            </span>
            <br />
            real time.
          </h1>

          <p className="max-w-lg text-sm leading-relaxed text-mist">
            Autonomous multi-vehicle route optimization across the live Bengaluru road graph.
            Quantum-inspired particles tunnel through congestion bottlenecks, benchmarked live
            against GA, ACO and Classical Particle Swarm Optimization (PSO).
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/optimizer"
              className="rounded-full bg-ember px-6 py-3 text-xs font-bold text-void transition-all hover:bg-foreground hover:text-background shadow-sm cursor-pointer"
            >
              Open Optimizer ↗
            </Link>
            <Link
              to="/benchmark"
              className="rounded-full border border-line bg-card px-6 py-3 text-xs font-semibold text-foreground transition-all hover:border-ember shadow-xs"
            >
              Algorithm Benchmark
            </Link>
            <Link
              to="/intelligence"
              className="rounded-full border border-line bg-card px-5 py-3 text-xs font-semibold text-mist hover:text-foreground hover:border-purple-500/50 transition-all shadow-xs"
            >
              🧠 Intelligence Hub
            </Link>
            <Link
              to="/events"
              className="rounded-full border border-line bg-card px-5 py-3 text-xs font-semibold text-mist hover:text-foreground transition-all shadow-xs"
            >
              📡 Live Incidents
            </Link>
          </div>

          {/* Quick Stat Tiles - Move. card style */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-2xl border border-line bg-card p-3.5 shadow-xs">
              <p className="font-display text-2xl font-extrabold text-foreground">25</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase text-mist">Graph Nodes</p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-3.5 shadow-xs">
              <p className="font-display text-2xl font-extrabold text-ember">{params.vehicles}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase text-mist">
                Vehicles Dispatched
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-3.5 shadow-xs">
              <p className="font-display text-2xl font-extrabold text-foreground">
                {qpso ? qpso.convergedAt : "32"}
                <span className="text-xs font-normal text-mist"> it</span>
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase text-mist">Convergence</p>
            </div>
          </div>
        </div>

        {/* Live Map Preview Card - Move. 3D isometric city look */}
        <div className="lg:col-span-6">
          <div className="rounded-3xl border border-line bg-card p-3 shadow-md">
            <div className="mb-2.5 flex items-center justify-between px-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-ember text-void text-[10px] font-bold">
                  ↗
                </span>
                <span className="font-display text-xs font-bold text-foreground">
                  Live Corridor Dispatch · Bengaluru
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge-move-transit">:: In Transit</span>
                <span className="font-mono text-[10px] text-faint hidden sm:inline">
                  {clock} IST
                </span>
              </div>
            </div>

            <CityMap
              routes={revealedRoutes}
              {...(ga ? { ghostRoutes: ga.best.routes } : {})}
              pinMode={pinMode}
              onPinModeChange={setPinMode}
              className="aspect-[4/3] w-full rounded-2xl"
            />

            <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-obsidian border border-line/60">
              <div className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-ember text-void text-xs font-bold">
                  1
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {qpso ? routeLabel(qpso.best.routes[0]!) : "Solving fleet corridors…"}
                  </p>
                  <p className="font-mono text-[10px] text-mist">
                    Vehicle 01 · QPSO Optimal Path · Ghost line = Genetic Algorithm
                  </p>
                </div>
              </div>
              <span className="badge-move-transit">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Performance & Completion Times Chart Section */}
      <div className="mt-6">
        <DriverPerformanceChart />
      </div>
    </section>
  );
}
