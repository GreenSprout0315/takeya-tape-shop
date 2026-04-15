"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  QUOTE_STATUS_LABELS,
  STATUS_ACTION_LABELS,
  getNextStatus,
  type QuoteStatus,
} from "@/lib/order";

export default function AdvanceStatusButton({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: QuoteStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const next = getNextStatus(currentStatus);
  if (!next) return null;

  const label = STATUS_ACTION_LABELS[currentStatus] ?? "次へ進める";

  async function handleClick() {
    if (!next) return;
    const confirmed = window.confirm(
      `ステータスを「${QUOTE_STATUS_LABELS[next]}」に変更します。よろしいですか？`
    );
    if (!confirmed) return;

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "更新に失敗しました");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium rounded bg-[#1C3557] text-white hover:bg-[#2a4876] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {busy ? "更新中..." : `${label} →`}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
