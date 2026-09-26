import { useState } from "react";
import { useSolver } from "@/lib/solver";
import { PRESET_HUBS, type HubLocation } from "@/lib/network";
import { HubLocationModal } from "@/components/HubLocationModal";

type Props = {
  className?: string;
  onStartMapPinPick?: (target: "pickup" | "destination") => void;
  activePinMode?: "pickup" | "destination" | null;
  onCancelPinMode?: () => void;
};

export function HubSelectorBar({
  className = "",
  onStartMapPinPick,
  activePinMode,
  onCancelPinMode,
}: Props) {
  const { networkConfig, setPickupHub, setDestinationHub, toggleRoundTrip, resetHubsToDefault } =
    useSolver();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card/90 p-3.5 shadow-sm backdrop-blur-md ${className}`}
      >
        {/* Left: Origin & Destination Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Pick-up / Base Hub */}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-1.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-void font-bold">
              🚀
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                  Base Origin
                </span>
                <span className="font-mono text-[9px] text-faint">
                  {networkConfig.pickupHub.lat.toFixed(3)}°N,{" "}
                  {networkConfig.pickupHub.lng.toFixed(3)}°E
                </span>
              </div>
              <p className="font-display text-xs font-bold text-foreground">
                {networkConfig.pickupHub.name}
              </p>
            </div>
          </div>

          {/* Circuit Connector & Toggle */}
          <button
            type="button"
            onClick={toggleRoundTrip}
            title="Toggle between Round Trip (return to base) and Open Destination corridor"
            className="group flex items-center gap-1 rounded-lg border border-line bg-muted/40 px-2 py-1 font-mono text-[10px] text-mist hover:border-ember hover:text-ember transition-all cursor-pointer"
          >
            <span>{networkConfig.isRoundTrip ? "🔄" : "➔"}</span>
            <span className="font-semibold">
              {networkConfig.isRoundTrip ? "Round Trip" : "Open Terminus"}
            </span>
          </button>

          {/* Destination Hub */}
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${
              networkConfig.isRoundTrip
                ? "border-emerald-500/15 bg-emerald-950/10 opacity-75"
                : "border-violet-500/25 bg-violet-950/20"
            }`}
          >
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[10px] text-void font-bold ${
                networkConfig.isRoundTrip ? "bg-emerald-600/70" : "bg-violet-500"
              }`}
            >
              🏁
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-mono text-[9px] font-bold uppercase tracking-wider ${
                    networkConfig.isRoundTrip ? "text-emerald-400/80" : "text-violet-400"
                  }`}
                >
                  {networkConfig.isRoundTrip ? "Terminus (Return)" : "Destination Hub"}
                </span>
                <span className="font-mono text-[9px] text-faint">
                  {networkConfig.destinationHub.lat.toFixed(3)}°N,{" "}
                  {networkConfig.destinationHub.lng.toFixed(3)}°E
                </span>
              </div>
              <p className="font-display text-xs font-bold text-foreground">
                {networkConfig.destinationHub.name}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Quick actions & Map Pin mode */}
        <div className="flex items-center gap-2">
          {activePinMode ? (
            <div className="flex items-center gap-2 rounded-xl border border-ember bg-ember/15 px-3 py-1.5 animate-pulse">
              <span className="font-mono text-xs font-bold text-ember">
                📍 Click on Map to set {activePinMode === "pickup" ? "Base Hub" : "Destination"}
              </span>
              <button
                type="button"
                onClick={onCancelPinMode}
                className="rounded-md bg-void/50 px-2 py-0.5 text-[10px] font-bold text-foreground hover:bg-void"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              {onStartMapPinPick && (
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onStartMapPinPick("pickup")}
                    title="Click anywhere on the map to set Base Hub"
                    className="rounded-lg border border-line bg-muted/40 px-2.5 py-1.5 font-mono text-[11px] text-mist hover:border-emerald-500 hover:text-emerald-400 transition-all cursor-pointer"
                  >
                    📍 Pin Base
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartMapPinPick("destination")}
                    title="Click anywhere on the map to set Destination Hub"
                    className="rounded-lg border border-line bg-muted/40 px-2.5 py-1.5 font-mono text-[11px] text-mist hover:border-violet-500 hover:text-violet-400 transition-all cursor-pointer"
                  >
                    📍 Pin Dest
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-ember px-3.5 py-1.5 font-display text-xs font-bold text-void hover:bg-foreground hover:text-background transition-all shadow-xs cursor-pointer"
              >
                <span>⚙️</span>
                <span>Change Locations</span>
              </button>
            </>
          )}
        </div>
      </div>

      <HubLocationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onStartMapPinPick={onStartMapPinPick}
      />
    </>
  );
}
