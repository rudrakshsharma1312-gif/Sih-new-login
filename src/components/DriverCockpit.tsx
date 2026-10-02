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

  const qpso = runs.qpso;

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
    return allRoutes[vehicleIdx % allRoutes.length] || allRoutes[0] || [0, 1, 0];
  }, [hasCustomRoute, currentDriver.customRoute, qpso, vehicleIdx]);

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
      {!embedded && (
        <header className="sticky top-0 z-30 border-b border-line bg-obsidian/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-3.5">
            <div className="flex items-center gap-3">
              <div className="relative grid size-9 place-items-center rounded-md bg-obsidian border border-line">
                <span className="size-2 rounded-full bg-ember" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[15px] font-semibold text-foreground">
                    Driver Dispatch
                  </span>
                </div>
                <p className="font-mono text-[10px] text-faint">
                  Fleet:{" "}
                  <span className="text-foreground font-medium">{currentDriver.companyName}</span> ·
                  Manager:{" "}
                  <span className="text-ember font-medium">
                    {currentDriver.managerName || "Fleet Manager"}
                  </span>{" "}
                  · Driver: <strong className="text-foreground">{currentDriver.driverName}</strong>{" "}
                  ({currentDriver.mobileNo})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-md border border-line bg-card px-3 py-1 font-mono text-xs">
                <span className="text-faint">Vehicle</span>{" "}
                <span className="font-medium text-ember">
                  #{String(vehicleIdx + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-md border border-line bg-card px-2 py-1">
                <span className="font-mono text-[10px] text-faint">Switch:</span>
                <select
                  aria-label="Switch driver view"
                  value={driver.id}
                  onChange={(e) => switchDriverForDemo(e.target.value)}
                  className="rounded border-none bg-transparent font-mono text-[10px] text-foreground focus:outline-none cursor-pointer"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id} className="bg-obsidian text-foreground">
                      {d.driverName} (Veh #{d.vehicleIndex + 1})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={logout}
                className="rounded-md border border-line px-3 py-1 font-mono text-[11px] text-mist transition hover:border-foreground/30 hover:text-foreground"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={embedded ? "w-full pt-2" : "mx-auto max-w-[1280px] px-6 pt-6"}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-card p-3">
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-ember" />
            <p className="font-mono text-xs text-mist">
              <span className="font-medium text-foreground">Assigned Route:</span> Vehicle #
              {vehicleIdx + 1}
              {hasCustomRoute ? (
                <span className="ml-2 rounded border border-ember/30 bg-ember/10 px-2 py-0.5 text-[10px] text-foreground font-medium">
                  Custom
                </span>
              ) : (
                <span className="ml-2 rounded bg-obsidian px-2 py-0.5 text-[10px] text-faint border border-line/40">
                  QPSO Optimization
                </span>
              )}
            </p>
          </div>
          <span className="font-mono text-[11px] text-faint">Live · {clock} IST</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="panel overflow-hidden p-2">
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-semibold text-foreground">
                    Live Route
                  </span>
                </div>
                <span className="badge-move-transit">In Transit</span>
              </div>
              <CityMap routes={[singleDriverRoute]} className="aspect-[4/3] w-full rounded-md" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="panel p-3">
                <p className="font-mono text-[10px] text-faint">Distance</p>
                <p className="mt-1 font-display text-xl font-bold text-foreground">
                  {routeDetails.totalKm.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-mist">km</span>
                </p>
              </div>
              <div className="panel p-3">
                <p className="font-mono text-[10px] text-faint">Est. Time</p>
                <p className="mt-1 font-display text-xl font-bold text-foreground">
                  {routeDetails.totalMin.toFixed(0)}{" "}
                  <span className="text-xs font-normal text-mist">min</span>
                </p>
              </div>
              <div className="panel p-3">
                <p className="font-mono text-[10px] text-faint">Stops</p>
                <p className="mt-1 font-display text-xl font-bold text-foreground">
                  {routeDetails.stops.length}{" "}
                  <span className="text-xs font-normal text-mist">stops</span>
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="panel p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-obsidian border border-line text-sm font-bold text-foreground">
                    {driver.driverName?.[0] ?? "D"}
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-medium text-foreground">
                      {driver.driverName}
                    </h4>
                    <p className="text-xs text-mist">Delivery Driver · Veh #{vehicleIdx + 1}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`sms:${driver.mobileNo}`}
                    className="flex size-8 items-center justify-center rounded-md border border-line bg-obsidian text-xs text-foreground hover:border-ember transition"
                    title="Send SMS"
                  >
                    SMS
                  </a>
                  <a
                    href={`tel:${driver.mobileNo}`}
                    className="flex size-8 items-center justify-center rounded-md border border-line bg-obsidian text-xs text-foreground hover:border-ember transition"
                    title="Call Driver"
                  >
                    Call
                  </a>
                </div>
              </div>

              <div className="mt-4 border-t border-line/60 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-faint">Next Stop</p>
                    <p className="font-display text-sm font-medium text-foreground">
                      {routeDetails.stops[0]?.name ?? "Bengaluru Hub"}
                    </p>
                  </div>
                  <span className="badge-move-transit">Active</span>
                </div>

                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
                    <div className="h-full w-2/3 bg-ember rounded-full" />
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-mist">
                    <span>8:15 AM</span>
                    <span className="font-medium text-foreground">
                      ~{routeDetails.totalMin.toFixed(0)} min ETA
                    </span>
                    <span>4:20 PM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel p-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-medium text-foreground">
                    Order Details
                  </span>
                </div>
                <span className="font-mono text-[10px] text-faint">
                  BLR-{String(vehicleIdx + 1).padStart(2, "0")}861
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-md bg-obsidian px-3 py-2 border border-line">
                <div>
                  <p className="text-[10px] text-faint font-mono">Tracking</p>
                  <p className="font-mono text-xs font-medium text-foreground">
                    164149816521{vehicleIdx}86
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(`164149816521${vehicleIdx}86`);
                  }}
                  className="rounded bg-obsidian px-2 py-1 text-[10px] font-mono text-mist border border-line hover:text-foreground transition cursor-pointer"
                >
                  Copy
                </button>
              </div>

              <div className="mt-3 space-y-2 text-xs divide-y divide-line/40">
                <div className="flex items-center justify-between pt-2">
                  <span className="text-mist">Delivery Address</span>
                  <span className="font-medium text-foreground text-right">
                    {routeDetails.stops[0]?.name ?? "MG Road"}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-mist">Recipient</span>
                  <span className="font-medium text-foreground">Regional Logistics Hub</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-mist">Delivery Time</span>
                  <span className="font-medium text-foreground">
                    ~{routeDetails.totalMin.toFixed(0)} min
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-mist block mb-1">Notes</span>
                  <p className="rounded-md bg-obsidian p-2 text-[11px] text-mist border border-line">
                    Scheduled depot transit.
                  </p>
                </div>
              </div>
            </div>

            <div className="panel p-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-medium text-foreground">
                    Delivery Stops
                  </span>
                </div>
                <span className="font-mono text-[10px] text-faint">
                  {routeDetails.stops.length} stops
                </span>
              </div>

              <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {routeDetails.stops.map((st, i) => {
                  const isDone = !!completedStops[i];
                  const isDepotReturn = i === routeDetails.stops.length - 1;
                  return (
                    <div
                      key={i}
                      onClick={() => toggleStop(i)}
                      className={`flex items-center justify-between p-2.5 rounded-md border transition cursor-pointer ${
                        isDone
                          ? "bg-obsidian/50 border-line/40 opacity-60"
                          : "bg-obsidian border-line hover:border-foreground/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex size-6 items-center justify-center rounded-md text-xs font-medium font-mono transition ${
                            isDone
                              ? "bg-emerald-500/20 text-emerald-500"
                              : isDepotReturn
                                ? "bg-ember/20 text-ember"
                                : "bg-card text-foreground border border-line"
                          }`}
                        >
                          {isDone ? "✓" : i + 1}
                        </div>
                        <div>
                          <p
                            className={`text-xs font-medium ${
                              isDone ? "line-through text-faint" : "text-foreground"
                            }`}
                          >
                            {st.name} {isDepotReturn ? "(Return)" : ""}
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
                        {isDone ? "Done" : isDepotReturn ? "Base" : "Pending"}
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
