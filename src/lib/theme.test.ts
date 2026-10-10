import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, inkFor, isHexColor, sanitizeTheme, themeAttrs, themeVars } from "./theme";

describe("inkFor", () => {
  it("uses white text on the dark brand green", () => {
    expect(inkFor("#2f5d46")).toBe("#ffffff");
  });
  it("uses dark ink on light colors", () => {
    expect(inkFor("#ffeb3b")).toBe("#241b27");
    expect(inkFor("#fff")).toBe("#241b27");
  });
});

describe("isHexColor", () => {
  it("accepts 3 and 6 digit hex", () => {
    expect(isHexColor("#abc")).toBe(true);
    expect(isHexColor("#2F5D46")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("#2f5d46;background:url(x)")).toBe(false);
    expect(isHexColor(42)).toBe(false);
  });
});

describe("sanitizeTheme", () => {
  it("returns the prototype defaults when given nothing", () => {
    expect(sanitizeTheme()).toEqual(DEFAULT_THEME);
  });
  it("keeps valid values", () => {
    const c = sanitizeTheme({ color: "#123456", bg: "blush", radius: 26, cols: 3, ratio: "4/5" });
    expect(c).toMatchObject({ color: "#123456", bg: "blush", radius: 26, cols: 3, ratio: "4/5" });
  });
  it("replaces unsafe or out-of-range values", () => {
    const c = sanitizeTheme({
      color: "url(javascript:x)",
      bg: "pink" as never,
      radius: 999,
      cols: 0,
      font: "Comic Sans" as never,
      ratio: "1/1;x" as never,
    });
    expect(c).toEqual({ ...DEFAULT_THEME, radius: 32, cols: 2 });
  });
});

describe("themeVars", () => {
  it("produces the prototype's CSS variables for the default config", () => {
    expect(themeVars()).toMatchObject({
      "--brand": "#2f5d46",
      "--brand-ink": "#ffffff",
      "--brand-soft": "color-mix(in srgb, #2f5d46 12%, var(--bg))",
      "--radius": "16px",
      "--cols": "4",
      "--ratio": "1/1",
      "--side": "#1d2b24",
    });
    expect(themeVars()["--font-body"]).toMatch(/^var\(--font-plex\)/);
  });
  it("switches the font variable", () => {
    expect(themeVars({ font: "Cairo" })["--font-body"]).toMatch(/^var\(--font-cairo\)/);
  });
});

describe("themeAttrs", () => {
  it("sets data-bg, and data-theme only for dark", () => {
    expect(themeAttrs()).toEqual({ "data-bg": "cream" });
    expect(themeAttrs({ bg: "dark" })).toEqual({ "data-bg": "dark", "data-theme": "dark" });
  });
});
