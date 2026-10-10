import { locale as rootLocale } from "next/root-params";
import { Storefront } from "@/components/store/Storefront";
import { getStoreData } from "@/lib/server/catalog";
import ar from "../../../messages/ar.json";
import fr from "../../../messages/fr.json";

export default async function Home() {
  const locale = (await rootLocale()) === "fr" ? "fr" : "ar";
  const { config, catalog } = await getStoreData();
  return (
    <Storefront
      locale={locale}
      config={config}
      catalog={catalog}
      tx={{ ar: ar.store, fr: fr.store }}
    />
  );
}
