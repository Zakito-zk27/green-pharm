import { Cairo, IBM_Plex_Sans_Arabic, Tajawal } from "next/font/google";

// next/font downloads these at build time and serves them from our own domain:
// visitors never make a request to Google.
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

// Alternatives the Store Designer can switch to; not preloaded.
export const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cairo",
  display: "swap",
  preload: false,
});

export const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
  preload: false,
});
