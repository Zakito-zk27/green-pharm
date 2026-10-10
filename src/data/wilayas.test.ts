import { describe, expect, it } from "vitest";
import { WILAYAS, wilayaByCode, wilayaName } from "./wilayas";

describe("wilayas", () => {
  it("has exactly 58 wilayas with codes 1 to 58 in order", () => {
    expect(WILAYAS).toHaveLength(58);
    WILAYAS.forEach((w, i) => expect(w.code).toBe(i + 1));
  });

  it("has unique, non-empty names in Arabic and French", () => {
    for (const lang of ["ar", "fr"] as const) {
      const names = WILAYAS.map((w) => w[lang].trim());
      expect(names.every((n) => n.length > 0)).toBe(true);
      expect(new Set(names).size).toBe(58);
    }
  });

  it("finds wilayas by code", () => {
    expect(wilayaByCode(16)).toEqual({ code: 16, ar: "الجزائر", fr: "Alger" });
    expect(wilayaName(31, "fr")).toBe("Oran");
    expect(wilayaName(58, "ar")).toBe("المنيعة");
    expect(wilayaByCode(0)).toBeUndefined();
    expect(wilayaByCode(59)).toBeUndefined();
  });
});
