import { Metadata } from "next";
import ProductsClient from "@/components/ProductsClient";

export const metadata: Metadata = {
  title: "識別テープ一覧",
  description: "JIS Z 9102対応の配管識別テープ・ケーブル識別テープ・安全標識テープを全13種類取り揃えています。工場・建設・設備管理現場の安全管理に。",
};

export default function ProductsPage() {
  return <ProductsClient />;
}
