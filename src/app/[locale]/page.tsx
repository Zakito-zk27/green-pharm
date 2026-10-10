import { useTranslations } from "next-intl";
import { LanguageSwitch } from "@/components/LanguageSwitch";

export default function Home() {
  const t = useTranslations("store");
  return (
    <main>
      <p>{t("ann")}</p>
      <h1>Green Pharm</h1>
      <p>{t("heroT")}</p>
      <LanguageSwitch />
    </main>
  );
}
