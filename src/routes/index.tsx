import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { CityMap } from "@/components/CityMap";
import { DriverPerformanceChart } from "@/components/DriverPerformanceChart";
import { routeLabel } from "@/lib/optimizer";
import { useSolver } from "@/lib/solver";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QUANTA — Quantum-Inspired Traffic Route Optimization, Bengaluru" },
      {
        name: "description",
        content:
          "QUANTA solves multi-vehicle routing across the Bengaluru road network with quantum-inspired particle swarm optimization, benchmarked live against GA, ACO and SA.",
      },
      {
        property: "og:title",
        content: "QUANTA — Quantum-Inspired Traffic Route Optimization",
      },
      {
        property: "og:description",
        content:
          "Live fleet routing command centre: QPSO vs GA, ACO and SA on the Bengaluru road graph.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { runs, progress, params, clock } = useSolver();
  const qpso = runs.qpso;
  const ga = runs.ga;

  const revealedRoutes = useMemo(() => {
    if (!qpso) return [];
    const count = Math.max(1, Math.ceil(qpso.best.routes.length * progress));
    return qpso.best.routes.slice(0, count);
  }, [qpso, progress]);

  return (
    <section className="grid items-center gap-10 pb-20 pt-6 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-glass/50 px-3 py-1">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ember">SIH 2026 · 137</span>
          <span className="size-1 rounded-full bg-faint" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-mist">
            Quantum-inspired metaheuristics
          </span>
        </div>
        <h1 className="font-display text-[clamp(2.6rem,6vw,4.6rem)] font-semibold leading-[0.95] tracking-tight">
          The fleet,
          <span className="text-mist"> routed</span>{" "}
          <span className="relative inline-block">
            <span className="relative z-10">in real</span>
            <span className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-sm bg-ember/25" />
          </span>
          <br />
          time.
        </h1>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-mist">
          QUANTA runs Quantum Particle Swarm Optimization on the live Bengaluru road graph — solving
          multi-vehicle routing on classical hardware, and proving it against GA, ACO and Simulated
          Annealing on the same instance.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/optimizer"
            className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-ember hover:text-void"
          >
            Open the optimizer
          </Link>
          <Link
            to="/benchmark"
            className="rounded-full border border-line bg-glass/40 px-6 py-3 text-sm text-foreground transition-colors hover:border-faint"
          >
            See the benchmark
          </Link>
        </div>
        <div className="mt-10 flex gap-10">
          <div>
            <p className="font-display text-2xl font-semibold">25</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
              Graph nodes
            </p>
          </div>
          <div className="border-l border-line pl-10">
            <p className="font-display text-2xl font-semibold text-ember">{params.vehicles}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
              Vehicles routed
            </p>
          </div>
          <div className="border-l border-line pl-10">
            <p className="font-display text-2xl font-semibold">
              {qpso ? qpso.convergedAt : "—"}
              <span className="text-sm text-mist">it</span>
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
              To convergence
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.15em]">
          <Link
            to="/fleet"
            className="rounded-full border border-line bg-glass/40 px-3 py-1.5 text-mist transition-colors hover:text-foreground"
          >
            Fleet manifest →
          </Link>
          <Link
            to="/events"
            className="rounded-full border border-line bg-glass/40 px-3 py-1.5 text-mist transition-colors hover:text-foreground"
          >
            Event stream →
          </Link>
        </div>
      </div>

      <div className="lg:col-span-6">
        <div className="relative rounded-2xl border border-line bg-gradient-to-b from-glass to-obsidian p-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)]">
          <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-md border border-line bg-void/70 px-2.5 py-1">
            <span className="size-1.5 animate-pulse rounded-full bg-ember" />
            <span className="font-mono text-[9px] tracking-[0.2em] text-mist">
              LIVE · {clock} IST
            </span>
          </div>
          <CityMap
            routes={revealedRoutes}
            {...(ga ? { ghostRoutes: ga.best.routes } : {})}
            className="aspect-[4/3] w-full"
          />
          <div className="mt-2 flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-3">
              <span className="glowdot size-2 rounded-full bg-ember" />
              <div>
                <p className="text-[12px] font-medium leading-none">
                  {qpso ? routeLabel(qpso.best.routes[0]!) : "Solving fleet routes…"}
                </p>
                <p className="mt-1 font-mono text-[9px] tracking-wider text-faint">
                  VEHICLE 01 · QPSO OPTIMAL · GHOST LINE = GA
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] tracking-wider text-ember">◀ LIVE</span>
          </div>
        </div>
      </div>

      {/* Driver Performance & Completion Times Chart Section */}
      <div className="mt-8 lg:col-span-12">
        <DriverPerformanceChart />
      </div>
    </section>
  );
}
