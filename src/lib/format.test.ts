import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import fr from "../../messages/fr.json";
import { CURRENCY, LRI, PDI, fixNums, formatDA, groupThousands, ltr } from "./format";

const iso = (s: string) => LRI + s + PDI;

describe("ltr", () => {
  it("wraps in LTR isolate characters", () => {
    expect(ltr("2 700")).toBe("⁦2 700⁩");
    expect(ltr(5)).toBe(iso("5"));
  });
});

describe("fixNums", () => {
  it("isolates prices with spaces", () => {
    expect(fixNums("المجموع 2 700 دج")).toBe(`المجموع ${iso("2 700")} دج`);
  });
  it("keeps the minus sign and percent with the number", () => {
    expect(fixNums("خصم -20%")).toBe(`خصم ${iso("-20%")}`);
  });
  it("isolates phones, order numbers and single digits", () => {
    expect(fixNums("اتصل 0550 12 34 56")).toBe(`اتصل ${iso("0550 12 34 56")}`);
    expect(fixNums("طلب #1042")).toBe(`طلب ${iso("#1042")}`);
    expect(fixNums("توصيل لـ 58 ولاية")).toBe(`توصيل لـ ${iso("58")} ولاية`);
    expect(fixNums("خلال 3 أيام")).toBe(`خلال ${iso("3")} أيام`);
  });
  it("isolates every number separately", () => {
    expect(fixNums("1 و 2")).toBe(`${iso("1")} و ${iso("2")}`);
  });
  it("leaves text without numbers unchanged", () => {
    expect(fixNums("مرحبا")).toBe("مرحبا");
  });
});

describe("groupThousands", () => {
  it("adds a space every three digits", () => {
    expect(groupThousands(0)).toBe("0");
    expect(groupThousands(950)).toBe("950");
    expect(groupThousands(2700)).toBe("2 700");
    expect(groupThousands(1250000)).toBe("1 250 000");
  });
});

describe("formatDA", () => {
  it("formats in Arabic by default", () => {
    expect(formatDA(2700)).toBe(`${iso("2 700")} دج`);
  });
  it("formats in French", () => {
    expect(formatDA(6000, "fr")).toBe(`${iso("6 000")} DA`);
  });
  it("rounds to whole dinars and handles zero and negatives", () => {
    expect(formatDA(1999.6)).toBe(`${iso("2 000")} دج`);
    expect(formatDA(0)).toBe(`${iso("0")} دج`);
    expect(formatDA(-500, "fr")).toBe(`${iso("-500")} DA`);
  });
  it("uses the same currency labels as the texts", () => {
    expect(CURRENCY.ar).toBe(ar.store.cur);
    expect(CURRENCY.fr).toBe(fr.store.cur);
  });
});
