/**
 * Live Incident Feed
 *
 * Simulates real-time IoT sensor and traffic management system events
 * from Bengaluru's road network, including BMTC sensors, BMLTA feeds,
 * and crowd-sourced incident reports.
 */

export type IncidentSeverity = "info" | "warning" | "critical";

export interface LiveIncident {
  id: string;
  timestamp: Date;
  title: string;
  location: string;
  severity: IncidentSeverity;
  impactedNodes: string[]; // Node IDs affected
  congestionBoost: number; // multiplier boost applied to affected edges
  ttlMs: number; // Time-to-live in ms before auto-resolve
  source: string; // "BMLTA", "IoT-Sensor", "BBMP", "Crowdsource"
  icon: string;
  resolved: boolean;
}

const INCIDENT_TEMPLATES: Omit<LiveIncident, "id" | "timestamp" | "resolved">[] = [
  {
    title: "Multi-vehicle pileup — Outer Ring Road",
    location: "Marathahalli–Bellandur Corridor",
    severity: "critical",
    impactedNodes: ["S5", "S15"],
    congestionBoost: 2.4,
    ttlMs: 45000,
    source: "BMLTA",
    icon: "🚨",
  },
  {
    title: "Road closure — BBMP maintenance",
    location: "Jayanagar 4th Block",
    severity: "warning",
    impactedNodes: ["S10", "S14"],
    congestionBoost: 1.8,
    ttlMs: 60000,
    source: "BBMP",
    icon: "🚧",
  },
  {
    title: "Heavy goods vehicle breakdown",
    location: "Tumkur Road near Peenya",
    severity: "warning",
    impactedNodes: ["S17", "S18"],
    congestionBoost: 1.6,
    ttlMs: 30000,
    source: "IoT-Sensor",
    icon: "🚛",
  },
  {
    title: "Waterlogging — monsoon overflow",
    location: "Hebbal Flyover underpass",
    severity: "critical",
    impactedNodes: ["S2", "S19"],
    congestionBoost: 3.0,
    ttlMs: 90000,
    source: "BBMP",
    icon: "🌊",
  },
  {
    title: "Political rally — VIP movement",
    location: "MG Road to Vidhana Soudha",
    severity: "warning",
    impactedNodes: ["S7", "S8"],
    congestionBoost: 2.0,
    ttlMs: 50000,
    source: "BMLTA",
    icon: "🚔",
  },
  {
    title: "Metro construction detour active",
    location: "Banashankari Station Approach",
    severity: "info",
    impactedNodes: ["S11", "S24"],
    congestionBoost: 1.4,
    ttlMs: 120000,
    source: "BMRCL",
    icon: "🏗️",
  },
  {
    title: "Signal failure — intersection down",
    location: "Koramangala 80-ft Road",
    severity: "warning",
    impactedNodes: ["S9", "S13"],
    congestionBoost: 1.7,
    ttlMs: 35000,
    source: "IoT-Sensor",
    icon: "🚦",
  },
  {
    title: "Festival procession — route blocked",
    location: "Vijayanagar Main Road",
    severity: "info",
    impactedNodes: ["S23", "S17"],
    congestionBoost: 1.5,
    ttlMs: 80000,
    source: "Crowdsource",
    icon: "🎉",
  },
  {
    title: "Fuel tanker incident — HAZMAT alert",
    location: "Electronic City Phase II Toll",
    severity: "critical",
    impactedNodes: ["S12", "S21"],
    congestionBoost: 2.8,
    ttlMs: 40000,
    source: "KSRP",
    icon: "⚠️",
  },
  {
    title: "Pothole cluster — speed limit 20 km/h",
    location: "KR Puram–Whitefield Link",
    severity: "info",
    impactedNodes: ["S3", "S4"],
    congestionBoost: 1.35,
    ttlMs: 200000,
    source: "BBMP",
    icon: "🕳️",
  },
];

let incidentCounter = 0;

function generateIncident(): LiveIncident {
  const template = INCIDENT_TEMPLATES[incidentCounter % INCIDENT_TEMPLATES.length]!;
  incidentCounter++;
  return {
    ...template,
    id: `INC-${Date.now()}-${incidentCounter}`,
    timestamp: new Date(),
    resolved: false,
  };
}

export interface IncidentFeedState {
  incidents: LiveIncident[];
  totalToday: number;
  activeCount: number;
  severityBreakdown: { info: number; warning: number; critical: number };
}

export class LiveIncidentFeed {
  private incidents: LiveIncident[] = [];
  private listeners: Array<(state: IncidentFeedState) => void> = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private totalToday = 0;

  subscribe(fn: (state: IncidentFeedState) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
  }

  getState(): IncidentFeedState {
    const active = this.incidents.filter((i) => !i.resolved);
    return {
      incidents: [...this.incidents].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      totalToday: this.totalToday,
      activeCount: active.length,
      severityBreakdown: {
        info: active.filter((i) => i.severity === "info").length,
        warning: active.filter((i) => i.severity === "warning").length,
        critical: active.filter((i) => i.severity === "critical").length,
      },
    };
  }

  start(avgIntervalMs = 12000) {
    if (this.intervalId) return;

    // Emit first incident immediately to show feed is live
    const first = generateIncident();
    this.incidents.push(first);
    this.totalToday++;
    this.scheduleAutoResolve(first);
    this.notify();

    this.intervalId = setInterval(() => {
      // 70% chance a new incident fires each interval
      if (Math.random() < 0.7) {
        const incident = generateIncident();
        this.incidents.push(incident);
        this.totalToday++;
        this.scheduleAutoResolve(incident);
        // Keep feed capped at 20 most recent
        if (this.incidents.length > 20) {
          this.incidents = this.incidents.slice(-20);
        }
        this.notify();
      }
    }, avgIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private scheduleAutoResolve(incident: LiveIncident) {
    setTimeout(() => {
      const i = this.incidents.find((x) => x.id === incident.id);
      if (i) {
        i.resolved = true;
        this.notify();
      }
    }, incident.ttlMs);
  }

  resolveAll() {
    this.incidents.forEach((i) => (i.resolved = true));
    this.notify();
  }

  injectManual(severity: IncidentSeverity) {
    const templates = INCIDENT_TEMPLATES.filter((t) => t.severity === severity);
    const t = templates[Math.floor(Math.random() * templates.length)]!;
    const incident: LiveIncident = {
      ...t,
      id: `MANUAL-${Date.now()}`,
      timestamp: new Date(),
      resolved: false,
    };
    this.incidents.push(incident);
    this.totalToday++;
    this.scheduleAutoResolve(incident);
    this.notify();
    return incident;
  }
}

// Singleton feed instance
export const globalIncidentFeed = new LiveIncidentFeed();
