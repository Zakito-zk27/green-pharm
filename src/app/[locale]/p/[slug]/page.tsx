import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LandingView } from "@/components/store/LandingView";
import { getCatalog, getLanding, getPublishedConfig } from "@/lib/server/catalog";
import ar from "../../../../../messages/ar.json";
import fr from "../../../../../messages/fr.json";

type Props = PageProps<"/[locale]/p/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const [lp, catalog] = await Promise.all([getLanding(slug), getCatalog()]);
  const p = lp && catalog.products.find((x) => x.id === lp.productId);
  if (!p) return {};
  const L = locale === "fr" ? "fr" : "ar";
  return {
    title: p.name[L] || p.name.ar,
    description: p.tagline[L] || p.tagline.ar,
    openGraph: { images: p.images[0] ? [p.images[0]] : ["/logo.png"] },
  };
}

async function Content({ params }: Props) {
  const { slug, locale } = await params;
  const [lp, catalog, config] = await Promise.all([
    getLanding(slug),
    getCatalog(),
    getPublishedConfig(),
  ]);
  const product = lp && catalog.products.find((x) => x.id === lp.productId);
  if (!lp || !product) notFound();
  return (
    <LandingView
      lp={lp}
      product={product}
      catalog={catalog}
      config={config}
      locale={locale === "fr" ? "fr" : "ar"}
      tx={{ ar: ar.store, fr: fr.store }}
    />
  );
}

export default function LandingPageRoute(props: Props) {
  return (
    <Suspense fallback={null}>
      <Content {...props} />
    </Suspense>
  );
}
