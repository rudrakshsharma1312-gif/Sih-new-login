import { useEffect, useState } from "react";
import { globalIncidentFeed, type LiveIncident, type IncidentFeedState } from "@/lib/incident-feed";
import { useSolver } from "@/lib/solver";

interface LiveIncidentFeedProps {
  className?: string;
  autoResolveOnSolve?: boolean;
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; text: string; badge: string }> =
  {
    critical: {
      border: "border-red-500/30",
      bg: "bg-red-950/20",
      text: "text-red-400",
      badge: "bg-red-500/20 text-red-300 border border-red-500/30",
    },
    warning: {
      border: "border-amber-500/30",
      bg: "bg-amber-950/15",
      text: "text-amber-400",
      badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    },
    info: {
      border: "border-blue-500/20",
      bg: "bg-blue-950/10",
      text: "text-blue-400",
      badge: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
    },
  };

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export function LiveIncidentFeedPanel({ className = "" }: LiveIncidentFeedProps) {
  const { run: resolveAndRun } = useSolver();
  const [feedState, setFeedState] = useState<IncidentFeedState>(globalIncidentFeed.getState());
  const [feedActive, setFeedActive] = useState(false);
  const [, forceRender] = useState(0);

  // Tick timestamps every 5s
  useEffect(() => {
    const t = setInterval(() => forceRender((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // Subscribe to feed
  useEffect(() => {
    const unsub = globalIncidentFeed.subscribe(setFeedState);
    return unsub;
  }, []);

  const startFeed = () => {
    setFeedActive(true);
    globalIncidentFeed.start(10000);
  };

  const stopFeed = () => {
    setFeedActive(false);
    globalIncidentFeed.stop();
  };

  const injectCritical = () => {
    globalIncidentFeed.injectManual("critical");
    resolveAndRun();
  };

  const injectWarning = () => {
    globalIncidentFeed.injectManual("warning");
  };

  const activeIncidents = feedState.incidents.filter((i) => !i.resolved);
  const resolvedIncidents = feedState.incidents.filter((i) => i.resolved).slice(0, 3);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="text-base">📡</span>
              {feedActive && (
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-red-500 animate-pulse ring-1 ring-obsidian" />
              )}
            </div>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Live Incident Command Feed
              </p>
              <p className="font-mono text-[10px] text-faint">
                BMLTA · BBMP · IoT Sensor Network · Crowdsource
              </p>
            </div>
          </div>

          {/* Feed Controls */}
          <div className="flex items-center gap-2">
            {!feedActive ? (
              <button
                onClick={startFeed}
                className="flex items-center gap-1.5 rounded-full bg-ember px-3 py-1.5 font-mono text-[10px] font-bold text-void transition hover:bg-foreground hover:text-background"
              >
                <span className="size-1.5 rounded-full bg-current" />
                Start Live Feed
              </button>
            ) : (
              <button
                onClick={stopFeed}
                className="flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-950/30 px-3 py-1.5 font-mono text-[10px] font-bold text-red-400 transition hover:bg-red-950/50"
              >
                <span className="size-1.5 rounded-full bg-red-400 animate-pulse" />
                Stop Feed
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="rounded-lg border border-line bg-obsidian p-2 text-center">
            <p className="font-display text-lg font-bold text-foreground">{feedState.totalToday}</p>
            <p className="font-mono text-[9px] uppercase text-faint">Today</p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-950/15 p-2 text-center">
            <p className="font-display text-lg font-bold text-red-400">
              {feedState.severityBreakdown.critical}
            </p>
            <p className="font-mono text-[9px] uppercase text-red-500/70">Critical</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-2 text-center">
            <p className="font-display text-lg font-bold text-amber-400">
              {feedState.severityBreakdown.warning}
            </p>
            <p className="font-mono text-[9px] uppercase text-amber-500/70">Warning</p>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-950/10 p-2 text-center">
            <p className="font-display text-lg font-bold text-blue-400">
              {feedState.severityBreakdown.info}
            </p>
            <p className="font-mono text-[9px] uppercase text-blue-500/70">Info</p>
          </div>
        </div>

        {/* Manual Injection */}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line/60 pt-3">
          <p className="w-full font-mono text-[9px] uppercase tracking-widest text-faint">
            Manual Incident Injection
          </p>
          <button
            onClick={injectCritical}
            className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-950/20 px-3 py-1.5 font-mono text-[10px] text-red-400 transition hover:bg-red-950/40"
          >
            🚨 Inject Critical + Re-solve
          </button>
          <button
            onClick={injectWarning}
            className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/20 px-3 py-1.5 font-mono text-[10px] text-amber-400 transition hover:bg-amber-950/40"
          >
            ⚠️ Inject Warning
          </button>
          <button
            onClick={() => globalIncidentFeed.resolveAll()}
            className="flex items-center gap-1.5 rounded-full border border-line bg-glass/40 px-3 py-1.5 font-mono text-[10px] text-mist transition hover:text-foreground"
          >
            ✓ Clear All
          </button>
        </div>
      </div>

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground">
              Active Incidents ({activeIncidents.length})
            </p>
          </div>
          <div className="divide-y divide-line/40 max-h-64 overflow-y-auto">
            {activeIncidents.map((incident) => (
              <IncidentRow key={incident.id} incident={incident} />
            ))}
          </div>
        </div>
      )}

      {/* Resolved (recent) */}
      {resolvedIncidents.length > 0 && (
        <div className="panel overflow-hidden opacity-60">
          <div className="border-b border-line px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
              Recently Resolved
            </p>
          </div>
          <div className="divide-y divide-line/30">
            {resolvedIncidents.map((incident) => (
              <IncidentRow key={incident.id} incident={incident} resolved />
            ))}
          </div>
        </div>
      )}

      {!feedActive && feedState.incidents.length === 0 && (
        <div className="panel p-8 text-center">
          <p className="text-2xl">📡</p>
          <p className="mt-2 font-mono text-xs text-mist">
            Start the live feed to receive real-time incident updates from Bengaluru's road network
          </p>
        </div>
      )}
    </div>
  );
}

function IncidentRow({
  incident,
  resolved = false,
}: {
  incident: LiveIncident;
  resolved?: boolean;
}) {
  const styles = SEVERITY_STYLES[incident.severity] ?? SEVERITY_STYLES["info"]!;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${resolved ? "opacity-50" : ""}`}>
      <span className="text-base leading-none mt-0.5">{incident.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[11px] font-semibold text-foreground leading-none">
            {incident.title}
          </p>
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[8px] uppercase font-bold ${styles.badge}`}
          >
            {resolved ? "RESOLVED" : incident.severity}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-mist">{incident.location}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] text-faint">{incident.source}</span>
          <span className="text-faint">·</span>
          {!resolved && (
            <span className={`font-mono text-[9px] font-bold ${styles.text}`}>
              ×{incident.congestionBoost.toFixed(1)} congestion
            </span>
          )}
          <span className="text-faint">·</span>
          <span className="font-mono text-[9px] text-faint">{timeAgo(incident.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
