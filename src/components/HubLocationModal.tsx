import { useState, useEffect } from "react";
import { type HubLocation, PRESET_HUBS, haversine, type NetworkConfig } from "@/lib/network";
import {
  searchBengaluruLocations,
  reverseGeocodeLocation,
  EXTENDED_BENGALURU_HUBS,
} from "@/lib/location-service";
import { useSolver } from "@/lib/solver";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onStartMapPinPick?: (target: "pickup" | "destination") => void;
};

export function HubLocationModal({ isOpen, onClose, onStartMapPinPick }: Props) {
  const { networkConfig, setNetworkConfig } = useSolver();

  const [activeTab, setActiveTab] = useState<"pickup" | "destination">("pickup");
  const [draftConfig, setDraftConfig] = useState<NetworkConfig>(networkConfig);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HubLocation[]>(PRESET_HUBS);
  const [searching, setSearching] = useState(false);

  // Manual coordinate inputs
  const [customLat, setCustomLat] = useState("");
  const [customLng, setCustomLng] = useState("");
  const [customName, setCustomName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDraftConfig(networkConfig);
      setSearchQuery("");
      setSearchResults(PRESET_HUBS);
      const active =
        activeTab === "pickup" ? networkConfig.pickupHub : networkConfig.destinationHub;
      setCustomLat(active.lat.toFixed(4));
      setCustomLng(active.lng.toFixed(4));
      setCustomName(active.name);
    }
  }, [isOpen, networkConfig, activeTab]);

  // Handle live search
  useEffect(() => {
    let cancelled = false;
    if (!searchQuery.trim()) {
      setSearchResults(PRESET_HUBS);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchBengaluruLocations(searchQuery);
        if (!cancelled) {
          setSearchResults(results);
          setSearching(false);
        }
      } catch {
        if (!cancelled) {
          setSearchResults(EXTENDED_BENGALURU_HUBS);
          setSearching(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  const currentSelection =
    activeTab === "pickup" ? draftConfig.pickupHub : draftConfig.destinationHub;

  const handleSelectPreset = (hub: HubLocation) => {
    if (activeTab === "pickup") {
      setDraftConfig((prev) => ({
        ...prev,
        pickupHub: hub,
        destinationHub: prev.isRoundTrip ? hub : prev.destinationHub,
      }));
    } else {
      setDraftConfig((prev) => ({
        ...prev,
        destinationHub: hub,
        isRoundTrip: hub.id === prev.pickupHub.id,
      }));
    }
    setCustomLat(hub.lat.toFixed(4));
    setCustomLng(hub.lng.toFixed(4));
    setCustomName(hub.name);
  };

  const handleApplyCustomCoordinates = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (isNaN(lat) || isNaN(lng) || lat < 12.0 || lat > 14.0 || lng < 76.5 || lng > 78.5) {
      alert(
        "Please enter valid coordinates within the greater Bengaluru area (Lat ~12.7-13.4, Lng ~77.3-77.9)",
      );
      return;
    }

    const customHub: HubLocation = {
      id: `custom_${Date.now()}`,
      name: customName.trim() || `Custom Hub (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      lat,
      lng,
      tag: "Manager Custom Location",
      address: `Custom Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
      isCustom: true,
    };

    handleSelectPreset(customHub);
  };

  const handleToggleRoundTrip = () => {
    setDraftConfig((prev) => {
      const willBeRound = !prev.isRoundTrip;
      return {
        ...prev,
        isRoundTrip: willBeRound,
        destinationHub: willBeRound ? prev.pickupHub : prev.destinationHub,
      };
    });
  };

  const handleSaveAndApply = () => {
    setNetworkConfig(draftConfig);
    onClose();
  };

  // Direct distance between Base and Destination
  const hubSpanKm = haversine(
    {
      id: "a",
      name: "a",
      lat: draftConfig.pickupHub.lat,
      lng: draftConfig.pickupHub.lng,
      demand: 0,
    },
    {
      id: "b",
      name: "b",
      lat: draftConfig.destinationHub.lat,
      lng: draftConfig.destinationHub.lng,
      demand: 0,
    },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-ember/15 text-lg text-ember">
              📍
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                Base & Destination Route Configuration
              </h2>
              <p className="font-mono text-xs text-faint">
                Define fleet origin depot and delivery terminal points
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-faint hover:bg-muted hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection: Pickup Hub vs Destination Hub */}
        <div className="flex border-b border-line bg-card px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab("pickup")}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "pickup"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-mist hover:text-foreground"
            }`}
          >
            <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] text-emerald-400 font-bold">
              1
            </span>
            <span>🚀 Pick-up / Base Hub (Origin)</span>
          </button>

          <button
            onClick={() => setActiveTab("destination")}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "destination"
                ? "border-violet-500 text-violet-400"
                : "border-transparent text-mist hover:text-foreground"
            }`}
          >
            <span className="flex size-4 items-center justify-center rounded-full bg-violet-500/20 text-[10px] text-violet-400 font-bold">
              2
            </span>
            <span>🏁 Destination Hub (Terminus)</span>
            {draftConfig.isRoundTrip && (
              <span className="rounded-full bg-line px-2 py-0.5 font-mono text-[9px] text-faint">
                Round-Trip
              </span>
            )}
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6 space-y-6">
          {/* Active selection summary card */}
          <div
            className={`rounded-xl border p-4 ${
              activeTab === "pickup"
                ? "border-emerald-500/30 bg-emerald-950/10"
                : "border-violet-500/30 bg-violet-950/10"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span
                  className={`inline-block rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    activeTab === "pickup"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-violet-500/20 text-violet-400"
                  }`}
                >
                  {activeTab === "pickup" ? "Active Base Hub" : "Active Destination"}
                </span>
                <h3 className="mt-1 font-display text-base font-bold text-foreground">
                  {currentSelection.name}
                </h3>
                <p className="font-mono text-xs text-mist">
                  {currentSelection.address || currentSelection.tag || "Bengaluru Network Node"}
                </p>
              </div>

              <div className="text-right font-mono text-xs">
                <p className="text-faint">Coordinates:</p>
                <p className="font-semibold text-foreground">
                  {currentSelection.lat.toFixed(4)}°N, {currentSelection.lng.toFixed(4)}°E
                </p>
              </div>
            </div>

            {activeTab === "destination" && (
              <div className="mt-4 flex items-center justify-between border-t border-line/50 pt-3">
                <span className="text-xs text-mist">Circuit Mode:</span>
                <button
                  type="button"
                  onClick={handleToggleRoundTrip}
                  className={`flex items-center gap-2 rounded-full px-3 py-1 font-mono text-xs font-semibold transition-all ${
                    draftConfig.isRoundTrip
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                  }`}
                >
                  <span>
                    {draftConfig.isRoundTrip ? "🔄 Return to Base Depot" : "➔ Separate Destination"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Search bar with Google Maps API connection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-medium text-mist">
                Search Location, Landmark or Address:
              </label>
              <span className="font-mono text-[10px] text-faint">
                {searching
                  ? "Searching Google Places & Geocoder..."
                  : "Google Maps Geocoding connected"}
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Kempegowda Airport, Nelamangala Logistics, Whitefield, Electronic City..."
                className="w-full rounded-xl border border-line bg-muted/30 px-4 py-2.5 pl-10 text-xs text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
              />
              <span className="absolute left-3.5 top-3 text-faint">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-faint hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick select presets grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs font-medium text-mist">
                Recommended Logistics & Transport Hubs:
              </p>
              {onStartMapPinPick && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartMapPinPick(activeTab);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ember/40 bg-ember/10 px-2.5 py-1 font-mono text-[11px] font-bold text-ember hover:bg-ember/20 transition-all cursor-pointer"
                >
                  <span>📍 Pick directly on Map</span>
                </button>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 max-h-48 overflow-y-auto pr-1">
              {searchResults.map((hub) => {
                const isSelected = currentSelection.id === hub.id;
                return (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => handleSelectPreset(hub)}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-ember bg-ember/10 ring-1 ring-ember shadow-xs"
                        : "border-line bg-muted/20 hover:border-line hover:bg-muted/40"
                    }`}
                  >
                    <span className="font-display text-xs font-bold text-foreground line-clamp-1">
                      {hub.name}
                    </span>
                    <span className="mt-0.5 font-mono text-[10px] text-faint line-clamp-1">
                      {hub.tag || hub.address}
                    </span>
                    <span className="mt-1 font-mono text-[9px] text-mist">
                      {hub.lat.toFixed(3)}°N, {hub.lng.toFixed(3)}°E
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Coordinate Override */}
          <div className="rounded-xl border border-line bg-muted/10 p-4 space-y-3">
            <p className="font-mono text-xs font-semibold text-mist">
              Custom Geographic Coordinates (Precise Lat / Lng):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[10px] text-faint mb-1">Hub Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. West Warehouse"
                  className="w-full rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-foreground focus:border-ember focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-faint mb-1">Latitude (°N)</label>
                <input
                  type="text"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  placeholder="13.0287"
                  className="w-full rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-mono text-foreground focus:border-ember focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-faint mb-1">
                  Longitude (°E)
                </label>
                <input
                  type="text"
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                  placeholder="77.5199"
                  className="w-full rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-mono text-foreground focus:border-ember focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyCustomCoordinates}
              className="rounded-lg bg-line px-3 py-1.5 font-mono text-xs font-semibold text-foreground hover:bg-ember hover:text-void transition-all cursor-pointer"
            >
              Set Custom Coordinates
            </button>
          </div>
        </div>

        {/* Footer with network metrics & save */}
        <div className="flex flex-wrap items-center justify-between border-t border-line bg-muted/40 px-6 py-4 gap-4">
          <div className="font-mono text-xs text-mist">
            <span>Direct Hub Span: </span>
            <strong className="text-foreground">{hubSpanKm.toFixed(1)} km</strong>
            <span className="mx-2 text-faint">·</span>
            <span>Mode: </span>
            <strong className={draftConfig.isRoundTrip ? "text-emerald-400" : "text-violet-400"}>
              {draftConfig.isRoundTrip ? "Closed Circuit" : "Open Freight Corridor"}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-4 py-2 font-mono text-xs text-mist hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="rounded-full bg-ember px-5 py-2 font-display text-xs font-bold text-void hover:bg-foreground hover:text-background transition-all shadow-md cursor-pointer"
            >
              Apply & Re-optimize Fleet ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
