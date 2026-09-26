import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CityMap } from "@/components/CityMap";
import { FleetManifest } from "@/components/FleetManifest";
import { DriverAssignmentPanel } from "@/components/DriverAssignmentPanel";
import { DriverPerformanceChart } from "@/components/DriverPerformanceChart";
import { HubSelectorBar } from "@/components/HubSelectorBar";
import { PageHead } from "@/components/Shell";
import { useSolver } from "@/lib/solver";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet manifest & Driver Assignment — QUANTA Route Intelligence" },
      {
        name: "description",
        content:
          "Per-vehicle assignments from the quantum-inspired solver and interactive driver route mapping from 25 Bengaluru inner-city locations.",
      },
      { property: "og:title", content: "Fleet manifest & Driver Assignment — QUANTA" },
      {
        property: "og:description",
        content: "Stop sequence, distance, ETA and custom driver route mapping.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FleetPage,
});

function FleetPage() {
  const { runs, scenario, params, clock } = useSolver();
  const qpso = runs.qpso;
  const ga = runs.ga;

  const [activeTab, setActiveTab] = useState<"assignment" | "performance" | "manifest">(
    "assignment",
  );

  return (
    <section className="pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHead
          kicker="Fleet operations & Dispatch"
          title="Who drives where, and when"
          aside={`${params.vehicles} VEHICLES · DEPOT PEENYA`}
        />

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-line bg-obsidian p-1 font-mono text-xs">
          <button
            onClick={() => setActiveTab("assignment")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "assignment"
                ? "bg-ember text-void font-bold shadow"
                : "text-mist hover:text-foreground"
            }`}
          >
            <span>🗺️</span>
            <span>Driver Assignment</span>
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "performance"
                ? "bg-ember text-void font-bold shadow"
                : "text-mist hover:text-foreground"
            }`}
          >
            <span>📊</span>
            <span>Performance Chart</span>
          </button>
          <button
            onClick={() => setActiveTab("manifest")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "manifest"
                ? "bg-ember text-void font-bold shadow"
                : "text-mist hover:text-foreground"
            }`}
          >
            <span>🚛</span>
            <span>Fleet Manifest</span>
          </button>
        </div>
      </div>

      <HubSelectorBar className="mt-4" />

      {/* Conditionally rendered view based on active tab */}
      {activeTab === "assignment" ? (
        <div className="mt-4">
          <DriverAssignmentPanel />
        </div>
      ) : activeTab === "performance" ? (
        <div className="mt-4">
          <DriverPerformanceChart />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl border border-line bg-gradient-to-b from-glass to-obsidian p-2">
              <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-md border border-line bg-void/70 px-2.5 py-1">
                <span className="size-1.5 animate-pulse rounded-full bg-ember" />
                <span className="font-mono text-[9px] tracking-[0.2em] text-mist">
                  LIVE · {clock} IST
                </span>
              </div>
              <CityMap
                routes={qpso?.best.routes ?? []}
                {...(ga ? { ghostRoutes: ga.best.routes } : {})}
                className="aspect-[4/3] w-full"
              />
            </div>
          </div>
          <div className="lg:col-span-5">
            <FleetManifest solution={qpso?.best ?? null} scenario={scenario} />
          </div>
        </div>
      )}
    </section>
  );
}
