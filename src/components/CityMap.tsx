/// <reference types="google.maps" />
import { useEffect, useRef, useState, useId } from "react";
import { ALL_NODES, DEPOT } from "@/lib/network";
import { useTheme } from "@/lib/theme";

type Props = {
  routes: number[][];
  ghostRoutes?: number[][];
  className?: string;
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
  if (!key) return false;
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;

  // Cloud Run and container preview environments (*.run.app, googleusercontent.com)
  // are rejected by Google Maps referrer rules unless the key owner has explicitly added
  // this exact domain to their allowed HTTP referrers in Google Cloud Console.
  // Never load Google Maps automatically on *.run.app without a user-configured key.
  if (
    hostname.endsWith(".run.app") ||
    hostname.includes("run.app") ||
    hostname.includes("googleusercontent.com")
  ) {
    try {
      const userStoredKey = localStorage.getItem("quanta_custom_gmaps_key");
      return Boolean(userStoredKey && userStoredKey.trim().length > 15);
    } catch {
      return false;
    }
  }

  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal");

  return isLocal;
}

function loadMaps(key: string, channel?: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as unknown as Record<string, unknown>;
  if ((w["google"] as { maps?: unknown } | undefined)?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    w["gm_authFailure"] = () => {
      console.warn("Google Maps auth failure. Gracefully switching to Vector Road Graph.");
      window.dispatchEvent(new CustomEvent("gm_auth_failure_event"));
      reject(new Error("Google Maps auth failure"));
    };

    w["__quantaMapsReady"] = () => resolve();
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      loading: "async",
      callback: "__quantaMapsReady",
      libraries: "places,geometry",
      v: "weekly",
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

// Coordinate projection for schematic fallback
const MIN_LAT = 12.82;
const MAX_LAT = 13.06;
const MIN_LNG = 77.46;
const MAX_LNG = 77.78;

function toSvgCoord(lat: number, lng: number): [number, number] {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 740 + 30;
  const y = (1 - (lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 520 + 40;
  return [x, y];
}

export function CityMap({ routes, ghostRoutes = [], className = "" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawnRef = useRef<google.maps.Polyline[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("error");
  const [mapMode, setMapMode] = useState<"google" | "vector">("vector");
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const gradientId = useId();
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const [customKeyModalOpen, setCustomKeyModalOpen] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState("");

  useEffect(() => {
    const userCustomKey =
      typeof window !== "undefined"
        ? localStorage.getItem("quanta_custom_gmaps_key") || undefined
        : undefined;

    const envKey = (import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] ||
      import.meta.env["VITE_MAPS_API_KEY"]) as string | undefined;

    const key = userCustomKey || envKey;
    const channel = import.meta.env["VITE_GOOGLE_MAPS_TRACKING_ID"] as string | undefined;

    // Fail-safe auth failure handler
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
          mapRef.current = new google.maps.Map(hostRef.current, {
            center: { lat: 12.9716, lng: 77.6146 },
            zoom: 11,
            disableDefaultUI: true,
            zoomControl: true,
            backgroundColor: themeRef.current === "light" ? "#f4f4f2" : "#0b0b10",
            styles: themeRef.current === "light" ? LIGHT_STYLE : DARK_STYLE,
          });

          new google.maps.Marker({
            map: mapRef.current,
            position: { lat: DEPOT.lat, lng: DEPOT.lng },
            title: DEPOT.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#ffffff",
              fillOpacity: 1,
              strokeColor: "#ff7a29",
              strokeWeight: 3,
            },
          });

          ALL_NODES.slice(1).forEach((node) => {
            new google.maps.Marker({
              map: mapRef.current,
              position: { lat: node.lat, lng: node.lng },
              title: node.name,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                fillColor: "#0b0b10",
                fillOpacity: 0.9,
                strokeColor: "#ffb066",
                strokeWeight: 1.5,
              },
            });
          });

          setStatus("ready");

          // Trigger map resize so tiles render sharply
          setTimeout(() => {
            if (mapRef.current) {
              google.maps.event.trigger(mapRef.current, "resize");
              mapRef.current.setCenter({ lat: 12.9716, lng: 77.6146 });
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
  }, []);

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
          const n = ALL_NODES[nodeIdx] ?? DEPOT;
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
  }, [routes, ghostRoutes, status]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-void border border-line ${className}`}>
      {/* Map Header Overlay with Mode Switcher & Status */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
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

            <p className="mt-3 text-xs leading-relaxed text-mist">
              Google Maps API requires an authorized HTTP referrer for this site domain:
            </p>
            <div className="mt-1.5 rounded bg-void p-2 font-mono text-[10px] text-ember break-all select-all border border-line">
              {typeof window !== "undefined" ? window.location.origin : "https://*.run.app"}/*
            </div>

            <p className="mt-3 text-[11px] text-faint">
              To enable live satellite & street tiles, paste a Google Maps JavaScript API key
              authorized for the domain above:
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

      {/* High-Precision Interactive Vector Graph Map (Move. 3D Architectural City aesthetic) */}
      {(status !== "ready" || mapMode === "vector") && (
        <div className="absolute inset-0 z-10 flex flex-col bg-void select-none transition-colors">
          <svg viewBox="0 0 800 600" className="size-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id={`cubeTop-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffe685" />
                <stop offset="100%" stopColor="#ffd358" />
              </linearGradient>
              <linearGradient id={`cubeLeft-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e6bc3c" />
                <stop offset="100%" stopColor="#cfa528" />
              </linearGradient>
              <linearGradient id={`cubeRight-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd358" />
                <stop offset="100%" stopColor="#dfb22d" />
              </linearGradient>
            </defs>

            {/* Base Background & Architectural Grid */}
            <rect width="800" height="600" fill="currentColor" className="text-void" />

            {/* Isometric architectural building blocks background */}
            <g
              className={theme === "light" ? "text-[#e5e7eb]" : "text-[#161a22]"}
              fill="currentColor"
              stroke={theme === "light" ? "#d1d5db" : "#242c38"}
              strokeWidth="0.5"
            >
              {/* City district silhouettes */}
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
            <g
              stroke={theme === "light" ? "#e2e4e8" : "#1b2029"}
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="4,6"
            >
              <ellipse cx="420" cy="300" rx="270" ry="190" />
              <line x1="170" y1="120" x2="380" y2="280" />
              <line x1="380" y1="280" x2="680" y2="270" />
              <line x1="380" y1="280" x2="520" y2="480" />
              <line x1="380" y1="280" x2="250" y2="450" />
            </g>

            {/* Ghost Routes (Baseline GA / comparison) */}
            {ghostRoutes.map((r, rIdx) => {
              const points = r
                .map((nIdx) => {
                  const node = ALL_NODES[nIdx] ?? DEPOT;
                  const [x, y] = toSvgCoord(node.lat, node.lng);
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

            {/* Active Optimized Routes - Move. bold canary yellow accent */}
            {routes.map((r, rIdx) => {
              const points = r
                .map((nIdx) => {
                  const node = ALL_NODES[nIdx] ?? DEPOT;
                  const [x, y] = toSvgCoord(node.lat, node.lng);
                  return `${x},${y}`;
                })
                .join(" ");
              const color = ROUTE_COLORS[rIdx % ROUTE_COLORS.length] ?? "#ffd358";
              const isPrimary = rIdx === 0;

              return (
                <g key={`route-${rIdx}`}>
                  {/* Underlay casing */}
                  <polyline
                    points={points}
                    fill="none"
                    stroke={theme === "light" ? "#080a0c" : "#ffffff"}
                    strokeWidth={isPrimary ? "5.5" : "4"}
                    strokeOpacity={isPrimary ? "0.85" : "0.3"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Vibrant inner route */}
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

            {/* Node Markers - Move. style 3D Cube Depot and Circular Location Pins */}
            {ALL_NODES.map((node, idx) => {
              const [x, y] = toSvgCoord(node.lat, node.lng);
              const isDepot = idx === 0;
              const isHovered = hoveredNode === idx;

              return (
                <g
                  key={node.id}
                  className="cursor-pointer transition-transform"
                  onMouseEnter={() => setHoveredNode(idx)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {isDepot ? (
                    // Move. 3D Yellow Building Cube Marker for Peenya Base Depot
                    <g transform={`translate(${x}, ${y})`} className="filter drop-shadow-md">
                      {/* Pulse aura */}
                      <circle
                        cx="0"
                        cy="0"
                        r="20"
                        fill="#ffd358"
                        fillOpacity="0.25"
                        className="animate-pulse"
                      />
                      {/* 3D Isometric Cube */}
                      {/* Top face */}
                      <polygon
                        points="0,-16 14,-9 0,-2 -14,-9"
                        fill={`url(#cubeTop-${gradientId})`}
                      />
                      {/* Left face */}
                      <polygon
                        points="-14,-9 0,-2 0,12 -14,5"
                        fill={`url(#cubeLeft-${gradientId})`}
                      />
                      {/* Right face */}
                      <polygon
                        points="0,-2 14,-9 14,5 0,12"
                        fill={`url(#cubeRight-${gradientId})`}
                      />
                      {/* Black pin badge on cube */}
                      <circle cx="0" cy="-6" r="4.5" fill="#080a0c" />
                      <circle cx="0" cy="-6" r="2" fill="#ffd358" />
                      {/* Depot label */}
                      <rect x="18" y="-14" width="130" height="20" rx="4" fill="#080a0c" />
                      <text
                        x="24"
                        y="0"
                        fill="#ffd358"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        PEENYA DEPOT ⌂
                      </text>
                    </g>
                  ) : (
                    // Move. styled Delivery Pin Drop
                    <g>
                      {/* Pin aura on hover */}
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
                      {/* Dark pin base */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? "8" : "5.5"}
                        fill={isHovered ? "#ffd358" : "#080a0c"}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="transition-all"
                      />
                      {/* Inner dot */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? "3.5" : "2"}
                        fill={isHovered ? "#080a0c" : "#ffd358"}
                      />
                      {/* Node name badge */}
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
                  )}
                </g>
              );
            })}
          </svg>

          {/* Map Footer status overlay */}
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded border border-line bg-void/80 px-2.5 py-1 font-mono text-[9px] text-mist">
            <span className="size-1.5 rounded-full bg-ember animate-pulse" />
            <span>Bengaluru Inner City Road Graph (25 Nodes · Peenya Depot)</span>
            <span className="text-faint">|</span>
            <span className="text-ember">
              {routes.length} Active Vehicle Route{routes.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Decorative sheen overlay */}
      <span className="sheen pointer-events-none absolute inset-0 z-20" />
    </div>
  );
}
