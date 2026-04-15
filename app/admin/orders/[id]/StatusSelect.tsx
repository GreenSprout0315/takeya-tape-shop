"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/order";

const OPTIONS: QuoteStatus[] = [
  "issued",
  "approved",
  "shipping",
  "shipped",
  "invoiced",
  "paid",
  "cancelled",
];

export default function StatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: QuoteStatus;
}) {
  const [value, setValue] = useState<QuoteStatus>(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleChange(next: QuoteStatus) {
    if (next === value) return;
    setError(null);
    const prev = value;
    setValue(next);
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "更新に失敗しました");
      setValue(prev);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="text-xs text-gray-500">ステータス変更</label>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value as QuoteStatus)}
        disabled={pending}
        className="text-sm border border-gray-300 rounded px-3 py-1.5 bg-white disabled:opacity-50"
      >
        {OPTIONS.map((s) => (
          <option key={s} value={s}>
            {QUOTE_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
