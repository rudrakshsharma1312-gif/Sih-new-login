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
          kicker="Fleet"
          title="Driver Assignments & Routes"
          aside={`${params.vehicles} vehicles`}
        />

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-obsidian p-0.5 font-mono text-xs">
          <button
            onClick={() => setActiveTab("assignment")}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === "assignment"
                ? "bg-ember text-void font-semibold"
                : "text-mist hover:text-foreground"
            }`}
          >
            Assignment
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === "performance"
                ? "bg-ember text-void font-semibold"
                : "text-mist hover:text-foreground"
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setActiveTab("manifest")}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === "manifest"
                ? "bg-ember text-void font-semibold"
                : "text-mist hover:text-foreground"
            }`}
          >
            Manifest
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
            <div className="panel relative p-2">
              <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-md border border-line bg-void/80 px-2 py-1">
                <span className="size-1.5 rounded-full bg-ember" />
                <span className="font-mono text-[10px] text-faint">{clock} IST</span>
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
