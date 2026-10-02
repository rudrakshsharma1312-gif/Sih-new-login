import { scryptSync, randomBytes } from "node:crypto";

/**
 * Hash password with a unique salt using Node.js scrypt.
 * Output format: salt:hash
 */
export function hashPassword(password: string): string {
  if (!password) return "";
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plain-text password against a stored hashed password.
 * Supports legacy unhashed strings for backward-compatibility with demo/seed records.
 *
 * SECURITY WARNING: The fallback passwords ("driver123", "manager123") are enabled for demo purposes.
 * In production, set DISABLE_AUTH_FALLBACKS=true to enforce strict password verification.
 */
export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!password || !storedHash) return false;

  // Format salt:hash
  if (storedHash.includes(":")) {
    const parts = storedHash.split(":");
    const salt = parts[0];
    const hash = parts[1];
    if (parts.length === 2 && salt && hash) {
      try {
        const computed = scryptSync(password, salt, 32).toString("hex");
        return computed === hash;
      } catch {
        return false;
      }
    }
  }

  // Only allow fallback passwords in development/demo mode
  const allowFallbacks = process.env["DISABLE_AUTH_FALLBACKS"] !== "true";

  if (allowFallbacks) {
    // Backward compatibility fallback for pre-existing demo entries
    return password === storedHash || password === "driver123" || password === "manager123";
  }

  // In production with fallbacks disabled, only accept exact match with stored hash
  return password === storedHash;
}
