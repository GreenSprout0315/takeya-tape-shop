"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

type SpecInfo = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  wholesalePrice: number;
};

type CustomerInfo = {
  id: number;
  name: string;
};

export default function PricingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [specs, setSpecs] = useState<SpecInfo[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [originalPrices, setOriginalPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/customers/${id}`).then((r) => r.json()),
      fetch(`/api/admin/customers/${id}/pricing`).then((r) => r.json()),
      fetch("/api/admin/specs").then((r) => r.json()),
    ]).then(([cust, priceRows, specList]) => {
      setCustomer(cust);
      setSpecs(specList);

      const priceMap: Record<string, string> = {};
      const origMap: Record<string, number> = {};
      for (const row of priceRows) {
        priceMap[row.spec_id] = String(row.price);
        origMap[row.spec_id] = row.price;
      }
      setPrices(priceMap);
      setOriginalPrices(origMap);
      setLoading(false);
    });
  }, [id]);

  const updatePrice = useCallback((specId: string, value: string) => {
    setPrices((prev) => ({ ...prev, [specId]: value }));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");

    const payload: Record<string, number | null> = {};
    for (const spec of specs) {
      const val = prices[spec.id]?.trim();
      if (val && !isNaN(Number(val))) {
        payload[spec.id] = Number(val);
      } else if (originalPrices[spec.id] !== undefined && !val) {
        // 値が消された → 削除（定価に戻す）
        payload[spec.id] = null;
      }
    }

    try {
      const res = await fetch(`/api/admin/customers/${id}/pricing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices: payload }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`保存しました（更新: ${data.upserted}件、削除: ${data.deleted}件）`);
        // originalPricesを更新
        const newOrig: Record<string, number> = {};
        for (const [specId, price] of Object.entries(payload)) {
          if (price !== null) newOrig[specId] = price;
        }
        setOriginalPrices(newOrig);
      } else {
        setMessage(`エラー: ${data.error}`);
      }
    } catch {
      setMessage("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  /** 他の顧客から価格をコピー */
  async function handleCopy() {
    const sourceId = prompt("コピー元の顧客ID（数字）を入力してください:");
    if (!sourceId) return;

    const res = await fetch(`/api/admin/customers/${sourceId}/pricing`);
    if (!res.ok) {
      alert("顧客が見つかりません");
      return;
    }
    const rows = await res.json();
    const newPrices: Record<string, string> = {};
    for (const row of rows) {
      newPrices[row.spec_id] = String(row.price);
    }
    setPrices((prev) => ({ ...prev, ...newPrices }));
    setMessage("価格をコピーしました（まだ保存されていません）");
  }

  if (loading) return <p className="text-gray-500">読み込み中...</p>;

  // カテゴリごとにグループ化
  const categories = new Map<string, SpecInfo[]>();
  for (const spec of specs) {
    const list = categories.get(spec.categoryLabel) || [];
    list.push(spec);
    categories.set(spec.categoryLabel, list);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">特別価格設定</h2>
          <p className="text-gray-500 mt-1">{customer?.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const csv = prompt(
                "CSV（spec_id,price 形式、ヘッダ行OK、#でコメント）を貼り付けてください:\n\n例:\nspec_id,price\nstd-008-15-50,115\nstd-008-30-50,230"
              );
              if (!csv) return;
              const res = await fetch(`/api/admin/customers/${id}/pricing/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ csv }),
              });
              const data = await res.json();
              if (res.ok) {
                setMessage(
                  `CSV取込: ${data.upserted}件upsert、エラー${data.errorCount}件${
                    data.errors?.length ? "\n" + data.errors.join("\n") : ""
                  }`
                );
                setTimeout(() => window.location.reload(), 1500);
              } else {
                setMessage(`エラー: ${data.error}`);
              }
            }}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            CSV取込
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            他顧客からコピー
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-[#1C3557] text-white rounded-md hover:bg-[#152a45] transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded text-sm ${message.startsWith("エラー") || message.startsWith("通信") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {message}
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">
        空欄の商品は定価（標準売価）が適用されます。数値を入力すると特別価格が設定されます。
      </p>

      {Array.from(categories.entries()).map(([catLabel, catSpecs]) => (
        <div key={catLabel} className="mb-6">
          <h3 className="text-lg font-bold text-gray-700 mb-3 border-b pb-2">
            {catLabel}
          </h3>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">商品名</th>
                  <th className="text-right px-4 py-2 font-medium w-28">
                    定価（税抜）
                  </th>
                  <th className="text-right px-4 py-2 font-medium w-36">
                    特別価格（税抜）
                  </th>
                  <th className="text-right px-4 py-2 font-medium w-20">
                    割引率
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {catSpecs.map((spec) => {
                  const val = prices[spec.id] || "";
                  const numVal = Number(val);
                  const discount =
                    val && !isNaN(numVal)
                      ? Math.round((1 - numVal / spec.wholesalePrice) * 100)
                      : null;
                  return (
                    <tr key={spec.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800">{spec.name}</td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        {spec.wholesalePrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={val}
                          onChange={(e) => updatePrice(spec.id, e.target.value)}
                          placeholder="定価適用"
                          className="w-28 px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1C3557]"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-xs">
                        {discount !== null && (
                          <span className={discount > 0 ? "text-green-600" : "text-red-600"}>
                            {discount > 0 ? `-${discount}%` : `+${Math.abs(discount)}%`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-[#1C3557] text-white rounded-md hover:bg-[#152a45] transition-colors disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <a
          href={`/admin/customers/${id}`}
          className="px-6 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
        >
          顧客編集に戻る
        </a>
        <a
          href="/admin/customers"
          className="px-6 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
        >
          顧客一覧に戻る
        </a>
      </div>
    </div>
  );
}
