import { useTranslations } from "next-intl";
import { LanguageSwitch } from "@/components/LanguageSwitch";

// Placeholder until phase 1 ports the storefront. Shows the theme tokens at work.
export default function Home() {
  const t = useTranslations("store");
  return (
    <>
      <p className="bg-side px-4 py-2 text-center text-sm text-white">{t("ann")}</p>
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-3xl font-bold">Green Pharm</h1>
        <p className="text-muted">{t("heroT")}</p>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-theme bg-brand px-5 py-3 font-bold text-brand-ink">
            {t("cta")}
          </span>
          <span className="rounded-theme border border-line bg-brand-soft px-5 py-3">
            {t("codT")}
          </span>
          <LanguageSwitch />
        </div>
      </main>
    </>
  );
}
