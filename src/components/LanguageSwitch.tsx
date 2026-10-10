"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export function LanguageSwitch() {
  const t = useTranslations("store");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const next: Locale = locale === "ar" ? "fr" : "ar";

  return (
    <button type="button" onClick={() => router.replace(pathname, { locale: next })}>
      {t("langBtn")}
    </button>
  );
}
