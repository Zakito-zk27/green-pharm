import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Green Pharm",
  description: "Produits dermo-cosmétiques originaux, livraison 58 wilayas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
