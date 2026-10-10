import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { readDB } from "@/lib/server/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const db = await readDB();
  const pages = ["ar", "fr"].map((l) => ({
    url: `${base}/${l}`,
    changeFrequency: "daily" as const,
    priority: 1,
  }));
  const landings = db.landings
    .filter((l) => l.published)
    .flatMap((l) =>
      ["ar", "fr"].map((lang) => ({
        url: `${base}/${lang}/p/${l.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    );
  return [...pages, ...landings];
}
