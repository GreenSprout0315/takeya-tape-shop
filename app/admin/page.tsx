import { getDb } from "@/lib/db";
import { getOrderStatusCounts } from "@/lib/order-db";
import { QUOTE_STATUS_LABELS } from "@/lib/order";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const sql = getDb();

  const [customerCount] = await sql`SELECT COUNT(*)::int AS count FROM customers`;
  const [activeCount] = await sql`
    SELECT COUNT(*)::int AS count FROM customers WHERE status = 'active'
  `;
  const [userCount] = await sql`SELECT COUNT(*)::int AS count FROM users`;
  const [priceCount] = await sql`SELECT COUNT(*)::int AS count FROM customer_prices`;
  const orderCounts = await getOrderStatusCounts();
  const orderTotal = Object.values(orderCounts).reduce((a, b) => a + b, 0);
  const actionRequired =
    (orderCounts.issued ?? 0) +
    (orderCounts.approved ?? 0) +
    (orderCounts.shipping ?? 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="累計発注数" value={orderTotal} />
        <StatCard label="対応中（発注〜出荷）" value={actionRequired} accent />
        <StatCard label="登録顧客数" value={customerCount.count} />
        <StatCard label="特別価格設定数" value={priceCount.count} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-700 mb-3">発注ステータス内訳</h3>
          <ul className="space-y-1.5 text-sm">
            {(
              [
                "issued",
                "approved",
                "shipping",
                "shipped",
                "invoiced",
                "paid",
                "cancelled",
              ] as const
            ).map((s) => (
              <li key={s} className="flex justify-between">
                <a
                  href={`/admin/orders?status=${s}`}
                  className="text-gray-600 hover:text-[#1C3557] hover:underline"
                >
                  {QUOTE_STATUS_LABELS[s]}
                </a>
                <span className="font-medium text-gray-800">
                  {orderCounts[s] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-700 mb-3">クイックリンク</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/admin/orders" className="text-[#1C3557] hover:underline">
                → 発注一覧
              </a>
            </li>
            <li>
              <a
                href="/admin/customers"
                className="text-[#1C3557] hover:underline"
              >
                → 顧客一覧・追加・価格設定
              </a>
            </li>
            <li>
              <a
                href="/admin/customers/new"
                className="text-[#1C3557] hover:underline"
              >
                → 新規顧客を追加
              </a>
            </li>
            <li className="text-xs text-gray-400 pt-2 border-t mt-3">
              ユーザー数: {userCount.count} / アクティブ顧客: {activeCount.count}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg shadow p-4 ${
        accent ? "bg-[#E07B2A]/10 border border-[#E07B2A]/30" : "bg-white"
      }`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`text-3xl font-bold ${
          accent ? "text-[#E07B2A]" : "text-[#1C3557]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
