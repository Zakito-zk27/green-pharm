import type { MetadataRoute } from "next";
import { getStoreData } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { landings } = await getStoreData();
  const pages = ["ar", "fr"].map((l) => ({
    url: `${base}/${l}`,
    changeFrequency: "daily" as const,
    priority: 1,
  }));
  const pages2 = landings.flatMap((l) =>
    ["ar", "fr"].map((lang) => ({
      url: `${base}/${lang}/p/${l.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  );
  return [...pages, ...pages2];
}
