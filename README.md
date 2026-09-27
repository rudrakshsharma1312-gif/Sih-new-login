# QUANTA — Quantum-Inspired Traffic Route Optimization

> Intelligent multi-vehicle route optimization on the Bengaluru road network using quantum-inspired particle swarm optimization (QPSO), benchmarked live against Genetic Algorithms (GA), Ant Colony Optimization (ACO), and Simulated Annealing (SA).

## Overview

QUANTA addresses NP-hard Capacitated Vehicle Routing Problems (CVRP) across Bengaluru's high-density traffic corridors (25 inner-city delivery hubs centered around Peenya Logistics Hub). The quantum-inspired particle swarm solver uses wave-function delta-potential well dynamics to escape local minima, achieving rapid convergence (&lt;3.5 seconds) while accounting for dynamic congestion multipliers, one-way bottlenecks, and SLA delivery windows.

## Core Features

- **Quantum-Inspired Swarm Optimization (QPSO)**:
  - Quantum delta-potential well wave equation for global swarm exploration.
  - Multi-objective fitness function: Distance + Congestion Delay + SLA Penalties + Fleet Capacity variance.
  - Real-time comparative benchmarking against Genetic Algorithms (GA), Ant Colony Optimization (ACO), and Simulated Annealing (SA).

- **Interactive Command & Dispatcher**:
  - Live route topology viewer for 25 Bengaluru inner-city hub locations.
  - Manual waypoint reordering with live distance, ETA, and capacity recalculation.
  - Direct route dispatching to driver cockpits.

- **Driver Mobile Cockpit**:
  - Distraction-free mobile UI designed for delivery drivers on the road.
  - Turn-by-turn navigation guidance with browser Text-to-Speech (TTS) audio alerts.
  - Live progress checklists, package verification, and customer signature capture.

- **Fleet Manager Dashboard & SLA Analytics**:
  - Driver database management (add, edit, toggle active status, vehicle assignment).
  - Historical delivery analytics and SLA compliance tracking via interactive Recharts.
  - Live network disruption injector (accidents, construction closures, peak-hour bottlenecks).

## Development Setup

Requirements:

- Node.js 18+
- npm or bun

```sh
# Install dependencies
npm install

# Run development server
npm run dev
```

The application will start on `http://localhost:3000`.

## Production Build

```sh
npm run build
npm run start
```

## Tech Stack

- **Framework**: React, TypeScript, TanStack Start & Router
- **State & Data**: TanStack React Query, Firebase Firestore & Authentication
- **Styling**: Tailwind CSS
- **Visualization**: HTML5 Canvas, Recharts, Google Maps JavaScript API (with SVG Vector Fallback)
