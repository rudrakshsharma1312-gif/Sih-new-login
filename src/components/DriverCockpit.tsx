import { useState, useMemo } from "react";
import { useAuth, type DriverUser } from "@/lib/auth-context";
import { useSolver } from "@/lib/solver";
import { ALL_NODES, buildMatrices, DEPOT } from "@/lib/network";
import { CityMap } from "@/components/CityMap";

const AVG_SPEED = 26;

export function DriverCockpit({ embedded = false }: { embedded?: boolean }) {
  const { user, logout, drivers, switchDriverForDemo } = useAuth();
  const { runs, scenario, clock } = useSolver();
  const driver = user as DriverUser;
  const currentDriver = drivers.find((d) => d.id === driver.id) ?? driver;

  const [completedStops, setCompletedStops] = useState<Record<number, boolean>>({});

  // Extract QPSO solution
  const qpso = runs.qpso;

  // Determine the single route assigned to THIS driver: either manager mapped customRoute or QPSO route
  const vehicleIdx = currentDriver.vehicleIndex ?? 0;
  const hasCustomRoute =
    Array.isArray(currentDriver.customRoute) && currentDriver.customRoute.length >= 2;

  const singleDriverRoute = useMemo(() => {
    if (hasCustomRoute && currentDriver.customRoute) {
      return currentDriver.customRoute;
    }
    const allRoutes = qpso?.best.routes ?? [];
    if (!allRoutes.length) return [0, 1, 0];
    if (vehicleIdx < allRoutes.length && allRoutes[vehicleIdx]) {
      return allRoutes[vehicleIdx]!;
    }
    // Fallback to route modulo length if fleet size was temporarily changed
    return allRoutes[vehicleIdx % allRoutes.length] || allRoutes[0] || [0, 1, 0];
  }, [hasCustomRoute, currentDriver.customRoute, qpso, vehicleIdx]);

  // Calculate metrics for this driver's single route
  const matrices = useMemo(() => buildMatrices(scenario), [scenario]);

  const routeDetails = useMemo(() => {
    let totalKm = 0;
    let totalMin = 0;
    const stopsList: Array<{
      nodeIdx: number;
      name: string;
      demand: number;
      lat: number;
      lng: number;
      legKm: number;
      legMin: number;
    }> = [];

    for (let i = 0; i < singleDriverRoute.length - 1; i++) {
      const a = singleDriverRoute[i]!;
      const b = singleDriverRoute[i + 1]!;
      const d = matrices.dist[a]![b]!;
      const t = (d / AVG_SPEED) * 60 * matrices.congestion[a]![b]!;
      totalKm += d;
      totalMin += t;

      const nodeObj = ALL_NODES[b] ?? DEPOT;
      stopsList.push({
        nodeIdx: b,
        name: nodeObj.name,
        demand: nodeObj.demand,
        lat: nodeObj.lat,
        lng: nodeObj.lng,
        legKm: d,
        legMin: t + 3,
      });
    }
    totalMin += Math.max(singleDriverRoute.length - 2, 0) * 3;

    return {
      totalKm,
      totalMin,
      stops: stopsList,
    };
  }, [singleDriverRoute, matrices]);

  const toggleStop = (idx: number) => {
    setCompletedStops((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div
      className={
        embedded
          ? "w-full pb-8 font-body text-foreground antialiased"
          : "min-h-screen bg-void pb-16 font-body text-foreground antialiased"
      }
    >
      {/* Driver Cockpit Top Bar (shown if not embedded in DashboardLayout) */}
      {!embedded && (
        <header className="sticky top-0 z-30 border-b border-line bg-obsidian/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-3.5">
            <div className="flex items-center gap-3">
              <div className="relative grid size-9 place-items-center rounded-lg border border-line bg-gradient-to-br from-glasshi to-obsidian">
                <span className="glowdot size-2.5 rounded-full bg-ember" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[15px] font-bold text-foreground">
                    QUANTA DRIVER COCKPIT
                  </span>
                  <span className="rounded bg-ember/20 px-2 py-0.5 font-mono text-[9px] font-semibold text-ember uppercase">
                    Single Route View
                  </span>
                </div>
                <p className="font-mono text-[10px] text-mist">
                  {driver.companyName} · Driver:{" "}
                  <strong className="text-foreground">{driver.driverName}</strong> (
                  {driver.mobileNo})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Assigned Vehicle Badge */}
              <div className="rounded-lg border border-line bg-glass px-3 py-1 font-mono text-xs">
                <span className="text-faint">ASSIGNED:</span>{" "}
                <span className="font-bold text-ember">
                  VEHICLE #{String(vehicleIdx + 1).padStart(2, "0")}
                </span>
              </div>

              {/* Quick Driver Switcher for Evaluators to verify isolated routes */}
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-line/80 bg-void/80 px-2 py-1">
                <span className="font-mono text-[9px] uppercase text-faint">
                  Test Other Driver:
                </span>
                <select
                  aria-label="Switch driver view"
                  value={driver.id}
                  onChange={(e) => switchDriverForDemo(e.target.value)}
                  className="rounded border-none bg-transparent font-mono text-[10px] text-mist focus:outline-none focus:text-foreground cursor-pointer"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id} className="bg-obsidian text-foreground">
                      {d.driverName} (Veh #{d.vehicleIndex + 1})
                    </option>
                  ))}
                </select>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                className="rounded-lg border border-line bg-glasshi/60 px-3 py-1.5 font-mono text-[11px] text-mist transition hover:border-ember hover:text-foreground"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Driver Content */}
      <main className={embedded ? "w-full pt-2" : "mx-auto max-w-[1280px] px-6 pt-6"}>
        {/* Route Privacy Banner */}
        <div className="mb-4 flex items-center justify-between rounded-lg border border-ember/30 bg-ember/[0.07] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="size-2 animate-pulse rounded-full bg-ember" />
            <p className="font-mono text-[11px] text-mist">
              <span className="font-semibold text-foreground">ISOLATED DRIVER VIEW:</span> Showing
              exclusively{" "}
              <span className="text-ember font-bold">Vehicle #{vehicleIdx + 1}&apos;s Route</span>
              {hasCustomRoute ? (
                <span className="ml-2 rounded bg-ember/20 px-1.5 py-0.5 text-[10px] text-ember font-semibold">
                  Custom Manager Mapped Route
                </span>
              ) : (
                <span className="ml-2 rounded bg-glass px-1.5 py-0.5 text-[10px] text-faint">
                  QPSO Algorithmic Dispatch
                </span>
              )}
              . All other fleet vehicles are restricted to Manager access.
            </p>
          </div>
          <span className="font-mono text-[10px] text-faint">LIVE · {clock} IST</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Map Column: ONLY renders this single driver's route */}
          <div className="lg:col-span-7">
            <div className="panel overflow-hidden p-2">
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-mist">
                  Active Dispatch Map · Peenya Corridor
                </span>
                <span className="font-mono text-[10px] text-ember">1 Route Active</span>
              </div>
              <CityMap
                // CRITICAL: Only pass this driver's single route!
                routes={[singleDriverRoute]}
                className="aspect-[4/3] w-full"
              />
            </div>

            {/* Route summary telemetry */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="panel p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
                  Total Distance
                </p>
                <p className="mt-1 font-display text-lg font-bold text-foreground">
                  {routeDetails.totalKm.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-mist">km</span>
                </p>
              </div>
              <div className="panel p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
                  Estimated Travel
                </p>
                <p className="mt-1 font-display text-lg font-bold text-foreground">
                  {routeDetails.totalMin.toFixed(0)}{" "}
                  <span className="text-xs font-normal text-mist">min</span>
                </p>
              </div>
              <div className="panel p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
                  Delivery Waypoints
                </p>
                <p className="mt-1 font-display text-lg font-bold text-foreground">
                  {routeDetails.stops.length}{" "}
                  <span className="text-xs font-normal text-mist">stops</span>
                </p>
              </div>
            </div>
          </div>

          {/* Turn / Stop Sequence Column */}
          <div className="lg:col-span-5">
            <div className="panel p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember">
                    Your Assigned Schedule
                  </p>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    Vehicle #{String(vehicleIdx + 1).padStart(2, "0")} Itinerary
                  </h3>
                </div>
                <span className="rounded bg-glasshi px-2 py-0.5 font-mono text-[10px] text-mist">
                  Depot: Peenya
                </span>
              </div>

              {/* Waypoint Checklist */}
              <div className="mt-4 max-h-[460px] overflow-y-auto pr-1">
                {/* Starting Depot */}
                <div className="relative flex items-start gap-3 pb-4">
                  <div className="relative z-10 flex size-6 items-center justify-center rounded-full border border-ember bg-ember/20 text-xs font-bold text-ember">
                    0
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-xs font-semibold text-foreground">
                      Peenya Depot (Base Origin)
                    </p>
                    <p className="text-[11px] text-mist">
                      Vehicle dispatch & payload loading point
                    </p>
                  </div>
                </div>

                {/* Stops */}
                {routeDetails.stops.map((st, i) => {
                  const isDone = !!completedStops[i];
                  const isDepotReturn = i === routeDetails.stops.length - 1;
                  return (
                    <div key={i} className="relative flex items-start gap-3 pb-4">
                      {/* Timeline line */}
                      <div className="absolute left-3 top-3 h-full w-[1px] bg-line" />
                      <button
                        type="button"
                        onClick={() => toggleStop(i)}
                        className={`relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-mono transition-all ${
                          isDone
                            ? "bg-emerald-500 text-void font-bold"
                            : isDepotReturn
                              ? "border border-ember text-ember bg-glass"
                              : "border border-line bg-obsidian text-mist hover:border-ember"
                        }`}
                      >
                        {isDone ? "✓" : i + 1}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <p
                            className={`font-mono text-xs font-medium ${
                              isDone ? "text-faint line-through" : "text-foreground"
                            }`}
                          >
                            {st.name} {isDepotReturn ? "(Return to Depot)" : ""}
                          </p>
                          <span className="font-mono text-[10px] text-faint">
                            {st.legKm.toFixed(1)} km · ~{st.legMin.toFixed(0)}m
                          </span>
                        </div>
                        {!isDepotReturn && (
                          <p className="text-[11px] text-mist">Demand package: {st.demand} units</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status Note */}
              <div className="mt-4 rounded-lg border border-line/60 bg-void/50 p-3 text-xs text-mist">
                <span className="font-semibold text-foreground">QPSO Route Optimization:</span>{" "}
                Calculated to minimize commute bottlenecks in Bengaluru inner city. Follow the
                assigned waypoint sequence in order.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
