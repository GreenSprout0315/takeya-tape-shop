import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const siteUrl = "https://takeya-tape-shop.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "竹谷商事 | 識別テープ専門店",
    template: "%s | 竹谷商事",
  },
  description: "JIS規格対応の配管識別テープ・ケーブル識別テープ・安全標識テープを取り揃えた識別テープ専門店。工場・建設・設備管理現場の安全管理をサポートします。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "竹谷商事",
    title: "竹谷商事 | 識別テープ専門店",
    description: "JIS規格対応の識別テープ専門店。配管・ケーブル・安全標識テープを豊富に取り揃えています。",
  },
  twitter: {
    card: "summary_large_image",
    title: "竹谷商事 | 識別テープ専門店",
    description: "JIS規格対応の識別テープ専門店。配管・ケーブル・安全標識テープを豊富に取り揃えています。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
