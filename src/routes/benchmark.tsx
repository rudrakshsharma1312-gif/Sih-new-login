import { createFileRoute } from "@tanstack/react-router";
import { BenchmarkTable } from "@/components/BenchmarkTable";
import { ConvergenceChart } from "@/components/ConvergenceChart";
import { HubSelectorBar } from "@/components/HubSelectorBar";
import { PageHead } from "@/components/Shell";
import { useSolver } from "@/lib/solver";

export const Route = createFileRoute("/benchmark")({
  head: () => ({
    meta: [
      { title: "Benchmark — QPSO vs GA, ACO and QSO | QUANTA" },
      {
        name: "description",
        content:
          "Head-to-head comparison of quantum particle swarm optimization against genetic algorithms, ant colony optimization and quantum swarm optimization (QSO) on the same Bengaluru instance.",
      },
      { property: "og:title", content: "Benchmark — QPSO vs GA, ACO and QSO" },
      {
        property: "og:description",
        content: "Fitness, distance, ETA, convergence and runtime on one shared instance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BenchmarkPage,
});

function BenchmarkPage() {
  const { runs, progress } = useSolver();

  return (
    <section className="pb-20">
      <PageHead
        kicker="Benchmark engine"
        title="Head-to-head on the same instance"
        aside="4 ALGORITHMS · 25 NODES"
      />
      <HubSelectorBar className="mb-4" />
      <div className="flex flex-col gap-4">
        <ConvergenceChart runs={runs} progress={progress} />
        <BenchmarkTable runs={runs} />
      </div>
    </section>
  );
}
