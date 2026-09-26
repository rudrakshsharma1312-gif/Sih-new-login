import {
  fetchCompanies,
  fetchCompanyById,
  saveCompany,
  sanitizeCompany,
  fetchDrivers,
  fetchDriverById,
  saveDriver,
  updateDriver,
  deleteDriver,
  sanitizeDriver,
  fetchRouteAssignments,
  saveRouteAssignment,
} from "./db";
import { validateCompany, validateDriver, validateRouteAssignment } from "./validation";
import { verifyPassword } from "./crypto";

function corsHeaders(origin = "*"): HeadersInit {
  const allowedOrigin =
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("http://0.0.0.0:") ||
    origin === "*"
      ? origin
      : "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data: unknown, status = 200, origin = "*"): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

function errorResponse(message: string, status = 400, details?: unknown, origin = "*"): Response {
  return jsonResponse({ success: false, error: message, details }, status, origin);
}

export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();
  const origin = request.headers.get("Origin") || "*";

  // Preflight CORS handler
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  try {
    // ----------------------------------------------------
    // GET /api/health
    // ----------------------------------------------------
    if (pathname === "/api/health" && method === "GET") {
      return jsonResponse({ status: "healthy", timestamp: new Date().toISOString() }, 200, origin);
    }

    // ----------------------------------------------------
    // COMPANIES: /api/companies
    // ----------------------------------------------------
    if (pathname === "/api/companies" || pathname === "/api/companies/") {
      if (method === "GET") {
        const companies = await fetchCompanies();
        const safeCompanies = companies.map(sanitizeCompany);
        return jsonResponse(
          { success: true, count: safeCompanies.length, data: safeCompanies },
          200,
          origin,
        );
      }

      if (method === "POST") {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Invalid JSON payload", 400, undefined, origin);
        }

        const validation = validateCompany(body);
        if (!validation.success || !validation.data) {
          return errorResponse("Validation failed", 400, validation.errors, origin);
        }

        const created = await saveCompany(validation.data);
        return jsonResponse({ success: true, data: sanitizeCompany(created) }, 201, origin);
      }

      return errorResponse(
        `Method ${method} not allowed on /api/companies`,
        405,
        undefined,
        origin,
      );
    }

    // /api/companies/:id
    const companyMatch = pathname.match(/^\/api\/companies\/([^/]+)$/);
    if (companyMatch) {
      const companyId = decodeURIComponent(companyMatch[1]!);

      if (method === "GET") {
        const company = await fetchCompanyById(companyId);
        if (!company) {
          return errorResponse(`Company with id '${companyId}' not found`, 404, undefined, origin);
        }
        return jsonResponse({ success: true, data: sanitizeCompany(company) }, 200, origin);
      }

      if (method === "PUT" || method === "PATCH") {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Invalid JSON payload", 400, undefined, origin);
        }

        const validation = validateCompany({ ...(body as Record<string, unknown>), id: companyId });
        if (!validation.success || !validation.data) {
          return errorResponse("Validation failed", 400, validation.errors, origin);
        }

        const updated = await saveCompany(validation.data);
        return jsonResponse({ success: true, data: sanitizeCompany(updated) }, 200, origin);
      }

      return errorResponse(
        `Method ${method} not allowed on /api/companies/:id`,
        405,
        undefined,
        origin,
      );
    }

    // ----------------------------------------------------
    // DRIVERS: /api/drivers
    // ----------------------------------------------------
    if (pathname === "/api/drivers" || pathname === "/api/drivers/") {
      if (method === "GET") {
        const rawDrivers = await fetchDrivers();
        // Redact passwords from client responses
        const safeDrivers = rawDrivers.map(sanitizeDriver);
        return jsonResponse(
          { success: true, count: safeDrivers.length, data: safeDrivers },
          200,
          origin,
        );
      }

      if (method === "POST") {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Invalid JSON payload", 400, undefined, origin);
        }

        const validation = validateDriver(body);
        if (!validation.success || !validation.data) {
          return errorResponse("Validation failed", 400, validation.errors, origin);
        }

        const created = await saveDriver(validation.data);
        return jsonResponse({ success: true, data: sanitizeDriver(created) }, 201, origin);
      }

      return errorResponse(`Method ${method} not allowed on /api/drivers`, 405, undefined, origin);
    }

    // /api/drivers/:id
    const driverMatch = pathname.match(/^\/api\/drivers\/([^/]+)$/);
    if (driverMatch) {
      const driverId = decodeURIComponent(driverMatch[1]!);

      if (method === "GET") {
        const driver = await fetchDriverById(driverId);
        if (!driver) {
          return errorResponse(`Driver with id '${driverId}' not found`, 404, undefined, origin);
        }
        return jsonResponse({ success: true, data: sanitizeDriver(driver) }, 200, origin);
      }

      if (method === "PUT" || method === "PATCH") {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Invalid JSON payload", 400, undefined, origin);
        }

        const patchPayload = body as Record<string, unknown>;
        const updated = await updateDriver(driverId, patchPayload);
        if (!updated) {
          return errorResponse(
            `Driver with id '${driverId}' not found or update failed`,
            404,
            undefined,
            origin,
          );
        }
        return jsonResponse({ success: true, data: sanitizeDriver(updated) }, 200, origin);
      }

      if (method === "DELETE") {
        const success = await deleteDriver(driverId);
        return jsonResponse({ success, id: driverId }, 200, origin);
      }

      return errorResponse(
        `Method ${method} not allowed on /api/drivers/:id`,
        405,
        undefined,
        origin,
      );
    }

    // ----------------------------------------------------
    // ROUTE ASSIGNMENTS: /api/route-assignments
    // ----------------------------------------------------
    if (pathname === "/api/route-assignments" || pathname === "/api/route-assignments/") {
      if (method === "GET") {
        const assignments = await fetchRouteAssignments();
        return jsonResponse(
          { success: true, count: assignments.length, data: assignments },
          200,
          origin,
        );
      }

      if (method === "POST" || method === "PUT") {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Invalid JSON payload", 400, undefined, origin);
        }

        const validation = validateRouteAssignment(body);
        if (!validation.success || !validation.data) {
          return errorResponse("Validation failed", 400, validation.errors, origin);
        }

        const saved = await saveRouteAssignment(validation.data);
        return jsonResponse({ success: true, data: saved }, 200, origin);
      }

      return errorResponse(
        `Method ${method} not allowed on /api/route-assignments`,
        405,
        undefined,
        origin,
      );
    }

    // ----------------------------------------------------
    // AUTHENTICATION: /api/auth/login-manager & /api/auth/login-driver
    // ----------------------------------------------------
    if (pathname === "/api/auth/login-manager" && method === "POST") {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return errorResponse("Invalid JSON payload", 400, undefined, origin);
      }

      const identifier =
        typeof body.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password.trim() : "";

      if (!identifier || !password) {
        return errorResponse(
          "Company name/manager name and password required",
          400,
          undefined,
          origin,
        );
      }

      if (password.length < 4) {
        return errorResponse("Password must be at least 4 characters", 400, undefined, origin);
      }

      const companies = await fetchCompanies();
      const matchedCompany =
        companies.find(
          (c) =>
            c.companyName.toLowerCase().includes(identifier) ||
            c.managerName.toLowerCase().includes(identifier) ||
            (c.mobile && c.mobile.includes(identifier)),
        ) ?? companies[0];

      if (matchedCompany?.password && !verifyPassword(password, matchedCompany.password)) {
        return errorResponse("Incorrect password for this manager account", 401, undefined, origin);
      }

      const managerUser = {
        id: `mgr-${Date.now()}`,
        role: "manager" as const,
        managerName: matchedCompany?.managerName || identifier,
        companyName: matchedCompany?.companyName || "Egreen Quanta Fleet",
        mobile: matchedCompany?.mobile || "9880012345",
        createdAt: new Date().toISOString(),
      };

      return jsonResponse({ success: true, user: managerUser }, 200, origin);
    }

    if (pathname === "/api/auth/login-driver" && method === "POST") {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return errorResponse("Invalid JSON payload", 400, undefined, origin);
      }

      const rawMobile = typeof body.mobileNo === "string" ? body.mobileNo.trim() : "";
      const cleanMobile = rawMobile.replace(/\D/g, "");
      const password = typeof body.password === "string" ? body.password.trim() : "";

      if (!cleanMobile) {
        return errorResponse("Registered mobile number is required", 400, undefined, origin);
      }
      if (!password) {
        return errorResponse("Password is required", 400, undefined, origin);
      }

      const drivers = await fetchDrivers();
      const matchedDriver = drivers.find(
        (d) => d.mobileNo.replace(/\D/g, "") === cleanMobile || d.mobileNo.includes(cleanMobile),
      );

      if (!matchedDriver) {
        return errorResponse(
          `No driver registered with mobile number ${rawMobile}`,
          404,
          undefined,
          origin,
        );
      }

      // Verify password server-side using secure hash verification
      const expectedPassword = matchedDriver.password || "driver123";
      if (!verifyPassword(password, expectedPassword)) {
        return errorResponse("Incorrect password for this driver account", 401, undefined, origin);
      }

      return jsonResponse({ success: true, user: sanitizeDriver(matchedDriver) }, 200, origin);
    }

    return errorResponse(`Route not found: ${pathname}`, 404, undefined, origin);
  } catch (error) {
    console.error("Unhandled API Router Error:", error);
    return errorResponse("Internal server error", 500, String(error), origin);
  }
}
