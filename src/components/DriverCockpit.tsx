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
                  Fleet:{" "}
                  <span className="text-foreground font-semibold">{currentDriver.companyName}</span>{" "}
                  · Manager:{" "}
                  <span className="text-ember font-semibold">
                    {currentDriver.managerName || "Fleet Manager"}
                  </span>{" "}
                  · Driver: <strong className="text-foreground">{currentDriver.driverName}</strong>{" "}
                  ({currentDriver.mobileNo})
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

      {/* Main Driver Content - Move. inspired */}
      <main className={embedded ? "w-full pt-2" : "mx-auto max-w-[1280px] px-6 pt-6"}>
        {/* Route Privacy Banner */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-card p-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full bg-ember animate-pulse" />
            <p className="font-mono text-xs text-mist">
              <span className="font-bold text-foreground">ASSIGNED FLEET COCKPIT:</span> Exclusively{" "}
              <span className="text-foreground font-bold underline decoration-ember decoration-2 underline-offset-2">
                Vehicle #{vehicleIdx + 1}&apos;s Route
              </span>
              {hasCustomRoute ? (
                <span className="ml-2 rounded-md bg-ember/15 px-2 py-0.5 text-[10px] text-foreground font-bold border border-ember/30">
                  Custom Manager Mapped
                </span>
              ) : (
                <span className="ml-2 rounded-md bg-glasshi px-2 py-0.5 text-[10px] text-faint">
                  QPSO Algorithmic Dispatch
                </span>
              )}
            </p>
          </div>
          <span className="font-mono text-[11px] text-faint">LIVE · {clock} IST</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Map Column: ONLY renders this single driver's route */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-3xl border border-line bg-card overflow-hidden p-2.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between px-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-ember text-void text-[10px] font-bold">
                    ↗
                  </span>
                  <span className="font-display text-xs font-bold text-foreground">
                    Live Route Visibility · Bengaluru
                  </span>
                </div>
                <span className="badge-move-transit">:: In Transit</span>
              </div>
              <CityMap
                // CRITICAL: Only pass this driver's single route!
                routes={[singleDriverRoute]}
                className="aspect-[4/3] w-full rounded-2xl"
              />
            </div>

            {/* Route summary telemetry tiles */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-line bg-card p-3.5 shadow-xs">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
                  Total Distance
                </p>
                <p className="mt-1 font-display text-xl font-extrabold text-foreground">
                  {routeDetails.totalKm.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-mist">km</span>
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-card p-3.5 shadow-xs">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
                  Est. Travel Time
                </p>
                <p className="mt-1 font-display text-xl font-extrabold text-foreground">
                  {routeDetails.totalMin.toFixed(0)}{" "}
                  <span className="text-xs font-normal text-mist">min</span>
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-card p-3.5 shadow-xs">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
                  Delivery Stops
                </p>
                <p className="mt-1 font-display text-xl font-extrabold text-foreground">
                  {routeDetails.stops.length}{" "}
                  <span className="text-xs font-normal text-mist">stops</span>
                </p>
              </div>
            </div>
          </div>

          {/* Turn / Stop Sequence Column - Move. UI cards */}
          <div className="lg:col-span-5 space-y-4">
            {/* Move. Driver Card */}
            <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative size-12 rounded-full ring-2 ring-ember p-0.5">
                    <div className="flex size-full items-center justify-center rounded-full bg-obsidian text-sm font-bold text-foreground">
                      {driver.driverName?.[0] ?? "D"}
                    </div>
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-400 ring-2 ring-card" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-display text-sm font-bold text-foreground">
                        {driver.driverName}
                      </h4>
                      <span className="text-xs font-semibold text-amber flex items-center gap-0.5">
                        ★ 4.8
                      </span>
                    </div>
                    <p className="text-xs text-mist">Delivery Driver · Veh #{vehicleIdx + 1}</p>
                  </div>
                </div>

                {/* Communication buttons from Move screenshot */}
                <div className="flex items-center gap-2">
                  <a
                    href={`sms:${driver.mobileNo}`}
                    className="flex size-9 items-center justify-center rounded-full border border-line bg-glass text-xs text-foreground hover:border-ember transition"
                    title="Send SMS"
                  >
                    💬
                  </a>
                  <a
                    href={`tel:${driver.mobileNo}`}
                    className="flex size-9 items-center justify-center rounded-full border border-line bg-glass text-xs text-foreground hover:border-ember transition"
                    title="Call Driver"
                  >
                    📞
                  </a>
                </div>
              </div>

              {/* Destination Drop-off & Visual Progress Timeline (Move. mockup style) */}
              <div className="mt-4 border-t border-line/60 pt-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-faint">Next Drop-off Corridor</p>
                    <p className="font-display text-sm font-bold text-foreground">
                      Drop-off at {routeDetails.stops[0]?.name ?? "Bengaluru Hub"}
                    </p>
                    <p className="text-[11px] text-mist">Bengaluru, KA · Peenya Dispatch</p>
                  </div>
                  <span className="badge-move-transit">:: In Transit</span>
                </div>

                {/* Progress bar with yellow filled track & 3D cube milestone */}
                <div className="mt-4">
                  <div className="relative flex items-center">
                    <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
                      <div className="h-full w-2/3 bg-ember rounded-full" />
                    </div>
                    {/* Yellow 3D cube milestone */}
                    <div className="absolute left-[65%] -translate-x-1/2 flex size-6 items-center justify-center rounded-md bg-ember text-void text-[11px] font-bold shadow-md">
                      ⌂
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-mist">
                    <span>8:15 AM (Departed)</span>
                    <span className="font-bold text-foreground">
                      ~{routeDetails.totalMin.toFixed(0)} min ETA
                    </span>
                    <span>4:20 PM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details Card (From Screenshot 2 & 3) */}
            <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold text-foreground">
                    Order BLR-{String(vehicleIdx + 1).padStart(2, "0")}861
                  </span>
                  <span className="badge-move-delivered">Paid</span>
                </div>
                <span className="font-mono text-[10px] text-faint">Peenya Base</span>
              </div>

              {/* Tracking Number pill with copy */}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-obsidian px-3 py-2 border border-line/60">
                <div>
                  <p className="text-[10px] text-faint font-mono">Tracking Number</p>
                  <p className="font-mono text-xs font-bold text-foreground tracking-wider">
                    164149816521{vehicleIdx}86
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(`164149816521${vehicleIdx}86`);
                  }}
                  className="rounded-lg bg-glass px-2.5 py-1 text-[10px] font-mono text-mist hover:text-foreground transition cursor-pointer"
                >
                  Copy 📋
                </button>
              </div>

              {/* Order key-value specifications from Move screenshot */}
              <div className="mt-3 space-y-2 text-xs divide-y divide-line/40">
                <div className="flex items-center justify-between pt-2">
                  <span className="text-mist">Delivery Address</span>
                  <span className="font-medium text-foreground text-right">
                    {routeDetails.stops[0]?.name ?? "MG Road"}, Bengaluru
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-mist">Recipient</span>
                  <span className="font-medium text-foreground">Regional Logistics Hub</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-mist">Delivery Time</span>
                  <span className="font-medium text-foreground">
                    Today, ~{routeDetails.totalMin.toFixed(0)} min
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-mist">Payment Method</span>
                  <span className="font-medium text-foreground">Paid · Fleet Contract</span>
                </div>
                <div className="pt-2">
                  <span className="text-mist block mb-1">Delivery Notes</span>
                  <p className="rounded-lg bg-obsidian p-2 text-[11px] text-mist italic border border-line/40">
                    &quot;Please ensure high-priority packages are handled with care — scheduled
                    depot transit.&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Waypoint Checklist Sequence */}
            <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold text-foreground">
                    Delivery Stops ({routeDetails.stops.length})
                  </span>
                </div>
                <span className="font-mono text-[10px] text-faint">Check off completed stops</span>
              </div>

              <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {routeDetails.stops.map((st, i) => {
                  const isDone = !!completedStops[i];
                  const isDepotReturn = i === routeDetails.stops.length - 1;
                  return (
                    <div
                      key={i}
                      onClick={() => toggleStop(i)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isDone
                          ? "bg-glass/40 border-line/40 opacity-60"
                          : "bg-obsidian border-line hover:border-ember"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex size-6 items-center justify-center rounded-full text-xs font-bold font-mono transition ${
                            isDone
                              ? "bg-emerald-500 text-void"
                              : isDepotReturn
                                ? "bg-ember text-void"
                                : "bg-glass text-foreground border border-line"
                          }`}
                        >
                          {isDone ? "✓" : i + 1}
                        </div>
                        <div>
                          <p
                            className={`text-xs font-semibold ${
                              isDone ? "line-through text-faint" : "text-foreground"
                            }`}
                          >
                            {st.name} {isDepotReturn ? "(Return Base)" : ""}
                          </p>
                          <p className="text-[10px] text-mist">
                            {st.legKm.toFixed(1)} km · ~{st.legMin.toFixed(0)} min
                          </p>
                        </div>
                      </div>

                      <span
                        className={
                          isDone
                            ? "badge-move-delivered"
                            : isDepotReturn
                              ? "badge-move-transit"
                              : "badge-move-pending"
                        }
                      >
                        {isDone ? "Delivered" : isDepotReturn ? "Base" : "≤20 kg"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
