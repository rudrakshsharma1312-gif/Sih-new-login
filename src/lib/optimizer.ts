import {
  ALL_NODES,
  STOPS,
  buildMatrices,
  getActiveNodes,
  getDestNodeIndex,
  type Matrices,
  type Scenario,
  type NetworkConfig,
  type Node,
} from "./network";
import { runQPSO, type QPSODiagnostics, type QPSOConfig } from "./qpso";
import { runGA, type GAConfig } from "./ga";
import { runACO, type ACOConfig } from "./aco";
import { runQSO, type QSOConfig } from "./qso";

export type AlgorithmId = "qpso" | "ga" | "aco" | "qso" | "sa";

export type Weights = {
  time: number;
  distance: number;
  congestion: number;
  emissions: number;
};

export type Params = {
  swarm: number;
  iterations: number;
  vehicles: number;
  weights: Weights;
};

export type Solution = {
  /** vehicle routes as node indices into ALL_NODES, depot-first and depot-last */
  routes: number[][];
  distanceKm: number;
  timeMin: number;
  congestionIdx: number;
  co2Kg: number;
  fitness: number;
};

export type Run = {
  algorithm: AlgorithmId;
  best: Solution;
  history: number[];
  convergedAt: number;
  runtimeMs: number;
  diagnostics?: QPSODiagnostics;
};

const AVG_SPEED = 26; // km/h free flow
const CO2_PER_KM = 0.19; // kg

function mulberry(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function split(order: number[], vehicles: number): number[][] {
  const per = Math.ceil(order.length / vehicles);
  const routes: number[][] = [];
  for (let v = 0; v < vehicles; v++) {
    const slice = order.slice(v * per, (v + 1) * per);
    if (slice.length) routes.push([0, ...slice, 0]);
  }
  return routes;
}

function evaluate(order: number[], m: Matrices, p: Params): Solution {
  const routes = split(order, p.vehicles);
  let distanceKm = 0;
  let timeMin = 0;
  let congestionSum = 0;
  let edges = 0;

  for (const route of routes) {
    for (let k = 0; k < route.length - 1; k++) {
      const i = route[k]!;
      const j = route[k + 1]!;
      const d = m.dist[i]![j]!;
      const c = m.congestion[i]![j]!;
      distanceKm += d;
      timeMin += (d / AVG_SPEED) * 60 * c;
      congestionSum += c;
      edges++;
    }
    timeMin += (route.length - 2) * 3; // service time per stop
  }

  const congestionIdx = edges ? (congestionSum / edges - 1) / 1.6 : 0;
  const co2Kg = distanceKm * CO2_PER_KM * (1 + congestionIdx * 0.35);

  const w = p.weights;
  const total = w.time + w.distance + w.congestion + w.emissions || 1;
  const fitness =
    ((w.time / total) * (timeMin / 240) +
      (w.distance / total) * (distanceKm / 320) +
      (w.congestion / total) * congestionIdx +
      (w.emissions / total) * (co2Kg / 70)) *
    100;

  return {
    routes,
    distanceKm,
    timeMin: timeMin / Math.max(routes.length, 1),
    congestionIdx,
    co2Kg,
    fitness,
  };
}

type Profile = {
  /** how aggressively a candidate moves toward the global best */
  attraction: number;
  /** local perturbation strength */
  mutation: number;
  /** probability of accepting a worse candidate (exploration) */
  tolerance: number;
  /** local 2-opt refinement passes per candidate per iteration */
  refine: number;
  speed: number;
};

const PROFILES: Record<AlgorithmId, Profile> = {
  // Quantum position update samples a wider space -> strong attraction + healthy exploration
  qpso: { attraction: 0.34, mutation: 0.22, tolerance: 0.1, refine: 12, speed: 1 },
  ga: { attraction: 0.2, mutation: 0.18, tolerance: 0.04, refine: 1, speed: 2.3 },
  aco: { attraction: 0.16, mutation: 0.12, tolerance: 0.02, refine: 0, speed: 2.8 },
  sa: { attraction: 0.06, mutation: 0.3, tolerance: 0.18, refine: 0, speed: 3.4 },
};

function perturb(order: number[], strength: number, rnd: () => number): number[] {
  const next = order.slice();
  const moves = 1 + Math.floor(strength * 2);
  for (let m = 0; m < moves; m++) {
    const a = Math.floor(rnd() * next.length);
    const b = Math.floor(rnd() * next.length);
    if (rnd() < 0.5) {
      const tmp = next[a]!;
      next[a] = next[b]!;
      next[b] = tmp;
    } else {
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const seg = next.slice(lo, hi + 1).reverse();
      next.splice(lo, seg.length, ...seg);
    }
  }
  return next;
}

/** Move a candidate toward the global best by copying a contiguous block of its ordering. */
function attract(order: number[], best: number[], rnd: () => number): number[] {
  const len = order.length;
  const size = Math.max(2, Math.floor(len * (0.2 + rnd() * 0.35)));
  const start = Math.floor(rnd() * (len - size));
  const block = best.slice(start, start + size);
  const rest = order.filter((v) => !block.includes(v));
  return [...rest.slice(0, start), ...block, ...rest.slice(start)];
}

export function optimize(
  algorithm: AlgorithmId,
  params: Params,
  scenario: Scenario,
  seed = 26137,
  networkConfig?: NetworkConfig,
): Run {
  const nodes = getActiveNodes(networkConfig);
  const destIndex = getDestNodeIndex(networkConfig);
  const m = buildMatrices(scenario, nodes);

  // 1. Quantum-behaved Particle Swarm Optimization (QPSO)
  if (algorithm === "qpso") {
    return runQPSO(params, m, seed, {}, destIndex);
  }

  // 2. Canonical Genetic Algorithm (GA)
  if (algorithm === "ga") {
    return runGA(params, m, seed, {}, destIndex);
  }

  // 3. Max-Min Ant Colony Optimization (ACO)
  if (algorithm === "aco") {
    return runACO(params, m, seed, {}, destIndex);
  }

  // 4. Quantum Swarm Optimization (QSO) - in place of SA
  if (algorithm === "qso" || algorithm === "sa") {
    const run = runQSO(params, m, seed, {}, destIndex);
    return {
      ...run,
      algorithm, // preserves requested id if requested as "sa"
    };
  }

  // Fallback to QPSO
  return runQPSO(params, m, seed, {}, destIndex);
}

export const ALGORITHM_META: Record<AlgorithmId, { label: string; full: string; color: string }> = {
  qpso: { label: "QPSO", full: "Quantum Particle Swarm", color: "var(--ember)" },
  ga: { label: "GA", full: "Genetic Algorithm", color: "var(--amber)" },
  aco: { label: "ACO", full: "Ant Colony Optimization", color: "var(--azure)" },
  qso: { label: "QSO", full: "Quantum Swarm Optimization", color: "var(--violet)" },
  sa: { label: "QSO", full: "Quantum Swarm Optimization (ex-SA)", color: "var(--violet)" },
};

export function routeLabel(route: number[], customNodes?: Node[]): string {
  const list = customNodes ?? ALL_NODES;
  return route
    .slice(1, -1)
    .map((i) => list[i]?.name ?? `Stop #${i}`)
    .join(" → ");
}

export { runQPSO, type QPSOConfig, type QPSODiagnostics } from "./qpso";
export { runGA, type GAConfig } from "./ga";
export { runACO, type ACOConfig } from "./aco";
export { runQSO, type QSOConfig } from "./qso";
