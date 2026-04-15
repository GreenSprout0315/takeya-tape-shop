import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理画面 | 竹谷商事",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[60vh] bg-gray-50">
      <div className="bg-[#1C3557] text-white px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">竹谷商事 管理画面</h1>
          <nav className="flex gap-4 text-sm">
            <a href="/admin" className="hover:underline">
              ダッシュボード
            </a>
            <a href="/admin/orders" className="hover:underline">
              発注管理
            </a>
            <a href="/admin/customers" className="hover:underline">
              顧客管理
            </a>
            <a href="/order" className="hover:underline text-gray-300">
              発注フォーム →
            </a>
          </nav>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
