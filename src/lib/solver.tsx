import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { optimize, type AlgorithmId, type Params, type Run } from "@/lib/optimizer";
import {
  DEFAULT_NETWORK_CONFIG,
  getActiveNodes,
  getDestNodeIndex,
  type HubLocation,
  type NetworkConfig,
  type Node,
  type Scenario,
} from "@/lib/network";

export const ALGORITHMS: AlgorithmId[] = ["qpso", "ga", "aco", "qso"];

export const DEFAULT_PARAMS: Params = {
  swarm: 30,
  iterations: 120,
  vehicles: 4,
  weights: { time: 0.4, distance: 0.3, congestion: 0.2, emissions: 0.1 },
};

const STORAGE_KEY_NETWORK_CONFIG = "quanta_network_config";

function getStoredNetworkConfig(): NetworkConfig {
  if (typeof window === "undefined") return DEFAULT_NETWORK_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NETWORK_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.pickupHub?.lat && parsed?.destinationHub?.lat) {
        return parsed as NetworkConfig;
      }
    }
  } catch {
    // Fallback to default config
  }
  return DEFAULT_NETWORK_CONFIG;
}

type Ctx = {
  params: Params;
  setParams: (p: Params) => void;
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  networkConfig: NetworkConfig;
  setNetworkConfig: (cfg: NetworkConfig) => void;
  setPickupHub: (hub: HubLocation) => void;
  setDestinationHub: (hub: HubLocation) => void;
  toggleRoundTrip: () => void;
  resetHubsToDefault: () => void;
  activeNodes: Node[];
  destNodeIndex: number;
  runs: Partial<Record<AlgorithmId, Run>>;
  progress: number;
  running: boolean;
  run: () => void;
  clock: string;
};

const SolverContext = createContext<Ctx | null>(null);

export function SolverProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [scenario, setScenario] = useState<Scenario>({ accident: false, closure: false });
  const [networkConfig, setNetworkConfigState] = useState<NetworkConfig>(getStoredNetworkConfig);
  const [runs, setRuns] = useState<Partial<Record<AlgorithmId, Run>>>({});
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [clock, setClock] = useState("--:--:--");
  const frame = useRef<number>(0);
  const latest = useRef({ params, scenario, networkConfig });
  latest.current = { params, scenario, networkConfig };

  const activeNodes = useMemo(() => getActiveNodes(networkConfig), [networkConfig]);
  const destNodeIndex = useMemo(() => getDestNodeIndex(networkConfig), [networkConfig]);

  const setNetworkConfig = (cfg: NetworkConfig) => {
    setNetworkConfigState(cfg);
    try {
      localStorage.setItem(STORAGE_KEY_NETWORK_CONFIG, JSON.stringify(cfg));
    } catch {
      // storage quota or private browsing
    }
  };

  const setPickupHub = (hub: HubLocation) => {
    setNetworkConfig({
      ...latest.current.networkConfig,
      pickupHub: hub,
      // If round trip, sync destination as well
      destinationHub: latest.current.networkConfig.isRoundTrip
        ? hub
        : latest.current.networkConfig.destinationHub,
    });
  };

  const setDestinationHub = (hub: HubLocation) => {
    const isSameAsPickup =
      hub.id === latest.current.networkConfig.pickupHub.id ||
      (Math.abs(hub.lat - latest.current.networkConfig.pickupHub.lat) < 1e-4 &&
        Math.abs(hub.lng - latest.current.networkConfig.pickupHub.lng) < 1e-4);

    setNetworkConfig({
      ...latest.current.networkConfig,
      destinationHub: hub,
      isRoundTrip: isSameAsPickup,
    });
  };

  const toggleRoundTrip = () => {
    const current = latest.current.networkConfig;
    const willBeRoundTrip = !current.isRoundTrip;
    setNetworkConfig({
      ...current,
      isRoundTrip: willBeRoundTrip,
      destinationHub: willBeRoundTrip ? current.pickupHub : current.destinationHub,
    });
  };

  const resetHubsToDefault = () => {
    setNetworkConfig(DEFAULT_NETWORK_CONFIG);
  };

  const run = () => {
    setRunning(true);
    setProgress(0);
    const currentConfig = latest.current.networkConfig;
    const next: Partial<Record<AlgorithmId, Run>> = {};

    for (const id of ALGORITHMS) {
      next[id] = optimize(id, latest.current.params, latest.current.scenario, 26137, currentConfig);
    }
    setRuns(next);

    const start = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / 1400);
      setProgress(p);
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else setRunning(false);
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);
  };

  // Re-run solver whenever networkConfig, params, or scenario change
  useEffect(() => {
    run();
    return () => cancelAnimationFrame(frame.current);
  }, [networkConfig]);

  useEffect(() => {
    const t = setInterval(() => {
      setClock(
        new Date().toLocaleTimeString("en-IN", {
          hour12: false,
          timeZone: "Asia/Kolkata",
        }),
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <SolverContext.Provider
      value={{
        params,
        setParams,
        scenario,
        setScenario,
        networkConfig,
        setNetworkConfig,
        setPickupHub,
        setDestinationHub,
        toggleRoundTrip,
        resetHubsToDefault,
        activeNodes,
        destNodeIndex,
        runs,
        progress,
        running,
        run,
        clock,
      }}
    >
      {children}
    </SolverContext.Provider>
  );
}

export function useSolver(): Ctx {
  const ctx = useContext(SolverContext);
  if (!ctx) throw new Error("useSolver must be used within a SolverProvider");
  return ctx;
}
