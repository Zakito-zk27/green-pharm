// Text helpers for the storefront, ported from `T`, `fmt`, `stars` in reference/store.html.

import { fixNums, groupThousands, ltr } from "@/lib/format";
import type { L2, StoreConfig } from "@/lib/types";

export type Lang = "ar" | "fr";
export type Dict = Record<string, string>;
export type TX = { ar: Dict; fr: Dict };

export type Texts = {
  L: Lang;
  /** Text by key, with the Store Designer's override first; `{0}` is replaced by the first argument. */
  T: (k: string, ...args: (string | number)[]) => string;
  /** Price in dinars, e.g. "⁦2 700⁩ دج". */
  fmt: (n: number) => string;
  /** Pick the current language from an { ar, fr } pair. */
  li: (v: L2 | undefined) => string;
};

export function makeTexts(tx: TX, cfg: StoreConfig, L: Lang): Texts {
  const T = (k: string, ...args: (string | number)[]) => {
    let v = cfg.texts[k]?.[L] || tx[L][k] || tx.ar[k] || k;
    args.forEach((x, i) => {
      v = v.split("{" + i + "}").join(String(x));
    });
    return L === "ar" ? fixNums(v) : v;
  };
  const cur = cfg.texts.cur?.[L] || tx[L].cur;
  return {
    L,
    T,
    fmt: (n: number) => ltr(groupThousands(Math.round(n))) + " " + cur,
    li: (v) => (v ? v[L] || v.ar || v.fr || "" : ""),
  };
}

export function stars(r: number): string {
  const n = Math.round(r);
  return "★".repeat(n) + "☆".repeat(5 - n);
}
