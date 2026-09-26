import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient, type CompanyModel, type DriverModel } from "./api-client";

export type Company = CompanyModel;

export interface DriverUser {
  id: string;
  role: "driver";
  driverName: string;
  mobileNo: string;
  password?: string;
  companyName: string;
  vehicleIndex: number;
  customRoute?: number[];
  assignedRoute?: string;
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
  isSyncing: boolean;
  apiError: string | null;
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
  refreshFromApi: () => Promise<void>;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Initialize from cache and sync with REST API
  const refreshFromApi = async () => {
    setIsSyncing(true);
    setApiError(null);
    try {
      const [driversRes, companiesRes] = await Promise.all([
        apiClient.drivers.getAll(),
        apiClient.companies.getAll(),
      ]);

      if (driversRes.success && driversRes.data && driversRes.data.length > 0) {
        const loaded: DriverUser[] = driversRes.data.map((d: DriverModel) => ({
          id: d.id,
          role: "driver",
          driverName: d.driverName,
          mobileNo: d.mobileNo,
          companyName: d.companyName,
          vehicleIndex: d.vehicleIndex,
          customRoute: d.customRoute,
          assignedRoute: d.assignedRoute,
          status: d.status ?? "Active",
          createdAt: d.createdAt,
        }));
        setDrivers(loaded);
        localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(loaded));
      } else if (!driversRes.success) {
        setApiError(driversRes.error ?? "Failed to fetch drivers from API");
      }

      if (companiesRes.success && companiesRes.data && companiesRes.data.length > 0) {
        setCompany(companiesRes.data[0]!);
        localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(companiesRes.data[0]));
      } else if (!companiesRes.success) {
        setApiError(companiesRes.error ?? "Failed to fetch companies from API");
      }
    } catch (err) {
      console.warn("API sync error, using cached data:", err);
      setApiError(err instanceof Error ? err.message : "API connection failed");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
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
    } finally {
      setLoading(false);
    }

    refreshFromApi();
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
    const term = companyOrManager.trim();
    if (!term || !pass) {
      return { success: false, error: "Please provide company/manager name and password." };
    }

    if (pass.length < 4) {
      return { success: false, error: "Password must be at least 4 characters." };
    }

    try {
      const res = await apiClient.auth.loginManager(term, pass);
      if (res.success && res.data) {
        const mgrUser = res.data.user as ManagerUser;
        persistUser(mgrUser);
        return { success: true };
      }
      if (res.error) {
        return { success: false, error: res.error };
      }
    } catch {
      // Fallback in case of server connectivity issue
    }

    // Fallback against local state
    const matchedCompany =
      company?.companyName.toLowerCase().includes(term.toLowerCase()) ||
      company?.managerName.toLowerCase().includes(term.toLowerCase()) ||
      company?.mobile?.includes(term);

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

    try {
      const res = await apiClient.auth.loginDriver(mobileNo, pass);
      if (res.success && res.data) {
        const drv = res.data.user as DriverUser;
        persistUser(drv);
        return { success: true };
      }
      if (res.error) {
        return { success: false, error: res.error };
      }
    } catch {
      // Fallback
    }

    // Local fallback
    const found = drivers.find(
      (d) => d.mobileNo.replace(/\D/g, "") === cleanMobile || d.mobileNo.includes(cleanMobile),
    );

    if (!found) {
      return {
        success: false,
        error: `No driver found registered with mobile number ${mobileNo}. Please check with fleet manager.`,
      };
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

    const newDriversList: DriverUser[] = data.drivers.map((drv, idx) => ({
      id: `drv-${Date.now()}-${idx}`,
      role: "driver",
      driverName: drv.driverName.trim() || `Driver #${idx + 1}`,
      mobileNo: drv.mobileNo.trim() || `98450${10000 + idx}`,
      companyName: data.companyName.trim(),
      vehicleIndex: idx,
      status: "Active",
      createdAt: new Date().toISOString(),
    }));

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

    // Call REST API in background
    apiClient.companies.create(newCompany).catch(console.warn);
    for (const drv of data.drivers) {
      apiClient.drivers
        .create({
          driverName: drv.driverName,
          mobileNo: drv.mobileNo,
          password: drv.password,
          companyName: data.companyName,
        })
        .catch(console.warn);
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
    if (!data.driverName.trim() || !data.mobileNo.trim()) {
      return { success: false, error: "Driver name and mobile number are required." };
    }

    const assignedIdx = typeof data.vehicleIndex === "number" ? data.vehicleIndex : drivers.length;

    const newDriver: DriverUser = {
      id: `drv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      role: "driver",
      driverName: data.driverName.trim(),
      mobileNo: data.mobileNo.trim(),
      companyName: data.companyName.trim() || (company?.companyName ?? "Egreen Quanta Fleet"),
      vehicleIndex: assignedIdx,
      status: "Active",
      createdAt: new Date().toISOString(),
    };

    const updatedDrivers = [...drivers, newDriver];
    setDrivers(updatedDrivers);
    localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(updatedDrivers));

    if (company) {
      const updatedCompany = { ...company, driverCount: updatedDrivers.length };
      setCompany(updatedCompany);
      localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(updatedCompany));
    }

    // Call REST API
    const res = await apiClient.drivers.create({
      ...data,
      id: newDriver.id,
      vehicleIndex: assignedIdx,
    });

    if (!res.success && res.error) {
      return { success: false, error: res.error };
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

    // Call REST API for driver update and route assignment
    try {
      await Promise.all([
        apiClient.drivers.update(driverId, {
          customRoute: routeNodes,
          assignedRoute: routeNodes.join(","),
          status: "En Route",
        }),
        apiClient.routeAssignments.save({
          id: `assign-${target.vehicleIndex}`,
          companyName: target.companyName,
          vehicleIndex: target.vehicleIndex,
          driverMobile: target.mobileNo,
          driverName: target.driverName,
          stops: routeNodes.join(" → "),
          routeNodes,
        }),
      ]);
    } catch (err) {
      console.warn("API route assignment update warning:", err);
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
      await apiClient.drivers.update(driverId, {
        customRoute: null,
        assignedRoute: "",
      });
    } catch (err) {
      console.warn("API reset route warning:", err);
    }

    return { success: true };
  };

  const removeDriver = async (driverId: string) => {
    const updated = drivers.filter((d) => d.id !== driverId);
    setDrivers(updated);
    localStorage.setItem(STORAGE_DRIVERS_KEY, JSON.stringify(updated));

    try {
      await apiClient.drivers.delete(driverId);
    } catch (err) {
      console.warn("API delete driver warning:", err);
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
        isSyncing,
        apiError,
        loginManager,
        loginDriver,
        signupManager,
        registerDriver,
        assignRouteToDriver,
        resetDriverRoute,
        removeDriver,
        logout,
        switchDriverForDemo,
        refreshFromApi,
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
