import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { locale as rootLocale } from "next/root-params";
import { dirOf, routing } from "@/i18n/routing";
import { getStoreData } from "@/lib/server/catalog";
import { themeAttrs, themeVars } from "@/lib/theme";
import type { StoreConfig } from "@/lib/types";
import { cairo, plexArabic, tajawal } from "../fonts";
import "../globals.css";
import "@/components/store/store.css";

// Every page reads the live database (products, prices, design), so nothing is prebuilt.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("store");
  const locale = await rootLocale();
  const description = t("heroS");
  return {
    title: t("title"),
    description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    alternates: { languages: { ar: "/ar", fr: "/fr" } },
    openGraph: {
      title: t("title"),
      description,
      locale: locale === "fr" ? "fr_DZ" : "ar_DZ",
      type: "website",
      images: [{ url: "/logo.png", width: 200, height: 200 }],
    },
    icons: { icon: "/logo.png", apple: "/logo.png" },
  };
}

function theme(c: StoreConfig) {
  const input = {
    color: c.color,
    bg: c.bg,
    radius: c.radius,
    font: c.font,
    cols: c.cols,
    annBg: c.annBg,
    ratio: c.card.ratio,
  };
  return { attrs: themeAttrs(input), style: themeVars(input) as CSSProperties };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  const { attrs, style } = theme((await getStoreData()).config);

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      {...attrs}
      style={style}
      className={`${plexArabic.variable} ${cairo.variable} ${tajawal.variable}`}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
