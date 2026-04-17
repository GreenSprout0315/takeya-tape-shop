import { Metadata } from "next";
import ProductsClient from "@/components/ProductsClient";

export const metadata: Metadata = {
  title: "識別テープ・ナンバーテープ 商品一覧",
  description: "森林調査・測量現場向けの識別テープ・ナンバーテープを豊富に取り揃え。厚み0.08〜0.2mm、幅15〜50mm、長さ50m/100mから選択可能。ミシン目入りナンバーテープもご用意。",
};

export default function ProductsPage() {
  return <ProductsClient />;
}
