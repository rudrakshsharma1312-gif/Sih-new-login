import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { optimize, type AlgorithmId, type Params, type Run } from "@/lib/optimizer";
import type { Scenario } from "@/lib/network";

export const ALGORITHMS: AlgorithmId[] = ["qpso", "ga", "aco", "sa"];

export const DEFAULT_PARAMS: Params = {
  swarm: 30,
  iterations: 120,
  vehicles: 4,
  weights: { time: 0.4, distance: 0.3, congestion: 0.2, emissions: 0.1 },
};

type Ctx = {
  params: Params;
  setParams: (p: Params) => void;
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
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
  const [runs, setRuns] = useState<Partial<Record<AlgorithmId, Run>>>({});
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [clock, setClock] = useState("--:--:--");
  const frame = useRef<number>(0);
  const latest = useRef({ params, scenario });
  latest.current = { params, scenario };

  const run = () => {
    setRunning(true);
    setProgress(0);
    const next: Partial<Record<AlgorithmId, Run>> = {};
    for (const id of ALGORITHMS)
      next[id] = optimize(id, latest.current.params, latest.current.scenario);
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

  useEffect(() => {
    run();
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  if (!ctx) throw new Error("useSolver must be used inside SolverProvider");
  return ctx;
}
