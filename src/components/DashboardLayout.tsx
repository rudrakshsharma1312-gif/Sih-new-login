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
  { to: "/", label: "Overview", desc: "Fleet map & status" },
  { to: "/optimizer", label: "Optimizer", desc: "Swarm parameters" },
  { to: "/benchmark", label: "Benchmark", desc: "QPSO vs GA, ACO, PSO" },
  { to: "/fleet", label: "Fleet", desc: "Drivers & assignments" },
  { to: "/events", label: "Events", desc: "Network disruptions" },
  { to: "/intelligence", label: "Intelligence", desc: "Forecasts & export" },
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

  const pageTitle = isDriver
    ? `Vehicle #${(driverUser?.vehicleIndex ?? 0) + 1}`
    : currentPath === "/"
      ? "Overview"
      : MANAGER_NAV.find((n) => currentPath.startsWith(n.to) && n.to !== "/")?.label ??
        currentPath.replace("/", "").charAt(0).toUpperCase() + currentPath.slice(2);

  return (
    <div className="flex min-h-screen bg-void font-body text-foreground antialiased">
      {/* MOBILE OVERLAY BACKDROP */}
      {mobileMenuOpen && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-void/80 backdrop-blur-sm md:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-obsidian p-4 transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between pb-4">
          <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-ember text-void text-xs font-bold">
              Q
            </div>
            <div>
              <span className="font-display text-sm font-bold text-foreground">QUANTA</span>
              <p className="font-mono text-[10px] text-faint">Fleet Command</p>
            </div>
          </Link>
          <button
            onClick={closeMobileMenu}
            className="rounded-md border border-line p-1 text-xs text-mist hover:text-foreground md:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* User identity */}
        <div className="border-t border-b border-line py-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex size-8 items-center justify-center rounded-md font-mono text-xs font-bold ${
                isDriver
                  ? "bg-glasshi text-ember"
                  : "bg-ember text-void"
              }`}
            >
              {isDriver ? `V${(driverUser?.vehicleIndex ?? 0) + 1}` : "HQ"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {isDriver
                  ? driverUser?.driverName
                  : (user as { managerName?: string }).managerName ?? company?.managerName ?? "Fleet Manager"}
              </p>
              <p className="truncate font-mono text-[10px] text-faint">
                {isDriver ? "Driver" : "Manager"} · {(user as { companyName?: string })?.companyName ?? company?.companyName ?? "QUANTA Fleet"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-3 flex-1 overflow-y-auto space-y-0.5">
          {isDriver ? (
            <>
              <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                Navigation
              </p>
              <button
                type="button"
                onClick={() => { setDriverViewTab("route"); closeMobileMenu(); }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition ${
                  driverViewTab === "route"
                    ? "bg-ember/10 text-ember font-medium"
                    : "text-mist hover:bg-glass hover:text-foreground"
                }`}
              >
                My Route
              </button>

              <button
                type="button"
                onClick={() => { setDriverViewTab("checklist"); closeMobileMenu(); }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition ${
                  driverViewTab === "checklist"
                    ? "bg-ember/10 text-ember font-medium"
                    : "text-mist hover:bg-glass hover:text-foreground"
                }`}
              >
                Itinerary
              </button>

              <div className="my-3 border-t border-line" />

              <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                Switch Driver
              </p>
              {drivers.slice(0, 5).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { switchDriverForDemo(d.id); closeMobileMenu(); }}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[12px] font-mono transition ${
                    d.id === driverUser?.id
                      ? "bg-ember/10 text-ember font-medium"
                      : "text-mist hover:bg-glass hover:text-foreground"
                  }`}
                >
                  <span>{d.driverName}</span>
                  <span className="text-[10px] text-faint">Veh #{d.vehicleIndex + 1}</span>
                </button>
              ))}
            </>
          ) : (
            <>
              <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                Operations
              </p>
              {MANAGER_NAV.map((item) => {
                const isActive =
                  item.to === "/" ? currentPath === "/" : currentPath.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition ${
                      isActive
                        ? "bg-ember/10 text-ember font-medium"
                        : "text-mist hover:bg-glass hover:text-foreground"
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="my-3 border-t border-line" />

              <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                Management
              </p>

              <button
                type="button"
                onClick={() => { setShowDriverDb(true); closeMobileMenu(); }}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] text-mist hover:bg-glass hover:text-foreground transition"
              >
                <span>Driver Database</span>
                <span className="rounded bg-glasshi px-1.5 py-0.5 font-mono text-[10px] text-faint">
                  {drivers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { run(); closeMobileMenu(); }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-ember py-2 text-xs font-semibold text-void transition hover:bg-emberdim"
              >
                Re-solve Fleet
              </button>
            </>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-line pt-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-[10px] text-faint">{clock} IST</span>
            <button
              onClick={toggleTheme}
              className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] text-mist hover:text-foreground transition"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center justify-center rounded-md border border-line py-1.5 font-mono text-[11px] text-mist hover:text-foreground hover:border-foreground/30 transition"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col min-w-0 md:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-obsidian/95 px-4 md:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-md border border-line p-1.5 text-mist hover:text-foreground md:hidden"
              aria-label="Open navigation"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h12M2 8h12M2 12h12" />
              </svg>
            </button>
            <h1 className="font-display text-sm font-semibold tracking-tight text-foreground">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Role switcher — for demo purposes */}
            <div className="hidden sm:flex items-center gap-0.5 rounded-md border border-line p-0.5">
              <button
                onClick={() => loginManager("Egreen Quanta Fleet", "manager123")}
                className={`rounded px-2.5 py-1 font-mono text-[10px] transition ${
                  isManager
                    ? "bg-ember text-void font-semibold"
                    : "text-mist hover:text-foreground"
                }`}
              >
                Manager
              </button>
              <button
                onClick={() => { if (drivers[0]) switchDriverForDemo(drivers[0].id); }}
                className={`rounded px-2.5 py-1 font-mono text-[10px] transition ${
                  isDriver && driverUser?.vehicleIndex === 0
                    ? "bg-foreground text-background font-semibold"
                    : "text-mist hover:text-foreground"
                }`}
              >
                Driver 1
              </button>
              <button
                onClick={() => { if (drivers[1]) switchDriverForDemo(drivers[1].id); }}
                className={`rounded px-2.5 py-1 font-mono text-[10px] transition ${
                  isDriver && driverUser?.vehicleIndex === 1
                    ? "bg-foreground text-background font-semibold"
                    : "text-mist hover:text-foreground"
                }`}
              >
                Driver 2
              </button>
            </div>

            {isManager && (
              <button
                onClick={() => setShowDriverDb(true)}
                className="hidden lg:flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 font-mono text-[10px] text-mist hover:text-foreground transition"
              >
                Drivers: <span className="font-semibold text-foreground">{drivers.length}</span>
              </button>
            )}

            {/* User avatar */}
            <div className="flex size-8 items-center justify-center rounded-md bg-glasshi text-xs font-semibold text-foreground">
              {isDriver ? (driverUser?.driverName?.[0] ?? "D") : "M"}
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="flex-1 p-4 md:p-6">
          {isDriver ? (
            <div className="mx-auto max-w-7xl">
              <DriverCockpit embedded />
            </div>
          ) : (
            <div className="mx-auto max-w-7xl">{children}</div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-line px-6 py-3 text-center font-mono text-[10px] text-faint">
          QUANTA · {company?.companyName ?? "Fleet Intelligence"}
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
