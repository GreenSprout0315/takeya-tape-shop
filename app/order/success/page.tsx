import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "発注を受け付けました",
};

// 動的レンダリング（searchParams 使用のため静的生成不可）
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ id?: string }>;
};

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { id } = await searchParams;

  return (
    <div className="bg-[#F5F6F8] min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-24">
        <div className="bg-white border border-gray-200 p-10 text-center">
          {/* チェックアイコン */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#E07B2A]/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-[#E07B2A]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-3">
            Order Received
          </p>
          <h1 className="text-3xl font-light tracking-wide text-[#1C3557] mb-4">
            発注を受け付けました
          </h1>

          {id && (
            <div className="inline-block bg-[#F5F6F8] border border-gray-200 px-6 py-3 mb-6">
              <div className="text-xs text-gray-400 mb-1">発注番号</div>
              <div className="font-mono text-lg font-bold text-[#1C3557]">
                {id}
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            このたびはご注文いただきありがとうございます。
            <br />
            担当より 1〜2 営業日以内に見積書をメールにてお送りいたします。
            <br />
            内容ご確認のうえ、返信にてご承認くださいますようお願い申し上げます。
          </p>

          <div className="text-left bg-[#F5F6F8] border border-gray-200 p-5 mb-8">
            <h2 className="text-xs tracking-widest uppercase text-gray-500 mb-3">
              今後の流れ
            </h2>
            <ol className="text-sm text-gray-600 space-y-2">
              <li className="flex gap-3">
                <span className="text-[#E07B2A] font-bold">1.</span>
                <span>担当者が内容を確認し、正式な見積書（PDF）を作成します</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#E07B2A] font-bold">2.</span>
                <span>ご入力のメールアドレス宛に見積書をお送りします</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#E07B2A] font-bold">3.</span>
                <span>メールへのご返信で承認いただくと出荷準備に入ります</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#E07B2A] font-bold">4.</span>
                <span>発送後、別途ご請求書をお送りいたします</span>
              </li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-8 py-3 border border-[#1C3557] text-[#1C3557] text-xs tracking-widest uppercase hover:bg-[#1C3557] hover:text-white transition-all"
            >
              ホームへ戻る
            </Link>
            <Link
              href="/order"
              className="px-8 py-3 bg-[#E07B2A] text-white text-xs tracking-widest uppercase hover:bg-[#c96e22] transition-colors"
            >
              続けて発注する
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          お問い合わせ: 竹谷商事 営業部（平日 9:00〜17:00）
        </p>
      </div>
    </div>
  );
}
