import { useState } from "react";
import { useAuth, type Company } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";

export function IntroOpeningPage() {
  const {
    loginManager,
    loginDriver,
    signupManager,
    registerDriver,
    company,
    drivers,
    switchDriverForDemo,
  } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  const [tab, setTab] = useState<
    "manager-login" | "driver-login" | "manager-signup" | "driver-signup"
  >("manager-login");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
    { driverName: "Ramesh Gowda", mobileNo: "9845012345", password: "driver123" },
    { driverName: "Suresh Patil", mobileNo: "9845023456", password: "driver123" },
    { driverName: "Ananya Sharma", mobileNo: "9845034567", password: "driver123" },
  ]);

  // Driver direct signup form state
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
        next.push({
          driverName: `Driver #${next.length + 1}`,
          mobileNo: `984500000${next.length + 1}`,
          password: "driver123",
        });
      }
      return next.slice(0, validCount);
    });
  };

  const handleDriverFieldChange = (
    index: number,
    field: "driverName" | "mobileNo" | "password",
    val: string,
  ) => {
    setDriverList((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: val };
      }
      return next;
    });
  };

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await loginManager(mgrIdentifier, mgrPassword);
    setLoading(false);
    if (!res.success) {
      setError(
        res.error ?? "Invalid credentials. Please verify your company/manager name and password.",
      );
    }
  };

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await loginDriver(driverMobile, driverPassword);
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Driver login failed. Please check your registered mobile number.");
    }
  };

  const handleManagerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!signupCompany || !signupManagerName || !signupPassword || !signupMobile) {
      setError("Please fill in all company and manager fields.");
      return;
    }
    setLoading(true);
    const res = await signupManager({
      companyName: signupCompany,
      managerName: signupManagerName,
      mobile: signupMobile,
      password: signupPassword,
      driverCount,
      drivers: driverList,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Failed to register fleet company.");
    }
  };

  const handleDriverSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!singleDriverName || !singleDriverMobile || !singleDriverPassword) {
      setError("Please fill in all driver fields.");
      return;
    }
    setLoading(true);
    const res = await registerDriver({
      driverName: singleDriverName,
      mobileNo: singleDriverMobile,
      password: singleDriverPassword,
      companyName: singleDriverCompany,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Driver registration failed.");
    } else {
      setSuccessMsg("Driver registered successfully! Logging you into the Cockpit...");
      setTimeout(() => {
        loginDriver(singleDriverMobile, singleDriverPassword);
      }, 700);
    }
  };

  // Quick 1-click Demo logins
  const handleQuickManagerDemo = () => {
    loginManager(company?.companyName ?? "Egreen Quanta Fleet", "manager123");
  };

  const handleQuickDriverDemo = (driverId?: string) => {
    const targetId = driverId || drivers[0]?.id || "drv-01";
    switchDriverForDemo(targetId);
  };

  return (
    <div className="relative min-h-screen bg-void text-foreground selection:bg-ember selection:text-void">
      {/* Dynamic ambient lighting & grid backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-ember/15 blur-[160px]" />
        <div className="absolute bottom-10 right-10 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#16162208_1px,transparent_1px),linear-gradient(to_bottom,#16162208_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-10 border-b border-line/60 bg-obsidian/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative grid size-10 place-items-center rounded-xl border border-line bg-gradient-to-br from-glasshi to-obsidian shadow-lg">
              <span className="glowdot size-3 rounded-full bg-ember animate-pulse" />
              <span className="speck absolute right-1.5 top-1.5 size-2 bg-foreground/40 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold tracking-tight text-foreground">
                  QUANTA
                </span>
                <span className="rounded-full border border-line bg-glass/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ember">
                  SIH 2026 · 137
                </span>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
                Quantum Fleet Route Intelligence · Bengaluru
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-line bg-glass/50 px-3 py-1 font-mono text-xs text-mist">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>25 Graph Nodes · Peenya Base Hub</span>
            </div>

            <button
              onClick={toggleTheme}
              className="rounded-lg border border-line bg-glass px-2.5 py-1.5 font-mono text-xs text-mist hover:text-foreground transition"
              title="Toggle Light/Dark Theme"
            >
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Presentation */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Hero Intro & Value Proposition */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-glasshi/60 px-3.5 py-1 backdrop-blur-md">
              <span className="glowdot size-2 rounded-full bg-ember" />
              <span className="font-mono text-[11px] font-semibold tracking-wider text-foreground">
                Autonomous Dispatch & Multi-Vehicle Optimization
              </span>
            </div>

            <h1 className="font-display text-[clamp(2.4rem,5vw,4.2rem)] font-bold leading-[1.02] tracking-tight">
              Quantum fleet routing,
              <br />
              <span className="text-mist">solved in live</span>{" "}
              <span className="relative inline-block text-foreground">
                <span className="relative z-10">real time.</span>
                <span className="absolute inset-x-0 bottom-1.5 -z-0 h-3.5 rounded-sm bg-ember/30" />
              </span>
            </h1>

            <p className="text-base leading-relaxed text-mist max-w-xl">
              QUANTA powers end-to-end multi-vehicle logistics across the live Bengaluru road
              network with Quantum-Inspired Particle Swarm Optimization (QPSO). Connect dispatchers
              and drivers into a unified command ecosystem with sub-second route convergence.
            </p>

            {/* Quick 1-Click Demo Launchers */}
            <div className="rounded-2xl border border-line bg-gradient-to-br from-glasshi to-obsidian p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <p className="font-mono text-[11px] uppercase tracking-wider text-mist">
                  ⚡ 1-Click Instant Demo Access
                </p>
                <span className="font-mono text-[10px] text-faint">No typing required</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleQuickManagerDemo}
                  className="group flex flex-col items-start rounded-xl border border-ember/40 bg-ember/10 p-3.5 text-left transition-all hover:bg-ember/20 hover:border-ember hover:shadow-lg hover:shadow-ember/10 cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-lg">🏢</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-ember font-bold">
                      Manager Portal →
                    </span>
                  </div>
                  <strong className="mt-2 font-display text-sm font-semibold text-foreground group-hover:text-ember transition-colors">
                    Enter as Fleet Manager
                  </strong>
                  <p className="mt-0.5 text-[11px] text-mist">
                    Dr. Rajesh Sharma · Egreen Quanta Fleet
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDriverDemo("drv-01")}
                  className="group flex flex-col items-start rounded-xl border border-sky-500/40 bg-sky-500/10 p-3.5 text-left transition-all hover:bg-sky-500/20 hover:border-sky-400 hover:shadow-lg hover:shadow-sky-500/10 cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-lg">🚚</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-sky-400 font-bold">
                      Driver Cockpit →
                    </span>
                  </div>
                  <strong className="mt-2 font-display text-sm font-semibold text-foreground group-hover:text-sky-300 transition-colors">
                    Enter as Delivery Driver
                  </strong>
                  <p className="mt-0.5 text-[11px] text-mist">
                    Ramesh Gowda · Veh #01 (Peenya Corridor)
                  </p>
                </button>
              </div>
            </div>

            {/* Quick architectural specs */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="rounded-xl border border-line bg-glass/40 p-3">
                <p className="font-display text-xl font-bold text-foreground">25 Nodes</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase text-mist">Bengaluru Hubs</p>
              </div>
              <div className="rounded-xl border border-line bg-glass/40 p-3">
                <p className="font-display text-xl font-bold text-ember">&lt; 3.5s</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase text-mist">QPSO Convergence</p>
              </div>
              <div className="rounded-xl border border-line bg-glass/40 p-3">
                <p className="font-display text-xl font-bold text-emerald-400">4 Heuristics</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase text-mist">
                  QPSO vs GA/ACO/SA
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Integrated Sign In / Sign Up Card */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl border border-line bg-gradient-to-b from-obsidian via-obsidian/95 to-void p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
              {/* Card Header & Tabs */}
              <div className="border-b border-line pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      Access Workspace
                    </h2>
                    <p className="mt-0.5 text-xs text-mist">
                      Sign in or create a fleet account to unlock the full interface
                    </p>
                  </div>
                  <span className="rounded-full border border-line bg-glass px-2.5 py-1 font-mono text-[10px] text-ember">
                    Secure Session
                  </span>
                </div>

                {/* Tab Navigation */}
                <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-void/80 p-1 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setTab("manager-login");
                      setError(null);
                    }}
                    className={`rounded-lg py-2 font-medium transition ${
                      tab === "manager-login"
                        ? "bg-ember text-void font-bold shadow"
                        : "text-mist hover:text-foreground"
                    }`}
                  >
                    🏢 Manager Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("driver-login");
                      setError(null);
                    }}
                    className={`rounded-lg py-2 font-medium transition ${
                      tab === "driver-login"
                        ? "bg-ember text-void font-bold shadow"
                        : "text-mist hover:text-foreground"
                    }`}
                  >
                    🚚 Driver Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("manager-signup");
                      setError(null);
                    }}
                    className={`rounded-lg py-2 font-medium transition ${
                      tab === "manager-signup"
                        ? "bg-ember text-void font-bold shadow"
                        : "text-mist hover:text-foreground"
                    }`}
                  >
                    ✍️ New Company
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("driver-signup");
                      setError(null);
                    }}
                    className={`rounded-lg py-2 font-medium transition ${
                      tab === "driver-signup"
                        ? "bg-ember text-void font-bold shadow"
                        : "text-mist hover:text-foreground"
                    }`}
                  >
                    ➕ Register Driver
                  </button>
                </div>
              </div>

              {/* Status & Error Alerts */}
              {error && (
                <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 font-mono text-xs text-rose-300">
                  ⚠️ {error}
                </div>
              )}
              {successMsg && (
                <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 font-mono text-xs text-emerald-300">
                  ✅ {successMsg}
                </div>
              )}

              {/* TAB 1: Manager Login Form */}
              {tab === "manager-login" && (
                <form onSubmit={handleManagerLogin} className="mt-6 space-y-4">
                  <div>
                    <label className="block font-mono text-xs text-mist mb-1">
                      Company Name or Manager Username
                    </label>
                    <input
                      type="text"
                      required
                      value={mgrIdentifier}
                      onChange={(e) => setMgrIdentifier(e.target.value)}
                      placeholder="e.g. Egreen Quanta Fleet or Dr. Rajesh Sharma"
                      className="w-full rounded-xl border border-line bg-void/80 px-4 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-mist mb-1">
                      Manager Password
                    </label>
                    <input
                      type="password"
                      required
                      value={mgrPassword}
                      onChange={(e) => setMgrPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-line bg-void/80 px-4 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-line/60 bg-glass/40 p-3 text-[11px] text-mist">
                    💡 <strong className="text-foreground">Default credentials:</strong> Company:{" "}
                    <code className="text-ember font-mono">Egreen Quanta Fleet</code> · Password:{" "}
                    <code className="text-ember font-mono">manager123</code>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background transition-all hover:bg-ember hover:text-void disabled:opacity-50 cursor-pointer shadow-lg"
                  >
                    {loading ? "Authenticating Manager…" : "Sign In to Manager Command Center →"}
                  </button>
                </form>
              )}

              {/* TAB 2: Driver Login Form */}
              {tab === "driver-login" && (
                <form onSubmit={handleDriverLogin} className="mt-6 space-y-4">
                  <div>
                    <label className="block font-mono text-xs text-mist mb-1">
                      Driver Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={driverMobile}
                      onChange={(e) => setDriverMobile(e.target.value)}
                      placeholder="e.g. 9845012345"
                      className="w-full rounded-xl border border-line bg-void/80 px-4 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-mist mb-1">
                      Driver Password / PIN
                    </label>
                    <input
                      type="password"
                      required
                      value={driverPassword}
                      onChange={(e) => setDriverPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-line bg-void/80 px-4 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-line/60 bg-glass/40 p-3 text-[11px] text-mist">
                    💡 <strong className="text-foreground">Active demo driver:</strong> Mobile:{" "}
                    <code className="text-ember font-mono">9845012345</code> · Password:{" "}
                    <code className="text-ember font-mono">driver123</code> (Ramesh Gowda · Veh #01)
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-ember py-3 text-sm font-bold text-void transition-all hover:bg-foreground hover:text-background disabled:opacity-50 cursor-pointer shadow-lg"
                  >
                    {loading ? "Connecting Cockpit…" : "Sign In to Driver Cockpit →"}
                  </button>
                </form>
              )}

              {/* TAB 3: Manager Sign Up Form (Company Registration) */}
              {tab === "manager-signup" && (
                <form
                  onSubmit={handleManagerSignup}
                  className="mt-6 space-y-4 max-h-[440px] overflow-y-auto pr-1"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[11px] text-mist mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        required
                        value={signupCompany}
                        onChange={(e) => setSignupCompany(e.target.value)}
                        placeholder="e.g. Nexus Logistics"
                        className="w-full rounded-xl border border-line bg-void/80 px-3 py-2 text-xs text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[11px] text-mist mb-1">
                        Manager Name
                      </label>
                      <input
                        type="text"
                        required
                        value={signupManagerName}
                        onChange={(e) => setSignupManagerName(e.target.value)}
                        placeholder="e.g. Priya Nair"
                        className="w-full rounded-xl border border-line bg-void/80 px-3 py-2 text-xs text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[11px] text-mist mb-1">
                        Contact Mobile
                      </label>
                      <input
                        type="tel"
                        required
                        value={signupMobile}
                        onChange={(e) => setSignupMobile(e.target.value)}
                        placeholder="e.g. 9880099999"
                        className="w-full rounded-xl border border-line bg-void/80 px-3 py-2 text-xs text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[11px] text-mist mb-1">
                        Manager Password
                      </label>
                      <input
                        type="password"
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-line bg-void/80 px-3 py-2 text-xs text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-mono text-[11px] text-mist">
                        Initial Fleet Vehicle Count:{" "}
                        <strong className="text-ember font-bold">{driverCount}</strong>
                      </label>
                      <span className="text-[10px] text-faint">1 to 10 vehicles</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      value={driverCount}
                      onChange={(e) => handleDriverCountChange(Number(e.target.value))}
                      className="w-full accent-ember cursor-pointer"
                    />
                  </div>

                  {/* Driver Roster inputs */}
                  <div className="space-y-2 border-t border-line/60 pt-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                      Assign Fleet Drivers:
                    </p>
                    {driverList.map((d, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-3 gap-2 rounded-lg border border-line/50 bg-void/60 p-2"
                      >
                        <input
                          type="text"
                          required
                          value={d.driverName}
                          onChange={(e) =>
                            handleDriverFieldChange(idx, "driverName", e.target.value)
                          }
                          placeholder={`Driver #${idx + 1}`}
                          className="rounded border border-line bg-obsidian px-2 py-1 text-[11px] text-foreground focus:border-ember focus:outline-none"
                        />
                        <input
                          type="tel"
                          required
                          value={d.mobileNo}
                          onChange={(e) => handleDriverFieldChange(idx, "mobileNo", e.target.value)}
                          placeholder="Mobile #"
                          className="rounded border border-line bg-obsidian px-2 py-1 text-[11px] text-foreground focus:border-ember focus:outline-none"
                        />
                        <input
                          type="password"
                          required
                          value={d.password}
                          onChange={(e) => handleDriverFieldChange(idx, "password", e.target.value)}
                          placeholder="Password"
                          className="rounded border border-line bg-obsidian px-2 py-1 text-[11px] text-foreground focus:border-ember focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-ember py-3 text-sm font-bold text-void transition-all hover:bg-foreground hover:text-background disabled:opacity-50 cursor-pointer shadow-lg"
                  >
                    {loading ? "Registering Fleet…" : "Create Fleet & Open Dashboard →"}
                  </button>
                </form>
              )}

              {/* TAB 4: Driver Self-Registration Form */}
              {tab === "driver-signup" && (
                <form onSubmit={handleDriverSignup} className="mt-6 space-y-4">
                  <div>
                    <label className="block font-mono text-xs text-mist mb-1">
                      Assigned Company
                    </label>
                    <input
                      type="text"
                      required
                      value={singleDriverCompany}
                      onChange={(e) => setSingleDriverCompany(e.target.value)}
                      className="w-full rounded-xl border border-line bg-void/80 px-4 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-mist mb-1">
                      Full Driver Name
                    </label>
                    <input
                      type="text"
                      required
                      value={singleDriverName}
                      onChange={(e) => setSingleDriverName(e.target.value)}
                      placeholder="e.g. Manjunath Swamy"
                      className="w-full rounded-xl border border-line bg-void/80 px-4 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-mist mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={singleDriverMobile}
                      onChange={(e) => setSingleDriverMobile(e.target.value)}
                      placeholder="e.g. 9845098765"
                      className="w-full rounded-xl border border-line bg-void/80 px-4 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-mist mb-1">
                      Create Password / PIN
                    </label>
                    <input
                      type="password"
                      required
                      value={singleDriverPassword}
                      onChange={(e) => setSingleDriverPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-line bg-void/80 px-4 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-ember focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background transition-all hover:bg-ember hover:text-void disabled:opacity-50 cursor-pointer shadow-lg"
                  >
                    {loading ? "Registering Driver…" : "Register & Launch Cockpit →"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid Below Hero */}
        <div className="mt-20 border-t border-line/60 pt-16">
          <div className="mb-8 text-center max-w-2xl mx-auto">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ember">
              Core Capabilities
            </span>
            <h3 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-foreground">
              Built specifically for Bengaluru Inner-City Road Logistics
            </h3>
            <p className="mt-2 text-sm text-mist">
              Solving NP-hard Capacitated Vehicle Routing Problems (CVRP) with real-world congestion
              adaptation and instant turn-by-turn cockpit execution.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-line bg-gradient-to-b from-glass to-obsidian p-6 shadow-md">
              <span className="text-3xl">⚛️</span>
              <h4 className="mt-4 font-display text-lg font-semibold text-foreground">
                QPSO Swarm Engine
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-mist">
                Quantum delta-potential well wave equations allow particles to tunnel out of local
                minima, outperforming standard Genetic Algorithms and Ant Colony heuristics.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-gradient-to-b from-glass to-obsidian p-6 shadow-md">
              <span className="text-3xl">🗺️</span>
              <h4 className="mt-4 font-display text-lg font-semibold text-foreground">
                Interactive Dispatcher
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-mist">
                Fleet managers can customize and drag-and-drop waypoint sequences, preview
                distances, and reassign routes directly to specific driver cockpits.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-gradient-to-b from-glass to-obsidian p-6 shadow-md">
              <span className="text-3xl">🚚</span>
              <h4 className="mt-4 font-display text-lg font-semibold text-foreground">
                Driver Mobile Cockpit
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-mist">
                Distraction-free interface with text-to-speech audio navigation announcements,
                delivery checklists, and real-time corridor ETAs from Peenya Depot.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-gradient-to-b from-glass to-obsidian p-6 shadow-md">
              <span className="text-3xl">📊</span>
              <h4 className="mt-4 font-display text-lg font-semibold text-foreground">
                Recharts SLA Analytics
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-mist">
                Live benchmarking charts measuring driver completion times, network delays, payload
                distribution, and SLA performance compliance across the roster.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-line/60 bg-obsidian/90 py-8 text-center font-mono text-xs text-faint">
        <p>QUANTA — Quantum-Inspired Route Optimization & Fleet Intelligence · SIH 2026</p>
        <p className="mt-1 text-[10px]">
          Peenya Base Hub · Bengaluru Road Network (25 Delivery Hubs) · Powered by React & TanStack
          Start
        </p>
      </footer>
    </div>
  );
}
