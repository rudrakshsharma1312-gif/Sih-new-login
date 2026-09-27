import { createFileRoute } from "@tanstack/react-router";
import { PageHead } from "@/components/Shell";
import { useSolver } from "@/lib/solver";
import { LiveIncidentFeedPanel } from "@/components/LiveIncidentFeedPanel";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Event stream — live disruptions | QUANTA" },
      {
        name: "description",
        content:
          "Live network events: Marathahalli–Whitefield incident, MG Road closure, real-time IoT incident feed from Bengaluru's road network.",
      },
      { property: "og:title", content: "Event stream — live disruptions | QUANTA" },
      {
        property: "og:description",
        content: "Incidents, closures and IoT sensor events driving each quantum re-solve.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { scenario, setScenario, runs, running, params, run } = useSolver();
  const qpso = runs.qpso;

  const toggle = (key: "accident" | "closure") => {
    setScenario({ ...scenario, [key]: !scenario[key] });
    run();
  };

  return (
    <section className="pb-20">
      <PageHead
        kicker="Events"
        title="Network Disruptions"
        aside="Auto re-solve on event"
      />

      {/* Manual Scenario Controls */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="panel hairline-top relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
              E-114 · Incident
            </span>
            <span className="rounded-full border border-ember/30 bg-ember/15 px-2 py-0.5 font-mono text-[9px] tracking-wider text-ember">
              {scenario.accident ? "ACTIVE" : "STANDBY"}
            </span>
          </div>
          <p className="mt-4 font-display text-lg font-semibold">Marathahalli–Whitefield</p>
          <p className="mt-1 text-[13px] leading-relaxed text-mist">
            Collision on the outer corridor lifts edge cost 2.4×. QPSO auto-reroutes the fleet.
          </p>
          <button
            onClick={() => toggle("accident")}
            className="mt-4 rounded-full border border-line bg-glass/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-mist transition-colors hover:text-foreground"
          >
            {scenario.accident ? "Clear incident" : "Inject incident"} · ×2.4
          </button>
        </div>

        <div className="panel relative overflow-hidden p-5">
          <span className="absolute left-0 top-0 h-px w-1/3 bg-gradient-to-r from-foreground/40 to-transparent" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
              E-207 · Closure
            </span>
            <span className="rounded-full border border-line bg-foreground/10 px-2 py-0.5 font-mono text-[9px] tracking-wider text-mist">
              {scenario.closure ? "ACTIVE" : "STANDBY"}
            </span>
          </div>
          <p className="mt-4 font-display text-lg font-semibold">MG Road links shut</p>
          <p className="mt-1 text-[13px] leading-relaxed text-mist">
            All arcs touching MG Road carry a 3.1× penalty, pushing the swarm to route the fleet
            around the CBD.
          </p>
          <button
            onClick={() => toggle("closure")}
            className="mt-4 rounded-full border border-line bg-glass/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-mist transition-colors hover:text-foreground"
          >
            {scenario.closure ? "Reopen MG Road" : "Shut MG Road"} · ×3.1
          </button>
        </div>

        <div className="panel relative overflow-hidden p-5">
          <span className="absolute left-0 top-0 h-px w-1/3 bg-gradient-to-r from-ember/40 to-transparent" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
              E-301 · Solver
            </span>
            <span className="rounded-full border border-line bg-foreground/10 px-2 py-0.5 font-mono text-[9px] tracking-wider text-mist">
              {running ? "SOLVING" : "IDLE"}
            </span>
          </div>
          <p className="mt-4 font-display text-lg font-semibold">
            {qpso ? `Fitness ${qpso.best.fitness.toFixed(3)}` : "Awaiting solve"}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-mist">
            Early stop fires after 20 iterations without improvement — the swarm stopped at
            iteration {qpso?.convergedAt ?? "—"}.
          </p>
          <p className="mt-4 font-mono text-[10px] tracking-wider text-faint">
            SWARM {params.swarm} PARTICLES
          </p>
        </div>
      </div>

      {/* Live IoT Incident Feed */}
      <LiveIncidentFeedPanel />
    </section>
  );
}
