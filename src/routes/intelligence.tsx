import { createFileRoute } from "@tanstack/react-router";
import { PageHead } from "@/components/Shell";
import { TrafficPredictionPanel } from "@/components/TrafficPredictionPanel";
import { ScenarioComparator } from "@/components/ScenarioComparator";
import { RouteExportPanel } from "@/components/RouteExportPanel";

export const Route = createFileRoute("/intelligence")({
  head: () => ({
    meta: [
      { title: "Intelligence Hub — Predictive Traffic & Route Analytics | QUANTA" },
      {
        name: "description",
        content:
          "AI-powered Bengaluru traffic prediction, SLA breach early warning, scenario snapshot comparison, and route export tools for fleet dispatch.",
      },
      {
        property: "og:title",
        content: "Intelligence Hub — Predictive Traffic & Analytics | QUANTA",
      },
      {
        property: "og:description",
        content:
          "Gaussian mixture traffic forecasting, SLA alerts, multi-scenario comparator and route export for the QUANTA fleet optimization platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntelligencePage,
});

function IntelligencePage() {
  return (
    <section className="pb-20">
      <PageHead
        kicker="Intelligence"
        title="Forecasts & Route Export"
        aside="Traffic prediction · Scenarios · Export"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column — traffic forecast + SLA */}
        <div className="lg:col-span-7">
          <TrafficPredictionPanel />
        </div>

        {/* Right column — comparator + export */}
        <div className="lg:col-span-5 space-y-4">
          <ScenarioComparator />
          <RouteExportPanel />
        </div>
      </div>
    </section>
  );
}
