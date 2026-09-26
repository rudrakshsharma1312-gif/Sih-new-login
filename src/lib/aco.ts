/**
 * Ant Colony Optimization (ACO) for Multi-Vehicle Routing Problem (VRP)
 *
 * Implements Max-Min Ant System (MMAS) / Elitist Ant System:
 * 1. Pheromone matrix Tau[i][j] tracking edge desirability between stops and depot
 * 2. Heuristic visibility Eta[i][j] inversely proportional to travel distance & congestion
 * 3. Probabilistic state transition rule: P(i -> j) proportional to Tau[i][j]^alpha * Eta[i][j]^beta
 * 4. Pheromone evaporation (rate rho) and elitist deposit based on VRP fitness
 * 5. Max-Min pheromone limits [Tau_min, Tau_max] to prevent stagnation
 * 6. Systematic 2-opt refinement on iteration-best solutions
 */

import { STOPS, type Matrices } from "./network";
import { evaluateVRP } from "./qpso";
import type { Params, Run } from "./optimizer";

export type ACOConfig = {
  ants?: number;
  alpha?: number; // pheromone importance weight
  beta?: number; // heuristic visibility importance weight
  rho?: number; // pheromone evaporation rate
  q0?: number; // exploitation vs exploration probability
  tauMin?: number;
  tauMax?: number;
};

/** Mulberry32 PRNG for deterministic, reproducible runs */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let z = t;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/** Local 2-opt edge swap refinement */
function twoOpt(order: number[], matrices: Matrices, params: Params, destIndex = 0): number[] {
  let best = order.slice();
  let bestFit = evaluateVRP(best, matrices, params, destIndex).fitness;
  const n = best.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < Math.min(n, i + 8); j++) {
      const candidate = best.slice();
      const seg = candidate.slice(i, j + 1).reverse();
      candidate.splice(i, seg.length, ...seg);
      const fit = evaluateVRP(candidate, matrices, params, destIndex).fitness;
      if (fit < bestFit) {
        bestFit = fit;
        best = candidate;
      }
    }
  }
  return best;
}

/**
 * Executes Ant Colony Optimization for Fleet Routing
 */
export function runACO(
  params: Params,
  matrices: Matrices,
  seed = 42,
  config: ACOConfig = {},
  destIndex = 0,
): Run {
  const startTime = performance.now();
  const rnd = mulberry32(seed);

  const numAnts = Math.max(12, config.ants ?? params.swarm);
  const maxIter = Math.max(20, params.iterations);
  const alpha = config.alpha ?? 1.0;
  const beta = config.beta ?? 2.2;
  const rho = config.rho ?? 0.12;
  const q0 = config.q0 ?? 0.35;
  const tauMin = config.tauMin ?? 0.05;
  const tauMax = config.tauMax ?? 5.0;

  const nodeCount = matrices.dist.length; // 25 (0 depot + 24 stops)
  const stopIds = Array.from({ length: STOPS.length }, (_, i) => i + 1);

  // Initialize Pheromone Matrix
  const tau: number[][] = Array.from({ length: nodeCount }, () =>
    new Array<number>(nodeCount).fill(1.0),
  );

  // Precompute Heuristic Visibility Matrix Eta[i][j]
  const eta: number[][] = Array.from({ length: nodeCount }, (_, i) =>
    Array.from({ length: nodeCount }, (_, j) => {
      if (i === j) return 0;
      const d = matrices.dist[i]![j]!;
      const c = matrices.congestion[i]![j]!;
      return 10.0 / (d * c + 0.5);
    }),
  );

  let globalBestOrder: number[] = stopIds.slice();
  let globalBestFitness = evaluateVRP(globalBestOrder, matrices, params, destIndex).fitness;
  let convergedAt = 0;

  const history: number[] = [globalBestFitness];

  for (let iter = 1; iter <= maxIter; iter++) {
    const antTours: number[][] = [];
    const antFitnesses: number[] = [];

    // Each ant constructs a full sequence of stops
    for (let a = 0; a < numAnts; a++) {
      const unvisited = new Set<number>(stopIds);
      const tour: number[] = [];

      // Start ant from a random customer stop or depot
      let current = rnd() < 0.5 ? 0 : stopIds[Math.floor(rnd() * stopIds.length)]!;
      if (current !== 0) {
        tour.push(current);
        unvisited.delete(current);
      }

      while (unvisited.size > 0) {
        const candidates = Array.from(unvisited);

        // Calculate transition probabilities
        const weights: number[] = [];
        let totalWeight = 0;

        for (const cand of candidates) {
          const ph = Math.pow(tau[current]![cand]!, alpha);
          const he = Math.pow(eta[current]![cand]!, beta);
          const w = ph * he;
          weights.push(w);
          totalWeight += w;
        }

        let nextStop: number;

        // Pseudo-random proportional rule
        if (rnd() < q0 && totalWeight > 0) {
          // Greedy choice: pick maximum weight
          let maxW = -1;
          let bestCand = candidates[0]!;
          for (let i = 0; i < candidates.length; i++) {
            if (weights[i]! > maxW) {
              maxW = weights[i]!;
              bestCand = candidates[i]!;
            }
          }
          nextStop = bestCand;
        } else if (totalWeight > 0) {
          // Roulette wheel selection
          const pick = rnd() * totalWeight;
          let accum = 0;
          nextStop = candidates[candidates.length - 1]!;
          for (let i = 0; i < candidates.length; i++) {
            accum += weights[i]!;
            if (accum >= pick) {
              nextStop = candidates[i]!;
              break;
            }
          }
        } else {
          // Fallback uniform random
          nextStop = candidates[Math.floor(rnd() * candidates.length)]!;
        }

        tour.push(nextStop);
        unvisited.delete(nextStop);
        current = nextStop;
      }

      const fit = evaluateVRP(tour, matrices, params, destIndex).fitness;
      antTours.push(tour);
      antFitnesses.push(fit);
    }

    // Find iteration best ant
    let iterBestIdx = 0;
    for (let a = 1; a < numAnts; a++) {
      if (antFitnesses[a]! < antFitnesses[iterBestIdx]!) {
        iterBestIdx = a;
      }
    }

    // Apply local 2-opt refinement to iteration best
    let refinedTour = antTours[iterBestIdx]!;
    if (iter % 2 === 0) {
      refinedTour = twoOpt(refinedTour, matrices, params, destIndex);
    }
    const refinedFit = evaluateVRP(refinedTour, matrices, params, destIndex).fitness;

    if (refinedFit < globalBestFitness) {
      globalBestFitness = refinedFit;
      globalBestOrder = refinedTour.slice();
      convergedAt = iter;
    }

    // Pheromone Evaporation: Tau = (1 - rho) * Tau
    for (let i = 0; i < nodeCount; i++) {
      for (let j = 0; j < nodeCount; j++) {
        tau[i]![j] = Math.max(tauMin, (1 - rho) * tau[i]![j]!);
      }
    }

    // Pheromone Deposit by Global Best & Iteration Best
    const depositDeposit = (order: number[], fitness: number, weight = 1.0) => {
      const delta = (weight * 100.0) / Math.max(1, fitness);
      for (let k = 0; k < order.length - 1; k++) {
        const u = order[k]!;
        const v = order[k + 1]!;
        tau[u]![v] = Math.min(tauMax, tau[u]![v]! + delta);
        tau[v]![u] = Math.min(tauMax, tau[v]![u]! + delta);
      }
    };

    depositDeposit(refinedTour, refinedFit, 1.0);
    depositDeposit(globalBestOrder, globalBestFitness, 1.5);

    history.push(globalBestFitness);
  }

  const finalSolution = evaluateVRP(globalBestOrder, matrices, params, destIndex);
  const runtimeMs = Math.round(performance.now() - startTime);

  return {
    algorithm: "aco",
    best: finalSolution,
    history,
    convergedAt,
    runtimeMs,
  };
}
