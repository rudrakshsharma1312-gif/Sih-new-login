# QUANTA — Quantum-Inspired Traffic Route Optimization

> Intelligent multi-vehicle route optimization on the Bengaluru road network using quantum-inspired particle swarm optimization (QPSO), benchmarked live against Genetic Algorithms (GA), Ant Colony Optimization (ACO), and Quantum Swarm Optimization (QSO).

---

## Overview

**QUANTA** solves NP-hard Capacitated Vehicle Routing Problems (CVRP) across Bengaluru's high-density traffic corridors (25 inner-city delivery hubs centered around Peenya Logistics Hub or customizable dynamic origins). 

The quantum-inspired particle swarm solver uses wave-function delta-potential well dynamics to escape local minima, achieving rapid convergence (&lt;3.5 seconds) while accounting for dynamic congestion multipliers, one-way bottlenecks, variable fleet sizes, and SLA delivery windows.

---

## Core Features

### 1. Quantum-Inspired Swarm Optimization (QPSO)
- **Delta-Potential Well Dynamics**: Particle positions are governed by quantum wave equations rather than Newtonian velocity vectors, enabling quantum tunneling through sub-optimal local barriers.
- **Ranked Order Value (ROV)**: Maps continuous quantum state coordinates directly to bijective discrete waypoint permutations.
- **Multi-Objective Fitness**: Evaluates Total Route Distance + Real-time Congestion Multipliers + Peak-Hour Delays + SLA Penalty Variance + Fleet Capacity Distribution.

### 2. 4-Way Algorithmic Showdown
- Compare live performance across 4 distinct heuristic and quantum engines:
  - **QPSO**: Quantum-Inspired Particle Swarm Optimization (global exploration via quantum tunneling).
  - **GA**: Genetic Algorithm (order-crossover OX1 and swap mutation).
  - **ACO**: Ant Colony Optimization (pheromone-evaporation heuristic path selection).
  - **QSO**: Quantum Swarm Optimization (multi-particle state vector annealing).
- Real-time convergence curves, iteration tracking, and execution runtime benchmarking.

### 3. Dynamic Base Origin & Destination Hubs
- **Round-Trip Corridors**: Vehicles depart and return to a chosen base depot (e.g., Peenya Logistics Hub, Nelamangala Industrial Area, Whitefield Freight Hub).
- **Open-Loop Express Corridors**: Vehicles depart from a logistics origin and terminate at a separate hub (e.g., Kempegowda Airport Terminus or Electronic City).
- Built-in location search and geocoding service for custom pickup/dropoff coordinates.

### 4. Fleet Manager Dashboard & SLA Analytics
- Real-time network disruption injection (corridor accidents, road closures, peak congestion).
- Interactive SVG & Google Maps vector visualization of all vehicle delivery paths.
- Driver management: Register, edit, toggle driver status, and assign live optimized routes.
- Fleet SLA compliance tracking and analytics using interactive Recharts.

### 5. Driver Mobile Cockpit
- Mobile-optimized interface for delivery drivers on the road.
- Turn-by-turn waypoint navigation with built-in browser Text-to-Speech (TTS) voice alerts.
- Live progress checklist, delivery confirmation, and customer signature capture.

### 6. Full-Stack Architecture & Authentication
- **Nitro SSR & API Router**: Integrated server routes for company manager and driver authentication (`/api/auth/*`), driver databases (`/api/drivers`), and route assignments (`/api/route-assignments`).
- **Firebase Firestore**: Persistent schema storage for companies, registered drivers, and real-time route assignments.

---

## Tech Stack

- **Frontend & Routing**: React 19, TypeScript, TanStack Start & TanStack Router
- **Backend & SSR**: Nitro 3 Server Engine with Vite SSR
- **State & Data Management**: TanStack React Query, Firebase Firestore & Authentication
- **Styling & UI Components**: Tailwind CSS, Radix UI primitives, Lucide Icons
- **Visualization**: HTML5 Canvas, Recharts, Google Maps JavaScript API (with SVG vector fallback)
- **Algorithms**: TypeScript (client/server solver) & Python (research inspection notebook & benchmark suite)

---

## Getting Started

### Prerequisites

- Node.js 18+ (Node.js 20+ recommended)
- npm or bun
- Python 3.10+ *(optional, for running standalone Python benchmarks)*

### Installation

```bash
# Clone the repository
git clone https://github.com/rudrakshsharma1312-gif/Sih-new-login.git
cd Sih-new-login

# Install project dependencies
npm install
```

### Environment Configuration

Create a `.env` file in the root directory (refer to `.env.example`):

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Development Server

```bash
npm run dev
```

The application will start on `http://localhost:3000`.

### Production Build

```bash
# Compile client and server bundles
npm run build

# Preview production build locally
npm run preview
```

---

## Automated Test Suites

QUANTA includes comprehensive test suites covering algorithmic convergence, dynamic routing, and benchmark correctness:

```bash
# Test Quantum Particle Swarm Optimization (ROV decoding, delta-well dynamics, nominal & accident scenarios)
npx tsx scripts/test-qpso.ts

# Test 4-way benchmark algorithms (GA, ACO, QSO, fleet scaling, disruption resilience)
npx tsx scripts/test-benchmarks.ts

# Test dynamic custom base & destination hubs (open-loop corridors & geocoding)
npx tsx scripts/test-custom-hubs.ts
```

---

## Project Structure

```text
├── algorithm/               # Python QPSO implementation & Jupyter inspection notebook
├── benchmark/               # Academic Python benchmark comparison suite
├── scripts/                 # Automated test suites for QPSO, benchmarks, and hubs
├── src/
│   ├── components/          # UI components (CityMap, DriverCockpit, HubSelectorBar, etc.)
│   ├── lib/                 # Core algorithms (qpso.ts, ga.ts, aco.ts, qso.ts, network.ts)
│   ├── routes/              # TanStack file-based routes (index, optimizer, fleet, benchmark)
│   ├── server/              # Nitro SSR API router, database layer, validation, and crypto
│   └── styles.css           # Global Tailwind styling
├── firebase-blueprint.json  # Firestore entities & security schemas
├── vite.config.ts           # Vite and TanStack Start configuration
└── package.json             # Project dependencies and run scripts
```

---

## License

This project was built for Smart India Hackathon (SIH) under the MIT License.
