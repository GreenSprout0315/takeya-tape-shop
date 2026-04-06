import { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ・見積もり依頼",
  description: "識別テープのご購入・見積もり・大量注文・カスタム仕様についてのお問い合わせはこちら。専門スタッフが対応いたします。",
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-3">Contact</p>
        <h1 className="text-4xl font-light tracking-wide text-[#1C3557] mb-4">
          お問い合わせ・見積もり依頼
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          商品の仕様・価格・大量注文など、<br />
          お気軽にお問い合わせください。
        </p>
      </div>

      <form className="space-y-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs tracking-widest uppercase text-gray-500 mb-2">
              会社名 <span className="text-[#E07B2A]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="竹谷株式会社"
              className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#1C3557] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-gray-500 mb-2">
              担当者名 <span className="text-[#E07B2A]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="山田 太郎"
              className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#1C3557] transition-colors"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs tracking-widest uppercase text-gray-500 mb-2">
              メールアドレス <span className="text-[#E07B2A]">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="info@example.co.jp"
              className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#1C3557] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-gray-500 mb-2">
              電話番号
            </label>
            <input
              type="tel"
              placeholder="03-0000-0000"
              className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#1C3557] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs tracking-widest uppercase text-gray-500 mb-2">
            お問い合わせ種別 <span className="text-[#E07B2A]">*</span>
          </label>
          <select
            required
            className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#1C3557] transition-colors bg-white"
          >
            <option value="">選択してください</option>
            <option value="quote">見積もり依頼</option>
            <option value="product">商品についての質問</option>
            <option value="bulk">大量注文について</option>
            <option value="custom">カスタム仕様について</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div>
          <label className="block text-xs tracking-widest uppercase text-gray-500 mb-2">
            ご関心の商品
          </label>
          <input
            type="text"
            placeholder="例: 配管識別テープ 赤 50mm × 10m × 100本"
            className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#1C3557] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs tracking-widest uppercase text-gray-500 mb-2">
            お問い合わせ内容 <span className="text-[#E07B2A]">*</span>
          </label>
          <textarea
            required
            rows={6}
            placeholder="ご質問・ご要望を詳しくお書きください。数量・納期・仕様など具体的にご記入いただくとスムーズにご対応できます。"
            className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#1C3557] transition-colors resize-none"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full py-4 bg-[#E07B2A] text-white text-xs tracking-widest uppercase hover:bg-[#c96e22] transition-colors"
          >
            送信する
          </button>
          <p className="text-xs text-gray-400 text-center mt-4">
            通常1〜2営業日以内にご返信いたします。
          </p>
        </div>
      </form>

      {/* 直接連絡先 */}
      <div className="mt-16 pt-16 border-t border-gray-100 grid md:grid-cols-2 gap-8">
        <div>
          <p className="text-xs tracking-widest uppercase text-gray-400 mb-3">直接のお問い合わせ</p>
          <p className="text-sm text-[#1C3557] font-medium mb-1">竹谷商事 営業部</p>
          <p className="text-sm text-gray-500">平日 9:00〜17:00</p>
        </div>
        <div>
          <p className="text-xs tracking-widest uppercase text-gray-400 mb-3">大量注文・特注</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            100巻以上のまとめ買い割引、<br />
            サイズ・素材のカスタム仕様に対応しています。<br />
            詳しくはお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}
