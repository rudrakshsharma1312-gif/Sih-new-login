import { useState } from "react";
import type { Params } from "@/lib/optimizer";
import type { Scenario } from "@/lib/network";
import { useAuth } from "@/lib/auth-context";
import { DriverDatabaseManager } from "@/components/DriverDatabaseManager";

type Props = {
  params: Params;
  onParams: (next: Params) => void;
  scenario: Scenario;
  onScenario: (next: Scenario) => void;
  onRun: () => void;
  running: boolean;
};

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] text-mist">{label}</span>
        <span className="font-mono text-[12px] text-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-ember [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ember"
      />
      <div className="mt-1 flex justify-between font-mono text-[9px] text-faint">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function ControlRail({ params, onParams, scenario, onScenario, onRun, running }: Props) {
  const { drivers } = useAuth();
  const [showDriverDb, setShowDriverDb] = useState(false);
  const [openForNewDriver, setOpenForNewDriver] = useState(false);

  const w = params.weights;
  const setWeight = (key: keyof typeof w, v: number) =>
    onParams({ ...params, weights: { ...w, [key]: v } });

  const handleVehiclesChange = (v: number) => {
    onParams({ ...params, vehicles: v });
    if (v > params.vehicles && v > drivers.length) {
      setOpenForNewDriver(true);
      setShowDriverDb(true);
    }
  };

  return (
    <div className="panel relative flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ember">Optimizer</p>
        <span className="font-mono text-[10px] text-faint">QPSO · cfg</span>
      </div>

      <Slider
        label="Swarm particles"
        value={params.swarm}
        min={10}
        max={60}
        onChange={(v) => onParams({ ...params, swarm: v })}
      />
      <Slider
        label="Max iterations"
        value={params.iterations}
        min={40}
        max={300}
        step={10}
        onChange={(v) => onParams({ ...params, iterations: v })}
      />
      <div>
        <Slider
          label="Fleet vehicles"
          value={params.vehicles}
          min={2}
          max={6}
          onChange={handleVehiclesChange}
        />
        {params.vehicles > drivers.length && (
          <div className="mt-2 rounded-lg border border-ember/40 bg-ember/10 p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-bold text-ember">VEHICLE UNASSIGNED</span>
              <span className="font-mono text-[9px] text-faint">
                {drivers.length} / {params.vehicles} Drivers
              </span>
            </div>
            <p className="mt-1 text-[11px] text-mist">
              Increased to {params.vehicles} vehicles. Register driver details in database.
            </p>
            <button
              type="button"
              onClick={() => {
                setOpenForNewDriver(true);
                setShowDriverDb(true);
              }}
              className="mt-2 w-full rounded bg-ember px-2 py-1 font-display text-[11px] font-semibold text-void hover:bg-foreground hover:text-background transition"
            >
              + Register Driver to Database
            </button>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="font-mono text-faint">Database:</span>
          <button
            type="button"
            onClick={() => {
              setOpenForNewDriver(false);
              setShowDriverDb(true);
            }}
            className="font-mono text-xs text-ember hover:underline"
          >
            {drivers.length} Drivers Registered →
          </button>
        </div>
      </div>

      <div className="h-px bg-line" />
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
        Fitness weights
      </p>
      <div className="flex flex-col gap-4">
        <Slider
          label="Travel time α"
          value={w.time}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => setWeight("time", v)}
        />
        <Slider
          label="Distance β"
          value={w.distance}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => setWeight("distance", v)}
        />
        <Slider
          label="Congestion γ"
          value={w.congestion}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => setWeight("congestion", v)}
        />
        <Slider
          label="Emissions δ"
          value={w.emissions}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => setWeight("emissions", v)}
        />
      </div>

      <div className="h-px bg-line" />
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
        Scenario injection
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onScenario({ ...scenario, accident: !scenario.accident })}
          className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-[12px] transition-colors ${
            scenario.accident
              ? "border-ember/40 bg-ember/10 text-ember"
              : "border-line bg-glass/40 text-mist hover:border-faint"
          }`}
        >
          <span>Accident · Marathahalli–Whitefield</span>
          <span className="font-mono text-[10px]">{scenario.accident ? "ON" : "OFF"}</span>
        </button>
        <button
          onClick={() => onScenario({ ...scenario, closure: !scenario.closure })}
          className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-[12px] transition-colors ${
            scenario.closure
              ? "border-ember/40 bg-ember/10 text-ember"
              : "border-line bg-glass/40 text-mist hover:border-faint"
          }`}
        >
          <span>Closure · MG Road links</span>
          <span className="font-mono text-[10px]">{scenario.closure ? "ON" : "OFF"}</span>
        </button>
      </div>

      <button
        onClick={onRun}
        disabled={running}
        className="mt-1 w-full rounded-full bg-ember py-3 text-[13px] font-semibold text-void transition-colors hover:bg-foreground hover:text-background disabled:opacity-60"
      >
        {running ? "Solving…" : "Run optimization"}
      </button>

      {/* Driver Database Modal */}
      <DriverDatabaseManager
        isOpen={showDriverDb}
        onClose={() => setShowDriverDb(false)}
        highlightNewRegistration={openForNewDriver}
      />
    </div>
  );
}
