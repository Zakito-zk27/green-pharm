import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import fr from "../../messages/fr.json";
import { dirOf, routing } from "./routing";

describe("i18n", () => {
  it("defaults to Arabic", () => {
    expect(routing.defaultLocale).toBe("ar");
  });

  it("uses rtl for Arabic and ltr for French", () => {
    expect(dirOf("ar")).toBe("rtl");
    expect(dirOf("fr")).toBe("ltr");
  });

  it("has the same text keys in both languages, none empty", () => {
    expect(Object.keys(fr.store).sort()).toEqual(Object.keys(ar.store).sort());
    for (const dict of [ar.store, fr.store]) {
      for (const value of Object.values(dict)) expect(value.trim()).not.toBe("");
    }
  });
});
