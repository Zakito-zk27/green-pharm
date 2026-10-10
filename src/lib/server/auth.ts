import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type Role } from "@/lib/session";

export class AuthError extends Error {}

/** Throws unless the visitor is logged in, with `owner` when `ownerOnly`. */
export async function requireRole(ownerOnly = false): Promise<Role> {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) throw new AuthError("login");
  if (ownerOnly && s.role !== "owner") throw new AuthError("owner");
  return s.role;
}
