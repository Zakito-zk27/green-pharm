// Algerian mobile numbers, as validated in reference/store.html (`submit`).

const ALGERIAN_MOBILE = /^0[567]\d{8}$/;

/** Removes spaces, dots and dashes: "0550 12.34-56" -> "0550123456". */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s.\-]/g, "");
}

/** True for 10-digit mobiles starting with 05, 06 or 07 (after normalizing). */
export function isValidAlgerianPhone(raw: string): boolean {
  return ALGERIAN_MOBILE.test(normalizePhone(raw));
}
