/**
 * Quantum-behaved Particle Swarm Optimization (QPSO)
 *
 * Implements canonical QPSO based on the Schrödinger equation for particles
 * in a Delta-potential well (Sun, Feng, Xu 2004; Sun, Choi et al. 2005):
 *
 * 1. Mean Best Position (mbest):
 *    mbest_d = (1 / M) * sum_{i=1}^M P_{i,d}
 *
 * 2. Stochastic Local Attractor (P'_{i}):
 *    P'_{i,d} = phi_d * P_{i,d} + (1 - phi_d) * G_d, where phi_d ~ U(0, 1)
 *
 * 3. Quantum State Wavefunction Collapse (Delta Potential Well):
 *    psi(y) = (1 / sqrt(L)) * exp(-|y| / L), with characteristic length L = 2 * alpha * |mbest_d - X_{i,d}|
 *    Position sampling via inverse CDF transform:
 *    X_{i,d}(t+1) = P'_{i,d} +/- alpha * |mbest_d - X_{i,d}(t)| * ln(1 / u), where u ~ U(0, 1)
 *
 * 4. Combinatorial VRP Mapping (Ranked Order Value / Random Key - ROV):
 *    Continuous quantum positions X_i in R^D are decoded to valid permutations
 *    of stops via sorting ranks. Multi-vehicle partitioning, congestion penalty,
 *    and energy/CO2 emissions are evaluated to drive quantum swarm convergence.
 */

import { STOPS, type Matrices } from "./network";
import type { Params, Solution, Run } from "./optimizer";

export interface QPSOConfig {
  /** Maximum contraction-expansion coefficient (early exploration) */
  alphaMax: number;
  /** Minimum contraction-expansion coefficient (late exploitation) */
  alphaMin: number;
  /** Quantum tunnel threshold multiplier for escaping deep basins */
  tunnelRate: number;
  /** Quantum local 2-opt refinement passes per iteration */
  refinePasses: number;
  /** Seed for reproducible deterministic runs */
  seed: number;
}

export const DEFAULT_QPSO_CONFIG: QPSOConfig = {
  alphaMax: 0.98,
  alphaMin: 0.45,
  tunnelRate: 0.08,
  refinePasses: 10,
  seed: 26137,
};

export interface QPSOParticle {
  /** Continuous quantum coordinate vector in R^D */
  position: Float64Array;
  /** Personal best continuous coordinate vector */
  pBestPosition: Float64Array;
  /** Decoded stop order permutation for the personal best */
  pBestOrder: number[];
  /** Personal best fitness */
  pBestFitness: number;
  /** Current candidate fitness */
  currentFitness: number;
}

export interface QPSODiagnostics {
  /** Number of quantum tunneling jumps triggered */
  tunnelEvents: number;
  /** Mean quantum wave packet width (|mbest - X|) at final step */
  meanWavePacketWidth: number;
  /** Iteration index where global best converged */
  convergedAt: number;
}

const AVG_SPEED = 26; // km/h free flow
const CO2_PER_KM = 0.19; // kg CO2 per km

/** Mulberry32 PRNG for deterministic, reproducible quantum state sampling */
export function createMulberryRng(seed: number) {
  let t = seed >>> 0;
  return function rnd(): number {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Split customer stops order into V vehicle routes (starting at pickup depot 0 and ending at destIndex) */
export function splitOrderToRoutes(order: number[], vehicles: number, destIndex = 0): number[][] {
  const per = Math.ceil(order.length / Math.max(1, vehicles));
  const routes: number[][] = [];
  for (let v = 0; v < vehicles; v++) {
    const slice = order.slice(v * per, (v + 1) * per);
    if (slice.length > 0) {
      routes.push([0, ...slice, destIndex]);
    }
  }
  return routes;
}

/** Evaluate fitness of a customer stop permutation on the Bengaluru road network */
export function evaluateOrder(order: number[], m: Matrices, p: Params, destIndex = 0): Solution {
  const routes = splitOrderToRoutes(order, p.vehicles, destIndex);
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
    timeMin += (route.length - 2) * 3; // 3 min service time per delivery stop
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

/**
 * Ranked Order Value (ROV) rule:
 * Sorts stop indices according to the real-valued continuous quantum positions.
 * This maps R^D continuously to the S_D permutation group.
 */
export function rovDecode(
  position: Float64Array,
  stopsList: number[],
  pairsScratch?: Array<{ stop: number; val: number }>,
): number[] {
  const D = stopsList.length;
  const items = pairsScratch || new Array(D);
  for (let d = 0; d < D; d++) {
    items[d] = { stop: stopsList[d]!, val: position[d]! };
  }
  items.sort((a, b) => a.val - b.val);
  const out = new Array<number>(D);
  for (let d = 0; d < D; d++) {
    out[d] = items[d]!.stop;
  }
  return out;
}

/**
 * Encodes a discrete stop permutation back into continuous coordinates in [-2.5, 2.5],
 * used to align a particle's quantum position after 2-opt refinement.
 */
export function encodeOrderToPosition(
  order: number[],
  stopsList: number[],
  scale = 2.5,
): Float64Array {
  const D = stopsList.length;
  const pos = new Float64Array(D);
  const stopRank = new Map<number, number>();
  for (let i = 0; i < order.length; i++) {
    stopRank.set(order[i]!, i);
  }
  for (let d = 0; d < D; d++) {
    const stop = stopsList[d]!;
    const rank = stopRank.get(stop) ?? d;
    // Map rank 0..D-1 linearly to [-scale, scale]
    pos[d] = -scale + (2 * scale * rank) / Math.max(1, D - 1);
  }
  return pos;
}

/**
 * Computes the Mean Best (mbest) position vector across all particles' personal bests:
 * mbest_d = (1 / M) * sum_{i=1}^M P_{i,d}
 */
export function computeMeanBest(
  particles: QPSOParticle[],
  dimension: number,
  out?: Float64Array,
): Float64Array {
  const mbest = out || new Float64Array(dimension);
  mbest.fill(0);
  const M = particles.length;
  if (M === 0) return mbest;

  for (let i = 0; i < M; i++) {
    const pBest = particles[i]!.pBestPosition;
    for (let d = 0; d < dimension; d++) {
      mbest[d] += pBest[d]!;
    }
  }

  const invM = 1 / M;
  for (let d = 0; d < dimension; d++) {
    mbest[d] *= invM;
  }
  return mbest;
}

/**
 * Systematic 2-opt local search on the multi-vehicle route order.
 * Since N = 24, checking 2-opt pairs is sub-millisecond and yields high solution quality.
 */
export function local2OptRefine(
  order: number[],
  m: Matrices,
  params: Params,
  maxPasses = 4,
  rnd?: () => number,
  destIndex = 0,
): { refinedOrder: number[]; refinedFitness: number } {
  let currentOrder = order.slice();
  let currentFitness = evaluateOrder(currentOrder, m, params, destIndex).fitness;
  const n = currentOrder.length;

  for (let pass = 0; pass < maxPasses; pass++) {
    let improvedInPass = false;

    // Systematic 2-opt segment reversals
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        // Fast test: create 2-opt reversed order
        const cand = currentOrder.slice();
        let left = i;
        let right = j;
        while (left < right) {
          const tmp = cand[left]!;
          cand[left] = cand[right]!;
          cand[right] = tmp;
          left++;
          right--;
        }

        const candFit = evaluateOrder(cand, m, params, destIndex).fitness;
        if (candFit < currentFitness - 1e-4) {
          currentOrder = cand;
          currentFitness = candFit;
          improvedInPass = true;
          break; // Greedily move to next improved state
        }
      }
      if (improvedInPass) break;
    }

    // Occasional relocation move if no 2-opt improvement found
    if (!improvedInPass && rnd) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const from = Math.floor(rnd() * n);
        const to = Math.floor(rnd() * n);
        if (from === to) continue;
        const cand = currentOrder.slice();
        const [moved] = cand.splice(from, 1);
        cand.splice(to, 0, moved!);
        const candFit = evaluateOrder(cand, m, params, destIndex).fitness;
        if (candFit < currentFitness - 1e-4) {
          currentOrder = cand;
          currentFitness = candFit;
          improvedInPass = true;
          break;
        }
      }
    }

    if (!improvedInPass) break;
  }

  return { refinedOrder: currentOrder, refinedFitness: currentFitness };
}

/**
 * Executes proper Quantum-behaved Particle Swarm Optimization (QPSO) on the network.
 * Returns a complete Run compatible with the platform's optimizer and benchmarking engine.
 */
export function runQPSO(
  params: Params,
  matrices: Matrices,
  seed = DEFAULT_QPSO_CONFIG.seed,
  customConfig?: Partial<QPSOConfig>,
  destIndex = 0,
): Run & { diagnostics: QPSODiagnostics } {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const cfg: QPSOConfig = { ...DEFAULT_QPSO_CONFIG, ...customConfig, seed };
  const rnd = createMulberryRng(seed);

  // Stop indices from network (1..24)
  const stopIndices = STOPS.map((_, i) => i + 1);
  const D = stopIndices.length;
  const M = Math.max(10, params.swarm);
  const T = Math.max(20, params.iterations);

  // Scratch arrays for performance
  const scratchPairs = new Array(D);
  const mbest = new Float64Array(D);

  // 1. Initialize quantum particles in R^D
  const particles: QPSOParticle[] = [];
  const gBestPosition = new Float64Array(D);
  let gBestOrder: number[] = [];
  let gBestFitness = Number.POSITIVE_INFINITY;
  let gBestSol: Solution | null = null;

  for (let i = 0; i < M; i++) {
    const pos = new Float64Array(D);
    for (let d = 0; d < D; d++) {
      // Initial uniform distribution in [-3.0, 3.0]
      pos[d] = (rnd() * 2 - 1) * 3.0;
    }
    const order = rovDecode(pos, stopIndices, scratchPairs);
    const sol = evaluateOrder(order, matrices, params, destIndex);

    const pBestPos = new Float64Array(pos);
    const particle: QPSOParticle = {
      position: pos,
      pBestPosition: pBestPos,
      pBestOrder: order,
      pBestFitness: sol.fitness,
      currentFitness: sol.fitness,
    };
    particles.push(particle);

    if (sol.fitness < gBestFitness) {
      gBestFitness = sol.fitness;
      gBestPosition.set(pBestPos);
      gBestOrder = order.slice();
      gBestSol = sol;
    }
  }

  const history: number[] = [];
  let convergedAt = T;
  let stagnant = 0;
  let tunnelEvents = 0;

  // 2. Quantum Swarm Evolution Iterations
  for (let it = 0; it < T; it++) {
    // Dynamic Contraction-Expansion (CE) coefficient alpha(t)
    // Decreases linearly from alphaMax to alphaMin to transition from global quantum tunneling to local convergence
    const progress = it / T;
    const alpha = cfg.alphaMax - progress * (cfg.alphaMax - cfg.alphaMin);

    // Compute swarm Mean Best (mbest)
    computeMeanBest(particles, D, mbest);

    for (let i = 0; i < M; i++) {
      const p = particles[i]!;
      const X = p.position;
      const P = p.pBestPosition;

      // Update each dimension d using the Delta-potential well wave equation
      for (let d = 0; d < D; d++) {
        // Stochastic local attractor: P'_{i,d} = phi * P_{i,d} + (1 - phi) * G_d
        const phi = rnd();
        const pPrime = phi * P[d]! + (1 - phi) * gBestPosition[d]!;

        // Quantum characteristic length L = 2 * alpha * |mbest_d - X_{i,d}|
        const waveDispersion = Math.abs(mbest[d]! - X[d]!);

        // Inverse CDF Monte Carlo sampling of quantum probability density Q(y)
        // u ~ Uniform(0, 1), clamped to prevent log(0)
        const u = Math.max(1e-11, Math.min(1 - 1e-11, rnd()));
        const lnU = Math.log(1 / u);

        if (lnU > 3.5) {
          tunnelEvents++;
        }

        // Quantum position jump: X_{i,d} = P'_{i,d} +/- alpha * |mbest_d - X_{i,d}| * ln(1/u)
        const quantumStep = alpha * waveDispersion * lnU;
        const sign = rnd() < 0.5 ? 1 : -1;
        X[d] = pPrime + sign * quantumStep;

        // Bounded quantum potential well boundary reflection
        if (X[d]! > 6.0) X[d] = 6.0 - (X[d]! - 6.0) * 0.5;
        if (X[d]! < -6.0) X[d] = -6.0 + (-6.0 - X[d]!) * 0.5;
      }

      // Ranked Order Value (ROV) decoding to permutation
      let candOrder = rovDecode(X, stopIndices, scratchPairs);
      let candFit = evaluateOrder(candOrder, matrices, params, destIndex).fitness;

      // Quantum local search refinement (2-opt polish)
      if (cfg.refinePasses > 0 && (i === 0 || rnd() < 0.45)) {
        const { refinedOrder, refinedFitness } = local2OptRefine(
          candOrder,
          matrices,
          params,
          cfg.refinePasses,
          rnd,
          destIndex,
        );
        if (refinedFitness < candFit) {
          candOrder = refinedOrder;
          candFit = refinedFitness;
          // Quantum coordinate alignment
          const aligned = encodeOrderToPosition(candOrder, stopIndices);
          X.set(aligned);
        }
      }

      p.currentFitness = candFit;

      // Update personal best (pBest)
      if (candFit < p.pBestFitness) {
        p.pBestFitness = candFit;
        p.pBestPosition.set(X);
        p.pBestOrder = candOrder.slice();

        // Update global best (gBest)
        if (candFit < gBestFitness) {
          gBestFitness = candFit;
          gBestPosition.set(X);
          gBestOrder = candOrder.slice();
          gBestSol = evaluateOrder(gBestOrder, matrices, params, destIndex);
          stagnant = -1;
        }
      }
    }

    // Occasional quantum tunneling pulse when stagnated
    stagnant++;
    if (stagnant > 15 && it < T - 10) {
      // Quantum tunneling excitation on weakest particle toward global best
      const weakest = particles.reduce((max, cur) =>
        cur.currentFitness > max.currentFitness ? cur : max,
      );
      for (let d = 0; d < D; d++) {
        weakest.position[d] = gBestPosition[d]! + (rnd() * 2 - 1) * alpha * 1.5;
      }
      tunnelEvents++;
    }

    if (stagnant === 18 && convergedAt === T) {
      convergedAt = it;
    }

    history.push(gBestFitness);
  }

  // Final solution safety check
  if (!gBestSol) {
    gBestSol = evaluateOrder(gBestOrder, matrices, params, destIndex);
  }

  // Calculate final quantum wave dispersion metric
  let waveSum = 0;
  for (let i = 0; i < M; i++) {
    for (let d = 0; d < D; d++) {
      waveSum += Math.abs(mbest[d]! - particles[i]!.position[d]!);
    }
  }
  const meanWavePacketWidth = waveSum / (M * D);

  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    algorithm: "qpso",
    best: gBestSol,
    history,
    convergedAt,
    runtimeMs: Math.max(1, Math.round(t1 - t0)),
    diagnostics: {
      tunnelEvents,
      meanWavePacketWidth,
      convergedAt,
    },
  };
}

export { evaluateOrder as evaluateVRP };
