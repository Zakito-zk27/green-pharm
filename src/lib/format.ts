// Number and price formatting, ported from reference/store.html (`ltr`, `fixNums`, `fmt`).

import type { Locale } from "@/i18n/routing";

/** Unicode "left-to-right isolate" and "pop directional isolate". */
export const LRI = "⁦";
export const PDI = "⁩";

/** Wraps `s` so it always reads left-to-right, even inside Arabic (RTL) text. */
export function ltr(s: string | number): string {
  return LRI + String(s) + PDI;
}

const NUMBER_RUN = /([#+\-]?\d[\d  .,:\/\-]*\d%?|[#+\-]?\d%?)/g;

/**
 * Isolates every number in a text so RTL rendering doesn't flip it
 * ("2 700" would show as "700 2", "-20%" as "%20-").
 * Use on Arabic texts that contain prices, discounts, phones or order numbers.
 */
export function fixNums(s: string | number): string {
  return String(s).replace(NUMBER_RUN, (m) => ltr(m));
}

/** "12500" -> "12 500" (space as thousands separator, as in the prototype). */
export function groupThousands(n: number | string): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Currency label per language; matches `cur` in messages/*.json. */
export const CURRENCY: Record<Locale, string> = { ar: "دج", fr: "DA" };

/** Price in Algerian dinars, e.g. formatDA(2700) -> "⁦2 700⁩ دج". Amounts are whole dinars. */
export function formatDA(amount: number, locale: Locale = "ar"): string {
  const whole = Math.round(amount);
  const sign = whole < 0 ? "-" : "";
  return ltr(sign + groupThousands(Math.abs(whole))) + " " + CURRENCY[locale];
}
