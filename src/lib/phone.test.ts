import { describe, expect, it } from "vitest";
import { isValidAlgerianPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("removes spaces, dots and dashes", () => {
    expect(normalizePhone(" 0550 12.34-56 ")).toBe("0550123456");
  });
});

describe("isValidAlgerianPhone", () => {
  it.each([
    "0550123456",
    "0661234567",
    "0771234567",
    "0550 12 34 56",
    "06.61.23.45.67",
    "07-71-23-45-67",
  ])("accepts %s", (p) => expect(isValidAlgerianPhone(p)).toBe(true));

  it.each([
    ["landline 021", "0211234567"],
    ["starts with 08", "0850123456"],
    ["9 digits", "055012345"],
    ["11 digits", "05501234567"],
    ["missing leading 0", "550123456"],
    ["international format (not accepted by the prototype)", "+213550123456"],
    ["letters", "05501234ab"],
    ["empty", ""],
  ])("rejects %s", (_label, p) => expect(isValidAlgerianPhone(p)).toBe(false));
});
