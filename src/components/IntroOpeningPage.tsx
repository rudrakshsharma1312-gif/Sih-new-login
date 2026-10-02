import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { QuantumBackgroundAnimation } from "@/components/QuantumBackgroundAnimation";

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

  // Driver direct signup form state
  const [singleDriverName, setSingleDriverName] = useState("");
  const [singleDriverMobile, setSingleDriverMobile] = useState("");
  const [singleDriverPassword, setSingleDriverPassword] = useState("");
  const [singleDriverCompany, setSingleDriverCompany] = useState(
    company?.companyName ?? "Egreen Quanta Fleet",
  );
  const [singleDriverManager, setSingleDriverManager] = useState(
    company?.managerName ?? "Dr. Rajesh Sharma",
  );

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
      setError(res.error ?? "Invalid driver credentials. Please check mobile and password.");
    }
  };

  const handleManagerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signupManager({
      companyName: signupCompany,
      managerName: signupManagerName,
      mobile: signupMobile,
      password: signupPassword,
      driverCount: 0,
      drivers: [],
    });

    if (res.success) {
      setSuccessMsg("Company account created successfully.");
      setTab("manager-login");
      setMgrIdentifier(signupCompany);
      setMgrPassword(signupPassword);
    } else {
      setError(res.error ?? "Failed to create company account.");
    }
    setLoading(false);
  };

  const handleDriverSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await registerDriver({
      driverName: singleDriverName,
      mobileNo: singleDriverMobile,
      password: singleDriverPassword,
      companyName: singleDriverCompany,
      managerName: singleDriverManager,
    });

    if (res.success) {
      setSuccessMsg(`Driver ${singleDriverName} registered successfully.`);
      setTab("driver-login");
      setDriverMobile(singleDriverMobile);
      setDriverPassword(singleDriverPassword);
    } else {
      setError(res.error ?? "Failed to register driver.");
    }
    setLoading(false);
  };

  const handleQuickManagerDemo = async () => {
    setError(null);
    setLoading(true);
    await loginManager("Egreen Quanta Fleet", "manager123");
    setLoading(false);
  };

  const handleQuickDriverDemo = async (id?: string) => {
    setError(null);
    setLoading(true);
    if (id) {
      await switchDriverForDemo(id);
    } else {
      await loginDriver("9845012345", "driver123");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-void text-foreground">
      {/* Subtle background animation */}
      <QuantumBackgroundAnimation variant="subtle" showHudBadge={false} />

      {/* Top Navigation Bar */}
      <header className="relative z-10 border-b border-line bg-obsidian/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-ember text-void font-bold">
              Q
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                QUANTA
              </span>
              <p className="font-mono text-[10px] text-faint">Fleet Route Command</p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="rounded-md border border-line px-3 py-1.5 font-mono text-xs text-mist hover:text-foreground transition"
            title="Toggle Light/Dark Theme"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-12 lg:py-24">
        <div className="mx-auto max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
              QUANTA Fleet Dispatch
            </h1>
            <p className="text-sm text-mist">
              Sign in to manage your fleet or access your driver assignments.
            </p>
          </div>

          <div className="panel p-6 shadow-md">
            {/* Tab Navigation */}
            <div className="mb-6 flex space-x-1 rounded-md bg-void p-1 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setTab("manager-login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 rounded-md py-2 font-medium transition ${
                  tab === "manager-login" ? "bg-ember text-void" : "text-mist hover:text-foreground"
                }`}
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("driver-login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 rounded-md py-2 font-medium transition ${
                  tab === "driver-login" ? "bg-ember text-void" : "text-mist hover:text-foreground"
                }`}
              >
                Driver
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("manager-signup");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 rounded-md py-2 font-medium transition ${
                  tab === "manager-signup"
                    ? "bg-ember text-void"
                    : "text-mist hover:text-foreground"
                }`}
              >
                New Fleet
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 border border-emerald-500/20">
                {successMsg}
              </div>
            )}

            {/* TAB 1: Manager Login */}
            {tab === "manager-login" && (
              <form onSubmit={handleManagerLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-mist mb-1">
                    Company / Username
                  </label>
                  <input
                    type="text"
                    required
                    value={mgrIdentifier}
                    onChange={(e) => setMgrIdentifier(e.target.value)}
                    className="w-full rounded-md border border-line bg-void px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mist mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={mgrPassword}
                    onChange={(e) => setMgrPassword(e.target.value)}
                    className="w-full rounded-md border border-line bg-void px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-ember py-2 text-sm font-semibold text-void transition hover:bg-emberdim disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign In as Manager"}
                </button>
              </form>
            )}

            {/* TAB 2: Driver Login */}
            {tab === "driver-login" && (
              <form onSubmit={handleDriverLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-mist mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={driverMobile}
                    onChange={(e) => setDriverMobile(e.target.value)}
                    className="w-full rounded-md border border-line bg-void px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mist mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={driverPassword}
                    onChange={(e) => setDriverPassword(e.target.value)}
                    className="w-full rounded-md border border-line bg-void px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-ember py-2 text-sm font-semibold text-void transition hover:bg-emberdim disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign In as Driver"}
                </button>
              </form>
            )}

            {/* TAB 3: Manager Sign Up */}
            {tab === "manager-signup" && (
              <form
                onSubmit={handleManagerSignup}
                className="space-y-4 max-h-[300px] overflow-y-auto pr-2"
              >
                <div>
                  <label className="block text-xs font-medium text-mist mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={signupCompany}
                    onChange={(e) => setSignupCompany(e.target.value)}
                    className="w-full rounded-md border border-line bg-void px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mist mb-1">Manager Name</label>
                  <input
                    type="text"
                    required
                    value={signupManagerName}
                    onChange={(e) => setSignupManagerName(e.target.value)}
                    className="w-full rounded-md border border-line bg-void px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mist mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={signupMobile}
                    onChange={(e) => setSignupMobile(e.target.value)}
                    className="w-full rounded-md border border-line bg-void px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mist mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full rounded-md border border-line bg-void px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-ember py-2 text-sm font-semibold text-void transition hover:bg-emberdim disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Fleet Account"}
                </button>
              </form>
            )}

            {/* TAB 4: Driver Sign Up */}
            {tab === "driver-signup" && (
              <form
                onSubmit={handleDriverSignup}
                className="space-y-4 max-h-[300px] overflow-y-auto pr-2"
              >
                <div>
                  <label className="block text-xs font-medium text-mist mb-1">Driver Name</label>
                  <input
                    type="text"
                    required
                    value={singleDriverName}
                    onChange={(e) => setSingleDriverName(e.target.value)}
                    className="w-full rounded-md border border-line bg-void px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mist mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={singleDriverMobile}
                    onChange={(e) => setSingleDriverMobile(e.target.value)}
                    className="w-full rounded-md border border-line bg-void px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mist mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={singleDriverPassword}
                    onChange={(e) => setSingleDriverPassword(e.target.value)}
                    className="w-full rounded-md border border-line bg-void px-3 py-2 text-sm text-foreground focus:border-ember focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-ember py-2 text-sm font-semibold text-void transition hover:bg-emberdim disabled:opacity-50"
                >
                  {loading ? "Registering..." : "Register Driver"}
                </button>
              </form>
            )}
          </div>

          <div className="mt-8">
            <p className="font-mono text-[10px] uppercase text-mist mb-3 text-center">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleQuickManagerDemo}
                className="panel p-3 text-left transition hover:border-foreground/30 text-sm font-medium"
              >
                Manager Demo
              </button>
              <button
                onClick={() => handleQuickDriverDemo(drivers[0]?.id)}
                className="panel p-3 text-left transition hover:border-foreground/30 text-sm font-medium"
              >
                Driver Demo
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
