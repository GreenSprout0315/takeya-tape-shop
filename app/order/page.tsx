import type { Metadata } from "next";
import OrderForm from "@/components/OrderForm";

export const metadata: Metadata = {
  title: "発注フォーム",
  description:
    "竹谷商事の識別テープを Web から発注。会社名を入力すると特別価格が自動適用され、見積金額をリアルタイムで確認できます。",
};

export default function OrderPage() {
  return (
    <div className="bg-[#F5F6F8] min-h-screen">
      <OrderForm />
    </div>
  );
}
