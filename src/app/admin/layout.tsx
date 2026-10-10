import type { Metadata } from "next";
import { plexArabic } from "../fonts";
import "./admin.css";

export const metadata: Metadata = {
  title: "لوحة تحكم المتجر",
  robots: { index: false, follow: false },
  icons: { icon: "/logo.png" },
};

// The dashboard is Arabic only, like the approved prototype.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={plexArabic.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
