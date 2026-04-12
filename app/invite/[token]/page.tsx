"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "done">("loading");
  const [info, setInfo] = useState({ email: "", customerName: "" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setInfo({ email: data.email, customerName: data.customerName });
          setStatus("valid");
        } else {
          setError(data.error);
          setStatus("invalid");
        }
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登録に失敗しました");
        return;
      }

      setStatus("done");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          {status === "loading" && (
            <p className="text-center text-gray-500">確認中...</p>
          )}

          {status === "invalid" && (
            <div className="text-center">
              <h1 className="text-xl font-bold text-red-600 mb-4">
                リンクが無効です
              </h1>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">
                担当者にお問い合わせ���ただき、新しい招待メールの送信をご依頼ください。
              </p>
            </div>
          )}

          {status === "valid" && (
            <>
              <h1 className="text-2xl font-bold text-center text-[#1C3557] mb-2">
                アカウント設定
              </h1>
              <p className="text-center text-gray-500 text-sm mb-6">
                {info.customerName}
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={info.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    パスワード（8文字以上）
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3557]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    パスワード（確認）
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C3557]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-[#1C3557] text-white font-medium rounded-md hover:bg-[#152a45] transition-colors disabled:opacity-50"
                >
                  {saving ? "設定中..." : "パスワードを設定してログイン"}
                </button>
              </form>
            </>
          )}

          {status === "done" && (
            <div className="text-center">
              <h1 className="text-xl font-bold text-green-600 mb-4">
                アカウントが作成されました
              </h1>
              <p className="text-gray-600 mb-6">
                パスワードの設定が完了しました。ログインして発注フォームをご利用ください。
              </p>
              <button
                onClick={() => router.push("/login")}
                className="px-6 py-2.5 bg-[#1C3557] text-white font-medium rounded-md hover:bg-[#152a45] transition-colors"
              >
                ログイン画面へ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
