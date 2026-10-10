import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "fr"],
  defaultLocale: "ar",
  // Remember the visitor's choice for one year (default is a session cookie).
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
