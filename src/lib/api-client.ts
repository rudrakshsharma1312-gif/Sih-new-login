/**
 * Typed frontend REST API client for QUANTA logistics platform.
 * Communicates with TanStack Start/Nitro server API endpoints.
 */

const API_BASE_URL = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) || "";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface CompanyModel {
  id: string;
  companyName: string;
  managerName: string;
  mobile?: string;
  driverCount: number;
  createdAt: string;
}

export interface DriverModel {
  id: string;
  role: "driver";
  driverName: string;
  mobileNo: string;
  companyName: string;
  vehicleIndex: number;
  customRoute?: number[];
  assignedRoute?: string;
  status?: "Active" | "En Route" | "Standby";
  createdAt: string;
}

export interface RouteAssignmentModel {
  id: string;
  companyName: string;
  vehicleIndex: number;
  driverMobile?: string;
  driverName?: string;
  stops: string;
  routeNodes: number[];
  distanceKm?: number;
  timeMin?: number;
  updatedAt: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json = (await res.json()) as ApiResponse<T>;
    if (!res.ok) {
      return {
        success: false,
        error: json.error || `HTTP ${res.status}: ${res.statusText}`,
        details: json.details,
      };
    }

    return json;
  } catch (error) {
    console.warn(`API client request error on ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error connecting to API",
    };
  }
}

export const apiClient = {
  companies: {
    async getAll(): Promise<ApiResponse<CompanyModel[]>> {
      return request<CompanyModel[]>("/api/companies", { method: "GET" });
    },
    async getById(id: string): Promise<ApiResponse<CompanyModel>> {
      return request<CompanyModel>(`/api/companies/${encodeURIComponent(id)}`, { method: "GET" });
    },
    async create(data: {
      id?: string;
      companyName: string;
      managerName: string;
      password?: string;
      mobile?: string;
      driverCount?: number;
    }): Promise<ApiResponse<CompanyModel>> {
      return request<CompanyModel>("/api/companies", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    async update(id: string, data: Partial<CompanyModel>): Promise<ApiResponse<CompanyModel>> {
      return request<CompanyModel>(`/api/companies/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
  },

  drivers: {
    async getAll(): Promise<ApiResponse<DriverModel[]>> {
      return request<DriverModel[]>("/api/drivers", { method: "GET" });
    },
    async getById(id: string): Promise<ApiResponse<DriverModel>> {
      return request<DriverModel>(`/api/drivers/${encodeURIComponent(id)}`, { method: "GET" });
    },
    async create(data: {
      id?: string;
      driverName: string;
      mobileNo: string;
      password?: string;
      companyName: string;
      vehicleIndex?: number;
      customRoute?: number[];
      assignedRoute?: string;
      status?: "Active" | "En Route" | "Standby";
    }): Promise<ApiResponse<DriverModel>> {
      return request<DriverModel>("/api/drivers", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    async update(
      id: string,
      patch: Partial<{
        driverName: string;
        mobileNo: string;
        companyName: string;
        vehicleIndex: number;
        customRoute: number[] | null;
        assignedRoute: string;
        status: "Active" | "En Route" | "Standby";
      }>,
    ): Promise<ApiResponse<DriverModel>> {
      return request<DriverModel>(`/api/drivers/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
    },
    async delete(id: string): Promise<ApiResponse<{ success: boolean; id: string }>> {
      return request<{ success: boolean; id: string }>(`/api/drivers/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  },

  routeAssignments: {
    async getAll(): Promise<ApiResponse<RouteAssignmentModel[]>> {
      return request<RouteAssignmentModel[]>("/api/route-assignments", { method: "GET" });
    },
    async save(data: {
      id?: string;
      companyName: string;
      vehicleIndex: number;
      driverMobile?: string;
      driverName?: string;
      stops?: string;
      routeNodes: number[];
      distanceKm?: number;
      timeMin?: number;
    }): Promise<ApiResponse<RouteAssignmentModel>> {
      return request<RouteAssignmentModel>("/api/route-assignments", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  auth: {
    async loginManager(identifier: string, pass: string): Promise<ApiResponse<{ user: unknown }>> {
      return request<{ user: unknown }>("/api/auth/login-manager", {
        method: "POST",
        body: JSON.stringify({ identifier, password: pass }),
      });
    },
    async loginDriver(mobileNo: string, pass: string): Promise<ApiResponse<{ user: DriverModel }>> {
      return request<{ user: DriverModel }>("/api/auth/login-driver", {
        method: "POST",
        body: JSON.stringify({ mobileNo, password: pass }),
      });
    },
  },
};
