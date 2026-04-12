"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    location: "",
    notes: "",
    status: "active",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  useEffect(() => {
    fetch(`/api/admin/customers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setForm({
            name: data.name || "",
            contact_name: data.contact_name || "",
            email: data.email || "",
            phone: data.phone || "",
            location: data.location || "",
            notes: data.notes || "",
            status: data.status || "active",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PUT",
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

  async function handleDelete() {
    if (!confirm(`「${form.name}」を削除しますか？\n関連する特別価格も全て削除されます。`)) return;

    const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/customers");
    }
  }

  if (loading) return <p className="text-gray-500">読み込み中...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">顧客編集</h2>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {inviteMsg && (
          <div className={`mb-4 p-3 rounded text-sm ${inviteMsg.startsWith("エラー") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
            {inviteMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="会社名" required>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3557]"
            />
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

          <Field label="ステータス">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3557]"
            >
              <option value="active">有効</option>
              <option value="pending">承認待ち</option>
              <option value="inactive">無効</option>
            </select>
          </Field>

          <Field label="備考">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3557]"
            />
          </Field>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#1C3557] text-white rounded-md hover:bg-[#152a45] transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <a
              href={`/admin/customers/${id}/pricing`}
              className="px-6 py-2 bg-[#E07B2A] text-white rounded-md hover:bg-[#c96a22] transition-colors text-sm"
            >
              特別価格を設定
            </a>
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`${form.name} に招待メールを送信しますか？\n宛先: ${form.email}`)) return;
                setInviteMsg("");
                const res = await fetch(`/api/admin/customers/${id}/invite`, { method: "POST" });
                const data = await res.json();
                if (res.ok) {
                  setInviteMsg(`招待メールを ${data.email} に送信しました`);
                } else {
                  setInviteMsg(`エラー: ${data.error}`);
                }
              }}
              disabled={!form.email}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              招待メール送信
            </button>
            <a
              href="/admin/customers"
              className="px-6 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
            >
              戻る
            </a>
            <button
              type="button"
              onClick={handleDelete}
              className="ml-auto px-4 py-2 text-red-600 hover:text-red-800 text-sm"
            >
              削除
            </button>
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
