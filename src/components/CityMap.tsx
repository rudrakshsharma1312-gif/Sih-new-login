/// <reference types="google.maps" />
import { useEffect, useRef, useState, useId, useMemo } from "react";
import { ALL_NODES, DEPOT, type HubLocation, type Node } from "@/lib/network";
import { useTheme } from "@/lib/theme";
import { useSolver } from "@/lib/solver";
import { reverseGeocodeLocation } from "@/lib/location-service";
import { HubLocationModal } from "@/components/HubLocationModal";

type Props = {
  routes: number[][];
  ghostRoutes?: number[][];
  className?: string;
  pinMode?: "pickup" | "destination" | null;
  onPinModeChange?: (mode: "pickup" | "destination" | null) => void;
  onOpenHubModal?: () => void;
};

const LIGHT_STYLE = [
  { featureType: "all", elementType: "geometry", stylers: [{ color: "#f4f5f7" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e5e7eb" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
];

const ROUTE_COLORS = ["#ffd358", "#080a0c", "#38bdf8", "#10b981", "#a855f7", "#f59e0b"];

const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#080a0c" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#080a0c" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1f29" }] },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#252c3b" }],
  },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { featureType: "landscape", stylers: [{ color: "#11141a" }] },
];

let loaderPromise: Promise<void> | null = null;
const DEMO_KEY = "AIzaSyDRHBccTbYgRYWL-CuujngqnQldbPJAw4I";

function shouldAttemptGoogleMapsLoad(key?: string): boolean {
  if (!key || typeof key !== "string" || key.trim().length < 10) return false;
  if (typeof window === "undefined") return false;
  return true;
}

function loadMaps(key: string, channel?: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.maps?.Map) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w["gm_auth_failure"] = () => {
      console.warn("Google Maps auth failure. Gracefully switching to Vector Road Graph.");
      window.dispatchEvent(new CustomEvent("gm_auth_failure_event"));
      reject(new Error("Google Maps auth failure"));
    };

    w["__quantaMapsReady"] = () => resolve();

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      v: "weekly",
      callback: "__quantaMapsReady",
      loading: "async",
    });
    if (channel) params.set("channel", channel);

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export function CityMap({
  routes,
  ghostRoutes = [],
  className = "",
  pinMode,
  onPinModeChange,
  onOpenHubModal,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawnRef = useRef<google.maps.Polyline[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mapMode, setMapMode] = useState<"google" | "vector">("google");
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const gradientId = useId();
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const {
    networkConfig,
    activeNodes,
    destNodeIndex,
    setPickupHub,
    setDestinationHub,
    scenario,
    run,
  } = useSolver();

  const [internalPinMode, setInternalPinMode] = useState<"pickup" | "destination" | null>(null);
  const activePinMode = pinMode !== undefined ? pinMode : internalPinMode;

  const [hubModalOpen, setHubModalOpen] = useState(false);
  const [customKeyModalOpen, setCustomKeyModalOpen] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState("");

  const handleSetPinMode = (mode: "pickup" | "destination" | null) => {
    if (onPinModeChange) {
      onPinModeChange(mode);
    } else {
      setInternalPinMode(mode);
    }
  };
  const handleSetPinModeRef = useRef(handleSetPinMode);
  handleSetPinModeRef.current = handleSetPinMode;

  // Keep Google Maps styles in sync with theme changes
  useEffect(() => {
    if (mapRef.current && status === "ready") {
      mapRef.current.setOptions({
        backgroundColor: theme === "light" ? "#f4f4f2" : "#0b0b10",
        styles: theme === "light" ? LIGHT_STYLE : DARK_STYLE,
      });
    }
  }, [theme, status]);

  // Load Google Maps JavaScript API
  useEffect(() => {
    const userCustomKey =
      typeof window !== "undefined"
        ? localStorage.getItem("quanta_custom_gmaps_key") || undefined
        : undefined;

    const envKey = (import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] ||
      import.meta.env["VITE_MAPS_API_KEY"] ||
      DEMO_KEY) as string | undefined;

    const key = userCustomKey || envKey;
    const channel = import.meta.env["VITE_GOOGLE_MAPS_TRACKING_ID"] as string | undefined;

    const handleAuthFail = () => {
      setStatus("error");
      setMapMode("vector");
      if (hostRef.current) {
        hostRef.current.innerHTML = "";
      }
    };
    window.addEventListener("gm_auth_failure_event", handleAuthFail);

    if (!shouldAttemptGoogleMapsLoad(key)) {
      setStatus("error");
      setMapMode("vector");
      return () => {
        window.removeEventListener("gm_auth_failure_event", handleAuthFail);
      };
    }

    setStatus("loading");
    let cancelled = false;
    loadMaps(key!, channel)
      .then(() => {
        if (cancelled || !hostRef.current) return;
        try {
          infoWindowRef.current = new google.maps.InfoWindow();

          mapRef.current = new google.maps.Map(hostRef.current, {
            center: { lat: networkConfig.pickupHub.lat, lng: networkConfig.pickupHub.lng },
            zoom: 11,
            disableDefaultUI: false,
            mapTypeControl: true,
            mapTypeControlOptions: {
              style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
              position: google.maps.ControlPosition.TOP_LEFT,
            },
            zoomControl: true,
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_BOTTOM,
            },
            streetViewControl: false,
            fullscreenControl: true,
            fullscreenControlOptions: {
              position: google.maps.ControlPosition.RIGHT_BOTTOM,
            },
            backgroundColor: themeRef.current === "light" ? "#f4f4f2" : "#0b0b10",
            styles: themeRef.current === "light" ? LIGHT_STYLE : DARK_STYLE,
          });

          setStatus("ready");
          setMapMode("google");

          setTimeout(() => {
            if (mapRef.current) {
              google.maps.event.trigger(mapRef.current, "resize");
              mapRef.current.setCenter({
                lat: networkConfig.pickupHub.lat,
                lng: networkConfig.pickupHub.lng,
              });
            }
          }, 150);
        } catch {
          handleAuthFail();
        }
      })
      .catch(() => {
        handleAuthFail();
      });

    return () => {
      cancelled = true;
      window.removeEventListener("gm_auth_failure_event", handleAuthFail);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to Google Maps click events for Pin Mode (setting pickup or destination)
  useEffect(() => {
    if (!mapRef.current) return;
    const listener = mapRef.current.addListener("click", async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !activePinMode) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      const hub = await reverseGeocodeLocation(lat, lng);
      if (activePinMode === "pickup") {
        setPickupHub(hub);
      } else {
        setDestinationHub(hub);
      }
      handleSetPinModeRef.current(null);
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [activePinMode, setPickupHub, setDestinationHub]);

  // Update Google Maps Markers whenever activeNodes or networkConfig change
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const baseNode = activeNodes[0] ?? DEPOT;
    const isSeparateDest = destNodeIndex !== 0;
    const destNode = isSeparateDest ? activeNodes[destNodeIndex] : null;

    // 1. Base Hub Marker (Emerald)
    const baseMarker = new google.maps.Marker({
      map: mapRef.current,
      position: { lat: baseNode.lat, lng: baseNode.lng },
      title: `🚀 Base Origin: ${baseNode.name}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#10b981",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3.5,
      },
      zIndex: 100,
    });
    markersRef.current.push(baseMarker);

    baseMarker.addListener("click", () => {
      if (!infoWindowRef.current || !mapRef.current) return;
      infoWindowRef.current.setContent(`
        <div style="font-family:sans-serif;padding:6px;min-width:200px;color:#111;">
          <div style="font-size:10px;text-transform:uppercase;color:#10b981;font-weight:700;letter-spacing:0.5px;">🚀 Pick-up / Base Origin</div>
          <div style="font-size:14px;font-weight:700;margin-top:2px;">${baseNode.name}</div>
          <div style="font-size:11px;color:#555;margin-top:4px;">${networkConfig.pickupHub.address || networkConfig.pickupHub.tag || "Fleet Origin"}</div>
          <div style="font-size:11px;color:#777;margin-top:2px;">Coordinates: ${baseNode.lat.toFixed(4)}°N, ${baseNode.lng.toFixed(4)}°E</div>
          <div style="margin-top:6px;padding:3px 6px;background:#ecfdf5;border-radius:4px;font-size:11px;font-weight:600;color:#047857;display:inline-block;">Active Departure Depot</div>
        </div>
      `);
      infoWindowRef.current.open(mapRef.current, baseMarker);
    });

    // 2. Final Destination Marker (Violet) if separate terminus
    if (isSeparateDest && destNode) {
      const destMarker = new google.maps.Marker({
        map: mapRef.current,
        position: { lat: destNode.lat, lng: destNode.lng },
        title: `🏁 Destination: ${destNode.name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#8b5cf6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3.5,
        },
        zIndex: 99,
      });
      markersRef.current.push(destMarker);

      destMarker.addListener("click", () => {
        if (!infoWindowRef.current || !mapRef.current) return;
        infoWindowRef.current.setContent(`
          <div style="font-family:sans-serif;padding:6px;min-width:200px;color:#111;">
            <div style="font-size:10px;text-transform:uppercase;color:#8b5cf6;font-weight:700;letter-spacing:0.5px;">🏁 Final Terminus / Destination</div>
            <div style="font-size:14px;font-weight:700;margin-top:2px;">${destNode.name}</div>
            <div style="font-size:11px;color:#555;margin-top:4px;">${networkConfig.destinationHub.address || networkConfig.destinationHub.tag || "Final Delivery Terminal"}</div>
            <div style="font-size:11px;color:#777;margin-top:2px;">Coordinates: ${destNode.lat.toFixed(4)}°N, ${destNode.lng.toFixed(4)}°E</div>
            <div style="margin-top:6px;padding:3px 6px;background:#f5f3ff;border-radius:4px;font-size:11px;font-weight:600;color:#6d28d9;display:inline-block;">Fleet Terminus Point</div>
          </div>
        `);
        infoWindowRef.current.open(mapRef.current, destMarker);
      });
    }

    // 3. Customer Delivery Stop Markers (Nodes 1..24)
    activeNodes.slice(1, 25).forEach((node) => {
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position: { lat: node.lat, lng: node.lng },
        title: `${node.id}. ${node.name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: "#0b0b10",
          fillOpacity: 0.9,
          strokeColor: "#ffb066",
          strokeWeight: 2,
        },
      });
      markersRef.current.push(marker);

      marker.addListener("click", () => {
        if (!infoWindowRef.current || !mapRef.current) return;
        infoWindowRef.current.setContent(`
          <div style="font-family:sans-serif;padding:6px;min-width:180px;color:#111;">
            <div style="font-size:10px;text-transform:uppercase;color:#ff7a29;font-weight:700;letter-spacing:0.5px;">Delivery Stop #${node.id}</div>
            <div style="font-size:13px;font-weight:700;margin-top:2px;">${node.name}</div>
            <div style="font-size:11px;color:#666;margin-top:4px;">Demand: <strong>${node.demand} kg</strong></div>
            <div style="font-size:11px;color:#666;">Loc: ${node.lat.toFixed(4)}°N, ${node.lng.toFixed(4)}°E</div>
          </div>
        `);
        infoWindowRef.current.open(mapRef.current, marker);
      });
    });
  }, [activeNodes, destNodeIndex, networkConfig, status]);

  // Update Google Maps Polylines if Google Maps is active
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    drawnRef.current.forEach((line) => line.setMap(null));
    drawnRef.current = [];

    const draw = (
      rList: number[][],
      opts: { colors: string[]; weight: number; opacity: number; dashed?: boolean },
    ) => {
      rList.forEach((r, idx) => {
        const path = r.map((nodeIdx) => {
          const n = activeNodes[nodeIdx] ?? activeNodes[0] ?? DEPOT;
          return { lat: n.lat, lng: n.lng };
        });
        const color = opts.colors[idx % opts.colors.length] ?? "#ff7a29";
        const line = new google.maps.Polyline({
          path,
          map: mapRef.current,
          strokeColor: color,
          strokeOpacity: opts.opacity,
          strokeWeight: opts.weight,
        });
        drawnRef.current.push(line);
      });
    };

    draw(ghostRoutes, {
      colors: ["#8b8b9c"],
      weight: 1.5,
      opacity: 0.45,
      dashed: true,
    });
    draw(routes, { colors: ROUTE_COLORS, weight: 3.5, opacity: 0.95 });
  }, [routes, ghostRoutes, activeNodes, status]);

  // Dynamic Geographic Bounding Box for Vector SVG Projection
  const bounds = useMemo(() => {
    let minLat = 12.82,
      maxLat = 13.06,
      minLng = 77.46,
      maxLng = 77.78;
    for (const n of activeNodes) {
      if (n.lat < minLat) minLat = n.lat;
      if (n.lat > maxLat) maxLat = n.lat;
      if (n.lng < minLng) minLng = n.lng;
      if (n.lng > maxLng) maxLng = n.lng;
    }
    const latPad = (maxLat - minLat) * 0.08 || 0.02;
    const lngPad = (maxLng - minLng) * 0.08 || 0.02;
    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad,
    };
  }, [activeNodes]);

  const toSvg = (lat: number, lng: number): [number, number] => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 740 + 30;
    const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 520 + 40;
    return [x, y];
  };

  const fromSvg = (x: number, y: number): [number, number] => {
    const lng = bounds.minLng + ((x - 30) / 740) * (bounds.maxLng - bounds.minLng);
    const lat = bounds.maxLat - ((y - 40) / 520) * (bounds.maxLat - bounds.minLat);
    return [lat, lng];
  };

  // Handle click on Vector SVG when in Pin Mode
  const handleSvgClick = async (e: React.MouseEvent<SVGSVGElement>) => {
    if (!activePinMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 800;
    const svgY = ((e.clientY - rect.top) / rect.height) * 600;

    const [lat, lng] = fromSvg(svgX, svgY);
    const hub = await reverseGeocodeLocation(lat, lng);
    if (activePinMode === "pickup") {
      setPickupHub(hub);
    } else {
      setDestinationHub(hub);
    }
    handleSetPinMode(null);
  };

  return (
    <div className={`relative overflow-hidden rounded-xl bg-void border border-line ${className}`}>
      {/* Map Header Overlay with Mode Switcher & Hub Info */}
      <div className="absolute top-3 right-3 z-30 flex flex-wrap items-center gap-2">
        {/* Pin mode notification banner */}
        {activePinMode && (
          <div className="flex items-center gap-1.5 rounded-lg border border-ember bg-void/90 px-2.5 py-1 font-mono text-[10px] font-bold text-ember backdrop-blur-md shadow-lg animate-pulse">
            <span>
              📍 Click on map to set {activePinMode === "pickup" ? "Base Origin" : "Destination"}
            </span>
            <button
              type="button"
              onClick={() => handleSetPinMode(null)}
              className="ml-1 text-mist hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}

        {/* Change Hubs Shortcut */}
        <button
          type="button"
          onClick={() => (onOpenHubModal ? onOpenHubModal() : setHubModalOpen(true))}
          className="flex items-center gap-1.5 rounded-md border border-line bg-void/85 px-2.5 py-1 font-mono text-[10px] text-foreground hover:border-ember backdrop-blur-md transition shadow cursor-pointer"
          title="Configure Base Origin & Destination Hubs"
        >
          <span>📍</span>
          <span className="font-semibold">{networkConfig.pickupHub.name.split(" ")[0]}</span>
          <span className="text-faint">➔</span>
          <span className="font-semibold">
            {networkConfig.isRoundTrip ? "Base" : networkConfig.destinationHub.name.split(" ")[0]}
          </span>
        </button>

        {status === "ready" && (
          <button
            type="button"
            onClick={() => setMapMode(mapMode === "google" ? "vector" : "google")}
            className="flex items-center gap-1.5 rounded-md border border-line bg-void/85 px-2.5 py-1 font-mono text-[10px] text-mist hover:text-foreground backdrop-blur-md transition shadow cursor-pointer"
            title="Toggle between Google Maps and High-Contrast Vector Graph"
          >
            <span>{mapMode === "google" ? "🗺️ Google Maps" : "⚡ Vector Graph"}</span>
            <span className="text-[9px] text-faint">(Toggle)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setCustomKeyModalOpen(!customKeyModalOpen)}
          className="flex items-center gap-1 rounded-md border border-line bg-void/85 px-2 py-1 font-mono text-[9px] text-mist hover:text-foreground backdrop-blur-md transition shadow cursor-pointer"
          title="Configure Google Maps API Key"
        >
          <span>🔑</span>
          <span>Maps Key</span>
        </button>

        {(scenario.accident || scenario.closure) && (
          <div className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-950/85 px-2.5 py-1 font-mono text-[9px] text-amber-300 backdrop-blur-md shadow">
            <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-semibold">
              🚨 {scenario.accident ? "Accident" : ""}
              {scenario.accident && scenario.closure ? " & " : ""}
              {scenario.closure ? "Closure" : ""}
            </span>
            <button
              type="button"
              onClick={() => run()}
              className="ml-1 rounded border border-amber-500/30 bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-200 hover:bg-amber-500/30 transition cursor-pointer"
              title="Recalculate adaptive bypass routes"
            >
              ⚡ Re-route
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 rounded-md border border-line bg-void/85 px-2.5 py-1 font-mono text-[9px] backdrop-blur-md">
          <span
            className={`size-1.5 rounded-full ${
              status === "ready" && mapMode === "google"
                ? "bg-emerald-400 animate-pulse"
                : "bg-ember"
            }`}
          />
          <span className="text-mist">
            {status === "ready" && mapMode === "google"
              ? "Google Maps Active"
              : "Road Graph Active"}
          </span>
        </div>
      </div>

      {/* Custom Key Configuration Dialog Modal */}
      {customKeyModalOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-xl border border-line bg-obsidian p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🗺️</span>
                <h4 className="font-display text-sm font-bold text-foreground">
                  Google Maps Authorization
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setCustomKeyModalOpen(false)}
                className="text-mist hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-[11px] text-faint">
              To enable live satellite & street tiles, paste a Google Maps JavaScript API key
              authorized for this domain:
            </p>

            <input
              type="text"
              value={customKeyInput}
              onChange={(e) => setCustomKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="mt-2 w-full rounded border border-line bg-void px-3 py-1.5 font-mono text-xs text-foreground focus:border-ember focus:outline-none"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomKeyModalOpen(false)}
                className="rounded border border-line bg-glass px-3 py-1 text-xs text-mist hover:text-foreground"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (customKeyInput.trim().length > 10) {
                    localStorage.setItem("quanta_custom_gmaps_key", customKeyInput.trim());
                    window.location.reload();
                  }
                }}
                className="rounded bg-ember px-3 py-1 text-xs font-semibold text-void hover:bg-foreground transition"
              >
                Apply Key & Reload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps Container */}
      <div
        ref={hostRef}
        className={`absolute inset-0 transition-opacity duration-300 ${
          status === "ready" && mapMode === "google"
            ? "opacity-100 z-10"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* High-Precision Interactive Vector Graph Map */}
      {(status !== "ready" || mapMode === "vector") && (
        <div className="absolute inset-0 z-10 flex flex-col bg-void select-none transition-colors">
          <svg
            viewBox="0 0 800 600"
            className={`size-full ${activePinMode ? "cursor-crosshair" : ""}`}
            preserveAspectRatio="xMidYMid meet"
            onClick={handleSvgClick}
          >
            <defs>
              <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient
                id={`cubeTopEmerald-${gradientId}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient
                id={`cubeTopViolet-${gradientId}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>

            {/* Base Background & Architectural Grid */}
            <rect width="800" height="600" fill="currentColor" className="text-void" />

            {/* City district silhouettes */}
            <g
              className={theme === "light" ? "text-[#e5e7eb]" : "text-[#161a22]"}
              fill="currentColor"
              stroke={theme === "light" ? "#d1d5db" : "#242c38"}
              strokeWidth="0.5"
            >
              <rect x="80" y="60" width="110" height="70" rx="6" />
              <rect x="220" y="75" width="90" height="65" rx="6" />
              <rect x="340" y="50" width="140" height="80" rx="8" />
              <rect x="510" y="70" width="120" height="90" rx="8" />
              <rect x="650" y="90" width="90" height="75" rx="6" />
              <rect x="70" y="160" width="100" height="90" rx="8" />
              <rect x="490" y="190" width="130" height="85" rx="8" />
              <rect x="640" y="200" width="110" height="110" rx="8" />
              <rect x="80" y="280" width="120" height="80" rx="8" />
              <rect x="580" y="340" width="140" height="95" rx="8" />
              <rect x="90" y="390" width="130" height="100" rx="8" />
              <rect x="250" y="470" width="160" height="80" rx="8" />
              <rect x="440" y="460" width="150" height="90" rx="8" />
              <rect x="620" y="470" width="120" height="80" rx="8" />
            </g>

            {/* Clean Road Network Arteries */}
            <g
              stroke={theme === "light" ? "#ffffff" : "#242a35"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              <ellipse cx="420" cy="300" rx="270" ry="190" />
              <line x1="170" y1="120" x2="380" y2="280" />
              <line x1="380" y1="280" x2="680" y2="270" />
              <line x1="380" y1="280" x2="520" y2="480" />
              <line x1="380" y1="280" x2="250" y2="450" />
            </g>

            {/* Ghost Routes (Baseline / Alternate) */}
            {ghostRoutes.map((r, rIdx) => {
              const points = r
                .map((nIdx) => {
                  const node = activeNodes[nIdx] ?? activeNodes[0] ?? DEPOT;
                  const [x, y] = toSvg(node.lat, node.lng);
                  return `${x},${y}`;
                })
                .join(" ");
              return (
                <polyline
                  key={`ghost-${rIdx}`}
                  points={points}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  opacity="0.4"
                />
              );
            })}

            {/* Active Optimized Routes */}
            {routes.map((r, rIdx) => {
              const points = r
                .map((nIdx) => {
                  const node = activeNodes[nIdx] ?? activeNodes[0] ?? DEPOT;
                  const [x, y] = toSvg(node.lat, node.lng);
                  return `${x},${y}`;
                })
                .join(" ");
              const color = ROUTE_COLORS[rIdx % ROUTE_COLORS.length] ?? "#ffd358";
              const isPrimary = rIdx === 0;

              return (
                <g key={`route-${rIdx}`}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke={theme === "light" ? "#080a0c" : "#ffffff"}
                    strokeWidth={isPrimary ? "5.5" : "4"}
                    strokeOpacity={isPrimary ? "0.85" : "0.3"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth={isPrimary ? "4" : "2.5"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* Render Nodes: Base Hub (0), Destination Hub (destNodeIndex), and Customer Stops */}
            {activeNodes.map((node, idx) => {
              const [x, y] = toSvg(node.lat, node.lng);
              const isBase = idx === 0;
              const isDest = idx === destNodeIndex && destNodeIndex !== 0;
              const isHovered = hoveredNode === idx;

              if (isBase) {
                return (
                  <g
                    key={`hub-base-${node.id}`}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer filter drop-shadow-md"
                    onMouseEnter={() => setHoveredNode(idx)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <circle
                      cx="0"
                      cy="0"
                      r="22"
                      fill="#10b981"
                      fillOpacity="0.25"
                      className="animate-pulse"
                    />
                    <polygon
                      points="0,-16 14,-9 0,-2 -14,-9"
                      fill={`url(#cubeTopEmerald-${gradientId})`}
                    />
                    <polygon points="-14,-9 0,-2 0,12 -14,5" fill="#047857" />
                    <polygon points="0,-2 14,-9 14,5 0,12" fill="#059669" />
                    <circle cx="0" cy="-6" r="4.5" fill="#064e3b" />
                    <circle cx="0" cy="-6" r="2" fill="#a7f3d0" />
                    <rect
                      x="18"
                      y="-14"
                      width={node.name.length * 7 + 36}
                      height="20"
                      rx="4"
                      fill="#080a0c"
                    />
                    <text
                      x="24"
                      y="0"
                      fill="#10b981"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      🚀 {node.name.toUpperCase()} (BASE)
                    </text>
                  </g>
                );
              }

              if (isDest) {
                return (
                  <g
                    key={`hub-dest-${node.id}`}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer filter drop-shadow-md"
                    onMouseEnter={() => setHoveredNode(idx)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <circle
                      cx="0"
                      cy="0"
                      r="22"
                      fill="#8b5cf6"
                      fillOpacity="0.25"
                      className="animate-pulse"
                    />
                    <polygon
                      points="0,-16 14,-9 0,-2 -14,-9"
                      fill={`url(#cubeTopViolet-${gradientId})`}
                    />
                    <polygon points="-14,-9 0,-2 0,12 -14,5" fill="#6d28d9" />
                    <polygon points="0,-2 14,-9 14,5 0,12" fill="#7c3aed" />
                    <circle cx="0" cy="-6" r="4.5" fill="#4c1d95" />
                    <circle cx="0" cy="-6" r="2" fill="#ddd6fe" />
                    <rect
                      x="18"
                      y="-14"
                      width={node.name.length * 7 + 36}
                      height="20"
                      rx="4"
                      fill="#080a0c"
                    />
                    <text
                      x="24"
                      y="0"
                      fill="#a78bfa"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      🏁 {node.name.toUpperCase()} (DEST)
                    </text>
                  </g>
                );
              }

              // Customer Delivery Pin Drop
              return (
                <g
                  key={node.id}
                  className="cursor-pointer transition-transform"
                  onMouseEnter={() => setHoveredNode(idx)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {isHovered && (
                    <circle
                      cx={x}
                      cy={y}
                      r="14"
                      fill="#ffd358"
                      fillOpacity="0.3"
                      className="animate-ping"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? "8" : "5.5"}
                    fill={isHovered ? "#ffd358" : "#080a0c"}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="transition-all"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? "3.5" : "2"}
                    fill={isHovered ? "#080a0c" : "#ffd358"}
                  />
                  {(isHovered || idx <= 5) && (
                    <g>
                      <rect
                        x={x + 9}
                        y={y - 8}
                        width={node.name.length * 6 + 12}
                        height="16"
                        rx="4"
                        fill={isHovered ? "#080a0c" : theme === "light" ? "#ffffff" : "#171b23"}
                        stroke={theme === "light" ? "#e5e7eb" : "#2b3240"}
                        strokeWidth="1"
                      />
                      <text
                        x={x + 15}
                        y={y + 4}
                        fill={isHovered ? "#ffd358" : "currentColor"}
                        className="text-foreground font-semibold"
                        fontSize="9"
                        fontFamily="sans-serif"
                      >
                        {node.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Map Footer status overlay */}
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-2 rounded border border-line bg-void/80 px-2.5 py-1 font-mono text-[9px] text-mist">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Base: {networkConfig.pickupHub.name}</span>
            <span className="text-faint">➔</span>
            <span>
              Dest:{" "}
              {networkConfig.isRoundTrip ? "Return to Base" : networkConfig.destinationHub.name}
            </span>
            <span className="text-faint">|</span>
            <span className="text-ember">
              {routes.length} Active Vehicle Route{routes.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Decorative sheen overlay */}
      <span className="sheen pointer-events-none absolute inset-0 z-20" />

      {/* Internal modal fallback if trigger used */}
      <HubLocationModal
        isOpen={hubModalOpen}
        onClose={() => setHubModalOpen(false)}
        onStartMapPinPick={(target) => handleSetPinMode(target)}
      />
    </div>
  );
}
