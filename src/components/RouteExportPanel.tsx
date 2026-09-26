import { useSolver } from "@/lib/solver";
import { ALL_NODES } from "@/lib/network";
import type { Solution } from "@/lib/optimizer";

interface RouteExportPanelProps {
  className?: string;
}

function formatRoute(route: number[], nodes = ALL_NODES): string {
  return route.map((i) => nodes[i]?.name ?? `Node#${i}`).join(" → ");
}

function generateRouteJSON(solution: Solution, networkLabel: string): string {
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      network: networkLabel,
      optimizer: "QPSO (Quantum-behaved Particle Swarm Optimization)",
      summary: {
        total_distance_km: parseFloat(solution.distanceKm.toFixed(2)),
        avg_eta_min: parseFloat(solution.timeMin.toFixed(1)),
        co2_kg: parseFloat(solution.co2Kg.toFixed(2)),
        congestion_index: parseFloat(solution.congestionIdx.toFixed(3)),
        fitness_score: parseFloat(solution.fitness.toFixed(4)),
      },
      routes: solution.routes.map((route, idx) => ({
        vehicle: `V${String(idx + 1).padStart(2, "0")}`,
        stops: route.map((i) => ({
          node_id: ALL_NODES[i]?.id ?? `N${i}`,
          name: ALL_NODES[i]?.name ?? `Node ${i}`,
          lat: ALL_NODES[i]?.lat,
          lng: ALL_NODES[i]?.lng,
          demand: ALL_NODES[i]?.demand ?? 0,
        })),
        stop_count: route.length - 2,
      })),
    },
    null,
    2,
  );
}

function generateRouteCSV(solution: Solution): string {
  const header = "Vehicle,Stop #,Node ID,Location,Lat,Lng,Demand\n";
  const rows = solution.routes
    .flatMap((route, vIdx) =>
      route.map((nodeIdx, stopIdx) => {
        const node = ALL_NODES[nodeIdx];
        return `V${String(vIdx + 1).padStart(2, "0")},${stopIdx},${node?.id ?? nodeIdx},${node?.name ?? "?"},${node?.lat ?? ""},${node?.lng ?? ""},${node?.demand ?? 0}`;
      }),
    )
    .join("\n");
  return header + rows;
}

function generateDriverBriefing(solution: Solution, networkLabel: string): string {
  const lines: string[] = [
    "═══════════════════════════════════════════════════",
    " QUANTA FLEET ROUTE BRIEFING",
    " Quantum-Inspired Optimal Route Plan",
    "═══════════════════════════════════════════════════",
    `Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
    `Network Origin: ${networkLabel}`,
    `Total Fleet Distance: ${solution.distanceKm.toFixed(1)} km`,
    `Avg Vehicle ETA: ${solution.timeMin.toFixed(0)} min`,
    `Fleet CO₂: ${solution.co2Kg.toFixed(1)} kg`,
    `Congestion Index: ${solution.congestionIdx.toFixed(3)}`,
    "",
  ];

  solution.routes.forEach((route, idx) => {
    lines.push(`───────────────────────────────────────────────────`);
    lines.push(`VEHICLE #${idx + 1} — ASSIGNED CORRIDOR`);
    lines.push(`Stops: ${route.length - 2} delivery points`);
    lines.push(`Sequence: ${formatRoute(route)}`);
    lines.push("");
  });

  lines.push("═══════════════════════════════════════════════════");
  lines.push("Algorithm: QPSO Delta-Potential Well Dynamics");
  lines.push("Platform: Move.QUANTA — SIH Fleet Intelligence");
  lines.push("═══════════════════════════════════════════════════");

  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function RouteExportPanel({ className = "" }: RouteExportPanelProps) {
  const { runs, networkConfig } = useSolver();
  const qpso = runs.qpso;

  const networkLabel = networkConfig.pickupHub.name;
  const timestamp = new Date().toISOString().slice(0, 10);

  const handleExportJSON = () => {
    if (!qpso) return;
    downloadFile(
      generateRouteJSON(qpso.best, networkLabel),
      `quanta-routes-${timestamp}.json`,
      "application/json",
    );
  };

  const handleExportCSV = () => {
    if (!qpso) return;
    downloadFile(
      generateRouteCSV(qpso.best),
      `quanta-routes-${timestamp}.csv`,
      "text/csv",
    );
  };

  const handleExportBriefing = () => {
    if (!qpso) return;
    downloadFile(
      generateDriverBriefing(qpso.best, networkLabel),
      `quanta-driver-briefing-${timestamp}.txt`,
      "text/plain",
    );
  };

  const handleCopyJSON = async () => {
    if (!qpso) return;
    try {
      await navigator.clipboard.writeText(generateRouteJSON(qpso.best, networkLabel));
    } catch {
      // clipboard not available
    }
  };

  return (
    <div className={`panel p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <span className="text-base">📤</span>
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            Route Export & Briefing
          </p>
          <p className="font-mono text-[10px] text-faint">
            Download optimized routes for dispatch operations
          </p>
        </div>
      </div>

      {!qpso ? (
        <div className="py-6 text-center">
          <p className="font-mono text-xs text-mist">
            Run the QPSO optimizer first to generate exportable routes
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Vehicles", value: qpso.best.routes.length },
              {
                label: "Total km",
                value: qpso.best.distanceKm.toFixed(1),
              },
              {
                label: "Avg ETA",
                value: `${qpso.best.timeMin.toFixed(0)}m`,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-line bg-obsidian p-2.5 text-center"
              >
                <p className="font-display text-base font-bold text-foreground">{s.value}</p>
                <p className="font-mono text-[9px] uppercase text-faint">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Export Buttons */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={handleExportJSON}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-glass/40 px-3 py-3 text-center transition hover:border-ember hover:bg-ember/5"
            >
              <span className="text-lg">{ }</span>
              <span className="font-mono text-[10px] font-bold text-foreground">
                Export JSON
              </span>
              <span className="font-mono text-[9px] text-mist">
                Full route data + metadata
              </span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-glass/40 px-3 py-3 text-center transition hover:border-emerald-500/50 hover:bg-emerald-950/10"
            >
              <span className="text-lg">📋</span>
              <span className="font-mono text-[10px] font-bold text-foreground">
                Export CSV
              </span>
              <span className="font-mono text-[9px] text-mist">
                Stop-by-stop spreadsheet
              </span>
            </button>

            <button
              onClick={handleExportBriefing}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-glass/40 px-3 py-3 text-center transition hover:border-blue-500/50 hover:bg-blue-950/10"
            >
              <span className="text-lg">📄</span>
              <span className="font-mono text-[10px] font-bold text-foreground">
                Driver Briefing
              </span>
              <span className="font-mono text-[9px] text-mist">
                Printable dispatch sheet (.txt)
              </span>
            </button>

            <button
              onClick={handleCopyJSON}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-glass/40 px-3 py-3 text-center transition hover:border-violet-500/50 hover:bg-violet-950/10"
            >
              <span className="text-lg">📎</span>
              <span className="font-mono text-[10px] font-bold text-foreground">
                Copy JSON
              </span>
              <span className="font-mono text-[9px] text-mist">
                Copy to clipboard
              </span>
            </button>
          </div>

          {/* Route Preview */}
          <div className="mt-3 max-h-36 overflow-y-auto rounded-lg border border-line bg-obsidian p-3">
            {qpso.best.routes.map((route, idx) => (
              <div key={idx} className="mb-2 last:mb-0">
                <span className="font-mono text-[9px] font-bold text-ember">
                  Vehicle #{idx + 1}:{" "}
                </span>
                <span className="font-mono text-[9px] text-mist">
                  {formatRoute(route)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
