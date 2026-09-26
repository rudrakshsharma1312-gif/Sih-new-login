/**
 * Quantum Swarm Optimization (QSO) for Multi-Vehicle Routing Problem (VRP)
 *
 * Implements canonical Quantum-inspired Swarm Optimization with Q-Bit Rotation Gates:
 * 1. Q-Bit Quantum State Vector:
 *    Each particle dimension possesses a quantum state |psi> = [cos(theta), sin(theta)]^T
 *    where probability amplitudes satisfy |alpha|^2 + |beta|^2 = 1 on the unit circle.
 *
 * 2. Quantum Rotation Gates U(Delta_theta):
 *    State angles rotate dynamically toward personal best (pbest) and swarm beacon (gbest):
 *    Delta_theta = c1 * r1 * delta(pbest_theta, theta) + c2 * r2 * delta(gbest_theta, theta)
 *
 * 3. Quantum Cauchy Wave Jump / Heavy-Tailed Tunneling:
 *    Cauchy distributed phase fluctuations tan(pi * (u - 0.5)) provide scale-free jumps
 *    to cross arbitrary potential barriers and prevent premature entrapment.
 *
 * 4. Quantum Measurement & Permutation Mapping (ROV):
 *    Quantum probability observation projects phase angles onto continuous spectrum,
 *    subsequently mapped bijectively to customer delivery orders via Ranked Order Value.
 *
 * 5. Quantum Pauli-X (NOT-Gate) Phase Inversion:
 *    Applies quantum bit flips when phase dispersion indicates localized freeze.
 */

import { STOPS, type Matrices } from "./network";
import { evaluateVRP } from "./qpso";
import type { Params, Run } from "./optimizer";

export type QSOConfig = {
  particles?: number;
  c1?: number; // cognitive rotation coefficient
  c2?: number; // social rotation coefficient
  cauchyScale?: number; // heavy-tailed quantum jump scaling
  phaseInversionRate?: number; // Pauli-X gate trigger threshold
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

/** Shortest directional angle difference on circle [-pi, pi] */
function angleDiff(target: number, current: number): number {
  let diff = (target - current) % (2 * Math.PI);
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

/** Standard Cauchy random deviate for quantum jump tunneling */
function sampleCauchy(rnd: () => number, gamma: number): number {
  const u = rnd();
  // Clamped inverse CDF of standard Cauchy distribution
  const p = Math.max(0.001, Math.min(0.999, u));
  return gamma * Math.tan(Math.PI * (p - 0.5));
}

/** Maps continuous measurement values to a permutation of stops via Ranked Order Value */
function rovMap(values: number[], stopIds: number[]): number[] {
  const indices = Array.from({ length: values.length }, (_, i) => i);
  indices.sort((a, b) => values[a]! - values[b]!);
  return indices.map((idx) => stopIds[idx]!);
}

/** Local 2-opt refinement on candidate sequence */
function twoOpt(order: number[], matrices: Matrices, params: Params, destIndex = 0): number[] {
  let best = order.slice();
  let bestFit = evaluateVRP(best, matrices, params, destIndex).fitness;
  const n = best.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < Math.min(n, i + 6); j++) {
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
 * Executes Quantum Swarm Optimization (QSO) for Fleet Routing
 */
export function runQSO(
  params: Params,
  matrices: Matrices,
  seed = 42,
  config: QSOConfig = {},
  destIndex = 0,
): Run {
  const startTime = performance.now();
  const rnd = mulberry32(seed);

  const swarmSize = Math.max(16, config.particles ?? params.swarm);
  const maxIterations = Math.max(20, params.iterations);
  const c1 = config.c1 ?? 1.4;
  const c2 = config.c2 ?? 1.6;
  const cauchyGamma = config.cauchyScale ?? 0.08;
  const inversionThreshold = config.phaseInversionRate ?? 0.05;

  const stopIds = Array.from({ length: STOPS.length }, (_, i) => i + 1);
  const dim = stopIds.length; // 24 customer stops

  // Quantum Phase Angles Theta[particle][dim] in [0, 2*pi)
  const theta: number[][] = [];
  // Personal Best Angles and Permutations
  const pBestTheta: number[][] = [];
  const pBestOrder: number[][] = [];
  const pBestFitness: number[] = [];

  // Global Best
  let gBestTheta: number[] = [];
  let gBestOrder: number[] = [];
  let gBestFitness = Infinity;
  let convergedAt = 0;

  // Initialize Quantum Particles
  for (let i = 0; i < swarmSize; i++) {
    const particleAngles = Array.from({ length: dim }, () => rnd() * 2 * Math.PI);
    theta.push(particleAngles);

    // Initial measurement
    const measured = particleAngles.map((th) => Math.pow(Math.cos(th), 2) + 0.5 * Math.sin(2 * th));
    const order = rovMap(measured, stopIds);
    const fit = evaluateVRP(order, matrices, params, destIndex).fitness;

    pBestTheta.push(particleAngles.slice());
    pBestOrder.push(order);
    pBestFitness.push(fit);

    if (fit < gBestFitness) {
      gBestFitness = fit;
      gBestTheta = particleAngles.slice();
      gBestOrder = order.slice();
    }
  }

  const history: number[] = [gBestFitness];

  // Optimization loop
  for (let iter = 1; iter <= maxIterations; iter++) {
    // Dynamic cognitive and social coefficient decay
    const progress = iter / maxIterations;
    const currentC1 = c1 * (1 - 0.5 * progress);
    const currentC2 = c2 * (0.5 + 0.5 * progress);
    const currentGamma = cauchyGamma * Math.exp(-2.5 * progress);

    // Measure phase variance across swarm to detect phase lock
    let phaseVarSum = 0;
    for (let d = 0; d < dim; d++) {
      let meanCos = 0;
      let meanSin = 0;
      for (let i = 0; i < swarmSize; i++) {
        meanCos += Math.cos(theta[i]![d]!);
        meanSin += Math.sin(theta[i]![d]!);
      }
      meanCos /= swarmSize;
      meanSin /= swarmSize;
      const R = Math.sqrt(meanCos * meanCos + meanSin * meanSin); // Circular variance: 1 - R
      phaseVarSum += 1 - R;
    }
    const avgPhaseVariance = phaseVarSum / dim;

    // Swarm update step
    for (let i = 0; i < swarmSize; i++) {
      const pTheta = theta[i]!;
      const pBest = pBestTheta[i]!;

      for (let d = 0; d < dim; d++) {
        const diffP = angleDiff(pBest[d]!, pTheta[d]!);
        const diffG = angleDiff(gBestTheta[d]!, pTheta[d]!);

        // Quantum rotation increment
        const r1 = rnd();
        const r2 = rnd();
        let deltaTheta = currentC1 * r1 * diffP + currentC2 * r2 * diffG;

        // Heavy-tailed quantum jump mutation
        if (rnd() < 0.25) {
          deltaTheta += sampleCauchy(rnd, currentGamma);
        }

        // Quantum Pauli-X / NOT gate phase flip if swarm variance has collapsed
        if (avgPhaseVariance < inversionThreshold && rnd() < 0.1) {
          pTheta[d] = (Math.PI - pTheta[d]!) % (2 * Math.PI);
        } else {
          pTheta[d] = (pTheta[d]! + deltaTheta + 2 * Math.PI) % (2 * Math.PI);
        }
      }

      // Quantum state projection to continuous space
      const measured = pTheta.map((th) => {
        // Superposition probability amplitude + harmonic term
        return Math.pow(Math.cos(th), 2) + 0.5 * Math.sin(2 * th);
      });

      let order = rovMap(measured, stopIds);

      // Periodic local 2-opt refinement on personal best
      if (iter % 3 === 0 && i < 3) {
        order = twoOpt(order, matrices, params, destIndex);
      }

      const fit = evaluateVRP(order, matrices, params, destIndex).fitness;

      // Update personal best
      if (fit < pBestFitness[i]!) {
        pBestFitness[i] = fit;
        pBestOrder[i] = order.slice();
        pBestTheta[i] = pTheta.slice();

        // Update global best
        if (fit < gBestFitness) {
          gBestFitness = fit;
          gBestTheta = pTheta.slice();
          gBestOrder = order.slice();
          convergedAt = iter;
        }
      }
    }

    history.push(gBestFitness);
  }

  const finalSolution = evaluateVRP(gBestOrder, matrices, params, destIndex);
  const runtimeMs = Math.round(performance.now() - startTime);

  return {
    algorithm: "qso",
    best: finalSolution,
    history,
    convergedAt,
    runtimeMs,
  };
}
