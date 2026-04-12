import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const sql = getDb();

  const [customerCount] = await sql`SELECT COUNT(*)::int AS count FROM customers`;
  const [activeCount] = await sql`
    SELECT COUNT(*)::int AS count FROM customers WHERE status = 'active'
  `;
  const [userCount] = await sql`SELECT COUNT(*)::int AS count FROM users`;
  const [priceCount] = await sql`SELECT COUNT(*)::int AS count FROM customer_prices`;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="登録顧客数" value={customerCount.count} />
        <StatCard label="アクティブ顧客" value={activeCount.count} />
        <StatCard label="ユーザー数" value={userCount.count} />
        <StatCard label="特別価格設定数" value={priceCount.count} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold text-gray-700 mb-3">クイックリンク</h3>
        <ul className="space-y-2 text-sm">
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
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-[#1C3557]">{value}</p>
    </div>
  );
}
