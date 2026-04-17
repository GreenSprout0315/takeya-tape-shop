import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const siteUrl = "https://takeya-tape-shop.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "竹谷商事 | 樹木用識別テープ専門メーカー",
    template: "%s | 竹谷商事",
  },
  description: "森林調査・測量・登山マーキング用の樹木用識別テープ／ナンバーテープ専門メーカー。7色×複数サイズ、厚み0.08〜0.2mm、長さ50m/100mから選べる豊富なラインナップ。全国発送対応。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "竹谷商事",
    title: "竹谷商事 | 樹木用識別テープ専門メーカー",
    description: "森林調査・測量現場向けの樹木用識別テープ・ナンバーテープを豊富に取り揃えています。",
  },
  twitter: {
    card: "summary_large_image",
    title: "竹谷商事 | 樹木用識別テープ専門メーカー",
    description: "森林調査・測量現場向けの樹木用識別テープ・ナンバーテープを豊富に取り揃えています。",
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
