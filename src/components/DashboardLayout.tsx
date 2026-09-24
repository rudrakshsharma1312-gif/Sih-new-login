import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useTheme } from "@/lib/theme";
import { useSolver } from "@/lib/solver";
import { useAuth, type DriverUser } from "@/lib/auth-context";
import { AuthModal } from "@/components/AuthModal";
import { DriverCockpit } from "@/components/DriverCockpit";
import { DriverDatabaseManager } from "@/components/DriverDatabaseManager";
import { IntroOpeningPage } from "@/components/IntroOpeningPage";

interface DashboardLayoutProps {
  children?: ReactNode;
}

const MANAGER_NAV = [
  { to: "/", label: "Overview", icon: "🛰️", desc: "Live multi-vehicle map" },
  { to: "/optimizer", label: "Optimizer", icon: "⚛️", desc: "QPSO swarm & weights" },
  { to: "/benchmark", label: "Benchmark", icon: "📈", desc: "QPSO vs GA, ACO, SA" },
  { to: "/fleet", label: "Fleet & Assignments", icon: "🚛", desc: "Driver roster & route mapping" },
  { to: "/events", label: "Traffic Events", icon: "⚠️", desc: "Accidents & congestion" },
] as const;

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, drivers, company, loginManager, switchDriverForDemo } = useAuth();
  const { run, clock } = useSolver();
  const { theme, toggle: toggleTheme } = useTheme();

  // Navigation route state for active link detection
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<
    "manager-login" | "driver-login" | "manager-signup" | "driver-signup"
  >("manager-login");
  const [showDriverDb, setShowDriverDb] = useState(false);
  const [driverViewTab, setDriverViewTab] = useState<"route" | "checklist" | "info">("route");

  const isDriver = user?.role === "driver";
  const isManager = user?.role === "manager";
  const driverUser = isDriver ? (user as DriverUser) : null;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // If user has not signed in, show the App Opening and Intro Page with Login & Sign Up
  if (!user) {
    return <IntroOpeningPage />;
  }

  return (
    <div className="flex min-h-screen bg-void font-body text-foreground antialiased">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 left-1/3 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-ember/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-ember/[0.05] blur-[100px]" />
      </div>

      {/* MOBILE OVERLAY BACKDROP */}
      {mobileMenuOpen && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-void/80 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR NAVIGATION COMPONENT */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-gradient-to-b from-obsidian via-obsidian/95 to-void/90 p-4 backdrop-blur-xl transition-transform duration-300 md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand / Logo Section */}
        <div className="flex items-center justify-between border-b border-line pb-4 pt-1">
          <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-3">
            <div className="relative grid size-9 place-items-center overflow-hidden rounded-lg border border-line bg-gradient-to-br from-glasshi to-obsidian">
              <span className="glowdot size-2.5 rounded-full bg-ember" />
              <span className="speck absolute right-1 top-1 size-3" />
            </div>
            <div>
              <p className="font-display text-[16px] font-bold leading-none tracking-tight text-foreground">
                QUANTA
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.25em] text-ember">
                Route Intelligence
              </p>
            </div>
          </Link>
          <button
            onClick={closeMobileMenu}
            className="rounded border border-line bg-glasshi p-1 text-xs text-mist hover:text-foreground md:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Company & Role Identity Card */}
        <div className="mt-4 rounded-xl border border-line bg-glass/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-widest text-faint">
              Active Workspace
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                isDriver
                  ? "bg-azure/20 text-azure border border-azure/40"
                  : isManager
                    ? "bg-ember/20 text-ember border border-ember/40"
                    : "bg-glasshi text-mist"
              }`}
            >
              {isDriver ? "Driver View" : isManager ? "Fleet Manager" : "Demo Mode"}
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            <div
              className={`flex size-10 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                isDriver
                  ? "bg-azure/20 text-azure border border-azure/30"
                  : "bg-ember/20 text-ember border border-ember/30"
              }`}
            >
              {isDriver ? `V#${(driverUser?.vehicleIndex ?? 0) + 1}` : "MGR"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold text-foreground">
                {isDriver
                  ? driverUser?.driverName
                  : user
                    ? (user as { managerName?: string }).managerName
                    : (company?.managerName ?? "Fleet Manager")}
              </p>
              <p className="truncate font-mono text-[10px] text-mist">
                {isDriver
                  ? `${driverUser?.mobileNo} · ${driverUser?.companyName}`
                  : (company?.companyName ?? "Egreen Quanta Fleet")}
              </p>
            </div>
          </div>

          {/* Quick Driver Vehicle status pill if driver */}
          {isDriver && (
            <div className="mt-2.5 rounded bg-void/80 px-2 py-1 text-center font-mono text-[10px] text-ember border border-ember/30">
              🔒 Route Locked to Vehicle #{(driverUser?.vehicleIndex ?? 0) + 1}
            </div>
          )}
        </div>

        {/* CONDITIONAL NAVIGATION SECTION */}
        <div className="mt-5 flex-1 overflow-y-auto pr-1">
          {isDriver ? (
            /* DRIVER-SPECIFIC NAVIGATION MENU */
            <div className="space-y-1">
              <p className="px-2 font-mono text-[9px] uppercase tracking-widest text-faint">
                Driver Navigation Tools
              </p>
              <button
                type="button"
                onClick={() => {
                  setDriverViewTab("route");
                  closeMobileMenu();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all ${
                  driverViewTab === "route"
                    ? "border border-ember/40 bg-ember/15 text-ember font-semibold shadow"
                    : "text-mist hover:bg-glass hover:text-foreground"
                }`}
              >
                <span className="text-base">🗺️</span>
                <div className="flex-1">
                  <p className="leading-none text-[13px]">My Assigned Route</p>
                  <p className="mt-1 font-mono text-[9px] text-faint">
                    Isolated map & corridor navigation
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDriverViewTab("checklist");
                  closeMobileMenu();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all ${
                  driverViewTab === "checklist"
                    ? "border border-ember/40 bg-ember/15 text-ember font-semibold shadow"
                    : "text-mist hover:bg-glass hover:text-foreground"
                }`}
              >
                <span className="text-base">📋</span>
                <div className="flex-1">
                  <p className="leading-none text-[13px]">Itinerary Waypoints</p>
                  <p className="mt-1 font-mono text-[9px] text-faint">
                    Stops sequence & deliveries
                  </p>
                </div>
              </button>

              <div className="my-3 border-t border-line/60" />

              {/* Demo Evaluation Tool: Switch Drivers */}
              <p className="px-2 font-mono text-[9px] uppercase tracking-widest text-faint">
                Test Route Isolation
              </p>
              <div className="mt-2 space-y-1">
                {drivers.slice(0, 5).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      switchDriverForDemo(d.id);
                      closeMobileMenu();
                    }}
                    className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 font-mono text-[11px] transition ${
                      d.id === driverUser?.id
                        ? "bg-ember/20 text-ember font-bold border border-ember/40"
                        : "text-mist hover:bg-glass hover:text-foreground"
                    }`}
                  >
                    <span>🚗 {d.driverName}</span>
                    <span className="text-[10px] text-faint">Veh #{d.vehicleIndex + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* MANAGER NAVIGATION MENU */
            <div className="space-y-1">
              <p className="px-2 font-mono text-[9px] uppercase tracking-widest text-faint">
                Fleet Operations & Optimization
              </p>
              {MANAGER_NAV.map((item) => {
                const isActive =
                  item.to === "/" ? currentPath === "/" : currentPath.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileMenu}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all ${
                      isActive
                        ? "border border-ember/40 bg-ember/15 text-ember font-semibold shadow"
                        : "text-mist hover:bg-glass hover:text-foreground"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <div className="flex-1">
                      <p className="leading-none text-[13px]">{item.label}</p>
                      <p className="mt-1 font-mono text-[9px] text-faint">{item.desc}</p>
                    </div>
                  </Link>
                );
              })}

              <div className="my-3 border-t border-line/60" />

              {/* Management Tools in Sidebar */}
              <p className="px-2 font-mono text-[9px] uppercase tracking-widest text-faint">
                Management Tools
              </p>

              <Link
                to="/fleet"
                onClick={closeMobileMenu}
                className="flex w-full items-center gap-3 rounded-lg border border-line bg-glass/40 px-3 py-2.5 text-left text-xs text-mist hover:border-ember hover:text-foreground transition"
              >
                <span className="text-base">🗺️</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="leading-none text-[13px] text-foreground font-medium">
                      Driver Route Mapping
                    </p>
                    <span className="rounded bg-ember/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-ember">
                      Active
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[9px] text-faint">Map locations & corridors</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setShowDriverDb(true);
                  closeMobileMenu();
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-line bg-glass/40 px-3 py-2.5 text-left text-xs text-mist hover:border-ember hover:text-foreground transition"
              >
                <span className="text-base">👥</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="leading-none text-[13px] text-foreground font-medium">
                      Driver Database
                    </p>
                    <span className="rounded bg-ember/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-ember">
                      {drivers.length}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[9px] text-faint">
                    Register & inspect fleet drivers
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  run();
                  closeMobileMenu();
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-ember py-2 font-display text-xs font-semibold text-void transition hover:bg-foreground hover:text-background"
              >
                <span>⚡ Re-solve Fleet (QPSO)</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer Actions */}
        <div className="border-t border-line pt-3 space-y-2">
          {/* Theme & Clock */}
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-[10px] text-faint">IST: {clock}</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-full border border-line bg-glass px-2.5 py-1 font-mono text-[10px] uppercase text-mist hover:text-foreground"
            >
              <span className="glowdot size-1 rounded-full bg-ember" />
              <span>{theme === "dark" ? "Dark" : "Light"}</span>
            </button>
          </div>

          {/* User Sign In / Out & Intro Portal */}
          {user && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-void/60 p-2">
                <div className="min-w-0 flex-1 font-mono text-[10px] text-mist truncate">
                  {isDriver
                    ? `Driver (${driverUser?.driverName})`
                    : (company?.companyName ?? "Fleet Manager")}
                </div>
                <button
                  onClick={logout}
                  className="rounded border border-line bg-glasshi px-2 py-0.5 font-mono text-[10px] text-mist hover:text-rose-400 transition cursor-pointer"
                  title="Sign out and return to Opening Intro"
                >
                  Sign Out
                </button>
              </div>

              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line/40 bg-glass/30 py-1 font-mono text-[10px] text-mist hover:text-foreground hover:bg-glass transition"
                title="Return to App Opening and Intro page"
              >
                <span>📖</span>
                <span>App Intro & Portal</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col min-w-0 md:pl-72">
        {/* Top Header inside main content area */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-obsidian/90 px-4 md:px-8 backdrop-blur-md">
          {/* Mobile hamburger & title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-line bg-glass p-2 text-mist hover:text-foreground md:hidden"
              aria-label="Open navigation sidebar"
            >
              <span className="text-base leading-none">☰</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="glowdot size-2 rounded-full bg-ember" />
              <h1 className="font-display text-sm md:text-base font-semibold tracking-tight text-foreground">
                {isDriver
                  ? `Driver Cockpit · Vehicle #${(driverUser?.vehicleIndex ?? 0) + 1} (${driverUser?.driverName})`
                  : currentPath === "/"
                    ? "Fleet Command Overview"
                    : currentPath.replace("/", "").toUpperCase()}
              </h1>
            </div>
          </div>

          {/* Right side role switches & quick action controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick role test switcher */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-line bg-glass/60 p-1">
              <button
                onClick={() => loginManager("Egreen Quanta Fleet", "manager123")}
                className={`rounded px-2.5 py-0.5 font-mono text-[10px] transition ${
                  isManager || !user
                    ? "bg-ember text-void font-bold"
                    : "text-mist hover:text-foreground"
                }`}
                title="View as Fleet Manager"
              >
                Manager
              </button>
              <button
                onClick={() => {
                  if (drivers[0]) switchDriverForDemo(drivers[0].id);
                }}
                className={`rounded px-2.5 py-0.5 font-mono text-[10px] transition ${
                  isDriver && driverUser?.vehicleIndex === 0
                    ? "bg-azure text-void font-bold"
                    : "text-mist hover:text-foreground"
                }`}
                title="View as Driver 1 (Vehicle #01)"
              >
                Driver 1
              </button>
              <button
                onClick={() => {
                  if (drivers[1]) switchDriverForDemo(drivers[1].id);
                }}
                className={`rounded px-2.5 py-0.5 font-mono text-[10px] transition ${
                  isDriver && driverUser?.vehicleIndex === 1
                    ? "bg-azure text-void font-bold"
                    : "text-mist hover:text-foreground"
                }`}
                title="View as Driver 2 (Vehicle #02)"
              >
                Driver 2
              </button>
            </div>

            {isManager && (
              <button
                onClick={() => setShowDriverDb(true)}
                className="hidden lg:flex items-center gap-1.5 rounded-lg border border-line bg-glass px-2.5 py-1 font-mono text-[11px] text-mist hover:border-ember hover:text-foreground transition"
              >
                <span>Drivers:</span>
                <span className="font-bold text-ember">{drivers.length}</span>
              </button>
            )}

            <button
              onClick={logout}
              className="rounded-lg border border-line bg-glass px-2.5 py-1 font-mono text-[11px] text-mist hover:text-rose-400 transition"
              title="Return to App Opening and Intro"
            >
              🚪 Exit to Intro
            </button>
          </div>
        </header>

        {/* MAIN BODY CONTENT: Conditionally renders based on role */}
        <main className="flex-1 p-4 md:p-8">
          {isDriver ? (
            /* IF DRIVER: RENDER ISOLATED DRIVER COCKPIT (SINGLE ROUTE & MAP) */
            <div className="mx-auto max-w-7xl">
              <DriverCockpit embedded />
            </div>
          ) : (
            /* IF MANAGER / GENERAL: RENDER CHILD ROUTE / MANAGEMENT TOOLS */
            <div className="mx-auto max-w-7xl">{children}</div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-line/60 bg-obsidian/40 px-6 py-4 text-center font-mono text-[10px] text-faint">
          QUANTA Route Intelligence · Quantum Particle Swarm Optimization ·{" "}
          {company?.companyName ?? "Egreen Quanta"}
        </footer>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        defaultTab={authModalTab}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Driver Database Management Modal */}
      <DriverDatabaseManager isOpen={showDriverDb} onClose={() => setShowDriverDb(false)} />
    </div>
  );
}
