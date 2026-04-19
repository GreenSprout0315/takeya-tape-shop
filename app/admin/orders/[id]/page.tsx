import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/order-db";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/order";
import StatusSelect from "./StatusSelect";
import AdvanceStatusButton from "./AdvanceStatusButton";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function formatJpy(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div>
      <Link
        href="/admin/orders"
        className="text-xs text-gray-500 hover:text-[#1C3557] mb-4 inline-block"
      >
        ← 発注一覧に戻る
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            発注詳細
            {order.quote_number && (
              <span className="ml-3 text-base font-mono text-gray-500">
                見積№ {order.quote_number}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            受付: {formatDate(order.received_at)}
          </p>
        </div>
        <div className="flex items-start gap-3 flex-wrap">
          <a
            href={`/api/admin/orders/${order.id}/pdf`}
            className="inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium rounded border border-[#1C3557] text-[#1C3557] bg-white hover:bg-[#1C3557]/5 transition-colors"
          >
            📄 見積PDF
          </a>
          <AdvanceStatusButton
            orderId={order.id}
            currentStatus={order.status as QuoteStatus}
          />
          <StatusSelect
            orderId={order.id}
            currentStatus={order.status as QuoteStatus}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-bold text-gray-700 mb-3 text-sm tracking-wider">
            お客様情報
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex">
              <dt className="w-24 text-gray-500">会社名</dt>
              <dd className="flex-1 text-gray-800">
                {order.company_name}
                {order.price_tier === "special" && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#E07B2A]/10 text-[#E07B2A] rounded">
                    特価
                  </span>
                )}
                {order.shipping_fee_waived && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#2A7D4F]/10 text-[#2A7D4F] rounded">
                    初回送料無料
                  </span>
                )}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-gray-500">担当者</dt>
              <dd className="flex-1 text-gray-800">{order.contact_name}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-gray-500">メール</dt>
              <dd className="flex-1 text-gray-800">{order.email}</dd>
            </div>
            {order.phone && (
              <div className="flex">
                <dt className="w-24 text-gray-500">電話</dt>
                <dd className="flex-1 text-gray-800">{order.phone}</dd>
              </div>
            )}
            {order.shipping_address && (
              <div className="flex">
                <dt className="w-24 text-gray-500">納品先</dt>
                <dd className="flex-1 text-gray-800">
                  {order.zip_code && `〒${order.zip_code} `}
                  {order.shipping_address}
                </dd>
              </div>
            )}
            {order.desired_delivery && (
              <div className="flex">
                <dt className="w-24 text-gray-500">希望納期</dt>
                <dd className="flex-1 text-gray-800">{order.desired_delivery}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-bold text-gray-700 mb-3 text-sm tracking-wider">
            金額・ステータス
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">小計（税抜）</dt>
              <dd className="text-gray-800">{formatJpy(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">消費税</dt>
              <dd className="text-gray-800">{formatJpy(order.tax)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <dt className="font-bold text-gray-700">合計（税込）</dt>
              <dd className="font-bold text-[#1C3557] text-lg">
                {formatJpy(order.total)}
              </dd>
            </div>
            <div className="flex justify-between pt-2">
              <dt className="text-gray-500">現在のステータス</dt>
              <dd className="text-gray-800">
                {QUOTE_STATUS_LABELS[order.status as QuoteStatus]}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">最終更新</dt>
              <dd className="text-gray-600 text-xs">
                {formatDate(order.status_updated_at)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <h3 className="font-bold text-gray-700 px-5 pt-5 pb-3 text-sm tracking-wider">
          発注明細（{order.lines.length}行）
        </h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2 text-left">商品</th>
              <th className="px-4 py-2 text-left">色</th>
              <th className="px-4 py-2 text-right">単価</th>
              <th className="px-4 py-2 text-right">数量</th>
              <th className="px-4 py-2 text-right">小計</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.lines.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-2 text-gray-800">{line.product_name}</td>
                <td className="px-4 py-2 text-gray-600">{line.color_name}</td>
                <td className="px-4 py-2 text-right text-gray-700">
                  {formatJpy(line.unit_price)}
                </td>
                <td className="px-4 py-2 text-right text-gray-700">
                  {line.quantity}
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-800">
                  {formatJpy(line.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.notes && (
        <div className="bg-white rounded-lg shadow p-5 mt-6">
          <h3 className="font-bold text-gray-700 mb-2 text-sm tracking-wider">
            備考・メッセージ
          </h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {order.notes}
          </p>
        </div>
      )}
    </div>
  );
}
