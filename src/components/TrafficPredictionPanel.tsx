import { useEffect, useState } from "react";
import {
  generateDailyForecast,
  predictCongestion,
  getISTHour,
  BENGALURU_ZONES,
  type TrafficPrediction,
  type ZoneProfile,
} from "@/lib/traffic-prediction";
import { analyzeSLABreaches } from "@/lib/traffic-prediction";
import { useSolver } from "@/lib/solver";

interface TrafficPredictionPanelProps {
  className?: string;
}

export function TrafficPredictionPanel({ className = "" }: TrafficPredictionPanelProps) {
  const { runs } = useSolver();
  const qpso = runs.qpso;

  const [selectedZone, setSelectedZone] = useState<string>("outer_ring");
  const [forecast, setForecast] = useState<TrafficPrediction[]>([]);
  const [currentHour, setCurrentHour] = useState(getISTHour());
  const [currentPrediction, setCurrentPrediction] = useState<TrafficPrediction | null>(null);

  const zone: ZoneProfile = BENGALURU_ZONES[selectedZone] ?? BENGALURU_ZONES["outer_ring"]!;

  useEffect(() => {
    const data = generateDailyForecast(zone);
    setForecast(data);
    const h = getISTHour();
    setCurrentHour(h);
    setCurrentPrediction(predictCongestion(h, zone));

    const interval = setInterval(() => {
      const h2 = getISTHour();
      setCurrentHour(h2);
      setCurrentPrediction(predictCongestion(h2, zone));
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedZone]);

  const slaAlerts = qpso
    ? analyzeSLABreaches(
        qpso.best.routes,
        Array(25).fill(Array(25).fill(5)), // fallback matrix; real matrix from solver context
        currentPrediction?.congestionMultiplier ?? 1.4,
        120,
      )
    : [];

  const maxC = Math.max(...forecast.map((f) => f.congestionMultiplier), 1);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🧠</span>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Predictive Traffic Intelligence
              </p>
              <p className="font-mono text-[10px] text-faint">
                Gaussian Mixture Model · Bengaluru Road Network
              </p>
            </div>
          </div>
          {currentPrediction && (
            <div
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
              style={{
                borderColor: currentPrediction.color + "40",
                backgroundColor: currentPrediction.color + "12",
              }}
            >
              <span
                className="size-2 rounded-full animate-pulse"
                style={{ backgroundColor: currentPrediction.color }}
              />
              <span
                className="font-mono text-[11px] font-bold"
                style={{ color: currentPrediction.color }}
              >
                NOW · {currentPrediction.label}
              </span>
              <span className="font-mono text-[10px] text-mist">
                ×{currentPrediction.congestionMultiplier.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Zone Selector */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(BENGALURU_ZONES).map(([key, z]) => (
            <button
              key={key}
              onClick={() => setSelectedZone(key)}
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] transition-all ${
                selectedZone === key
                  ? "border-ember bg-ember/20 text-ember font-bold"
                  : "border-line text-mist hover:border-ember/50 hover:text-foreground"
              }`}
            >
              {z.name.split("(")[0]!.trim()}
            </button>
          ))}
        </div>

        {/* 24h Forecast Bar Chart */}
        <div className="mt-4">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-faint">
            24-Hour Congestion Forecast
          </p>
          <div className="flex items-end gap-[2px] h-16">
            {forecast.map((f) => {
              const heightPct = ((f.congestionMultiplier - 1.0) / (maxC - 1.0)) * 100;
              const isNow = f.hour === currentHour;
              return (
                <div
                  key={f.hour}
                  className="flex-1 flex flex-col items-center gap-0.5"
                  title={`${f.hour}:00 — ${f.label} (×${f.congestionMultiplier.toFixed(2)})`}
                >
                  <div className="w-full flex items-end justify-center" style={{ height: "52px" }}>
                    <div
                      className={`w-full rounded-t-sm transition-all ${isNow ? "ring-1 ring-white/40" : ""}`}
                      style={{
                        height: `${Math.max(4, heightPct)}%`,
                        backgroundColor: f.color + (isNow ? "ff" : "99"),
                      }}
                    />
                  </div>
                  <span
                    className={`font-mono text-[7px] ${isNow ? "text-foreground font-bold" : "text-faint"}`}
                  >
                    {f.hour}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between font-mono text-[9px] text-faint">
            <span>12 AM</span>
            <span className="text-ember font-bold">▲ Current ({currentHour}:00)</span>
            <span>11 PM</span>
          </div>
        </div>

        {/* Current Recommendation */}
        {currentPrediction && (
          <div className="mt-3 rounded-lg border border-line/60 bg-obsidian/60 px-3 py-2">
            <p className="font-mono text-[9px] uppercase tracking-widest text-faint">
              AI Recommendation
            </p>
            <p className="mt-1 font-mono text-[11px] text-foreground">
              {currentPrediction.recommendedAction}
            </p>
            <p className="mt-1 font-mono text-[9px] text-mist">
              Model confidence:{" "}
              <span className="text-emerald-400 font-bold">{currentPrediction.confidencePct}%</span>
            </p>
          </div>
        )}
      </div>

      {/* SLA Breach Early Warning */}
      {slaAlerts.length > 0 && (
        <div className="panel p-4">
          <div className="flex items-center gap-2 border-b border-line pb-2">
            <span className="text-sm">⏱️</span>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              SLA Early Warning System
            </p>
            <span className="ml-auto rounded bg-ember/20 px-1.5 py-0.5 font-mono text-[9px] text-ember border border-ember/30">
              {slaAlerts.filter((a) => a.breachRisk !== "safe").length} at risk
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {slaAlerts.map((alert) => (
              <div
                key={alert.vehicleIdx}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  alert.breachRisk === "critical"
                    ? "border-red-500/30 bg-red-950/20"
                    : alert.breachRisk === "warning"
                      ? "border-amber-500/30 bg-amber-950/20"
                      : "border-emerald-500/20 bg-emerald-950/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs">
                    {alert.breachRisk === "critical"
                      ? "🔴"
                      : alert.breachRisk === "warning"
                        ? "🟡"
                        : "🟢"}
                  </span>
                  <div>
                    <p className="font-mono text-[11px] text-foreground">{alert.message}</p>
                    <p className="font-mono text-[9px] text-faint">
                      {alert.routeKm} km · {alert.etaMin} min ETA
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] font-bold ${
                    alert.breachRisk === "critical"
                      ? "text-red-400"
                      : alert.breachRisk === "warning"
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }`}
                >
                  {alert.marginMin > 0 ? `+${alert.marginMin}m` : `${alert.marginMin}m`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
