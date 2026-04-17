"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LookupMatch = {
  id: number;
  name: string;
  smile_code: string | null;
  notes: string | null;
  status: string;
};

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    location: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<LookupMatch[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // 会社名入力 → 既存取引先を部分一致検索（デバウンス）
  useEffect(() => {
    const q = form.name.trim();
    if (q.length < 2) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/admin/customers/lookup?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: { matches: LookupMatch[] }) => setMatches(data.matches || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [form.name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "保存に失敗しました");
        return;
      }

      router.push("/admin/customers");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">新規顧客追加</h2>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="会社名" required>
            <div className="relative">
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3557]"
              />
              {showSuggest && matches.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                    既存取引先 {matches.length}件 ・ クリックで編集画面へ
                  </div>
                  {matches.map((m) => (
                    <a
                      key={m.id}
                      href={`/admin/customers/${m.id}`}
                      className="block px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#1C3557]">{m.name}</span>
                        <span className="text-xs text-gray-500 font-mono">{m.smile_code || "—"}</span>
                      </div>
                      {m.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{m.notes}</p>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              入力すると SMILE 実績のある既存取引先を自動検索します
            </p>
          </Field>

          <Field label="担当者名">
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => update("contact_name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3557]"
            />
          </Field>

          <Field label="メールアドレス">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3557]"
              placeholder="招待メール送信先"
            />
          </Field>

          <Field label="電話番号">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3557]"
            />
          </Field>

          <Field label="所在地">
            <input
              type="text"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3557]"
            />
          </Field>

          <Field label="備考">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3557]"
            />
          </Field>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#1C3557] text-white rounded-md hover:bg-[#152a45] transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <a
              href="/admin/customers"
              className="px-6 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
