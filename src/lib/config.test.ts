import { describe, expect, it } from "vitest";
import { cleanText, normalizeConfig, safeImage, safeLink, safeUrl } from "./config";
import { DEFAULT_CONFIG } from "./defaults";

describe("normalizeConfig", () => {
  it("returns the prototype defaults for an empty config", () => {
    expect(normalizeConfig({})).toEqual(DEFAULT_CONFIG);
  });

  it("keeps valid edits", () => {
    const c = normalizeConfig({
      color: "#7a4ea8",
      bg: "white",
      cols: 3,
      texts: { heroT: { ar: "مرحبا", fr: "Bonjour" } },
    });
    expect(c.color).toBe("#7a4ea8");
    expect(c.bg).toBe("white");
    expect(c.cols).toBe(3);
    expect(c.texts.heroT).toEqual({ ar: "مرحبا", fr: "Bonjour" });
  });

  it("neutralizes malicious values", () => {
    const c = normalizeConfig({
      color: "red;background:url(javascript:alert(1))",
      name: "<script>alert(1)</script>Shop",
      logo: "javascript:alert(1)",
      social: { instagram: "javascript:alert(1)" },
      texts: { heroT: { ar: "<img src=x onerror=alert(1)>نص" } },
      custom: [{ id: "b1", link: "javascript:alert(1)", title: { ar: "عرض" } }],
      sections: [{ k: "c:b1" }, { k: "evil" }],
    });
    expect(c.color).toBe(DEFAULT_CONFIG.color);
    expect(c.name).toBe("alert(1)Shop");
    expect(c.logo).toBe("");
    expect(c.social.instagram).toBe("");
    expect(c.texts.heroT.ar).toBe("نص");
    expect(c.custom[0].link).toBe("#shop");
    expect(c.sections.map((s) => s.k)).not.toContain("evil");
    expect(c.sections.map((s) => s.k)).toContain("hero"); // missing defaults are added back
  });

  it("always keeps at least one language", () => {
    const c = normalizeConfig({ langs: { ar: false, fr: false }, defLang: "fr" });
    expect(c.langs.ar).toBe(true);
    expect(c.defLang).toBe("ar");
  });
});

describe("link and image filters", () => {
  it("allows anchors, https and tel links", () => {
    expect(safeLink("#shop")).toBe("#shop");
    expect(safeLink("https://example.com")).toBe("https://example.com");
    expect(safeLink("tel:0550000000")).toBe("tel:0550000000");
    expect(safeLink("data:text/html,x")).toBe("#shop");
  });
  it("allows only http(s) social links", () => {
    expect(safeUrl("https://instagram.com/x")).toBe("https://instagram.com/x");
    expect(safeUrl("ftp://x")).toBe("");
  });
  it("allows only our uploads or https images", () => {
    expect(safeImage("/media/abc-123.jpg")).toBe("/media/abc-123.jpg");
    expect(safeImage("/media/../db.json")).toBe("");
    expect(safeImage("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
  });
  it("strips tags and limits length", () => {
    expect(cleanText("<b>hi</b>")).toBe("hi");
    expect(cleanText("x".repeat(500), 10)).toHaveLength(10);
  });
});
