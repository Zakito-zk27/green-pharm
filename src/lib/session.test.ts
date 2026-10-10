import { beforeAll, describe, expect, it } from "vitest";
import { samePassword, signSession, verifySession } from "./session";

beforeAll(() => {
  process.env.ADMIN_SECRET = "test-secret-that-is-long-enough-123";
});

describe("admin session cookie", () => {
  it("accepts a token it signed", async () => {
    const t = await signSession("owner");
    expect((await verifySession(t))?.role).toBe("owner");
  });

  it("rejects a tampered token", async () => {
    const t = await signSession("staff");
    const [payload, sig] = t.split(".");
    const forged = btoa(JSON.stringify({ role: "owner", exp: Date.now() + 1e9 })).replace(
      /=+$/,
      "",
    );
    expect(await verifySession(forged + "." + sig)).toBeNull();
    expect(await verifySession(payload + ".AAAA")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const t = await signSession("owner", Date.now() - 30 * 864e5);
    expect(await verifySession(t)).toBeNull();
  });
});

describe("samePassword", () => {
  it("compares exactly", () => {
    expect(samePassword("abc", "abc")).toBe(true);
    expect(samePassword("abc", "abd")).toBe(false);
    expect(samePassword("abc", "abcd")).toBe(false);
  });
});
