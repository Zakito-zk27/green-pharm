// Admin session cookie: `<payload>.<HMAC-SHA256 signature>`, signed with ADMIN_SECRET.
// Uses Web Crypto so the same code runs in the proxy and in server actions.
// Replaced by Supabase Auth once the Supabase project exists.

export type Role = "owner" | "staff";
export type Session = { role: Role; exp: number };

export const SESSION_COOKIE = "gp_admin";
export const SESSION_DAYS = 14;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function key(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function secret(): string {
  const s = process.env.ADMIN_SECRET;
  if (!s || s.length < 16)
    throw new Error("ADMIN_SECRET is missing or too short (see .env.example)");
  return s;
}

export async function signSession(role: Role, now = Date.now()): Promise<string> {
  const payload = b64url(
    enc.encode(JSON.stringify({ role, exp: now + SESSION_DAYS * 864e5 } satisfies Session)),
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", await key(secret()), enc.encode(payload)),
  );
  return payload + "." + b64url(sig);
}

export async function verifySession(
  token: string | undefined,
  now = Date.now(),
): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await key(secret()),
      fromB64url(sig) as BufferSource,
      enc.encode(payload),
    );
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Session;
    if ((s.role !== "owner" && s.role !== "staff") || typeof s.exp !== "number" || s.exp < now)
      return null;
    return s;
  } catch {
    return null;
  }
}

/** Constant-time comparison for passwords. */
export function samePassword(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
