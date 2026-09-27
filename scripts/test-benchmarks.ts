/**
 * Comprehensive Benchmark Algorithms Test Suite:
 * Tests Genetic Algorithm (GA), Ant Colony Optimization (ACO), and Quantum Swarm Optimization (QSO).
 */

import { buildMatrices } from "../src/lib/network";
import { runQPSO } from "../src/lib/qpso";
import { runGA } from "../src/lib/ga";
import { runACO } from "../src/lib/aco";
import { runQSO } from "../src/lib/qso";
import { optimize, type Params, type Scenario } from "../src/lib/optimizer";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    failed++;
  }
}

function validateRoutes(routes: number[][], expectedVehicles: number) {
  assert(
    routes.length === expectedVehicles,
    `Routes count matches vehicle fleet (${expectedVehicles})`,
  );
  const visited: number[] = [];
  for (const r of routes) {
    assert(r[0] === 0, "Route starts at depot 0");
    assert(r[r.length - 1] === 0, "Route ends at depot 0");
    visited.push(...r.slice(1, -1));
  }
  const unique = new Set(visited);
  assert(visited.length === 24, "Total customer stops equals 24");
  assert(unique.size === 24, "All 24 customer stops visited with zero duplicates");
}

function isMonotonic(history: number[]): boolean {
  for (let i = 1; i < history.length; i++) {
    if (history[i]! > history[i - 1]! + 1e-6) return false;
  }
  return true;
}

const params: Params = {
  swarm: 25,
  iterations: 50,
  vehicles: 3,
  weights: { time: 0.4, distance: 0.3, congestion: 0.2, emissions: 0.1 },
};

const nominalMatrices = buildMatrices({ accident: false, closure: false });
const accidentMatrices = buildMatrices({ accident: true, closure: false });
const closureMatrices = buildMatrices({ accident: false, closure: true });

console.log("=================================================");
console.log("  TESTING BENCHMARK ALGORITHMS: GA, ACO, AND QSO ");
console.log("=================================================\n");

// --- 1. Testing Genetic Algorithm (GA) ---
console.log("--- 1. Testing Genetic Algorithm (GA) ---");
const gaNominal = runGA(params, nominalMatrices, 101);
assert(gaNominal.best.fitness > 0, "GA produces positive fitness");
assert(isMonotonic(gaNominal.history), "GA history is monotonically non-increasing");
validateRoutes(gaNominal.best.routes, 3);
console.log(
  `   GA Fitness: ${gaNominal.best.fitness.toFixed(3)} | Runtime: ${gaNominal.runtimeMs}ms | Conv: iter ${gaNominal.convergedAt}\n`,
);

// --- 2. Testing Ant Colony Optimization (ACO) ---
console.log("--- 2. Testing Ant Colony Optimization (ACO) ---");
const acoNominal = runACO(params, nominalMatrices, 202);
assert(acoNominal.best.fitness > 0, "ACO produces positive fitness");
assert(isMonotonic(acoNominal.history), "ACO history is monotonically non-increasing");
validateRoutes(acoNominal.best.routes, 3);
console.log(
  `   ACO Fitness: ${acoNominal.best.fitness.toFixed(3)} | Runtime: ${acoNominal.runtimeMs}ms | Conv: iter ${acoNominal.convergedAt}\n`,
);

// --- 3. Testing Quantum Swarm Optimization (QSO) ---
console.log("--- 3. Testing Quantum Swarm Optimization (QSO) [Replacing SA] ---");
const qsoNominal = runQSO(params, nominalMatrices, 303);
assert(qsoNominal.best.fitness > 0, "QSO produces positive fitness");
assert(isMonotonic(qsoNominal.history), "QSO history is monotonically non-increasing");
validateRoutes(qsoNominal.best.routes, 3);
console.log(
  `   QSO Fitness: ${qsoNominal.best.fitness.toFixed(3)} | Runtime: ${qsoNominal.runtimeMs}ms | Conv: iter ${qsoNominal.convergedAt}\n`,
);

// --- 4. Disruption Resilience (Accidents & Closures) ---
console.log("--- 4. Disruption Resilience Testing ---");
const gaAcc = runGA(params, accidentMatrices, 101);
const acoAcc = runACO(params, accidentMatrices, 202);
const qsoAcc = runQSO(params, accidentMatrices, 303);
assert(gaAcc.best.fitness > 0, "GA adapts to corridor accident");
assert(acoAcc.best.fitness > 0, "ACO adapts to corridor accident");
assert(qsoAcc.best.fitness > 0, "QSO adapts to corridor accident");

const gaClo = runGA(params, closureMatrices, 101);
const acoClo = runACO(params, closureMatrices, 202);
const qsoClo = runQSO(params, closureMatrices, 303);
assert(gaClo.best.fitness > 0, "GA adapts to road closure");
assert(acoClo.best.fitness > 0, "ACO adapts to road closure");
assert(qsoClo.best.fitness > 0, "QSO adapts to road closure");
console.log();

// --- 5. Variable Fleet Sizing ---
console.log("--- 5. Fleet Scaling (2 vs 5 Vehicles) ---");
const p2V = { ...params, vehicles: 2 };
const p5V = { ...params, vehicles: 5 };
const qso2V = runQSO(p2V, nominalMatrices, 404);
const qso5V = runQSO(p5V, nominalMatrices, 505);
validateRoutes(qso2V.best.routes, 2);
validateRoutes(qso5V.best.routes, 5);
console.log();

// --- 6. Four-Way Algorithmic Benchmark Overview ---
console.log("--- 6. 4-Way Algorithmic Showdown (QPSO vs GA vs ACO vs QSO) ---");
const qpsoNominal = runQPSO(params, nominalMatrices, 42);
console.log(
  `   [QPSO]  Fitness: ${qpsoNominal.best.fitness.toFixed(3)} | Distance: ${qpsoNominal.best.distanceKm.toFixed(1)}km | Runtime: ${qpsoNominal.runtimeMs}ms`,
);
console.log(
  `   [GA]    Fitness: ${gaNominal.best.fitness.toFixed(3)} | Distance: ${gaNominal.best.distanceKm.toFixed(1)}km | Runtime: ${gaNominal.runtimeMs}ms`,
);
console.log(
  `   [ACO]   Fitness: ${acoNominal.best.fitness.toFixed(3)} | Distance: ${acoNominal.best.distanceKm.toFixed(1)}km | Runtime: ${acoNominal.runtimeMs}ms`,
);
console.log(
  `   [QSO]   Fitness: ${qsoNominal.best.fitness.toFixed(3)} | Distance: ${qsoNominal.best.distanceKm.toFixed(1)}km | Runtime: ${qsoNominal.runtimeMs}ms`,
);

// --- 7. Testing Unified optimize() API for All 4 Algorithms ---
console.log("\n--- 7. Testing Unified optimize() API ---");
const scn = { accident: false, closure: false };
const runOptQPSO = optimize("qpso", params, scn, 77);
const runOptGA = optimize("ga", params, scn, 77);
const runOptACO = optimize("aco", params, scn, 77);
const runOptQSO = optimize("qso", params, scn, 77);
const runOptSA = optimize("sa", params, scn, 77);

assert(runOptQPSO.algorithm === "qpso", "optimize('qpso') returns qpso run");
assert(runOptGA.algorithm === "ga", "optimize('ga') returns ga run");
assert(runOptACO.algorithm === "aco", "optimize('aco') returns aco run");
assert(runOptQSO.algorithm === "qso", "optimize('qso') returns qso run");
assert(
  runOptSA.algorithm === "sa" && runOptSA.best.fitness > 0,
  "optimize('sa') gracefully executes QSO engine with sa id",
);

// --- 8. Testing Dynamic Base Origin & Separate Destination Locations ---
console.log("\n--- 8. Testing Custom Pick-up / Base & Destination Locations ---");
import { PRESET_HUBS, type NetworkConfig } from "../src/lib/network";

const airportBaseWhitefieldDest: NetworkConfig = {
  pickupHub: PRESET_HUBS[2]!, // Kempegowda Airport (North)
  destinationHub: PRESET_HUBS[3]!, // Whitefield ICD (East)
  isRoundTrip: false,
};

const qpsoCustomLoc = optimize("qpso", params, scn, 88, airportBaseWhitefieldDest);
const gaCustomLoc = optimize("ga", params, scn, 88, airportBaseWhitefieldDest);
const acoCustomLoc = optimize("aco", params, scn, 88, airportBaseWhitefieldDest);
const qsoCustomLoc = optimize("qso", params, scn, 88, airportBaseWhitefieldDest);

// Expected destination node index when destination is distinct is 25
const expectedDestIdx = 25;

[
  { name: "QPSO", run: qpsoCustomLoc },
  { name: "GA", run: gaCustomLoc },
  { name: "ACO", run: acoCustomLoc },
  { name: "QSO", run: qsoCustomLoc },
].forEach(({ name, run }) => {
  assert(
    run.best.routes.length === params.vehicles,
    `${name} produces ${params.vehicles} routes from custom base`,
  );
  assert(
    run.best.routes.every((r) => r[0] === 0 && r[r.length - 1] === expectedDestIdx),
    `${name} routes start at Base Origin (0) and end at Destination Hub (${expectedDestIdx})`,
  );
  assert(run.best.distanceKm > 0, `${name} calculates positive distance for custom corridor`);
});

console.log("\n=================================================");
console.log(`  SUMMARY: ${passed} / ${passed + failed} TESTS PASSED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
