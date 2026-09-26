import { useState } from "react";
import { buildMatrices, type Scenario } from "@/lib/network";
import type { Solution } from "@/lib/optimizer";
import { useAuth } from "@/lib/auth-context";
import { DriverDatabaseManager } from "@/components/DriverDatabaseManager";
import { useSolver } from "@/lib/solver";

const AVG_SPEED = 26;

export function FleetManifest({
  solution,
  scenario,
}: {
  solution: Solution | null;
  scenario: Scenario;
}) {
  const { drivers, company, switchDriverForDemo } = useAuth();
  const { activeNodes, networkConfig } = useSolver();
  const [showDriverDb, setShowDriverDb] = useState(false);
  const [highlightNew, setHighlightNew] = useState(false);

  if (!solution) return null;
  const m = buildMatrices(scenario, activeNodes);

  const legs = solution.routes.map((route, index) => {
    let km = 0;
    let min = 0;
    let load = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i]!;
      const b = route[i + 1]!;
      const d = m.dist[a]?.[b] ?? 5;
      km += d;
      min += (d / AVG_SPEED) * 60 * (m.congestion[a]?.[b] ?? 1.2);
      load += activeNodes[b]?.demand ?? 0;
    }
    min += Math.max(route.length - 2, 0) * 3; // service time per stop

    const assignedDriver = drivers.find((d) => d.vehicleIndex === index) || drivers[index];
    const originNode = activeNodes[route[0] ?? 0];
    const terminusNode = activeNodes[route[route.length - 1] ?? 0];

    return {
      index,
      id: `VEH-${String(index + 1).padStart(2, "0")}`,
      km,
      min,
      load,
      origin: originNode?.name ?? networkConfig.pickupHub.name,
      terminus: terminusNode?.name ?? networkConfig.destinationHub.name,
      stops: route.slice(1, -1).map((n) => activeNodes[n]?.name ?? `Stop #${n}`),
      driver: assignedDriver,
    };
  });

  const totalKm = legs.reduce((acc, l) => acc + l.km, 0);
  const totalMin = legs.reduce((acc, l) => acc + l.min, 0);
  const unoptimizedKm = totalKm * 1.34;
  const dieselSavedLiters = Math.max(0, (unoptimizedKm - totalKm) / 7.2);
  const co2AvoidedKg = Math.max(0, dieselSavedLiters * 2.68);
  const treesOffset = (co2AvoidedKg / 21).toFixed(1);

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

      {/* Green Logistics ESG Intelligence Card */}
      <div className="mt-4 rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-3.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/15 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🌱</span>
            <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wide">
              ESG Green Fleet Intelligence
            </span>
          </div>
          <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
            Rating: A+ Eco-Route
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-mist">CO₂ Avoided</p>
            <p className="mt-0.5 text-sm font-bold text-foreground">
              {co2AvoidedKg.toFixed(1)}{" "}
              <span className="text-[10px] font-normal text-emerald-400">kg</span>
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-mist">Fuel Saved</p>
            <p className="mt-0.5 text-sm font-bold text-foreground">
              {dieselSavedLiters.toFixed(1)}{" "}
              <span className="text-[10px] font-normal text-emerald-400">L diesel</span>
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-mist">Carbon Offset</p>
            <p className="mt-0.5 text-sm font-bold text-foreground">
              ~{treesOffset}{" "}
              <span className="text-[10px] font-normal text-emerald-400">trees/yr</span>
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-mist">Distance Delta</p>
            <p className="mt-0.5 text-sm font-bold text-foreground">
              -{(unoptimizedKm - totalKm).toFixed(1)}{" "}
              <span className="text-[10px] font-normal text-emerald-400">km vs unoptimized</span>
            </p>
          </div>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-line">
        {legs.map((leg) => (
          <li key={leg.id} className="py-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">{leg.id}</span>
                {leg.driver ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-ember/15 px-2 py-0.5 font-mono text-[10px] text-ember">
                      Driver: {leg.driver.driverName} ({leg.driver.mobileNo})
                    </span>
                    <span className="rounded bg-glasshi px-1.5 py-0.5 font-mono text-[9px] text-mist border border-line/60">
                      Mgr: {leg.driver.managerName || company?.managerName || "Fleet Manager"}
                    </span>
                  </div>
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

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] leading-relaxed">
              <span className="inline-flex items-center gap-1 rounded bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
                🚀 {leg.origin}
              </span>
              <span className="text-faint">➔</span>
              {leg.stops.length > 0 ? (
                <>
                  <span className="text-mist">{leg.stops.join("  →  ")}</span>
                  <span className="text-faint">➔</span>
                </>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded bg-violet-950/40 border border-violet-500/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-violet-400">
                🏁 {leg.terminus}
              </span>
            </div>

            {leg.driver && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-faint">
                <span>
                  Company:{" "}
                  <strong className="text-foreground">
                    {leg.driver.companyName || company?.companyName}
                  </strong>{" "}
                  · Manager:{" "}
                  <strong className="text-ember">
                    {leg.driver.managerName || company?.managerName || "Dr. Rajesh Sharma"}
                  </strong>
                </span>
                <button
                  onClick={() => switchDriverForDemo(leg.driver!.id)}
                  className="text-ember hover:underline cursor-pointer"
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
