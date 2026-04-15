import Link from "next/link";
import { listOrders, getOrderStatusCounts } from "@/lib/order-db";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/order";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

const STATUS_FILTERS: Array<QuoteStatus | "all"> = [
  "all",
  "issued",
  "approved",
  "shipping",
  "shipped",
  "invoiced",
  "paid",
  "cancelled",
];

function isQuoteStatus(v: string): v is QuoteStatus {
  return v in QUOTE_STATUS_LABELS;
}

function formatJpy(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status: rawStatus } = await searchParams;
  const activeStatus =
    rawStatus && isQuoteStatus(rawStatus) ? rawStatus : undefined;

  const [orders, counts] = await Promise.all([
    listOrders({ status: activeStatus, limit: 200 }),
    getOrderStatusCounts(),
  ]);

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">発注管理</h2>

      {/* ステータスフィルター */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((s) => {
          const label =
            s === "all" ? `すべて (${totalCount})` : `${QUOTE_STATUS_LABELS[s]} (${counts[s] ?? 0})`;
          const href = s === "all" ? "/admin/orders" : `/admin/orders?status=${s}`;
          const isActive =
            (s === "all" && !activeStatus) || s === activeStatus;
          return (
            <Link
              key={s}
              href={href}
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                isActive
                  ? "bg-[#1C3557] text-white border-[#1C3557]"
                  : "bg-white text-gray-700 border-gray-300 hover:border-[#1C3557]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          該当する受注はありません
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">見積№</th>
                <th className="px-4 py-3 text-left">受付日時</th>
                <th className="px-4 py-3 text-left">会社名</th>
                <th className="px-4 py-3 text-left">担当者</th>
                <th className="px-4 py-3 text-right">合計（税込）</th>
                <th className="px-4 py-3 text-left">ステータス</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {o.quote_number ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(o.received_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {o.company_name}
                    {o.price_tier === "special" && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#E07B2A]/10 text-[#E07B2A] rounded">
                        特価
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{o.contact_name}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#1C3557]">
                    {formatJpy(o.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                      {QUOTE_STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-xs text-[#1C3557] hover:underline"
                    >
                      詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
