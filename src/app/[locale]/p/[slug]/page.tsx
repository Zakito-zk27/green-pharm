import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingView } from "@/components/store/LandingView";
import { getStoreData } from "@/lib/server/catalog";
import ar from "../../../../../messages/ar.json";
import fr from "../../../../../messages/fr.json";

type Props = PageProps<"/[locale]/p/[slug]">;

async function find(slug: string) {
  const { config, catalog, landings } = await getStoreData();
  const lp = landings.find((l) => l.slug === slug);
  const product = lp && catalog.products.find((x) => x.id === lp.productId);
  return lp && product ? { lp, product, config, catalog } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const found = await find(slug);
  if (!found) return {};
  const p = found.product;
  const L = locale === "fr" ? "fr" : "ar";
  return {
    title: p.name[L] || p.name.ar,
    description: p.tagline[L] || p.tagline.ar,
    openGraph: { images: p.images[0] ? [p.images[0]] : ["/logo.png"] },
  };
}

export default async function LandingPageRoute({ params }: Props) {
  const { slug, locale } = await params;
  const found = await find(slug);
  if (!found) notFound();
  return (
    <LandingView
      lp={found.lp}
      product={found.product}
      catalog={found.catalog}
      config={found.config}
      locale={locale === "fr" ? "fr" : "ar"}
      tx={{ ar: ar.store, fr: fr.store }}
    />
  );
}
