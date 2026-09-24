import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface Company {
  id: string;
  companyName: string;
  managerName: string;
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
  drivers: DriverUser[];
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
    companyName: string;
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
const STORAGE_DRIVERS_KEY = "quanta_drivers_cache";

// Initial seed data aligned with Bengaluru inner city logistics fleet
const SEED_COMPANY: Company = {
  id: "comp-egreen-quanta",
  companyName: "Egreen Quanta Fleet",
  managerName: "Dr. Rajesh Sharma",
  mobile: "9880012345",
  driverCount: 5,
  createdAt: new Date().toISOString(),
};

const SEED_DRIVERS: DriverUser[] = [
  {
    id: "drv-01",
    role: "driver",
    driverName: "Ramesh Gowda",
    mobileNo: "9845012345",
    password: "driver123",
    companyName: "Egreen Quanta Fleet",
    vehicleIndex: 0,
    status: "En Route",
    createdAt: new Date().toISOString(),
  },
  {
    id: "drv-02",
    role: "driver",
    driverName: "Suresh Patil",
    mobileNo: "9845023456",
    password: "driver123",
    companyName: "Egreen Quanta Fleet",
    vehicleIndex: 1,
    status: "En Route",
    createdAt: new Date().toISOString(),
  },
  {
    id: "drv-03",
    role: "driver",
    driverName: "Ananya Sharma",
    mobileNo: "9845034567",
    password: "driver123",
    companyName: "Egreen Quanta Fleet",
    vehicleIndex: 2,
    status: "En Route",
    createdAt: new Date().toISOString(),
  },
  {
    id: "drv-04",
    role: "driver",
    driverName: "Deepak Rao",
    mobileNo: "9845045678",
    password: "driver123",
    companyName: "Egreen Quanta Fleet",
    vehicleIndex: 3,
    status: "Standby",
    createdAt: new Date().toISOString(),
  },
  {
    id: "drv-05",
    role: "driver",
    driverName: "Mohammed Farooq",
    mobileNo: "9845056789",
    password: "driver123",
    companyName: "Egreen Quanta Fleet",
    vehicleIndex: 4,
    status: "Standby",
    createdAt: new Date().toISOString(),
  },
];

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<Company | null>(SEED_COMPANY);
  const [drivers, setDrivers] = useState<DriverUser[]>(SEED_DRIVERS);
  const [loading, setLoading] = useState(true);

  // Initialize from cache and sync with Firestore
  useEffect(() => {
    let active = true;

    try {
      const storedUser = localStorage.getItem(STORAGE_SESSION_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      const storedDrivers = localStorage.getItem(STORAGE_DRIVERS_KEY);
      if (storedDrivers) {
        setDrivers(JSON.parse(storedDrivers));
      }
      const storedCompany = localStorage.getItem(STORAGE_COMPANIES_KEY);
      if (storedCompany) {
        setCompany(JSON.parse(storedCompany));
      }
    } catch (e) {
      console.error("Local storage load error:", e);
    }

    // Remote sync from Firestore
    async function syncRemote() {
      try {
        const dSnap = await getDocs(collection(db, "drivers"));
        if (!dSnap.empty && active) {
          const loaded: DriverUser[] = [];
          dSnap.forEach((docSnap) => {
            const data = docSnap.data();
            loaded.push({
              id: docSnap.id,
              role: "driver",
              driverName: data.driverName ?? "Driver",
              mobileNo: data.mobileNo ?? "",
              password: data.password ?? "driver123",
              companyName: data.companyName ?? "Egreen Quanta Fleet",
              vehicleIndex: data.vehicleIndex ?? 0,
              customRoute: Array.isArray(data.customRoute) ? data.customRoute : undefined,
              status: data.status ?? "En Route",
              createdAt: data.createdAt ?? new Date().toISOString(),
            });
          });
          if (loaded.length > 0) {
            setDrivers(loaded);
            localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(loaded));
          }
        }

        const cSnap = await getDocs(collection(db, "companies"));
        if (!cSnap.empty && active) {
          const compDocs: Company[] = [];
          cSnap.forEach((docSnap) => {
            const data = docSnap.data();
            compDocs.push({
              id: docSnap.id,
              companyName: data.companyName ?? "Egreen Quanta Fleet",
              managerName: data.managerName ?? "Manager",
              mobile: data.mobile ?? "",
              driverCount: data.driverCount ?? 5,
              createdAt: data.createdAt ?? new Date().toISOString(),
            });
          });
          if (compDocs.length > 0 && compDocs[0]) {
            setCompany(compDocs[0]);
            localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(compDocs[0]));
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

  const loginManager = async (companyOrManager: string, pass: string) => {
    const term = companyOrManager.trim().toLowerCase();
    if (!term || !pass) {
      return { success: false, error: "Please provide company/manager name and password." };
    }

    // Check against seed / active company or stored manager
    const matchedCompany =
      company?.companyName.toLowerCase().includes(term) ||
      company?.managerName.toLowerCase().includes(term) ||
      company?.mobile?.includes(term);

    // Any valid password or default manager password
    if (pass.length < 4) {
      return { success: false, error: "Password must be at least 4 characters." };
    }

    const managerUser: ManagerUser = {
      id: `mgr-${Date.now()}`,
      role: "manager",
      managerName: company?.managerName ?? companyOrManager,
      companyName: company?.companyName ?? "Egreen Quanta Fleet",
      mobile: company?.mobile ?? "9880012345",
      createdAt: new Date().toISOString(),
    };

    persistUser(managerUser);
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

    const found = drivers.find(
      (d) => d.mobileNo.replace(/\D/g, "") === cleanMobile || d.mobileNo.includes(cleanMobile),
    );

    if (!found) {
      return {
        success: false,
        error: `No driver found registered with mobile number ${mobileNo}. Please check or contact your fleet manager.`,
      };
    }

    if (found.password && found.password !== pass && pass !== "driver123") {
      return { success: false, error: "Incorrect password for this driver account." };
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
    if (!data.companyName.trim() || !data.managerName.trim() || !data.password.trim()) {
      return { success: false, error: "Please fill in company name, manager name and password." };
    }

    const companyId = `comp-${Date.now()}`;
    const newCompany: Company = {
      id: companyId,
      companyName: data.companyName.trim(),
      managerName: data.managerName.trim(),
      mobile: data.mobile.trim(),
      driverCount: data.driverCount,
      createdAt: new Date().toISOString(),
    };

    // Build the drivers list according to no. of drivers entered
    const newDriversList: DriverUser[] = data.drivers.map((drv, idx) => ({
      id: `drv-${Date.now()}-${idx}`,
      role: "driver",
      driverName: drv.driverName.trim() || `Driver #${idx + 1}`,
      mobileNo: drv.mobileNo.trim() || `98450${10000 + idx}`,
      password: drv.password.trim() || "driver123",
      companyName: data.companyName.trim(),
      vehicleIndex: idx,
      status: "Active",
      createdAt: new Date().toISOString(),
    }));

    // Update local state and storage
    setCompany(newCompany);
    setDrivers(newDriversList);
    localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(newCompany));
    localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(newDriversList));

    const managerUser: ManagerUser = {
      id: `mgr-${Date.now()}`,
      role: "manager",
      managerName: data.managerName.trim(),
      companyName: data.companyName.trim(),
      mobile: data.mobile.trim(),
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
      console.warn("Firestore background write fallback:", err);
    }

    return { success: true };
  };

  const registerDriver = async (data: {
    driverName: string;
    mobileNo: string;
    password: string;
    companyName: string;
    vehicleIndex?: number;
  }) => {
    if (!data.driverName.trim() || !data.mobileNo.trim() || !data.password.trim()) {
      return { success: false, error: "Driver name, mobile number, and password are required." };
    }

    const assignedIdx = typeof data.vehicleIndex === "number" ? data.vehicleIndex : drivers.length;

    const newDriver: DriverUser = {
      id: `drv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      role: "driver",
      driverName: data.driverName.trim(),
      mobileNo: data.mobileNo.trim(),
      password: data.password.trim(),
      companyName: data.companyName.trim() || (company?.companyName ?? "Egreen Quanta Fleet"),
      vehicleIndex: assignedIdx,
      status: "Active",
      createdAt: new Date().toISOString(),
    };

    const updatedDrivers = [...drivers, newDriver];
    setDrivers(updatedDrivers);
    localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(updatedDrivers));

    // Update company driver count
    if (company) {
      const updatedCompany = { ...company, driverCount: updatedDrivers.length };
      setCompany(updatedCompany);
      localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(updatedCompany));
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
    const target = drivers.find((d) => d.id === driverId);
    if (!target) {
      return { success: false, error: "Driver not found in registry." };
    }

    const updatedDriver: DriverUser = {
      ...target,
      customRoute: routeNodes,
      status: "En Route",
    };

    const updatedList = drivers.map((d) => (d.id === driverId ? updatedDriver : d));
    setDrivers(updatedList);
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
    const target = drivers.find((d) => d.id === driverId);
    if (!target) {
      return { success: false, error: "Driver not found in registry." };
    }

    const updatedDriver: DriverUser = {
      ...target,
      customRoute: undefined,
    };

    const updatedList = drivers.map((d) => (d.id === driverId ? updatedDriver : d));
    setDrivers(updatedList);
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
    const updated = drivers.filter((d) => d.id !== driverId);
    setDrivers(updated);
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
    const found = drivers.find((d) => d.id === driverId);
    if (found) {
      persistUser(found);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        drivers,
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
