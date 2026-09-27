export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export function validateCompany(input: unknown): ValidationResult<{
  id?: string;
  companyName: string;
  managerName: string;
  password?: string;
  mobile?: string;
  driverCount?: number;
}> {
  const errors: ValidationError[] = [];
  if (!input || typeof input !== "object") {
    return { success: false, errors: [{ field: "root", message: "Invalid payload body" }] };
  }

  const payload = input as Record<string, unknown>;
  const companyName = typeof payload.companyName === "string" ? payload.companyName.trim() : "";
  const managerName = typeof payload.managerName === "string" ? payload.managerName.trim() : "";
  const password = typeof payload.password === "string" ? payload.password.trim() : undefined;
  const mobile = typeof payload.mobile === "string" ? payload.mobile.trim() : undefined;
  const driverCount = typeof payload.driverCount === "number" ? payload.driverCount : undefined;
  const id = typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : undefined;

  if (companyName.length < 2 || companyName.length > 100) {
    errors.push({
      field: "companyName",
      message: "Company name must be between 2 and 100 characters",
    });
  }

  if (managerName.length < 2 || managerName.length > 100) {
    errors.push({
      field: "managerName",
      message: "Manager name must be between 2 and 100 characters",
    });
  }

  if (password !== undefined && password.length < 4) {
    errors.push({ field: "password", message: "Password must be at least 4 characters" });
  }

  if (mobile !== undefined && mobile.length > 0 && (mobile.length < 8 || mobile.length > 20)) {
    errors.push({ field: "mobile", message: "Mobile number must be between 8 and 20 characters" });
  }

  if (driverCount !== undefined && (driverCount < 0 || driverCount > 100)) {
    errors.push({ field: "driverCount", message: "Driver count must be between 0 and 100" });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      id,
      companyName,
      managerName,
      password,
      mobile,
      driverCount,
    },
  };
}

export function validateDriver(input: unknown): ValidationResult<{
  id?: string;
  driverName: string;
  mobileNo: string;
  password?: string;
  companyName: string;
  vehicleIndex?: number;
  customRoute?: number[];
  assignedRoute?: string;
  status?: "Active" | "En Route" | "Standby";
}> {
  const errors: ValidationError[] = [];
  if (!input || typeof input !== "object") {
    return { success: false, errors: [{ field: "root", message: "Invalid payload body" }] };
  }

  const payload = input as Record<string, unknown>;
  const driverName = typeof payload.driverName === "string" ? payload.driverName.trim() : "";
  const rawMobile = typeof payload.mobileNo === "string" ? payload.mobileNo.trim() : "";
  const mobileNo = rawMobile.replace(/[^\d+]/g, "");
  const password = typeof payload.password === "string" ? payload.password.trim() : undefined;
  const companyName =
    typeof payload.companyName === "string" ? payload.companyName.trim() : "Egreen Quanta Fleet";
  const vehicleIndex = typeof payload.vehicleIndex === "number" ? payload.vehicleIndex : undefined;
  const id = typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : undefined;
  const customRoute = Array.isArray(payload.customRoute)
    ? (payload.customRoute as unknown[]).filter((x): x is number => typeof x === "number")
    : undefined;
  const assignedRoute =
    typeof payload.assignedRoute === "string" ? payload.assignedRoute : undefined;
  const status =
    payload.status === "Active" || payload.status === "En Route" || payload.status === "Standby"
      ? payload.status
      : undefined;

  if (driverName.length < 2 || driverName.length > 100) {
    errors.push({
      field: "driverName",
      message: "Driver name must be between 2 and 100 characters",
    });
  }

  if (mobileNo.length < 8 || mobileNo.length > 20) {
    errors.push({
      field: "mobileNo",
      message: "Valid mobile number between 8 and 20 digits required",
    });
  }

  if (password !== undefined && password.length < 4) {
    errors.push({ field: "password", message: "Password must be at least 4 characters" });
  }

  if (vehicleIndex !== undefined && (vehicleIndex < 0 || vehicleIndex > 50)) {
    errors.push({ field: "vehicleIndex", message: "Vehicle index must be between 0 and 50" });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      id,
      driverName,
      mobileNo,
      password,
      companyName,
      vehicleIndex,
      customRoute,
      assignedRoute,
      status,
    },
  };
}

export function validateRouteAssignment(input: unknown): ValidationResult<{
  id?: string;
  companyName: string;
  vehicleIndex: number;
  driverMobile?: string;
  driverName?: string;
  stops?: string;
  routeNodes: number[];
  distanceKm?: number;
  timeMin?: number;
}> {
  const errors: ValidationError[] = [];
  if (!input || typeof input !== "object") {
    return { success: false, errors: [{ field: "root", message: "Invalid payload body" }] };
  }

  const payload = input as Record<string, unknown>;
  const companyName =
    typeof payload.companyName === "string" ? payload.companyName.trim() : "Egreen Quanta Fleet";
  const vehicleIndex = typeof payload.vehicleIndex === "number" ? payload.vehicleIndex : 0;
  const driverMobile =
    typeof payload.driverMobile === "string" ? payload.driverMobile.trim() : undefined;
  const driverName = typeof payload.driverName === "string" ? payload.driverName.trim() : undefined;
  const stops = typeof payload.stops === "string" ? payload.stops.trim() : undefined;
  const id = typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : undefined;
  const distanceKm = typeof payload.distanceKm === "number" ? payload.distanceKm : undefined;
  const timeMin = typeof payload.timeMin === "number" ? payload.timeMin : undefined;

  const routeNodes = Array.isArray(payload.routeNodes)
    ? (payload.routeNodes as unknown[]).filter((x): x is number => typeof x === "number")
    : [];

  if (routeNodes.length < 2) {
    errors.push({
      field: "routeNodes",
      message: "Route must contain at least 2 waypoint node indices",
    });
  }

  if (vehicleIndex < 0) {
    errors.push({ field: "vehicleIndex", message: "Vehicle index cannot be negative" });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      id,
      companyName,
      vehicleIndex,
      driverMobile,
      driverName,
      stops,
      routeNodes,
      distanceKm,
      timeMin,
    },
  };
}
