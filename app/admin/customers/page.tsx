"use client";

import { useEffect, useState } from "react";

type Customer = {
  id: number;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  status: string;
  price_count: number;
  user_email: string | null;
  created_at: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">読み込み中...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">顧客管理</h2>
        <a
          href="/admin/customers/new"
          className="px-4 py-2 bg-[#E07B2A] text-white rounded-md hover:bg-[#c96a22] transition-colors text-sm font-medium"
        >
          + 新規顧客を追加
        </a>
      </div>

      {customers.length === 0 ? (
        <p className="text-gray-500">顧客が登録されていません</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">会社名</th>
                <th className="text-left px-4 py-3 font-medium">担当者</th>
                <th className="text-left px-4 py-3 font-medium">メール</th>
                <th className="text-center px-4 py-3 font-medium">ステータス</th>
                <th className="text-center px-4 py-3 font-medium">特別価格</th>
                <th className="text-center px-4 py-3 font-medium">アカウント</th>
                <th className="text-center px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.contact_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {c.price_count > 0 ? `${c.price_count}件` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.user_email ? (
                      <span className="text-green-600 text-xs">登録済み</span>
                    ) : (
                      <span className="text-gray-400 text-xs">未発行</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <a
                      href={`/admin/customers/${c.id}`}
                      className="text-[#1C3557] hover:underline text-xs"
                    >
                      編集
                    </a>
                    <a
                      href={`/admin/customers/${c.id}/pricing`}
                      className="text-[#E07B2A] hover:underline text-xs"
                    >
                      価格設定
                    </a>
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    inactive: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    active: "有効",
    pending: "承認待ち",
    inactive: "無効",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.inactive}`}
    >
      {labels[status] || status}
    </span>
  );
}
