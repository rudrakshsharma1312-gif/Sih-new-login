/**
 * Genetic Algorithm (GA) for Multi-Vehicle Routing Problem (VRP)
 *
 * Implements canonical permutation-based Genetic Algorithm:
 * 1. Permutation Chromosome Representation of customer stops (1..24)
 * 2. Tournament Selection with configurable tournament size
 * 3. Order Crossover (OX) - preserves relative node ordering without generating duplicate stops
 * 4. Composite Mutation (Swap, Inversion / 2-Opt segment reversal, Scramble mutation)
 * 5. Strong Elitism - top candidates guaranteed preservation across generations
 * 6. Generational convergence tracking
 */

import { STOPS, type Matrices } from "./network";
import { evaluateVRP } from "./qpso";
import type { Params, Run } from "./optimizer";

export type GAConfig = {
  populationSize?: number;
  crossoverRate?: number;
  mutationRate?: number;
  tournamentSize?: number;
  elitismCount?: number;
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

/** Shuffles an array in place using Fisher-Yates with deterministic PRNG */
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}

/**
 * Order Crossover (OX):
 * Standard crossover for permutation problems (TSP / VRP).
 * Selects a segment from parent 1, preserves its position,
 * and fills remaining slots with genes from parent 2 in circular order.
 */
function orderCrossover(p1: number[], p2: number[], rnd: () => number): number[] {
  const len = p1.length;
  const child = new Array<number>(len).fill(-1);

  // Pick two random cut points
  const cut1 = Math.floor(rnd() * len);
  const cut2 = Math.floor(rnd() * len);
  const [start, end] = cut1 < cut2 ? [cut1, cut2] : [cut2, cut1];

  const inSegment = new Set<number>();
  for (let i = start; i <= end; i++) {
    child[i] = p1[i]!;
    inSegment.add(p1[i]!);
  }

  // Fill remaining slots in circular order from parent 2
  let targetIdx = (end + 1) % len;
  let p2Idx = (end + 1) % len;

  while (targetIdx !== start) {
    const gene = p2[p2Idx]!;
    if (!inSegment.has(gene)) {
      child[targetIdx] = gene;
      targetIdx = (targetIdx + 1) % len;
    }
    p2Idx = (p2Idx + 1) % len;
  }

  return child;
}

/**
 * Composite Mutation operator:
 * Applies swap, segment inversion (2-opt), or scramble mutation.
 */
function mutate(chromosome: number[], rate: number, rnd: () => number): number[] {
  if (rnd() > rate) return chromosome.slice();

  const mutated = chromosome.slice();
  const len = mutated.length;
  const roll = rnd();

  if (roll < 0.45) {
    // 1. Swap Mutation
    const i = Math.floor(rnd() * len);
    const j = Math.floor(rnd() * len);
    const tmp = mutated[i]!;
    mutated[i] = mutated[j]!;
    mutated[j] = tmp;
  } else if (roll < 0.85) {
    // 2. Inversion Mutation (2-opt edge swap)
    const i = Math.floor(rnd() * len);
    const j = Math.floor(rnd() * len);
    const [lo, hi] = i < j ? [i, j] : [j, i];
    const segment = mutated.slice(lo, hi + 1).reverse();
    mutated.splice(lo, segment.length, ...segment);
  } else {
    // 3. Scramble Mutation (sub-segment shuffle)
    const i = Math.floor(rnd() * len);
    const j = Math.floor(rnd() * len);
    const [lo, hi] = i < j ? [i, j] : [j, i];
    const segment = mutated.slice(lo, hi + 1);
    const scrambled = shuffle(segment, rnd);
    mutated.splice(lo, scrambled.length, ...scrambled);
  }

  return mutated;
}

/**
 * Tournament Selection:
 * Selects the fittest individual among `k` randomly chosen candidates.
 */
function tournamentSelect(
  population: number[][],
  fitnesses: number[],
  k: number,
  rnd: () => number,
): number[] {
  let bestIdx = Math.floor(rnd() * population.length);
  let bestFit = fitnesses[bestIdx]!;

  for (let i = 1; i < k; i++) {
    const candidateIdx = Math.floor(rnd() * population.length);
    const candidateFit = fitnesses[candidateIdx]!;
    if (candidateFit < bestFit) {
      bestFit = candidateFit;
      bestIdx = candidateIdx;
    }
  }

  return population[bestIdx]!;
}

/**
 * Executes Genetic Algorithm for Fleet Routing
 */
export function runGA(
  params: Params,
  matrices: Matrices,
  seed = 42,
  config: GAConfig = {},
  destIndex = 0,
): Run {
  const startTime = performance.now();
  const rnd = mulberry32(seed);

  const popSize = Math.max(16, config.populationSize ?? params.swarm);
  const maxGen = Math.max(20, params.iterations);
  const cxRate = config.crossoverRate ?? 0.88;
  const mutRate = config.mutationRate ?? 0.25;
  const tourSize = config.tournamentSize ?? 3;
  const eliteCount = Math.max(2, config.elitismCount ?? 2);

  const baseStops = Array.from({ length: STOPS.length }, (_, i) => i + 1);

  // Initialize population with randomized permutations
  let population: number[][] = [];
  for (let i = 0; i < popSize; i++) {
    population.push(shuffle(baseStops, rnd));
  }

  // Pre-evaluate initial generation
  let fitnesses = population.map(
    (chrom) => evaluateVRP(chrom, matrices, params, destIndex).fitness,
  );

  // Find best
  let bestIdx = 0;
  for (let i = 1; i < popSize; i++) {
    if (fitnesses[i]! < fitnesses[bestIdx]!) {
      bestIdx = i;
    }
  }

  let globalBestChromosome = population[bestIdx]!.slice();
  let globalBestFitness = fitnesses[bestIdx]!;
  let convergedAt = 0;

  const history: number[] = [globalBestFitness];

  // Generational loop
  for (let gen = 1; gen <= maxGen; gen++) {
    // Sort indices by fitness for elitism
    const sortedIndices = Array.from({ length: popSize }, (_, i) => i).sort(
      (a, b) => fitnesses[a]! - fitnesses[b]!,
    );

    const nextPopulation: number[][] = [];

    // Elitism: carry over the top N directly
    for (let e = 0; e < eliteCount; e++) {
      nextPopulation.push(population[sortedIndices[e]!]!.slice());
    }

    // Breed offspring to fill remainder of population
    while (nextPopulation.length < popSize) {
      const p1 = tournamentSelect(population, fitnesses, tourSize, rnd);
      const p2 = tournamentSelect(population, fitnesses, tourSize, rnd);

      let child: number[];
      if (rnd() < cxRate) {
        child = orderCrossover(p1, p2, rnd);
      } else {
        child = p1.slice();
      }

      child = mutate(child, mutRate, rnd);
      nextPopulation.push(child);
    }

    population = nextPopulation;
    fitnesses = population.map((chrom) => evaluateVRP(chrom, matrices, params, destIndex).fitness);

    // Update global best
    let genBestIdx = 0;
    for (let i = 1; i < popSize; i++) {
      if (fitnesses[i]! < fitnesses[genBestIdx]!) {
        genBestIdx = i;
      }
    }

    if (fitnesses[genBestIdx]! < globalBestFitness) {
      globalBestFitness = fitnesses[genBestIdx]!;
      globalBestChromosome = population[genBestIdx]!.slice();
      convergedAt = gen;
    }

    history.push(globalBestFitness);
  }

  const finalSolution = evaluateVRP(globalBestChromosome, matrices, params, destIndex);
  const runtimeMs = Math.round(performance.now() - startTime);

  return {
    algorithm: "ga",
    best: finalSolution,
    history,
    convergedAt,
    runtimeMs,
  };
}
