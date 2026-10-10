// Theme tokens driven by the Store Designer config.
// Ported from `applyConfig` / `inkFor` / `DEFAULT` in reference/store.html.

export type BgMode = "cream" | "blush" | "white" | "dark";
const BG_MODES: BgMode[] = ["cream", "blush", "white", "dark"];
export type FontName = "IBM Plex Sans Arabic" | "Cairo" | "Tajawal";

export type ThemeConfig = {
  color: string; // brand color, hex
  bg: BgMode;
  radius: number; // px
  font: FontName;
  cols: number; // product grid columns on desktop
  annBg: string; // announcement bar / dark side color, hex
  ratio: string; // product image aspect ratio, e.g. "1/1"
};

/** Defaults from `DEFAULT` in reference/store.html. */
export const DEFAULT_THEME: ThemeConfig = {
  color: "#2f5d46",
  bg: "cream",
  radius: 16,
  font: "IBM Plex Sans Arabic",
  cols: 4,
  annBg: "#1d2b24",
  ratio: "1/1",
};

/** CSS variables set by next/font in src/app/fonts.ts. */
const FONT_VARS: Record<FontName, string> = {
  "IBM Plex Sans Arabic": "var(--font-plex)",
  Cairo: "var(--font-cairo)",
  Tajawal: "var(--font-tajawal)",
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
// Options offered by the Store Designer in reference/admin-dashboard.html.
const RATIOS = ["1/1", "4/5"];

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** Text color readable on top of `hex`: dark ink on light colors, white otherwise. */
export function inkFor(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((x) => x + x)
          .join("")
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#241b27" : "#ffffff";
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

/**
 * Cleans a (possibly admin-edited, possibly partial) config so only safe values
 * reach the page's inline style.
 */
export function sanitizeTheme(input: Partial<ThemeConfig> = {}): ThemeConfig {
  const d = DEFAULT_THEME;
  return {
    color: isHexColor(input.color) ? input.color : d.color,
    bg: input.bg && BG_MODES.includes(input.bg) ? input.bg : d.bg,
    radius: clamp(input.radius, 0, 32, d.radius),
    font: input.font && input.font in FONT_VARS ? input.font : d.font,
    cols: clamp(input.cols, 2, 4, d.cols),
    annBg: isHexColor(input.annBg) ? input.annBg : d.annBg,
    ratio: input.ratio && RATIOS.includes(input.ratio) ? input.ratio : d.ratio,
  };
}

/** CSS custom properties for the `<html>` element. */
export function themeVars(input?: Partial<ThemeConfig>): Record<string, string> {
  const c = sanitizeTheme(input);
  return {
    "--brand": c.color,
    "--brand-ink": inkFor(c.color),
    "--brand-soft": `color-mix(in srgb, ${c.color} 12%, var(--bg))`,
    "--radius": `${c.radius}px`,
    "--cols": String(c.cols),
    "--ratio": c.ratio,
    "--side": c.annBg,
    "--font-body": `${FONT_VARS[c.font]}, ${FONT_VARS["IBM Plex Sans Arabic"]}, "Segoe UI", Tahoma, Arial, sans-serif`,
  };
}

/** Attributes for `<html>`: `data-bg`, plus `data-theme="dark"` for the dark background. */
export function themeAttrs(input?: Partial<ThemeConfig>) {
  const c = sanitizeTheme(input);
  return { "data-bg": c.bg, ...(c.bg === "dark" ? { "data-theme": "dark" } : {}) };
}
