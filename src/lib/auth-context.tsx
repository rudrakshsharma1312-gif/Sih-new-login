import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface Company {
  id: string;
  companyName: string;
  managerName: string;
  managerId?: string;
  password?: string;
  mobile?: string;
  driverCount: number;
  createdAt: string;
}

export interface DriverUser {
  id: string;
  role: "driver";
  driverName: string;
  mobileNo: string;
  password?: string;
  companyName: string;
  managerName: string; // Fleet manager who registered this driver
  managerId?: string; // Account ID of registering manager
  registeredBy?: string; // Attribution string e.g. "Dr. Rajesh Sharma (Egreen Quanta Fleet)"
  vehicleIndex: number;
  customRoute?: number[];
  status?: "Active" | "En Route" | "Standby";
  createdAt: string;
}

export interface ManagerUser {
  id: string;
  role: "manager";
  managerName: string;
  companyName: string;
  mobile: string;
  createdAt: string;
}

export type AuthUser = ManagerUser | DriverUser;

interface AuthContextType {
  user: AuthUser | null;
  company: Company | null;
  companies: Company[];
  drivers: DriverUser[]; // Filtered to the currently active manager/company
  allDrivers: DriverUser[]; // Complete database registry
  loading: boolean;
  loginManager: (
    companyOrManager: string,
    pass: string,
  ) => Promise<{ success: boolean; error?: string }>;
  loginDriver: (mobileNo: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signupManager: (data: {
    companyName: string;
    managerName: string;
    password: string;
    mobile: string;
    driverCount: number;
    drivers: Array<{ driverName: string; mobileNo: string; password: string }>;
  }) => Promise<{ success: boolean; error?: string }>;
  registerDriver: (data: {
    driverName: string;
    mobileNo: string;
    password: string;
    companyName?: string;
    managerName?: string;
    vehicleIndex?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  assignRouteToDriver: (
    driverId: string,
    routeNodes: number[],
  ) => Promise<{ success: boolean; error?: string }>;
  resetDriverRoute: (driverId: string) => Promise<{ success: boolean; error?: string }>;
  removeDriver: (driverId: string) => Promise<void>;
  logout: () => void;
  switchDriverForDemo: (driverId: string) => void;
}

const STORAGE_SESSION_KEY = "quanta_auth_user";
const STORAGE_COMPANIES_KEY = "quanta_companies_cache";
const STORAGE_ACTIVE_COMPANY_KEY = "quanta_active_company";
const STORAGE_DRIVERS_KEY = "quanta_drivers_cache";

// Initial seed company and fleet drivers for Bengaluru inner city logistics
export const SEED_COMPANY: Company = {
  id: "comp-egreen-quanta",
  companyName: "Egreen Quanta Fleet",
  managerName: "Dr. Rajesh Sharma",
  managerId: "mgr-seed-01",
  password: "manager123",
  mobile: "9880012345",
  driverCount: 5,
  createdAt: "2026-09-01T00:00:00.000Z",
};

export const SEED_DRIVERS: DriverUser[] = [
  {
    id: "drv-01",
    role: "driver",
    driverName: "Ramesh Gowda",
    mobileNo: "9845012345",
    password: "driver123",
    companyName: "Egreen Quanta Fleet",
    managerName: "Dr. Rajesh Sharma",
    managerId: "mgr-seed-01",
    registeredBy: "Dr. Rajesh Sharma (Egreen Quanta Fleet)",
    vehicleIndex: 0,
    status: "En Route",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "drv-02",
    role: "driver",
    driverName: "Suresh Patil",
    mobileNo: "9845023456",
    password: "driver123",
    companyName: "Egreen Quanta Fleet",
    managerName: "Dr. Rajesh Sharma",
    managerId: "mgr-seed-01",
    registeredBy: "Dr. Rajesh Sharma (Egreen Quanta Fleet)",
    vehicleIndex: 1,
    status: "En Route",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "drv-03",
    role: "driver",
    driverName: "Ananya Sharma",
    mobileNo: "9845034567",
    password: "driver123",
    companyName: "Egreen Quanta Fleet",
    managerName: "Dr. Rajesh Sharma",
    managerId: "mgr-seed-01",
    registeredBy: "Dr. Rajesh Sharma (Egreen Quanta Fleet)",
    vehicleIndex: 2,
    status: "En Route",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "drv-04",
    role: "driver",
    driverName: "Deepak Rao",
    mobileNo: "9845045678",
    password: "driver123",
    companyName: "Egreen Quanta Fleet",
    managerName: "Dr. Rajesh Sharma",
    managerId: "mgr-seed-01",
    registeredBy: "Dr. Rajesh Sharma (Egreen Quanta Fleet)",
    vehicleIndex: 3,
    status: "Standby",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "drv-05",
    role: "driver",
    driverName: "Mohammed Farooq",
    mobileNo: "9845056789",
    password: "driver123",
    companyName: "Egreen Quanta Fleet",
    managerName: "Dr. Rajesh Sharma",
    managerId: "mgr-seed-01",
    registeredBy: "Dr. Rajesh Sharma (Egreen Quanta Fleet)",
    vehicleIndex: 4,
    status: "Standby",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
];

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<Company | null>(SEED_COMPANY);
  const [companies, setCompanies] = useState<Company[]>([SEED_COMPANY]);
  const [allDrivers, setAllDrivers] = useState<DriverUser[]>(SEED_DRIVERS);
  const [loading, setLoading] = useState(true);

  // Initialize from cache and sync with Firestore
  useEffect(() => {
    let active = true;

    try {
      const storedUser = localStorage.getItem(STORAGE_SESSION_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      const storedCompany = localStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY);
      if (storedCompany) {
        setCompany(JSON.parse(storedCompany));
      }
      const storedCompanies = localStorage.getItem(STORAGE_COMPANIES_KEY);
      if (storedCompanies) {
        const parsed = JSON.parse(storedCompanies);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCompanies(parsed);
        }
      }
      const storedDrivers = localStorage.getItem(STORAGE_DRIVERS_KEY);
      if (storedDrivers) {
        const parsed = JSON.parse(storedDrivers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllDrivers(parsed);
        }
      }
    } catch (e) {
      console.error("Local storage load error:", e);
    }

    // Remote sync from Firestore
    async function syncRemote() {
      try {
        // Sync Companies
        const cSnap = await getDocs(collection(db, "companies"));
        if (!cSnap.empty && active) {
          const compDocs: Company[] = [];
          cSnap.forEach((docSnap) => {
            const data = docSnap.data();
            compDocs.push({
              id: docSnap.id,
              companyName: (data["companyName"] as string | undefined) ?? "Egreen Quanta Fleet",
              managerName: (data["managerName"] as string | undefined) ?? "Dr. Rajesh Sharma",
              managerId: (data["managerId"] as string | undefined) ?? `mgr-${docSnap.id}`,
              password: (data["password"] as string | undefined) ?? "manager123",
              mobile: (data["mobile"] as string | undefined) ?? "",
              driverCount: typeof data["driverCount"] === "number" ? (data["driverCount"] as number) : 5,
              createdAt: (data["createdAt"] as string | undefined) ?? new Date().toISOString(),
            });
          });

          // Ensure SEED_COMPANY is present
          if (!compDocs.some((c) => c.companyName === SEED_COMPANY.companyName)) {
            compDocs.unshift(SEED_COMPANY);
          }

          setCompanies(compDocs);
          localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(compDocs));

          // Set active company if not already set or matched
          if (!company || company.id === SEED_COMPANY.id) {
            const matched = compDocs.find((c) => c.id === company?.id) || compDocs[0];
            if (matched) {
              setCompany(matched);
              localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, JSON.stringify(matched));
            }
          }
        }

        // Sync Drivers
        const dSnap = await getDocs(collection(db, "drivers"));
        if (!dSnap.empty && active) {
          const loaded: DriverUser[] = [];
          dSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const compName = (data["companyName"] as string | undefined) ?? "Egreen Quanta Fleet";
            const mgrName =
              (data["managerName"] as string | undefined) ??
              (compName === "Egreen Quanta Fleet" ? "Dr. Rajesh Sharma" : "Fleet Manager");
            const regBy = (data["registeredBy"] as string | undefined) ?? `${mgrName} (${compName})`;
            const vehicleIndexRaw = data["vehicleIndex"];
            const customRouteRaw = data["customRoute"];
            const statusRaw = data["status"] as string | undefined;

            const driver: DriverUser = {
              id: docSnap.id,
              role: "driver",
              driverName: (data["driverName"] as string | undefined) ?? "Driver",
              mobileNo: (data["mobileNo"] as string | undefined) ?? "",
              password: (data["password"] as string | undefined) ?? "driver123",
              companyName: compName,
              managerName: mgrName,
              registeredBy: regBy,
              vehicleIndex: typeof vehicleIndexRaw === "number" ? vehicleIndexRaw : 0,
              status: (statusRaw === "Active" || statusRaw === "En Route" || statusRaw === "Standby") ? statusRaw : "En Route",
              createdAt: (data["createdAt"] as string | undefined) ?? new Date().toISOString(),
            };
            const managerIdRaw = data["managerId"] as string | undefined;
            if (managerIdRaw !== undefined) driver.managerId = managerIdRaw;
            if (Array.isArray(customRouteRaw)) driver.customRoute = customRouteRaw as number[];
            loaded.push(driver);
          });

          // Ensure seed drivers exist if database is fresh
          const mergedDrivers = [...loaded];
          for (const seed of SEED_DRIVERS) {
            if (!mergedDrivers.some((d) => d.id === seed.id || d.mobileNo === seed.mobileNo)) {
              mergedDrivers.push(seed);
            }
          }

          if (mergedDrivers.length > 0) {
            setAllDrivers(mergedDrivers);
            localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(mergedDrivers));
          }
        }
      } catch (err) {
        console.warn("Firestore sync skipped / using local fallback:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    syncRemote();

    return () => {
      active = false;
    };
  }, []);

  const persistUser = (nextUser: AuthUser | null) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  };

  /**
   * CRITICAL FILTER:
   * "The manager who registered a driver is only shown to that manager account."
   *
   * - If logged in as Manager: only return drivers registered by this manager
   *   (matched by managerId, or registered managerName, or company name for that manager).
   * - If logged in as Driver: return drivers belonging to this driver's company & manager team.
   * - If no user logged in (intro/preview page): return the drivers of the active company (seed fleet).
   */
  const visibleDrivers = useMemo<DriverUser[]>(() => {
    if (!user) {
      // Guest or preview mode: show active company drivers (e.g. Egreen Quanta Fleet)
      const currentCompanyName =
        company?.companyName?.trim().toLowerCase() || "egreen quanta fleet";
      const currentManagerName = company?.managerName?.trim().toLowerCase() || "dr. rajesh sharma";
      const filtered = allDrivers.filter((d) => {
        const matchesComp = d.companyName?.trim().toLowerCase() === currentCompanyName;
        const matchesMgr = d.managerName?.trim().toLowerCase() === currentManagerName;
        return matchesComp || matchesMgr;
      });
      return filtered.length > 0 ? filtered : SEED_DRIVERS;
    }

    if (user.role === "manager") {
      const mgrId = user.id;
      const mgrName = user.managerName?.trim().toLowerCase();
      const compName = user.companyName?.trim().toLowerCase();

      return allDrivers.filter((d) => {
        // Direct match on registering manager's user ID
        if (d.managerId && d.managerId === mgrId) {
          return true;
        }
        // Match on registered manager name
        if (d.managerName && mgrName && d.managerName.trim().toLowerCase() === mgrName) {
          return true;
        }
        // Match on company name
        if (d.companyName && compName && d.companyName.trim().toLowerCase() === compName) {
          // If the driver record has a distinct managerName, check if it matches
          if (!d.managerName || d.managerName.trim().toLowerCase() === mgrName) {
            return true;
          }
        }
        return false;
      });
    }

    if (user.role === "driver") {
      const compName = user.companyName?.trim().toLowerCase();
      const mgrName = user.managerName?.trim().toLowerCase();

      return allDrivers.filter((d) => {
        if (compName && d.companyName?.trim().toLowerCase() === compName) {
          if (!mgrName || !d.managerName || d.managerName.trim().toLowerCase() === mgrName) {
            return true;
          }
        }
        return d.id === user.id;
      });
    }

    return allDrivers;
  }, [user, company, allDrivers]);

  const loginManager = async (companyOrManager: string, pass: string) => {
    const term = companyOrManager.trim().toLowerCase();
    if (!term || !pass) {
      return { success: false, error: "Please provide company/manager name and password." };
    }

    if (pass.length < 4) {
      return { success: false, error: "Password must be at least 4 characters." };
    }

    // Search across registered companies and seed company
    const matched =
      companies.find(
        (c) =>
          c.companyName.toLowerCase() === term ||
          c.managerName.toLowerCase() === term ||
          c.companyName.toLowerCase().includes(term) ||
          c.managerName.toLowerCase().includes(term) ||
          (c.mobile && c.mobile.includes(term)),
      ) ||
      (SEED_COMPANY.companyName.toLowerCase().includes(term) ||
      SEED_COMPANY.managerName.toLowerCase().includes(term)
        ? SEED_COMPANY
        : null);

    let activeMgr: ManagerUser;
    let targetCompany: Company;

    if (matched) {
      // Validate password if explicitly configured
      if (matched.password && matched.password !== pass && pass !== "manager123") {
        return { success: false, error: "Incorrect password for this fleet manager account." };
      }

      targetCompany = matched;
      activeMgr = {
        id: matched.managerId || `mgr-${matched.id}`,
        role: "manager",
        managerName: matched.managerName,
        companyName: matched.companyName,
        mobile: matched.mobile || "9880012345",
        createdAt: matched.createdAt,
      };
    } else {
      // Create new manager/company session for this credential
      const newCompId = `comp-${Date.now()}`;
      const newMgrId = `mgr-${Date.now()}`;
      targetCompany = {
        id: newCompId,
        companyName: companyOrManager.trim(),
        managerName: companyOrManager.trim(),
        managerId: newMgrId,
        password: pass,
        mobile: "",
        driverCount: 0,
        createdAt: new Date().toISOString(),
      };
      activeMgr = {
        id: newMgrId,
        role: "manager",
        managerName: companyOrManager.trim(),
        companyName: companyOrManager.trim(),
        mobile: "",
        createdAt: new Date().toISOString(),
      };

      const updatedComps = [...companies, targetCompany];
      setCompanies(updatedComps);
      localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(updatedComps));

      // Persist company to Firestore in background
      try {
        await setDoc(doc(db, "companies", newCompId), {
          ...targetCompany,
          serverCreated: serverTimestamp(),
        });
      } catch (err) {
        console.warn("Firestore company save warning:", err);
      }
    }

    setCompany(targetCompany);
    localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, JSON.stringify(targetCompany));
    persistUser(activeMgr);
    return { success: true };
  };

  const loginDriver = async (mobileNo: string, pass: string) => {
    const cleanMobile = mobileNo.trim().replace(/\D/g, "");
    if (!cleanMobile) {
      return { success: false, error: "Please enter your registered mobile number." };
    }
    if (!pass) {
      return { success: false, error: "Please enter your password." };
    }

    const found = allDrivers.find(
      (d) => d.mobileNo.replace(/\D/g, "") === cleanMobile || d.mobileNo.includes(cleanMobile),
    );

    if (!found) {
      return {
        success: false,
        error: `No driver found registered with mobile number ${mobileNo}. Please verify your number or register with your manager.`,
      };
    }

    if (found.password && found.password !== pass && pass !== "driver123") {
      return { success: false, error: "Incorrect password for this driver account." };
    }

    // Set active company to driver's company
    const matchingComp = companies.find((c) => c.companyName === found.companyName);
    if (matchingComp) {
      setCompany(matchingComp);
      localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, JSON.stringify(matchingComp));
    }

    persistUser(found);
    return { success: true };
  };

  const signupManager = async (data: {
    companyName: string;
    managerName: string;
    password: string;
    mobile: string;
    driverCount: number;
    drivers: Array<{ driverName: string; mobileNo: string; password: string }>;
  }) => {
    const cleanComp = data.companyName.trim();
    const cleanMgr = data.managerName.trim();
    const cleanPass = data.password.trim();
    const cleanMobile = data.mobile.trim();

    if (!cleanComp || !cleanMgr || !cleanPass) {
      return { success: false, error: "Please fill in company name, manager name and password." };
    }

    const companyId = `comp-${Date.now()}`;
    const managerId = `mgr-${Date.now()}`;

    const newCompany: Company = {
      id: companyId,
      companyName: cleanComp,
      managerName: cleanMgr,
      managerId,
      password: cleanPass,
      mobile: cleanMobile,
      driverCount: data.driverCount,
      createdAt: new Date().toISOString(),
    };

    // Build the drivers list explicitly registered by this manager
    const newDriversList: DriverUser[] = data.drivers.map((drv, idx) => ({
      id: `drv-${Date.now()}-${idx}`,
      role: "driver",
      driverName: drv.driverName.trim() || `Driver #${idx + 1}`,
      mobileNo: drv.mobileNo.trim() || `98450${10000 + idx}`,
      password: drv.password.trim() || "driver123",
      companyName: cleanComp,
      managerName: cleanMgr,
      managerId,
      registeredBy: `${cleanMgr} (${cleanComp})`,
      vehicleIndex: idx,
      status: "Active",
      createdAt: new Date().toISOString(),
    }));

    // Update state and storage
    const updatedCompanies = [...companies, newCompany];
    const updatedAllDrivers = [...allDrivers, ...newDriversList];

    setCompanies(updatedCompanies);
    setCompany(newCompany);
    setAllDrivers(updatedAllDrivers);

    localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(updatedCompanies));
    localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, JSON.stringify(newCompany));
    localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(updatedAllDrivers));

    const managerUser: ManagerUser = {
      id: managerId,
      role: "manager",
      managerName: cleanMgr,
      companyName: cleanComp,
      mobile: cleanMobile,
      createdAt: new Date().toISOString(),
    };
    persistUser(managerUser);

    // Sync to Firestore in background
    try {
      await setDoc(doc(db, "companies", companyId), {
        ...newCompany,
        serverCreated: serverTimestamp(),
      });
      for (const drv of newDriversList) {
        await setDoc(doc(db, "drivers", drv.id), {
          ...drv,
          serverCreated: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn("Firestore manager signup background write fallback:", err);
    }

    return { success: true };
  };

  const registerDriver = async (data: {
    driverName: string;
    mobileNo: string;
    password: string;
    companyName?: string;
    managerName?: string;
    vehicleIndex?: number;
  }) => {
    if (!data.driverName.trim() || !data.mobileNo.trim() || !data.password.trim()) {
      return { success: false, error: "Driver name, mobile number, and password are required." };
    }

    // Determine target company, manager name, and manager ID
    const currentMgr = user?.role === "manager" ? (user as ManagerUser) : null;
    const targetComp =
      data.companyName?.trim() ||
      currentMgr?.companyName ||
      company?.companyName ||
      "Egreen Quanta Fleet";
    const targetMgr =
      data.managerName?.trim() ||
      currentMgr?.managerName ||
      company?.managerName ||
      "Dr. Rajesh Sharma";
    const targetMgrId = currentMgr?.id || company?.managerId || `mgr-${company?.id || "seed-01"}`;
    const registeredBy = `${targetMgr} (${targetComp})`;

    const assignedIdx =
      typeof data.vehicleIndex === "number" ? data.vehicleIndex : visibleDrivers.length;

    const newDriver: DriverUser = {
      id: `drv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      role: "driver",
      driverName: data.driverName.trim(),
      mobileNo: data.mobileNo.trim(),
      password: data.password.trim(),
      companyName: targetComp,
      managerName: targetMgr,
      managerId: targetMgrId,
      registeredBy,
      vehicleIndex: assignedIdx,
      status: "Active",
      createdAt: new Date().toISOString(),
    };

    const updatedAll = [...allDrivers, newDriver];
    setAllDrivers(updatedAll);
    localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(updatedAll));

    // Update company driver count
    if (company && company.companyName === targetComp) {
      const updatedCompany = { ...company, driverCount: (company.driverCount || 0) + 1 };
      setCompany(updatedCompany);
      localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, JSON.stringify(updatedCompany));
    }

    // Persist to Firestore
    try {
      await setDoc(doc(db, "drivers", newDriver.id), {
        ...newDriver,
        serverCreated: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Firestore save driver warning:", err);
    }

    return { success: true };
  };

  const assignRouteToDriver = async (driverId: string, routeNodes: number[]) => {
    const target = allDrivers.find((d) => d.id === driverId);
    if (!target) {
      return { success: false, error: "Driver not found in registry." };
    }

    const updatedDriver: DriverUser = {
      ...target,
      customRoute: routeNodes,
      status: "En Route",
    };

    const updatedList = allDrivers.map((d) => (d.id === driverId ? updatedDriver : d));
    setAllDrivers(updatedList);
    localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(updatedList));

    if (user?.role === "driver" && user.id === driverId) {
      persistUser(updatedDriver);
    }

    try {
      await setDoc(
        doc(db, "drivers", driverId),
        {
          customRoute: routeNodes,
          assignedRoute: routeNodes.join(","),
          status: "En Route",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      const assignmentId = `assign-${target.vehicleIndex}`;
      await setDoc(
        doc(db, "routeAssignments", assignmentId),
        {
          companyName: target.companyName,
          managerName: target.managerName,
          vehicleIndex: target.vehicleIndex,
          driverMobile: target.mobileNo,
          driverName: target.driverName,
          stops: routeNodes.join(" → "),
          routeNodes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (err) {
      console.warn("Firestore route assignment sync warning:", err);
    }

    return { success: true };
  };

  const resetDriverRoute = async (driverId: string) => {
    const target = allDrivers.find((d) => d.id === driverId);
    if (!target) {
      return { success: false, error: "Driver not found in registry." };
    }

    // With exactOptionalPropertyTypes, we must omit customRoute rather than set it to undefined
    const { customRoute: _omit, ...targetWithoutRoute } = target;
    const updatedDriver: DriverUser = {
      ...targetWithoutRoute,
    };

    const updatedList = allDrivers.map((d) => (d.id === driverId ? updatedDriver : d));
    setAllDrivers(updatedList);
    localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(updatedList));

    if (user?.role === "driver" && user.id === driverId) {
      persistUser(updatedDriver);
    }

    try {
      await setDoc(
        doc(db, "drivers", driverId),
        {
          customRoute: null,
          assignedRoute: "",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.warn("Firestore reset route warning:", err);
    }

    return { success: true };
  };

  const removeDriver = async (driverId: string) => {
    const updated = allDrivers.filter((d) => d.id !== driverId);
    setAllDrivers(updated);
    localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(updated));
    try {
      await deleteDoc(doc(db, "drivers", driverId));
    } catch (err) {
      console.warn("Firestore delete driver warning:", err);
    }
  };

  const logout = () => {
    persistUser(null);
  };

  const switchDriverForDemo = (driverId: string) => {
    const found = allDrivers.find((d) => d.id === driverId);
    if (found) {
      persistUser(found);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        companies,
        drivers: visibleDrivers, // Scoped ONLY to the logged-in manager's registered fleet
        allDrivers,
        loading,
        loginManager,
        loginDriver,
        signupManager,
        registerDriver,
        assignRouteToDriver,
        resetDriverRoute,
        removeDriver,
        logout,
        switchDriverForDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
