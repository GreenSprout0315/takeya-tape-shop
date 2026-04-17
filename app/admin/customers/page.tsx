"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: number;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  smile_code: string | null;
  notes: string | null;
  status: string;
  price_count: number;
  user_email: string | null;
  created_at: string;
};

const PAGE_SIZE = 50;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.smile_code || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
      );
    });
  }, [customers, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const counts = useMemo(() => {
    const c = { total: customers.length, active: 0, pending: 0, inactive: 0 };
    for (const x of customers) {
      if (x.status === "active") c.active++;
      else if (x.status === "pending") c.pending++;
      else if (x.status === "inactive") c.inactive++;
    }
    return c;
  }, [customers]);

  if (loading) {
    return <p className="text-gray-500">読み込み中...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">顧客管理</h2>
          <p className="text-xs text-gray-500 mt-1">
            全{counts.total}社 ・ 有効{counts.active} ・ 承認待ち{counts.pending} ・ 無効{counts.inactive}
          </p>
        </div>
        <a
          href="/admin/customers/new"
          className="px-4 py-2 bg-[#E07B2A] text-white rounded-md hover:bg-[#c96a22] transition-colors text-sm font-medium"
        >
          + 新規顧客を追加
        </a>
      </div>

      {/* 検索 & フィルター */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="会社名・SMILEコード・メールで検索"
          className="flex-1 min-w-[260px] border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1C3557]"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "all" | "active" | "pending" | "inactive");
            setPage(0);
          }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="all">全ステータス</option>
          <option value="active">有効</option>
          <option value="pending">承認待ち</option>
          <option value="inactive">無効</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500">該当する顧客がいません</p>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-3 font-medium">SMILEコード</th>
                  <th className="text-left px-3 py-3 font-medium">会社名</th>
                  <th className="text-left px-3 py-3 font-medium">担当者</th>
                  <th className="text-left px-3 py-3 font-medium">メール</th>
                  <th className="text-center px-3 py-3 font-medium">ステータス</th>
                  <th className="text-center px-3 py-3 font-medium">特価</th>
                  <th className="text-center px-3 py-3 font-medium">アカウント</th>
                  <th className="text-center px-3 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-500 font-mono">
                      {c.smile_code || "—"}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-3 py-3 text-gray-600">{c.contact_name || "—"}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{c.email || "—"}</td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">
                      {c.price_count > 0 ? `${c.price_count}件` : "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {c.user_email ? (
                        <span className="text-green-600 text-xs">登録済み</span>
                      ) : (
                        <span className="text-gray-400 text-xs">未発行</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center space-x-2">
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
                        価格
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ページング */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <div>
                {filtered.length}件中 {currentPage * PAGE_SIZE + 1}〜
                {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}件表示
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
                >
                  ← 前
                </button>
                <span className="px-3 py-1">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
                >
                  次 →
                </button>
              </div>
            </div>
          )}
        </>
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
