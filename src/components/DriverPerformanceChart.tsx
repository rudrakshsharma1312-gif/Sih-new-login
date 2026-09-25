import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import { useAuth, type DriverUser } from "@/lib/auth-context";
import { useSolver } from "@/lib/solver";
import { ALL_NODES, buildMatrices } from "@/lib/network";

const AVG_SPEED = 26; // km/h average Bengaluru inner-city dispatch speed

interface DriverMetricItem {
  id: string;
  driverName: string;
  mobileNo: string;
  vehicleLabel: string;
  vehicleIndex: number;
  stopsCount: number;
  distanceKm: number;
  completionTimeMin: number;
  payloadPackages: number;
  isCustom: boolean;
  performanceTier: "Fast" | "Balanced" | "High Demand";
}

// Modern distinct colors for each vehicle bar - Move. palette
const BAR_COLORS = [
  "#ffd358", // Move. Canary Yellow
  "#080a0c", // Move. Deep Black
  "#38bdf8", // Sky Azure
  "#10b981", // Emerald
  "#a855f7", // Purple
  "#f59e0b", // Amber
  "#6366f1", // Indigo
  "#14b8a6", // Teal
];

export function DriverPerformanceChart() {
  const { drivers, switchDriverForDemo } = useAuth();
  const { runs, scenario } = useSolver();
  const qpso = runs.qpso;
  const allQpsoRoutes = useMemo(() => qpso?.best.routes ?? [], [qpso]);

  const [activeMetric, setActiveMetric] = useState<"time" | "distance">("time");
  const [sortBy, setSortBy] = useState<"vehicle" | "fastest" | "slowest">("vehicle");

  const matrices = useMemo(() => buildMatrices(scenario), [scenario]);

  // Compute performance metrics for every registered driver
  const performanceData: DriverMetricItem[] = useMemo(() => {
    if (!drivers || drivers.length === 0) return [];

    return drivers.map((driver: DriverUser) => {
      const vIdx = driver.vehicleIndex ?? 0;
      const isCustom = Array.isArray(driver.customRoute) && driver.customRoute.length >= 2;

      // Use driver's custom assigned route or fallback to QPSO solver output
      const route = isCustom
        ? (driver.customRoute as number[])
        : allQpsoRoutes[vIdx] || allQpsoRoutes[0] || [0, 1, 0];

      let distanceKm = 0;
      let timeMin = 0;
      let payloadPackages = 0;

      for (let i = 0; i < route.length - 1; i++) {
        const from = route[i]!;
        const to = route[i + 1]!;
        const d = matrices.dist[from]?.[to] ?? 5;
        const c = matrices.congestion[from]?.[to] ?? 1.2;
        distanceKm += d;
        timeMin += (d / AVG_SPEED) * 60 * c;
        payloadPackages += ALL_NODES[to]?.demand ?? 0;
      }

      // Add 3 minutes per delivery stop
      const stopCount = Math.max(route.length - 2, 1);
      timeMin += stopCount * 3;

      const roundedTime = Math.round(timeMin);
      const roundedDist = Number(distanceKm.toFixed(1));

      let performanceTier: "Fast" | "Balanced" | "High Demand" = "Balanced";
      if (roundedTime < 75) performanceTier = "Fast";
      else if (roundedTime > 110) performanceTier = "High Demand";

      return {
        id: driver.id,
        driverName: driver.driverName,
        mobileNo: driver.mobileNo,
        vehicleLabel: `Veh #${String(vIdx + 1).padStart(2, "0")}`,
        vehicleIndex: vIdx,
        stopsCount: stopCount,
        distanceKm: roundedDist,
        completionTimeMin: roundedTime,
        payloadPackages,
        isCustom,
        performanceTier,
      };
    });
  }, [drivers, allQpsoRoutes, matrices]);

  // Sorted data based on user selection
  const sortedData = useMemo(() => {
    const list = [...performanceData];
    if (sortBy === "fastest") {
      list.sort((a, b) => a.completionTimeMin - b.completionTimeMin);
    } else if (sortBy === "slowest") {
      list.sort((a, b) => b.completionTimeMin - a.completionTimeMin);
    } else {
      list.sort((a, b) => a.vehicleIndex - b.vehicleIndex);
    }
    return list;
  }, [performanceData, sortBy]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (!performanceData.length) {
      return { avgTime: 0, avgDist: 0, fastest: null, longest: null, totalHours: 0 };
    }
    const totalTime = performanceData.reduce((acc, d) => acc + d.completionTimeMin, 0);
    const totalDist = performanceData.reduce((acc, d) => acc + d.distanceKm, 0);
    const avgTime = Math.round(totalTime / performanceData.length);
    const avgDist = Number((totalDist / performanceData.length).toFixed(1));

    const fastest = [...performanceData].sort(
      (a, b) => a.completionTimeMin - b.completionTimeMin,
    )[0];
    const longest = [...performanceData].sort(
      (a, b) => b.completionTimeMin - a.completionTimeMin,
    )[0];

    return {
      avgTime,
      avgDist,
      fastest,
      longest,
      totalHours: Number((totalTime / 60).toFixed(1)),
    };
  }, [performanceData]);

  return (
    <div className="rounded-3xl border border-line bg-card p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-ember text-void text-[10px] font-bold">
              ↗
            </span>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground font-bold">
              Performance Analytics & SLA Benchmarking
            </p>
          </div>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
            Driver Route Completion Times
          </h2>
          <p className="mt-0.5 text-xs text-mist">
            Comparison of estimated delivery completion times (ETA) and route distances across all
            assigned fleet drivers.
          </p>
        </div>

        {/* Chart View Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex rounded-full border border-line bg-obsidian p-1 font-mono text-xs shadow-xs">
            <button
              onClick={() => setActiveMetric("time")}
              className={`rounded-full px-3 py-1 transition cursor-pointer ${
                activeMetric === "time"
                  ? "bg-ember text-void font-bold shadow-xs"
                  : "text-mist hover:text-foreground"
              }`}
            >
              ⏱️ Time (min)
            </button>
            <button
              onClick={() => setActiveMetric("distance")}
              className={`rounded-full px-3 py-1 transition cursor-pointer ${
                activeMetric === "distance"
                  ? "bg-ember text-void font-bold shadow-xs"
                  : "text-mist hover:text-foreground"
              }`}
            >
              📏 Distance (km)
            </button>
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "vehicle" | "fastest" | "slowest")}
            className="rounded-full border border-line bg-obsidian px-3 py-1.5 font-mono text-xs text-foreground focus:border-ember focus:outline-none cursor-pointer"
            aria-label="Sort drivers"
          >
            <option value="vehicle">Sort by Vehicle #</option>
            <option value="fastest">Sort by Fastest First</option>
            <option value="slowest">Sort by Longest First</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Summary Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-obsidian p-4 shadow-xs">
          <p className="font-mono text-[10px] uppercase text-faint">Fleet Average ETA</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {stats.avgTime} <span className="text-xs font-mono text-mist font-normal">mins</span>
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-faint">Target SLA: 90 mins max</p>
        </div>

        <div className="rounded-2xl border border-line bg-obsidian p-4 shadow-xs">
          <p className="font-mono text-[10px] uppercase text-faint">Fastest Completion</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-500">
            {stats.fastest?.completionTimeMin ?? 0}{" "}
            <span className="text-xs font-mono text-mist font-normal">mins</span>
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-mist truncate">
            {stats.fastest?.driverName} ({stats.fastest?.vehicleLabel})
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-obsidian p-4 shadow-xs">
          <p className="font-mono text-[10px] uppercase text-faint">Longest Corridor</p>
          <p className="mt-1 font-display text-2xl font-bold text-ember">
            {stats.longest?.completionTimeMin ?? 0}{" "}
            <span className="text-xs font-mono text-mist font-normal">mins</span>
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-mist truncate">
            {stats.longest?.driverName} ({stats.longest?.vehicleLabel})
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-obsidian p-4 shadow-xs">
          <p className="font-mono text-[10px] uppercase text-faint">Active Drivers</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {performanceData.length}{" "}
            <span className="text-xs font-mono text-mist font-normal">dispatched</span>
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-faint">
            Total {stats.totalHours} fleet hours
          </p>
        </div>
      </div>

      {/* RECHARTS BAR CHART */}
      <div className="mt-6 rounded-2xl border border-line bg-obsidian p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-mist">
              {activeMetric === "time"
                ? "Route Duration by Driver (Minutes)"
                : "Route Distance by Driver (Kilometers)"}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-faint">
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-ember" />
              <span>Assigned Route</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 border-t-2 border-dashed border-sky-400" />
              <span>
                Fleet Average (
                {activeMetric === "time" ? `${stats.avgTime}m` : `${stats.avgDist}km`})
              </span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 15, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262635" vertical={false} />
              <XAxis
                dataKey="driverName"
                tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "monospace" }}
                interval={0}
                tickLine={{ stroke: "#3f3f46" }}
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "monospace" }}
                unit={activeMetric === "time" ? "m" : "km"}
                tickLine={{ stroke: "#3f3f46" }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0]?.payload as DriverMetricItem;
                  return (
                    <div className="rounded-xl border border-line bg-obsidian/95 p-3 shadow-2xl backdrop-blur-md">
                      <div className="flex items-center justify-between gap-3 border-b border-line pb-1.5">
                        <span className="font-display text-xs font-bold text-foreground">
                          {item.driverName}
                        </span>
                        <span className="rounded bg-ember/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-ember">
                          {item.vehicleLabel}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 font-mono text-[11px]">
                        <p className="flex justify-between gap-4 text-mist">
                          <span>Est. Completion Time:</span>
                          <strong className="text-foreground">{item.completionTimeMin} mins</strong>
                        </p>
                        <p className="flex justify-between gap-4 text-mist">
                          <span>Total Route Distance:</span>
                          <strong className="text-foreground">{item.distanceKm} km</strong>
                        </p>
                        <p className="flex justify-between gap-4 text-mist">
                          <span>Delivery Stops:</span>
                          <strong className="text-foreground">{item.stopsCount} stops</strong>
                        </p>
                        <p className="flex justify-between gap-4 text-mist">
                          <span>Payload Demand:</span>
                          <strong className="text-foreground">
                            {item.payloadPackages} packages
                          </strong>
                        </p>
                        <p className="flex justify-between gap-4 text-mist">
                          <span>Assignment Type:</span>
                          <strong className={item.isCustom ? "text-ember" : "text-sky-400"}>
                            {item.isCustom ? "Manager Mapped" : "QPSO Auto"}
                          </strong>
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={activeMetric === "time" ? stats.avgTime : stats.avgDist}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <Bar
                dataKey={activeMetric === "time" ? "completionTimeMin" : "distanceKm"}
                radius={[6, 6, 0, 0]}
              >
                {sortedData.map((entry, index) => {
                  const color = BAR_COLORS[entry.vehicleIndex % BAR_COLORS.length] ?? "#ff7a29";
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver Performance Table Details */}
      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        <div className="flex items-center justify-between bg-glass/60 px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mist">
            Driver Performance Breakdown
          </span>
          <span className="font-mono text-[10px] text-faint">
            {performanceData.length} Dispatched Drivers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-line bg-obsidian/60 text-[10px] uppercase text-faint">
              <tr>
                <th className="px-4 py-2">Vehicle</th>
                <th className="px-4 py-2">Driver Name</th>
                <th className="px-4 py-2">Mobile</th>
                <th className="px-4 py-2">Route Mode</th>
                <th className="px-4 py-2">Stops</th>
                <th className="px-4 py-2">Distance</th>
                <th className="px-4 py-2">ETA Completion</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40 bg-void/30">
              {sortedData.map((d) => (
                <tr key={d.id} className="transition hover:bg-glass/30">
                  <td className="px-4 py-2.5 font-bold text-ember">{d.vehicleLabel}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{d.driverName}</td>
                  <td className="px-4 py-2.5 text-mist">{d.mobileNo}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] uppercase font-semibold ${
                        d.isCustom
                          ? "bg-ember/20 text-ember border border-ember/30"
                          : "bg-glasshi text-mist"
                      }`}
                    >
                      {d.isCustom ? "Custom Mapped" : "QPSO Optimized"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-mist">{d.stopsCount} stops</td>
                  <td className="px-4 py-2.5 text-foreground">{d.distanceKm} km</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`font-bold ${
                        d.completionTimeMin <= stats.avgTime ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {d.completionTimeMin} mins
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => switchDriverForDemo(d.id)}
                      className="rounded border border-line bg-glass px-2 py-1 text-[10px] text-ember hover:bg-ember hover:text-void transition"
                    >
                      Test Cockpit →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
