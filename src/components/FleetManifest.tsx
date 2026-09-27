import { useState } from "react";
import { ALL_NODES, buildMatrices, type Scenario } from "@/lib/network";
import type { Solution } from "@/lib/optimizer";
import { useAuth } from "@/lib/auth-context";
import { DriverDatabaseManager } from "@/components/DriverDatabaseManager";

const AVG_SPEED = 26;

export function FleetManifest({
  solution,
  scenario,
}: {
  solution: Solution | null;
  scenario: Scenario;
}) {
  const { drivers, company, switchDriverForDemo } = useAuth();
  const [showDriverDb, setShowDriverDb] = useState(false);
  const [highlightNew, setHighlightNew] = useState(false);

  if (!solution) return null;
  const m = buildMatrices(scenario);

  const legs = solution.routes.map((route, index) => {
    let km = 0;
    let min = 0;
    let load = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i]!;
      const b = route[i + 1]!;
      const d = m.dist[a]![b]!;
      km += d;
      min += (d / AVG_SPEED) * 60 * m.congestion[a]![b]!;
      load += ALL_NODES[b]?.demand ?? 0;
    }
    min += Math.max(route.length - 2, 0) * 3; // service time per stop

    const assignedDriver = drivers.find((d) => d.vehicleIndex === index) || drivers[index];

    return {
      index,
      id: `VEH-${String(index + 1).padStart(2, "0")}`,
      km,
      min,
      load,
      stops: route.slice(1, -1).map((n) => ALL_NODES[n]!.name),
      driver: assignedDriver,
    };
  });

  return (
    <div className="panel p-5">
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ember">
            Fleet manifest & Driver Roster
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
            QPSO Assignments & Driver Registry
          </h3>
        </div>
        <button
          onClick={() => {
            setHighlightNew(false);
            setShowDriverDb(true);
          }}
          className="rounded border border-line bg-glass px-2.5 py-1 font-mono text-[10px] uppercase text-mist hover:text-ember transition"
        >
          Manage Drivers ({drivers.length})
        </button>
      </div>

      <ul className="mt-4 divide-y divide-line">
        {legs.map((leg) => (
          <li key={leg.id} className="py-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">{leg.id}</span>
                {leg.driver ? (
                  <span className="rounded bg-ember/15 px-2 py-0.5 font-mono text-[10px] text-ember">
                    Driver: {leg.driver.driverName} ({leg.driver.mobileNo})
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setHighlightNew(true);
                      setShowDriverDb(true);
                    }}
                    className="rounded bg-destructive/15 px-2 py-0.5 font-mono text-[10px] text-destructive hover:underline"
                  >
                    + Register Driver to Database
                  </button>
                )}
              </div>
              <span className="font-mono text-[10px] text-mist">
                {leg.km.toFixed(1)} km · {leg.min.toFixed(0)} min · load {leg.load}
              </span>
            </div>

            <p className="mt-1.5 text-[13px] leading-relaxed text-mist">
              {leg.stops.length ? leg.stops.join("  →  ") : "held in reserve at depot"}
            </p>

            {leg.driver && (
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-faint">
                <span>Company: {leg.driver.companyName || company?.companyName}</span>
                <button
                  onClick={() => switchDriverForDemo(leg.driver!.id)}
                  className="text-ember hover:underline"
                  title="Switch to this driver's perspective"
                >
                  View as Driver #{leg.index + 1} →
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Driver Database Modal */}
      <DriverDatabaseManager
        isOpen={showDriverDb}
        onClose={() => setShowDriverDb(false)}
        highlightNewRegistration={highlightNew}
      />
    </div>
  );
}
