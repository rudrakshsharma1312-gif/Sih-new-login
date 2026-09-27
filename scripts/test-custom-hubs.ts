/**
 * Test Suite for Dynamic Base and Destination Hubs across QPSO, GA, ACO, QSO
 */

import {
  PRESET_HUBS,
  getActiveNodes,
  getDestNodeIndex,
  buildMatrices,
  type NetworkConfig,
} from "../src/lib/network";
import { optimize } from "../src/lib/optimizer";
import { searchBengaluruLocations, reverseGeocodeLocation } from "../src/lib/location-service";
import type { Params } from "../src/lib/optimizer";

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

const params: Params = {
  swarm: 25,
  iterations: 40,
  vehicles: 3,
  weights: { time: 0.4, distance: 0.3, congestion: 0.2, emissions: 0.1 },
};

console.log("==========================================================");
console.log("  TESTING DYNAMIC BASE & DESTINATION HUBS & ALGORITHMS   ");
console.log("==========================================================\n");

// --- 1. Testing Location Search & Geocoding Service ---
console.log("--- 1. Testing Location Search & Geocoding Service ---");
async function testLocationService() {
  const airportResults = await searchBengaluruLocations("Airport");
  assert(airportResults.length > 0, "Finds Airport Cargo terminal in directory");
  assert(
    airportResults[0]!.name.includes("Airport") || airportResults[0]!.tag?.includes("Cargo"),
    "Airport search returns relevant cargo hub",
  );

  const whitefieldResults = await searchBengaluruLocations("Whitefield");
  assert(whitefieldResults.length > 0, "Finds Whitefield Freight Hub");

  const rev = await reverseGeocodeLocation(13.0287, 77.5199);
  assert(rev.lat === 13.0287 && rev.lng === 77.5199, "Reverse geocodes coordinates correctly");
}

await testLocationService();

// --- 2. Testing Case A: Custom Base (Nelamangala) Round-Trip ---
console.log("\n--- 2. Testing Case A: Custom Base (Nelamangala) Round-Trip ---");
const nelamangalaHub = PRESET_HUBS.find((h) => h.id === "nelamangala")!;
const configRoundTrip: NetworkConfig = {
  pickupHub: nelamangalaHub,
  destinationHub: nelamangalaHub,
  isRoundTrip: true,
};

const nodesRoundTrip = getActiveNodes(configRoundTrip);
const destIdxRoundTrip = getDestNodeIndex(configRoundTrip);
assert(nodesRoundTrip.length === 25, "Round trip network contains 25 nodes (1 base + 24 stops)");
assert(destIdxRoundTrip === 0, "Round trip destination node index is 0");
assert(nodesRoundTrip[0]!.name === nelamangalaHub.name, "Node 0 matches Nelamangala Base Hub");

// Run QPSO with Nelamangala base
const qpsoRound = optimize(
  "qpso",
  params,
  { accident: false, closure: false },
  10,
  configRoundTrip,
);
assert(qpsoRound.best.fitness > 0, "QPSO solves Nelamangala round-trip");
for (const route of qpsoRound.best.routes) {
  assert(route[0] === 0, "Vehicle starts at Nelamangala Base 0");
  assert(route[route.length - 1] === 0, "Vehicle finishes at Nelamangala Base 0");
}
console.log(
  `   QPSO Nelamangala Round-Trip: ${qpsoRound.best.distanceKm.toFixed(1)}km, ETA: ${qpsoRound.best.timeMin.toFixed(1)}min`,
);

// --- 3. Testing Case B: Open-Loop Freight Corridor (Peenya Base -> Kempegowda Airport Terminus) ---
console.log("\n--- 3. Testing Case B: Open-Loop Corridor (Peenya Base -> BLR Cargo Terminus) ---");
const peenyaHub = PRESET_HUBS.find((h) => h.id === "peenya")!;
const airportHub = PRESET_HUBS.find((h) => h.id === "airport")!;
const configOpenLoop: NetworkConfig = {
  pickupHub: peenyaHub,
  destinationHub: airportHub,
  isRoundTrip: false,
};

const nodesOpenLoop = getActiveNodes(configOpenLoop);
const destIdxOpenLoop = getDestNodeIndex(configOpenLoop);
assert(
  nodesOpenLoop.length === 26,
  "Open loop network contains 26 nodes (1 base + 24 stops + 1 destination)",
);
assert(destIdxOpenLoop === 25, "Open loop destination node index is 25");
assert(nodesOpenLoop[0]!.name === peenyaHub.name, "Node 0 is Peenya Base Origin");
assert(nodesOpenLoop[25]!.name === airportHub.name, "Node 25 is Kempegowda Airport Terminus");

// Run all 4 algorithms on the open-loop corridor
console.log("\n--- 4. Benchmarking All 4 Algorithms on Open-Loop Freight Corridor ---");
const qpsoOpen = optimize("qpso", params, { accident: false, closure: false }, 11, configOpenLoop);
const gaOpen = optimize("ga", params, { accident: false, closure: false }, 11, configOpenLoop);
const acoOpen = optimize("aco", params, { accident: false, closure: false }, 11, configOpenLoop);
const qsoOpen = optimize("qso", params, { accident: false, closure: false }, 11, configOpenLoop);

assert(qpsoOpen.best.routes.length === 3, "QPSO produces 3 vehicle routes");
for (const r of qpsoOpen.best.routes) {
  assert(r[0] === 0, "QPSO route starts at Peenya Origin 0");
  assert(r[r.length - 1] === 25, "QPSO route ends at Airport Terminus 25");
}

assert(gaOpen.best.routes.length === 3, "GA produces 3 vehicle routes");
for (const r of gaOpen.best.routes) {
  assert(r[0] === 0, "GA route starts at Peenya Origin 0");
  assert(r[r.length - 1] === 25, "GA route ends at Airport Terminus 25");
}

assert(acoOpen.best.routes.length === 3, "ACO produces 3 vehicle routes");
for (const r of acoOpen.best.routes) {
  assert(r[0] === 0, "ACO route starts at Peenya Origin 0");
  assert(r[r.length - 1] === 25, "ACO route ends at Airport Terminus 25");
}

assert(qsoOpen.best.routes.length === 3, "QSO produces 3 vehicle routes");
for (const r of qsoOpen.best.routes) {
  assert(r[0] === 0, "QSO route starts at Peenya Origin 0");
  assert(r[r.length - 1] === 25, "QSO route ends at Airport Terminus 25");
}

console.log(
  `   [QPSO] Open Corridor: Fitness ${qpsoOpen.best.fitness.toFixed(2)} | Distance ${qpsoOpen.best.distanceKm.toFixed(1)}km | Runtime ${qpsoOpen.runtimeMs}ms`,
);
console.log(
  `   [GA]   Open Corridor: Fitness ${gaOpen.best.fitness.toFixed(2)} | Distance ${gaOpen.best.distanceKm.toFixed(1)}km | Runtime ${gaOpen.runtimeMs}ms`,
);
console.log(
  `   [ACO]  Open Corridor: Fitness ${acoOpen.best.fitness.toFixed(2)} | Distance ${acoOpen.best.distanceKm.toFixed(1)}km | Runtime ${acoOpen.runtimeMs}ms`,
);
console.log(
  `   [QSO]  Open Corridor: Fitness ${qsoOpen.best.fitness.toFixed(2)} | Distance ${qsoOpen.best.distanceKm.toFixed(1)}km | Runtime ${qsoOpen.runtimeMs}ms`,
);

console.log("\n==========================================================");
console.log(`  SUMMARY: ${passed} / ${passed + failed} TESTS PASSED`);
console.log("==========================================================");

if (failed > 0) process.exit(1);
