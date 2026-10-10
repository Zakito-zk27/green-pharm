import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { locale as rootLocale } from "next/root-params";
import { dirOf, routing } from "@/i18n/routing";
import { themeAttrs, themeVars } from "@/lib/theme";
import { cairo, plexArabic, tajawal } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("store");
  return { title: t("title") };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      // Store Designer config comes from the database in phase 4; prototype defaults until then.
      {...themeAttrs()}
      style={themeVars() as CSSProperties}
      className={`${plexArabic.variable} ${cairo.variable} ${tajawal.variable}`}
    >
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
