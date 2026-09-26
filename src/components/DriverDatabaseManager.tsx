import { useState } from "react";
import { useAuth, type DriverUser } from "@/lib/auth-context";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  highlightNewRegistration?: boolean;
}

export function DriverDatabaseManager({
  isOpen,
  onClose,
  highlightNewRegistration = false,
}: Props) {
  const { user, drivers, company, registerDriver, removeDriver } = useAuth();

  const currentManagerName =
    user?.role === "manager" ? user.managerName : (company?.managerName ?? "Dr. Rajesh Sharma");
  const currentCompanyName =
    user?.role === "manager" ? user.companyName : (company?.companyName ?? "Egreen Quanta Fleet");

  const [showAddForm, setShowAddForm] = useState(highlightNewRegistration);
  const [driverName, setDriverName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [password, setPassword] = useState("driver123");
  const [companyName, setCompanyName] = useState(currentCompanyName);
  const [managerName, setManagerName] = useState(currentManagerName);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await registerDriver({
      driverName,
      mobileNo,
      password,
      companyName: companyName.trim() || currentCompanyName,
      managerName: managerName.trim() || currentManagerName,
      vehicleIndex: drivers.length,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Failed to register driver.");
    } else {
      // Reset form
      setDriverName("");
      setMobileNo("");
      setPassword("driver123");
      setShowAddForm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-md">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-line bg-gradient-to-b from-glass to-obsidian p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="glowdot size-2 rounded-full bg-ember" />
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ember">
                Fleet Logistics Registry · Manager Isolated
              </p>
            </div>
            <h2 className="mt-1 font-display text-xl font-bold text-foreground">
              Driver Database & Vehicle Roster
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mist">
              <span>
                Company: <strong className="text-foreground">{currentCompanyName}</strong>
              </span>
              <span>·</span>
              <span>
                Fleet Manager: <strong className="text-foreground">{currentManagerName}</strong>
              </span>
              <span>·</span>
              <span className="rounded bg-ember/15 px-2 py-0.5 font-mono text-[10px] font-bold text-ember">
                {drivers.length} Drivers Active
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-line bg-glasshi px-3 py-1 text-xs text-mist hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Manager Security & Isolation Banner */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-line/70 bg-void/60 px-3.5 py-2.5 text-xs text-mist">
          <span className="text-base">🔒</span>
          <p className="text-[11px] leading-relaxed">
            <strong className="text-foreground">Manager Privacy Isolation:</strong> Only drivers
            registered under your account (
            <span className="text-ember font-medium">{currentManagerName}</span> ·{" "}
            <span className="text-foreground font-medium">{currentCompanyName}</span>) are shown
            here. Other manager accounts have no access to your driver roster or vehicle telemetry.
          </p>
        </div>

        {/* Action bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-mist">
            Drivers authenticate with their mobile number and password to view their individual
            cockpit route.
          </p>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setError(null);
            }}
            className="flex items-center gap-2 rounded-lg bg-ember px-3.5 py-1.5 font-display text-xs font-semibold text-void hover:bg-foreground hover:text-background"
          >
            <span>{showAddForm ? "Cancel Registration" : "+ Register New Driver"}</span>
          </button>
        </div>

        {/* Form: Register Driver to Driver Database */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="mt-4 rounded-xl border border-ember/40 bg-void/70 p-4 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Register New Driver to Database
                </h3>
                <p className="text-[11px] text-mist">
                  Driver will be assigned to your company & registered under your manager profile.
                </p>
              </div>
              <span className="font-mono text-[10px] text-ember">
                Will assign Vehicle #{drivers.length + 1}
              </span>
            </div>

            {error && (
              <div className="mb-3 rounded border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-[10px] uppercase text-mist">
                  Driver Name *
                </label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Harish Chandra"
                  className="mt-1 w-full rounded border border-line bg-obsidian px-3 py-1.5 text-xs text-foreground focus:border-ember focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-mist">
                  Mobile No. *
                </label>
                <input
                  type="tel"
                  required
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  placeholder="e.g. 9845067890"
                  className="mt-1 w-full rounded border border-line bg-obsidian px-3 py-1.5 text-xs text-foreground focus:border-ember focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block font-mono text-[10px] uppercase text-mist">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password for driver login"
                  className="mt-1 w-full rounded border border-line bg-obsidian px-3 py-1.5 text-xs text-foreground focus:border-ember focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-mist">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Egreen Quanta Fleet"
                  className="mt-1 w-full rounded border border-line bg-obsidian px-3 py-1.5 text-xs text-foreground focus:border-ember focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-mist">
                  Manager Name (You) *
                </label>
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="mt-1 w-full rounded border border-line bg-obsidian px-3 py-1.5 text-xs text-foreground focus:border-ember focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded border border-line bg-glass px-3 py-1.5 text-xs text-mist hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-ember px-4 py-1.5 text-xs font-semibold text-void hover:bg-foreground hover:text-background"
              >
                {loading ? "Saving..." : "Save to Driver Database"}
              </button>
            </div>
          </form>
        )}

        {/* Database Roster Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-obsidian/90 font-mono text-[10px] uppercase tracking-wider text-mist">
              <tr>
                <th className="px-3.5 py-2.5">Vehicle</th>
                <th className="px-3.5 py-2.5">Driver Name</th>
                <th className="px-3.5 py-2.5">Mobile No.</th>
                <th className="px-3.5 py-2.5">Company Name</th>
                <th className="px-3.5 py-2.5">Registered By Manager</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5">Password</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 bg-glass/30">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-xs text-mist font-mono">
                    No drivers registered yet for your manager account. Click "+ Register New
                    Driver" to add drivers.
                  </td>
                </tr>
              ) : (
                drivers.map((d: DriverUser) => (
                  <tr key={d.id} className="hover:bg-glasshi/30 transition-colors">
                    <td className="px-3.5 py-3 font-mono font-semibold text-ember">
                      VEH-#{String(d.vehicleIndex + 1).padStart(2, "0")}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-foreground">{d.driverName}</td>
                    <td className="px-3.5 py-3 font-mono text-mist">{d.mobileNo}</td>
                    <td className="px-3.5 py-3 text-mist font-medium">{d.companyName}</td>
                    <td className="px-3.5 py-3">
                      <span className="rounded bg-glasshi px-2 py-0.5 font-mono text-[10px] text-ember border border-line/60">
                        {d.managerName || currentManagerName}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase font-semibold ${
                          d.status === "Active"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : d.status === "Standby"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-ember/15 text-ember"
                        }`}
                      >
                        {d.status ?? "Active"}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-faint">
                      {d.password ? "••••••••" : "driver123"}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      {drivers.length > 1 && (
                        <button
                          onClick={() => removeDriver(d.id)}
                          className="font-mono text-[10px] text-destructive hover:underline cursor-pointer"
                          title="Remove driver from fleet"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 text-[11px] text-mist">
          <span>Synced with Firebase Firestore (Database: {currentCompanyName})</span>
          <button
            onClick={onClose}
            className="rounded-md bg-glasshi px-4 py-1.5 text-xs text-foreground hover:bg-line cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
