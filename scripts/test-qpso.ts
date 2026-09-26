import { buildMatrices } from "../src/lib/network";
import { runQPSO, rovDecode, splitOrderToRoutes } from "../src/lib/qpso";
import { optimize, type Params } from "../src/lib/optimizer";

console.log("=================================================");
console.log("  TESTING QUANTUM PARTICLE SWARM OPTIMIZATION   ");
console.log("=================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ""}`);
    process.exitCode = 1;
  }
}

// 1. Math & Permutation Decoding Test
console.log("--- 1. Testing Ranked Order Value (ROV) and Route Validity ---");
const testStops = [1, 2, 3, 4, 5, 6, 7, 8];
const testPos = new Float64Array([2.5, -1.2, 0.4, 3.1, -2.8, 1.1, -0.5, 0.0]);
const decoded = rovDecode(testPos, testStops);
assert(
  decoded.length === 8 && new Set(decoded).size === 8,
  "ROV successfully produces bijective permutation with no duplicates",
);
const testRoutes = splitOrderToRoutes(decoded, 3);
assert(testRoutes.length === 3, "Routes correctly split into 3 vehicle paths");
assert(
  testRoutes.every((r) => r[0] === 0 && r[r.length - 1] === 0),
  "All vehicle paths start and end at depot 0",
);

// 2. Test Case 1: Nominal Scenario
console.log("\n--- 2. Testing Case 1: Nominal Scenario (accident: false, closure: false) ---");
const mNominal = buildMatrices({ accident: false, closure: false });
const defaultParams: Params = {
  swarm: 30,
  iterations: 80,
  vehicles: 4,
  weights: { time: 0.4, distance: 0.3, congestion: 0.2, emissions: 0.1 },
};

const qpsoNominal = runQPSO(defaultParams, mNominal, 42);
assert(qpsoNominal.best.fitness > 0, "Nominal fitness evaluated > 0");
assert(qpsoNominal.best.routes.length <= 4, "Number of vehicle routes matches vehicle fleet");

// Verify all 24 stops are present across routes
const visitedNominal = qpsoNominal.best.routes.flatMap((r) => r.slice(1, -1));
assert(
  visitedNominal.length === 24 && new Set(visitedNominal).size === 24,
  "All 24 Bengaluru stops visited exactly once with no duplicates",
);
console.log(
  `   Nominal Fitness: ${qpsoNominal.best.fitness.toFixed(3)} | Distance: ${qpsoNominal.best.distanceKm.toFixed(1)} km | Time: ${qpsoNominal.best.timeMin.toFixed(1)} min`,
);
console.log(
  `   Tunneling events: ${qpsoNominal.diagnostics.tunnelEvents} | Converged at iter: ${qpsoNominal.convergedAt}`,
);

// 3. Test Case 2: Accident Scenario
console.log("\n--- 3. Testing Case 2: Corridor Accident Scenario ---");
const mAccident = buildMatrices({ accident: true, closure: false });
const qpsoAccident = runQPSO(defaultParams, mAccident, 42);
assert(qpsoAccident.best.fitness > 0, "Accident case fitness is positive");
const visitedAccident = qpsoAccident.best.routes.flatMap((r) => r.slice(1, -1));
assert(
  visitedAccident.length === 24 && new Set(visitedAccident).size === 24,
  "Accident case: all 24 stops visited exactly once",
);
console.log(
  `   Accident Fitness: ${qpsoAccident.best.fitness.toFixed(3)} | Congestion Index: ${qpsoAccident.best.congestionIdx.toFixed(3)}`,
);

// 4. Test Case 3: MG Road Closure Scenario
console.log("\n--- 4. Testing Case 3: Road Closure Scenario ---");
const mClosure = buildMatrices({ accident: false, closure: true });
const qpsoClosure = runQPSO(defaultParams, mClosure, 42);
assert(qpsoClosure.best.fitness > 0, "Closure case fitness is positive");
const visitedClosure = qpsoClosure.best.routes.flatMap((r) => r.slice(1, -1));
assert(
  visitedClosure.length === 24 && new Set(visitedClosure).size === 24,
  "Closure case: all 24 stops visited exactly once",
);
console.log(
  `   Closure Fitness: ${qpsoClosure.best.fitness.toFixed(3)} | Distance: ${qpsoClosure.best.distanceKm.toFixed(1)} km`,
);

// 5. Test Case 4: Multiple Disruptions (Accident + Closure)
console.log("\n--- 5. Testing Case 4: Combined Disruptions (Accident + Closure) ---");
const mBoth = buildMatrices({ accident: true, closure: true });
const qpsoBoth = runQPSO(defaultParams, mBoth, 42);
assert(qpsoBoth.best.fitness > 0, "Combined disruptions fitness is positive");
const visitedBoth = qpsoBoth.best.routes.flatMap((r) => r.slice(1, -1));
assert(
  visitedBoth.length === 24 && new Set(visitedBoth).size === 24,
  "Combined case: all 24 stops visited exactly once",
);
console.log(`   Combined Fitness: ${qpsoBoth.best.fitness.toFixed(3)}`);

// 6. Test Case 5: Variable Fleet Sizes (2 vehicles vs 6 vehicles)
console.log("\n--- 6. Testing Case 5: Variable Fleet Configurations ---");
const params2V: Params = { ...defaultParams, vehicles: 2, iterations: 60 };
const qpso2V = runQPSO(params2V, mNominal, 123);
assert(qpso2V.best.routes.length === 2, "Fleet size 2 produces exactly 2 routes");

const params6V: Params = { ...defaultParams, vehicles: 6, iterations: 60 };
const qpso6V = runQPSO(params6V, mNominal, 123);
assert(qpso6V.best.routes.length === 6, "Fleet size 6 produces exactly 6 routes");
console.log(
  `   2 Vehicles: ETA ${qpso2V.best.timeMin.toFixed(1)} min | Distance ${qpso2V.best.distanceKm.toFixed(1)} km`,
);
console.log(
  `   6 Vehicles: ETA ${qpso6V.best.timeMin.toFixed(1)} min | Distance ${qpso6V.best.distanceKm.toFixed(1)} km`,
);

// 7. Test Case 6: Convergence Monotonicity & Global Best Tracking
console.log("\n--- 7. Testing Case 6: Swarm Convergence Property ---");
assert(qpsoNominal.history.length === defaultParams.iterations, "History tracks every iteration");
let nonIncreasing = true;
for (let i = 1; i < qpsoNominal.history.length; i++) {
  if (qpsoNominal.history[i]! > qpsoNominal.history[i - 1]! + 1e-6) {
    nonIncreasing = false;
    break;
  }
}
assert(nonIncreasing, "Global best fitness is monotonically non-increasing across iterations");

// 8. Test Case 7: Comparison with Benchmark Heuristics (GA, ACO, SA)
console.log("\n--- 8. Testing Case 7: Head-to-Head Comparison with Benchmarks ---");
const seed = 999;
const gaRun = optimize("ga", defaultParams, { accident: false, closure: false }, seed);
const acoRun = optimize("aco", defaultParams, { accident: false, closure: false }, seed);
const saRun = optimize("sa", defaultParams, { accident: false, closure: false }, seed);

console.log(`   QPSO Best Fitness: ${qpsoNominal.best.fitness.toFixed(3)}`);
console.log(`   GA Best Fitness:   ${gaRun.best.fitness.toFixed(3)}`);
console.log(`   ACO Best Fitness:  ${acoRun.best.fitness.toFixed(3)}`);
console.log(`   SA Best Fitness:   ${saRun.best.fitness.toFixed(3)}`);

assert(
  qpsoNominal.best.fitness <= gaRun.best.fitness + 5.0,
  "QPSO competitive or superior vs Genetic Algorithm",
);
assert(
  qpsoNominal.best.fitness <= saRun.best.fitness + 5.0,
  "QPSO competitive or superior vs Simulated Annealing",
);

// 9. Test Case 8: Integration with platform optimize("qpso", ...)
console.log("\n--- 9. Testing Case 8: optimize('qpso', ...) Integration ---");
const optQpso = optimize("qpso", defaultParams, { accident: false, closure: false }, 42);
assert(optQpso.algorithm === "qpso", "optimize('qpso') returns run for algorithm qpso");
assert(Boolean(optQpso.diagnostics), "optimize('qpso') provides quantum diagnostics");
assert(
  optQpso.best.fitness === qpsoNominal.best.fitness,
  "optimize('qpso') exactly delegates to canonical runQPSO",
);

console.log("\n=================================================");
console.log(`  SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log("=================================================\n");
