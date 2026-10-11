import "server-only";
import { getCurrentUser } from "@/lib/auth";
import type { UserRole } from "@/models/user";

export class AuthorizationError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Authentication required." : "You do not have permission to do that.");
  }
}

export async function requireRole(allowedRoles: readonly UserRole[]) {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError(401);
  if (!allowedRoles.includes(user.role)) throw new AuthorizationError(403);
  return user;
}

export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const appUrl = process.env.APP_URL;
  if (!origin) return false;
  if (appUrl && origin === new URL(appUrl).origin) return true;
  if (process.env.NODE_ENV !== "development") return false;

  try {
    const originUrl = new URL(origin);
    const requestHost = request.headers.get("host");
    return originUrl.protocol === "http:"
      && ["localhost", "127.0.0.1"].includes(originUrl.hostname)
      && requestHost === originUrl.host;
  } catch {
    return false;
  }
}