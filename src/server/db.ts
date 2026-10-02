import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

import { hashPassword } from "./crypto";

// Initialize Firebase App on the server
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const serverDb: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export interface CompanyEntity {
  id: string;
  companyName: string;
  managerName: string;
  password?: string;
  mobile?: string;
  driverCount?: number;
  createdAt: string;
  serverCreated?: unknown;
}

export interface DriverEntity {
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
  updatedAt?: unknown;
}

export interface RouteAssignmentEntity {
  id: string;
  companyName: string;
  vehicleIndex: number;
  driverMobile?: string;
  driverName?: string;
  stops?: string;
  routeNodes: number[];
  distanceKm?: number;
  timeMin?: number;
  updatedAt: string;
}

/** Sanitize driver entity to omit raw password from client responses */
export function sanitizeDriver(driver: DriverEntity): Omit<DriverEntity, "password"> {
  const { password: _pw, ...safeDriver } = driver;
  return safeDriver;
}

/** Sanitize company entity to omit password from client responses */
export function sanitizeCompany(company: CompanyEntity): Omit<CompanyEntity, "password"> {
  const { password: _pw, ...safeCompany } = company;
  return safeCompany;
}

// ==================== COMPANIES ====================

export async function fetchCompanies(): Promise<CompanyEntity[]> {
  try {
    const snap = await getDocs(collection(serverDb, "companies"));
    const companies: CompanyEntity[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const entity: CompanyEntity = {
        id: docSnap.id,
        companyName: (data["companyName"] as string | undefined) ?? "Egreen Quanta Fleet",
        managerName: (data["managerName"] as string | undefined) ?? "Manager",
        createdAt: (data["createdAt"] as string | undefined) ?? new Date().toISOString(),
      };
      if (data["password"] !== undefined) entity.password = data["password"] as string;
      if (data["mobile"] !== undefined) entity.mobile = (data["mobile"] as string | undefined) ?? "";
      if (data["driverCount"] !== undefined) entity.driverCount = (data["driverCount"] as number | undefined) ?? 5;
      companies.push(entity);
    });
    return companies;
  } catch (error) {
    console.warn("fetchCompanies server error:", error);
    return [];
  }
}

export async function fetchCompanyById(id: string): Promise<CompanyEntity | null> {
  try {
    const docSnap = await getDoc(doc(serverDb, "companies", id));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    const entity: CompanyEntity = {
      id: docSnap.id,
      companyName: (data["companyName"] as string | undefined) ?? "Egreen Quanta Fleet",
      managerName: (data["managerName"] as string | undefined) ?? "Manager",
      createdAt: (data["createdAt"] as string | undefined) ?? new Date().toISOString(),
    };
    if (data["password"] !== undefined) entity.password = data["password"] as string;
    if (data["mobile"] !== undefined) entity.mobile = (data["mobile"] as string | undefined) ?? "";
    if (data["driverCount"] !== undefined) entity.driverCount = (data["driverCount"] as number | undefined) ?? 5;
    return entity;
  } catch (error) {
    console.warn(`fetchCompanyById error (${id}):`, error);
    return null;
  }
}

export async function saveCompany(data: {
  id?: string;
  companyName: string;
  managerName: string;
  password?: string;
  mobile?: string;
  driverCount?: number;
}): Promise<CompanyEntity> {
  const companyId = data.id || `comp-${Date.now()}`;
  const now = new Date().toISOString();
  const entity: CompanyEntity = {
    id: companyId,
    companyName: data.companyName,
    managerName: data.managerName,
    password: data.password ? hashPassword(data.password) : hashPassword("manager123"),
    createdAt: now,
  };
  if (data.mobile !== undefined) entity.mobile = data.mobile;
  if (data.driverCount !== undefined) entity.driverCount = data.driverCount ?? 5;

  try {
    await setDoc(doc(serverDb, "companies", companyId), {
      ...entity,
      serverCreated: serverTimestamp(),
    });
  } catch (error) {
    console.warn("saveCompany firestore write failed, returning in-memory entity:", error);
  }

  return entity;
}

// ==================== DRIVERS ====================

export async function fetchDrivers(): Promise<DriverEntity[]> {
  try {
    const snap = await getDocs(collection(serverDb, "drivers"));
    const drivers: DriverEntity[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const vehicleIndexRaw = data["vehicleIndex"];
      const entity: DriverEntity = {
        id: docSnap.id,
        role: "driver",
        driverName: (data["driverName"] as string | undefined) ?? "Driver",
        mobileNo: (data["mobileNo"] as string | undefined) ?? "",
        companyName: (data["companyName"] as string | undefined) ?? "Egreen Quanta Fleet",
        vehicleIndex: typeof vehicleIndexRaw === "number" ? vehicleIndexRaw : 0,
        createdAt: (data["createdAt"] as string | undefined) ?? new Date().toISOString(),
      };
      if (data["password"] !== undefined) entity.password = data["password"] as string;
      const customRouteRaw = data["customRoute"];
      if (Array.isArray(customRouteRaw)) entity.customRoute = customRouteRaw as number[];
      const assignedRouteRaw = data["assignedRoute"];
      if (typeof assignedRouteRaw === "string") entity.assignedRoute = assignedRouteRaw;
      const statusRaw = data["status"];
      if (statusRaw === "Active" || statusRaw === "En Route" || statusRaw === "Standby") {
        entity.status = statusRaw;
      } else {
        entity.status = "Active";
      }
      drivers.push(entity);
    });
    return drivers;
  } catch (error) {
    console.warn("fetchDrivers server error:", error);
    return [];
  }
}

export async function fetchDriverById(id: string): Promise<DriverEntity | null> {
  try {
    const docSnap = await getDoc(doc(serverDb, "drivers", id));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    const vehicleIndexRaw = data["vehicleIndex"];
    const entity: DriverEntity = {
      id: docSnap.id,
      role: "driver",
      driverName: (data["driverName"] as string | undefined) ?? "Driver",
      mobileNo: (data["mobileNo"] as string | undefined) ?? "",
      companyName: (data["companyName"] as string | undefined) ?? "Egreen Quanta Fleet",
      vehicleIndex: typeof vehicleIndexRaw === "number" ? vehicleIndexRaw : 0,
      createdAt: (data["createdAt"] as string | undefined) ?? new Date().toISOString(),
    };
    if (data["password"] !== undefined) entity.password = data["password"] as string;
    const customRouteRaw = data["customRoute"];
    if (Array.isArray(customRouteRaw)) entity.customRoute = customRouteRaw as number[];
    const assignedRouteRaw = data["assignedRoute"];
    if (typeof assignedRouteRaw === "string") entity.assignedRoute = assignedRouteRaw;
    const statusRaw = data["status"];
    if (statusRaw === "Active" || statusRaw === "En Route" || statusRaw === "Standby") {
      entity.status = statusRaw;
    } else {
      entity.status = "Active";
    }
    return entity;
  } catch (error) {
    console.warn(`fetchDriverById error (${id}):`, error);
    return null;
  }
}

export async function saveDriver(data: {
  id?: string;
  driverName: string;
  mobileNo: string;
  password?: string;
  companyName: string;
  vehicleIndex?: number;
  customRoute?: number[];
  assignedRoute?: string;
  status?: "Active" | "En Route" | "Standby";
}): Promise<DriverEntity> {
  const driverId = data.id || `drv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const entity: DriverEntity = {
    id: driverId,
    role: "driver",
    driverName: data.driverName,
    mobileNo: data.mobileNo,
    password: data.password ? hashPassword(data.password) : hashPassword("driver123"),
    companyName: data.companyName,
    vehicleIndex: data.vehicleIndex ?? 0,
    createdAt: now,
  };
  if (data.customRoute !== undefined) entity.customRoute = data.customRoute;
  if (data.assignedRoute !== undefined) entity.assignedRoute = data.assignedRoute;
  entity.status = data.status ?? "Active";

  try {
    await setDoc(doc(serverDb, "drivers", driverId), {
      ...entity,
      serverCreated: serverTimestamp(),
    });
  } catch (error) {
    console.warn("saveDriver firestore write failed, returning in-memory entity:", error);
  }

  return entity;
}

export async function updateDriver(
  id: string,
  patch: Partial<DriverEntity>,
): Promise<DriverEntity | null> {
  try {
    const existing = await fetchDriverById(id);
    if (!existing) return null;

    const sanitizedPatch: Partial<DriverEntity> = { ...patch };
    if (patch.password) {
      sanitizedPatch.password = hashPassword(patch.password);
    }

    const updated: DriverEntity = {
      ...existing,
      ...sanitizedPatch,
      id,
    };

    const updatePayload: Record<string, unknown> = {
      ...sanitizedPatch,
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(serverDb, "drivers", id), updatePayload, { merge: true });
    return updated;
  } catch (error) {
    console.warn(`updateDriver error (${id}):`, error);
    return null;
  }
}

export async function deleteDriver(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(serverDb, "drivers", id));
    return true;
  } catch (error) {
    console.warn(`deleteDriver error (${id}):`, error);
    return false;
  }
}

// ==================== ROUTE ASSIGNMENTS ====================

export async function fetchRouteAssignments(): Promise<RouteAssignmentEntity[]> {
  try {
    const snap = await getDocs(collection(serverDb, "routeAssignments"));
    const assignments: RouteAssignmentEntity[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const vehicleIndexRaw = data["vehicleIndex"];
      const routeNodesRaw = data["routeNodes"];
      const entity: RouteAssignmentEntity = {
        id: docSnap.id,
        companyName: (data["companyName"] as string | undefined) ?? "Egreen Quanta Fleet",
        vehicleIndex: typeof vehicleIndexRaw === "number" ? vehicleIndexRaw : 0,
        routeNodes: Array.isArray(routeNodesRaw) ? (routeNodesRaw as number[]) : [],
        updatedAt: (data["updatedAt"] as string | undefined) ?? new Date().toISOString(),
      };
      const driverMobileRaw = data["driverMobile"];
      if (typeof driverMobileRaw === "string") entity.driverMobile = driverMobileRaw;
      const driverNameRaw = data["driverName"];
      if (typeof driverNameRaw === "string") entity.driverName = driverNameRaw;
      const stopsRaw = data["stops"];
      if (typeof stopsRaw === "string") entity.stops = stopsRaw;
      const distanceKmRaw = data["distanceKm"];
      if (typeof distanceKmRaw === "number") entity.distanceKm = distanceKmRaw;
      const timeMinRaw = data["timeMin"];
      if (typeof timeMinRaw === "number") entity.timeMin = timeMinRaw;
      assignments.push(entity);
    });
    return assignments;
  } catch (error) {
    console.warn("fetchRouteAssignments server error:", error);
    return [];
  }
}

export async function saveRouteAssignment(data: {
  id?: string;
  companyName: string;
  vehicleIndex: number;
  driverMobile?: string;
  driverName?: string;
  stops?: string;
  routeNodes: number[];
  distanceKm?: number;
  timeMin?: number;
}): Promise<RouteAssignmentEntity> {
  const assignmentId = data.id || `assign-${data.vehicleIndex}`;
  const now = new Date().toISOString();
  const entity: RouteAssignmentEntity = {
    id: assignmentId,
    companyName: data.companyName,
    vehicleIndex: data.vehicleIndex,
    routeNodes: data.routeNodes,
    updatedAt: now,
  };
  if (data.driverMobile !== undefined) entity.driverMobile = data.driverMobile;
  if (data.driverName !== undefined) entity.driverName = data.driverName;
  entity.stops = data.stops ?? data.routeNodes.join(" → ");
  if (data.distanceKm !== undefined) entity.distanceKm = data.distanceKm;
  if (data.timeMin !== undefined) entity.timeMin = data.timeMin;

  try {
    await setDoc(
      doc(serverDb, "routeAssignments", assignmentId),
      {
        ...entity,
        updatedAt: now,
        serverUpdated: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("saveRouteAssignment firestore write failed, returning in-memory entity:", error);
  }

  return entity;
}
