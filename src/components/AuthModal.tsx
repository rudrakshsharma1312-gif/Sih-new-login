import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  defaultTab?: "manager-login" | "driver-login" | "manager-signup" | "driver-signup";
}

export function AuthModal({ isOpen, onClose, defaultTab = "manager-login" }: AuthModalProps) {
  const {
    loginManager,
    loginDriver,
    signupManager,
    registerDriver,
    company,
    drivers,
    switchDriverForDemo,
  } = useAuth();

  const [tab, setTab] = useState<
    "manager-login" | "driver-login" | "manager-signup" | "driver-signup"
  >(defaultTab);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Manager login form state
  const [mgrIdentifier, setMgrIdentifier] = useState(company?.companyName ?? "Egreen Quanta Fleet");
  const [mgrPassword, setMgrPassword] = useState("manager123");

  // Driver login form state
  const [driverMobile, setDriverMobile] = useState("9845012345");
  const [driverPassword, setDriverPassword] = useState("driver123");

  // Manager signup form state
  const [signupCompany, setSignupCompany] = useState("");
  const [signupManagerName, setSignupManagerName] = useState("");
  const [signupMobile, setSignupMobile] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [driverCount, setDriverCount] = useState(3);
  const [driverList, setDriverList] = useState<
    Array<{ driverName: string; mobileNo: string; password: string }>
  >([
    { driverName: "", mobileNo: "", password: "" },
    { driverName: "", mobileNo: "", password: "" },
    { driverName: "", mobileNo: "", password: "" },
  ]);

  // Driver direct register form state
  const [singleDriverName, setSingleDriverName] = useState("");
  const [singleDriverMobile, setSingleDriverMobile] = useState("");
  const [singleDriverPassword, setSingleDriverPassword] = useState("");
  const [singleDriverCompany, setSingleDriverCompany] = useState(
    company?.companyName ?? "Egreen Quanta Fleet",
  );

  const handleDriverCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(10, count));
    setDriverCount(validCount);
    setDriverList((prev) => {
      const next = [...prev];
      while (next.length < validCount) {
        next.push({ driverName: "", mobileNo: "", password: "" });
      }
      return next.slice(0, validCount);
    });
  };

  const handleDriverFieldChange = (
    index: number,
    field: "driverName" | "mobileNo" | "password",
    value: string,
  ) => {
    setDriverList((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleManagerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await loginManager(mgrIdentifier, mgrPassword);
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Failed to log in.");
    } else if (onClose) {
      onClose();
    }
  };

  const handleDriverLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await loginDriver(driverMobile, driverPassword);
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Failed to log in.");
    } else if (onClose) {
      onClose();
    }
  };

  const handleManagerSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signupManager({
      companyName: signupCompany,
      managerName: signupManagerName,
      password: signupPassword,
      mobile: signupMobile,
      driverCount,
      drivers: driverList,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Failed to sign up manager.");
    } else if (onClose) {
      onClose();
    }
  };

  const handleDriverSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await registerDriver({
      driverName: singleDriverName,
      mobileNo: singleDriverMobile,
      password: singleDriverPassword,
      companyName: singleDriverCompany,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Failed to register driver.");
    } else {
      // Log in immediately as that driver
      await loginDriver(singleDriverMobile, singleDriverPassword);
      if (onClose) onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/85 p-4 backdrop-blur-md">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-gradient-to-b from-glass to-obsidian p-6 shadow-2xl shadow-ember/10">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="glowdot size-2 rounded-full bg-ember" />
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ember">
                Access Control & Fleet Auth
              </p>
            </div>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
              QUANTA Fleet Portal
            </h2>
            <p className="mt-0.5 text-xs text-mist">
              Select role to enter: Manager (Full Command) or Driver (Assigned Route & Map)
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg border border-line bg-glasshi/50 px-2.5 py-1 text-xs text-mist hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-line bg-obsidian/60 p-1 sm:grid-cols-4">
          <button
            onClick={() => {
              setTab("manager-login");
              setError(null);
            }}
            className={`rounded-md px-2.5 py-1.5 text-center font-mono text-[11px] uppercase tracking-wider transition-all ${
              tab === "manager-login"
                ? "bg-ember text-void font-bold shadow"
                : "text-mist hover:text-foreground"
            }`}
          >
            Manager Login
          </button>
          <button
            onClick={() => {
              setTab("driver-login");
              setError(null);
            }}
            className={`rounded-md px-2.5 py-1.5 text-center font-mono text-[11px] uppercase tracking-wider transition-all ${
              tab === "driver-login"
                ? "bg-ember text-void font-bold shadow"
                : "text-mist hover:text-foreground"
            }`}
          >
            Driver Login
          </button>
          <button
            onClick={() => {
              setTab("manager-signup");
              setError(null);
            }}
            className={`rounded-md px-2.5 py-1.5 text-center font-mono text-[11px] uppercase tracking-wider transition-all ${
              tab === "manager-signup"
                ? "bg-ember text-void font-bold shadow"
                : "text-mist hover:text-foreground"
            }`}
          >
            Manager Sign-Up
          </button>
          <button
            onClick={() => {
              setTab("driver-signup");
              setError(null);
            }}
            className={`rounded-md px-2.5 py-1.5 text-center font-mono text-[11px] uppercase tracking-wider transition-all ${
              tab === "driver-signup"
                ? "bg-ember text-void font-bold shadow"
                : "text-mist hover:text-foreground"
            }`}
          >
            Driver Register
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* TAB 1: MANAGER LOGIN */}
        {tab === "manager-login" && (
          <form onSubmit={handleManagerLoginSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                Company Name or Manager Name
              </label>
              <input
                type="text"
                required
                value={mgrIdentifier}
                onChange={(e) => setMgrIdentifier(e.target.value)}
                placeholder="e.g. Egreen Quanta Fleet"
                className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                Password
              </label>
              <input
                type="password"
                required
                value={mgrPassword}
                onChange={(e) => setMgrPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-ember py-2.5 font-display text-sm font-semibold text-void transition hover:bg-foreground hover:text-background"
            >
              {loading ? "Logging in..." : "Login as Fleet Manager (Full Access)"}
            </button>

            {/* Quick Demo Pre-load */}
            <div className="mt-4 rounded-lg border border-line/60 bg-glass/40 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
                ⚡ Quick Demo Access:
              </p>
              <button
                type="button"
                onClick={() => {
                  setMgrIdentifier("Egreen Quanta Fleet");
                  setMgrPassword("manager123");
                  loginManager("Egreen Quanta Fleet", "manager123").then(() => {
                    if (onClose) onClose();
                  });
                }}
                className="mt-1.5 text-xs text-ember underline hover:text-foreground"
              >
                Log in as Default Manager (Dr. Rajesh Sharma · Egreen Quanta)
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: DRIVER LOGIN */}
        {tab === "driver-login" && (
          <form onSubmit={handleDriverLoginSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                Driver Registered Mobile Number
              </label>
              <input
                type="tel"
                required
                value={driverMobile}
                onChange={(e) => setDriverMobile(e.target.value)}
                placeholder="e.g. 9845012345"
                className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                Password
              </label>
              <input
                type="password"
                required
                value={driverPassword}
                onChange={(e) => setDriverPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-ember py-2.5 font-display text-sm font-semibold text-void transition hover:bg-foreground hover:text-background"
            >
              {loading ? "Authenticating..." : "Login as Driver (View Single Assigned Route)"}
            </button>

            {/* Quick Driver Switches */}
            <div className="mt-4 rounded-lg border border-line/60 bg-glass/40 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
                ⚡ 1-Click Driver Demo (Tests route isolation):
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {drivers.slice(0, 4).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      switchDriverForDemo(d.id);
                      if (onClose) onClose();
                    }}
                    className="rounded-md border border-line bg-obsidian px-2.5 py-1 text-[11px] text-mist hover:border-ember hover:text-ember"
                  >
                    🚗 {d.driverName} (Vehicle #{d.vehicleIndex + 1})
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: MANAGER SIGN-UP (WITH DYNAMIC DRIVER DETAILS) */}
        {tab === "manager-signup" && (
          <form onSubmit={handleManagerSignupSubmit} className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={signupCompany}
                  onChange={(e) => setSignupCompany(e.target.value)}
                  placeholder="e.g. Apex Bengaluru Freight"
                  className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                  Manager Name *
                </label>
                <input
                  type="text"
                  required
                  value={signupManagerName}
                  onChange={(e) => setSignupManagerName(e.target.value)}
                  placeholder="e.g. Vikram Sethi"
                  className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                  Manager Mobile / Contact *
                </label>
                <input
                  type="tel"
                  required
                  value={signupMobile}
                  onChange={(e) => setSignupMobile(e.target.value)}
                  placeholder="e.g. 9811223344"
                  className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                  Manager Password *
                </label>
                <input
                  type="password"
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Minimum 4 characters"
                  className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                />
              </div>
            </div>

            {/* No. of Drivers Input */}
            <div className="rounded-xl border border-line bg-glass/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ember">
                    No. of Drivers in Fleet:
                  </label>
                  <p className="text-[11px] text-mist">
                    Specify how many drivers to register now (adds dynamic fields below)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDriverCountChange(driverCount - 1)}
                    className="flex size-7 items-center justify-center rounded border border-line bg-obsidian text-sm text-foreground hover:bg-glasshi"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={driverCount}
                    onChange={(e) => handleDriverCountChange(parseInt(e.target.value) || 1)}
                    className="w-12 rounded border border-line bg-void text-center font-mono text-sm text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => handleDriverCountChange(driverCount + 1)}
                    className="flex size-7 items-center justify-center rounded border border-line bg-obsidian text-sm text-foreground hover:bg-glasshi"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Dynamic driver registration cards according to no. of driver entered */}
              <div className="mt-4 space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  Drivers Registration Details ({driverCount} Drivers):
                </p>
                {driverList.map((drv, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-line/80 bg-obsidian/70 p-3 text-xs"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono font-semibold text-ember">
                        Driver #{idx + 1} (Vehicle #{idx + 1})
                      </span>
                      <span className="font-mono text-[10px] text-faint">
                        Company: {signupCompany || "Your Company"}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Driver Name"
                          value={drv.driverName}
                          onChange={(e) =>
                            handleDriverFieldChange(idx, "driverName", e.target.value)
                          }
                          className="w-full rounded border border-line bg-void px-2.5 py-1.5 text-xs text-foreground focus:border-ember focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="tel"
                          required
                          placeholder="Mobile No."
                          value={drv.mobileNo}
                          onChange={(e) => handleDriverFieldChange(idx, "mobileNo", e.target.value)}
                          className="w-full rounded border border-line bg-void px-2.5 py-1.5 text-xs text-foreground focus:border-ember focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          required
                          placeholder="Password"
                          value={drv.password}
                          onChange={(e) => handleDriverFieldChange(idx, "password", e.target.value)}
                          className="w-full rounded border border-line bg-void px-2.5 py-1.5 text-xs text-foreground focus:border-ember focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-ember py-2.5 font-display text-sm font-semibold text-void transition hover:bg-foreground hover:text-background"
            >
              {loading ? "Registering Fleet..." : "Complete Manager & Drivers Registration"}
            </button>
          </form>
        )}

        {/* TAB 4: INDIVIDUAL DRIVER REGISTRATION */}
        {tab === "driver-signup" && (
          <form onSubmit={handleDriverSignupSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                Driver Name *
              </label>
              <input
                type="text"
                required
                value={singleDriverName}
                onChange={(e) => setSingleDriverName(e.target.value)}
                placeholder="e.g. Anand Murthy"
                className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={singleDriverMobile}
                onChange={(e) => setSingleDriverMobile(e.target.value)}
                placeholder="e.g. 9845099887"
                className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                Password *
              </label>
              <input
                type="password"
                required
                value={singleDriverPassword}
                onChange={(e) => setSingleDriverPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mist">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={singleDriverCompany}
                onChange={(e) => setSingleDriverCompany(e.target.value)}
                placeholder="e.g. Egreen Quanta Fleet"
                className="mt-1 w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-ember py-2.5 font-display text-sm font-semibold text-void transition hover:bg-foreground hover:text-background"
            >
              {loading ? "Registering..." : "Register Driver to Database"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
