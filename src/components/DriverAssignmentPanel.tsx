import { useState, useMemo } from "react";
import { useAuth, type DriverUser } from "@/lib/auth-context";
import { ALL_NODES, DEPOT, buildMatrices, type Scenario } from "@/lib/network";
import { CityMap } from "@/components/CityMap";
import { useSolver } from "@/lib/solver";

const AVG_SPEED = 26;

// Regional categorization of the 25 Bengaluru inner city nodes
const REGION_MAP: Record<number, string> = {
  0: "Depot",
  1: "North",
  2: "Central",
  3: "Central",
  4: "Central",
  5: "Central",
  6: "East",
  7: "South",
  8: "South",
  9: "South",
  10: "South",
  11: "South",
  12: "South",
  13: "East",
  14: "East",
  15: "East",
  16: "East",
  17: "North",
  18: "North",
  19: "North",
  20: "North",
  21: "Central",
  22: "Central",
  23: "South",
  24: "South",
};

// Curated standard logistics corridors in Bengaluru
const CORRIDOR_PRESETS: Array<{
  name: string;
  desc: string;
  nodes: number[];
  tag: string;
}> = [
  {
    name: "North Bangalore Loop",
    desc: "Peenya → Yeshwantpur → Hebbal → Yelahanka → Hennur → Peenya",
    nodes: [0, 1, 17, 18, 19, 0],
    tag: "North Ring",
  },
  {
    name: "Central CBD Commercial",
    desc: "Peenya → Malleshwaram → Majestic → MG Road → Shivajinagar → Peenya",
    nodes: [0, 2, 4, 5, 22, 0],
    tag: "CBD Hub",
  },
  {
    name: "East ITPL Tech Corridor",
    desc: "Peenya → Indiranagar → Marathahalli → Whitefield → KR Puram → Peenya",
    nodes: [0, 6, 14, 15, 16, 0],
    tag: "Tech Corridor",
  },
  {
    name: "South Metro Line",
    desc: "Peenya → Rajajinagar → Basavanagudi → Jayanagar → BTM → Peenya",
    nodes: [0, 3, 23, 10, 9, 0],
    tag: "South Core",
  },
  {
    name: "Outer Ring Road Express",
    desc: "Peenya → Yeshwantpur → Hebbal → Banaswadi → Bellandur → Electronic City → Peenya",
    nodes: [0, 1, 17, 20, 13, 12, 0],
    tag: "ORR Express",
  },
];

export function DriverAssignmentPanel() {
  const { drivers, company, assignRouteToDriver, resetDriverRoute, switchDriverForDemo } =
    useAuth();
  const { runs, scenario } = useSolver();
  const qpso = runs.qpso;
  const allQpsoRoutes = useMemo(() => qpso?.best.routes ?? [], [qpso]);

  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id ?? "");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Selected driver
  const selectedDriver: DriverUser | undefined =
    drivers.find((d) => d.id === selectedDriverId) || drivers[0];

  // The draft route currently being edited in the panel
  // Initialized to the driver's customRoute if present, or their QPSO auto route
  const defaultRouteForSelected = useMemo(() => {
    if (!selectedDriver) return [0, 1, 0];
    if (selectedDriver.customRoute && selectedDriver.customRoute.length >= 2) {
      return selectedDriver.customRoute;
    }
    const idx = selectedDriver.vehicleIndex ?? 0;
    if (idx < allQpsoRoutes.length && allQpsoRoutes[idx]) {
      return allQpsoRoutes[idx]!;
    }
    return allQpsoRoutes[0] || [0, 1, 0];
  }, [selectedDriver, allQpsoRoutes]);

  const [draftRoute, setDraftRoute] = useState<number[]>(defaultRouteForSelected);

  // Update draft route when selected driver changes
  const handleSelectDriver = (driverId: string) => {
    setSelectedDriverId(driverId);
    setSaveSuccess(null);
    const d = drivers.find((item) => item.id === driverId);
    if (!d) return;
    if (d.customRoute && d.customRoute.length >= 2) {
      setDraftRoute(d.customRoute);
    } else {
      const idx = d.vehicleIndex ?? 0;
      const qpsoRoute = allQpsoRoutes[idx] || allQpsoRoutes[0] || [0, 1, 0];
      setDraftRoute(qpsoRoute);
    }
  };

  // Distance and travel time calculation for draft route
  const matrices = useMemo(() => buildMatrices(scenario), [scenario]);

  const routeMetrics = useMemo(() => {
    if (draftRoute.length < 2) return { km: 0, min: 0, load: 0 };
    let km = 0;
    let min = 0;
    let load = 0;

    for (let i = 0; i < draftRoute.length - 1; i++) {
      const a = draftRoute[i]!;
      const b = draftRoute[i + 1]!;
      const d = matrices.dist[a]?.[b] ?? 5;
      const c = matrices.congestion[a]?.[b] ?? 1.2;
      km += d;
      min += (d / AVG_SPEED) * 60 * c;
      load += ALL_NODES[b]?.demand ?? 0;
    }
    min += Math.max(draftRoute.length - 2, 0) * 3; // 3 mins per stop

    return { km, min, load };
  }, [draftRoute, matrices]);

  // Add location to route
  const handleAddLocation = (nodeIdx: number) => {
    // If route ends with Depot (0), insert before final depot return
    if (draftRoute.length >= 2 && draftRoute[draftRoute.length - 1] === 0) {
      const newRoute = [...draftRoute.slice(0, -1), nodeIdx, 0];
      setDraftRoute(newRoute);
    } else {
      setDraftRoute([...draftRoute, nodeIdx]);
    }
    setSaveSuccess(null);
  };

  // Remove stop at index
  const handleRemoveStop = (indexToRemove: number) => {
    if (draftRoute.length <= 2) return; // Keep at least depot and 1 stop
    const newRoute = draftRoute.filter((_, idx) => idx !== indexToRemove);
    setDraftRoute(newRoute);
    setSaveSuccess(null);
  };

  // Move stop up in sequence
  const handleMoveStop = (idx: number, direction: "up" | "down") => {
    if (idx === 0 || idx === draftRoute.length - 1) return; // Don't move start/end depot
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx <= 0 || targetIdx >= draftRoute.length - 1) return;

    const newRoute = [...draftRoute];
    const temp = newRoute[idx]!;
    newRoute[idx] = newRoute[targetIdx]!;
    newRoute[targetIdx] = temp;
    setDraftRoute(newRoute);
    setSaveSuccess(null);
  };

  // Apply corridor preset
  const handleApplyPreset = (presetNodes: number[]) => {
    setDraftRoute([...presetNodes]);
    setSaveSuccess(null);
  };

  // Save to driver and persist to Firebase Firestore
  const handleSaveRoute = async () => {
    if (!selectedDriver) return;
    setIsSaving(true);
    const res = await assignRouteToDriver(selectedDriver.id, draftRoute);
    setIsSaving(false);
    if (res.success) {
      setSaveSuccess(
        `Route successfully mapped and dispatched to ${selectedDriver.driverName} (Vehicle #${
          selectedDriver.vehicleIndex + 1
        })!`,
      );
      setTimeout(() => setSaveSuccess(null), 5000);
    }
  };

  // Revert back to QPSO auto solver route
  const handleResetToQpso = async () => {
    if (!selectedDriver) return;
    setIsSaving(true);
    await resetDriverRoute(selectedDriver.id);
    setIsSaving(false);
    const idx = selectedDriver.vehicleIndex ?? 0;
    const qpsoRoute = allQpsoRoutes[idx] || allQpsoRoutes[0] || [0, 1, 0];
    setDraftRoute(qpsoRoute);
    setSaveSuccess("Reverted driver route to QPSO fleet solver output.");
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  // Filter stored locations list
  const filteredNodes = useMemo(() => {
    return ALL_NODES.slice(1).filter((node) => {
      const matchesSearch = node.name.toLowerCase().includes(searchFilter.toLowerCase());
      const region = REGION_MAP[node.id] ?? "Other";
      const matchesRegion = selectedRegion === "All" || region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [searchFilter, selectedRegion]);

  return (
    <div className="panel p-6 shadow-xl">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="glowdot size-2 rounded-full bg-ember" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ember">
              Fleet Dispatch & Route Control
            </p>
          </div>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
            Driver Route Assignment & Location Mapping
          </h2>
          <p className="mt-0.5 text-xs text-mist">
            Select a registered driver, map specific route corridors from 25 stored Bengaluru
            locations, and dispatch directly to the driver&apos;s isolated cockpit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded bg-glasshi px-3 py-1 font-mono text-xs text-mist">
            {drivers.length} Drivers Registered
          </span>
          <span className="rounded bg-ember/15 px-3 py-1 font-mono text-xs text-ember font-semibold">
            Base Depot: Peenya
          </span>
        </div>
      </div>

      {saveSuccess && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400 animate-fadeIn">
          <span>✓ {saveSuccess}</span>
          <span className="font-mono text-[10px] uppercase">Synced to Firebase</span>
        </div>
      )}

      {/* Main Grid: Left Column (Drivers) | Right Column (Route Builder & Map) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Registered Drivers List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mist">
              Registered Fleet Drivers
            </span>
            <span className="font-mono text-[10px] text-faint">Click to map route</span>
          </div>

          <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {drivers.map((drv) => {
              const isSelected = drv.id === selectedDriver?.id;
              const hasCustom = drv.customRoute && drv.customRoute.length >= 2;
              const vNum = (drv.vehicleIndex ?? 0) + 1;

              return (
                <div
                  key={drv.id}
                  onClick={() => handleSelectDriver(drv.id)}
                  className={`group relative cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-ember bg-gradient-to-r from-ember/15 to-glass shadow-lg shadow-ember/5"
                      : "border-line bg-obsidian/70 hover:border-line/80 hover:bg-glass/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-ember">
                          VEH-#{String(vNum).padStart(2, "0")}
                        </span>
                        <span className="font-display text-sm font-semibold text-foreground">
                          {drv.driverName}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-mist">
                        📱 {drv.mobileNo} · {drv.companyName}
                      </p>
                    </div>

                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase font-semibold ${
                        hasCustom
                          ? "bg-ember/20 text-ember border border-ember/30"
                          : "bg-glasshi text-faint"
                      }`}
                    >
                      {hasCustom ? "Custom Mapped" : "QPSO Auto"}
                    </span>
                  </div>

                  {/* Route stop preview */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-line/50 pt-2 text-[11px]">
                    <span className="truncate text-mist font-mono text-[10px] max-w-[200px]">
                      {hasCustom
                        ? drv.customRoute?.map((n) => ALL_NODES[n]?.name).join(" → ")
                        : `QPSO Vehicle #${vNum} assignment`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        switchDriverForDemo(drv.id);
                      }}
                      className="font-mono text-[10px] text-ember hover:underline"
                      title="View driver's cockpit"
                    >
                      Test Cockpit →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Route Mapper & Stored Locations */}
        <div className="lg:col-span-8 space-y-5">
          {selectedDriver ? (
            <div className="rounded-xl border border-line bg-obsidian/80 p-5">
              {/* Target Driver Information Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ember">
                    Currently Editing Route For:
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="font-display text-base font-bold text-foreground">
                      {selectedDriver.driverName}
                    </h3>
                    <span className="rounded bg-ember/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-ember">
                      Vehicle #{selectedDriver.vehicleIndex + 1}
                    </span>
                    <span className="font-mono text-xs text-mist">({selectedDriver.mobileNo})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToQpso}
                    disabled={isSaving}
                    className="rounded border border-line bg-glass px-2.5 py-1 text-xs text-mist hover:text-foreground transition"
                  >
                    Revert to QPSO Auto
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRoute}
                    disabled={isSaving}
                    className="rounded bg-ember px-4 py-1.5 text-xs font-semibold text-void hover:bg-foreground hover:text-background transition shadow"
                  >
                    {isSaving ? "Saving..." : "Save & Dispatch Route"}
                  </button>
                </div>
              </div>

              {/* Corridor Presets Bar */}
              <div className="mt-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  ⚡ Quick Corridor Presets (Bengaluru Inner City):
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CORRIDOR_PRESETS.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleApplyPreset(preset.nodes)}
                      className="rounded-lg border border-line bg-glass/60 px-2.5 py-1 text-[11px] text-mist transition hover:border-ember hover:text-ember"
                    >
                      <span className="font-semibold">{preset.tag}:</span> {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Map Preview & Telemetry */}
              <div className="mt-5 grid gap-4 md:grid-cols-12">
                <div className="md:col-span-7">
                  <div className="panel overflow-hidden p-1.5">
                    <div className="mb-1.5 flex items-center justify-between px-2 pt-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-mist">
                        Mapped Route Preview
                      </span>
                      <span className="font-mono text-[10px] text-ember">
                        {draftRoute.length} Waypoints
                      </span>
                    </div>
                    <CityMap routes={[draftRoute]} className="aspect-[4/3] w-full" />
                  </div>
                </div>

                {/* Telemetry counters & Itinerary */}
                <div className="md:col-span-5 flex flex-col justify-between">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-line bg-glass p-2.5 text-center">
                      <p className="font-mono text-[9px] uppercase text-faint">Distance</p>
                      <p className="mt-0.5 font-display text-sm font-bold text-foreground">
                        {routeMetrics.km.toFixed(1)} km
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-glass p-2.5 text-center">
                      <p className="font-mono text-[9px] uppercase text-faint">Est. Time</p>
                      <p className="mt-0.5 font-display text-sm font-bold text-foreground">
                        {routeMetrics.min.toFixed(0)} min
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-glass p-2.5 text-center">
                      <p className="font-mono text-[9px] uppercase text-faint">Payload</p>
                      <p className="mt-0.5 font-display text-sm font-bold text-foreground">
                        {routeMetrics.load} pkgs
                      </p>
                    </div>
                  </div>

                  {/* Active Itinerary Stops sequence with reordering */}
                  <div className="mt-3 flex-1 rounded-xl border border-line bg-void/60 p-3">
                    <div className="flex items-center justify-between border-b border-line/60 pb-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-mist">
                        Stop Sequence Itinerary
                      </span>
                      <span className="font-mono text-[9px] text-faint">Reorder / Remove</span>
                    </div>

                    <div className="mt-2 max-h-[170px] space-y-1.5 overflow-y-auto pr-1">
                      {draftRoute.map((nodeIdx, seqIdx) => {
                        const isOrigin = seqIdx === 0;
                        const isFinalDepot = seqIdx === draftRoute.length - 1 && seqIdx > 0;
                        const nodeName = ALL_NODES[nodeIdx]?.name ?? "Unknown";

                        return (
                          <div
                            key={`${nodeIdx}-${seqIdx}`}
                            className="flex items-center justify-between rounded border border-line/60 bg-glass/40 px-2.5 py-1 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex size-4 items-center justify-center rounded-full font-mono text-[9px] font-bold ${
                                  isOrigin || isFinalDepot
                                    ? "bg-ember text-void"
                                    : "bg-obsidian border border-line text-mist"
                                }`}
                              >
                                {seqIdx}
                              </span>
                              <span className="font-mono text-[11px] text-foreground">
                                {nodeName} {isOrigin ? "(Origin)" : isFinalDepot ? "(Return)" : ""}
                              </span>
                            </div>

                            {!isOrigin && !isFinalDepot && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveStop(seqIdx, "up")}
                                  className="px-1 text-mist hover:text-foreground"
                                  title="Move earlier"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveStop(seqIdx, "down")}
                                  className="px-1 text-mist hover:text-foreground"
                                  title="Move later"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStop(seqIdx)}
                                  className="ml-1 text-destructive hover:underline text-xs"
                                  title="Remove stop"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stored Locations Selector & Search */}
              <div className="mt-6 border-t border-line pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display text-sm font-semibold text-foreground">
                      Stored Locations Hub (25 Bengaluru Nodes)
                    </h4>
                    <p className="text-[11px] text-mist">
                      Click &ldquo;+ Add to Route&rdquo; on any location below to map it to this
                      driver&apos;s delivery itinerary.
                    </p>
                  </div>

                  {/* Search and region filter */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search node (e.g. Indiranagar)..."
                      className="rounded-lg border border-line bg-void px-3 py-1 text-xs text-foreground focus:border-ember focus:outline-none"
                    />
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="rounded-lg border border-line bg-void px-2 py-1 font-mono text-xs text-mist focus:border-ember focus:outline-none"
                    >
                      <option value="All">All Regions</option>
                      <option value="North">North</option>
                      <option value="Central">Central CBD</option>
                      <option value="South">South</option>
                      <option value="East">East Tech</option>
                    </select>
                  </div>
                </div>

                {/* Stored Location Cards Grid */}
                <div className="mt-3 grid max-h-[220px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
                  {filteredNodes.map((node) => {
                    const isAlreadyInRoute = draftRoute.includes(node.id);
                    const region = REGION_MAP[node.id] ?? "Other";

                    return (
                      <div
                        key={node.id}
                        className={`flex flex-col justify-between rounded-lg border p-2.5 text-xs transition-colors ${
                          isAlreadyInRoute
                            ? "border-ember/40 bg-ember/[0.06]"
                            : "border-line bg-glass/30 hover:border-line/80"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] uppercase text-faint">
                              {region}
                            </span>
                            <span className="font-mono text-[9px] text-mist">
                              {node.demand} pkgs
                            </span>
                          </div>
                          <p className="mt-1 font-mono font-semibold text-foreground truncate">
                            {node.name}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddLocation(node.id)}
                          className="mt-2 w-full rounded bg-obsidian py-1 font-mono text-[10px] text-ember hover:bg-ember hover:text-void transition"
                        >
                          + Add to Route
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-line bg-obsidian/40 text-mist">
              Select a driver from the list to view and map their route.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
