import Link from "next/link";
import { getFeaturedProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export default function HomePage() {
  const featured = getFeaturedProducts();

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center bg-[#F5F6F8]">
        <div className="max-w-6xl mx-auto px-6 w-full grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-6">
              森林・測量の分野で40年以上の実績
            </p>
            <h1 className="text-5xl md:text-6xl font-light leading-tight tracking-wide text-[#1C3557] mb-6">
              森の現場を、<br />色で導く。
            </h1>
            <p className="text-gray-500 text-lg font-light leading-relaxed mb-4 max-w-md">
              樹木用識別テープ・目印テープを<br />
              7色×3サイズで豊富にラインナップ。<br />
              森林調査・測量・登山マーキングに。
            </p>
            <p className="text-xs text-gray-400 mb-8 flex items-center gap-2">
              <span className="text-[#E07B2A]">✔</span>
              非粘着ビニールテープ · 油性ペンで書込み可 · 全国発送対応
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/products"
                className="px-10 py-4 bg-[#E07B2A] text-white text-xs tracking-widest uppercase hover:bg-[#c96e22] transition-colors shadow-md"
              >
                商品を見る
              </Link>
              <Link
                href="/contact"
                className="px-10 py-4 border border-[#1C3557] text-[#1C3557] text-xs tracking-widest uppercase hover:bg-[#1C3557] hover:text-white transition-all"
              >
                お問い合わせ
              </Link>
            </div>
          </div>

          {/* Hero visual - 7色のテープスウォッチ */}
          <div className="hidden md:flex justify-center items-center">
            <div className="flex flex-col gap-3 w-64">
              {[
                { color: "#FF69B4", name: "ピンク" },
                { color: "#DC143C", name: "赤" },
                { color: "#FF8C00", name: "橙" },
                { color: "#FFD700", name: "黄" },
                { color: "#228B22", name: "緑" },
                { color: "#1E90FF", name: "青" },
                { color: "#FFFFFF", name: "白" },
              ].map((tape) => (
                <div key={tape.name} className="flex items-center gap-3">
                  <div
                    className="h-6 flex-1 rounded-sm shadow-sm border border-gray-200"
                    style={{ backgroundColor: tape.color }}
                  />
                  <span className="text-xs text-gray-400 w-10 text-right">{tape.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 数字で見る信頼 */}
      <section className="py-14 bg-[#1C3557] text-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: "7", unit: "色", label: "カラーバリエーション" },
            { num: "40+", unit: "年", label: "森林・測量での実績" },
            { num: "3", unit: "タイプ", label: "用途に合わせた仕様" },
            { num: "全国", unit: "", label: "発送対応" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-light text-[#E07B2A]">
                {s.num}<span className="text-lg">{s.unit}</span>
              </p>
              <p className="text-xs tracking-widest text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 安心ポイント */}
      <section className="py-16 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: "🌲", title: "森林調査に最適", body: "樹木への巻付け・枝への結束で確実な目印。" },
            { icon: "✏️", title: "文字書込み対応", body: "30mm幅は油性ペンで番号・記号の記入が可能。" },
            { icon: "📦", title: "ケース注文対応", body: "まとめ買いでお得に。見積もり無料。" },
            { icon: "❄️", title: "寒冷地仕様あり", body: "厚手タイプは低温環境でも割れにくい。" },
          ].map((f) => (
            <div key={f.title} className="px-2">
              <div className="text-3xl mb-3">{f.icon}</div>
              <p className="text-sm font-medium text-[#1C3557] mb-1">{f.title}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 人気商品 */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-3">Popular Items</p>
            <h2 className="text-3xl font-light tracking-wide text-[#1C3557]">人気の識別テープ</h2>
            <p className="text-gray-400 text-sm mt-3">多くの現場で採用されている識別テープ</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="text-center mt-16">
            <Link
              href="/products"
              className="inline-block px-12 py-4 border border-[#1C3557] text-xs tracking-widest uppercase hover:bg-[#1C3557] hover:text-white transition-all"
            >
              すべての商品を見る
            </Link>
          </div>
        </div>
      </section>

      {/* 用途別ガイド */}
      <section className="py-24 bg-[#F5F6F8]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-3">Product Lineup</p>
            <h2 className="text-3xl font-light tracking-wide text-[#1C3557]">用途で選ぶ識別テープ</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "30mm 識別テープ",
                desc: "文字の書込みに適した標準幅。樹木への巻付け・番号記入・調査記録に。森林調査の現場で最もよく使われるサイズです。",
                spec: "0.08mm × 30mm × 50m",
                href: "/products?category=30mm+識別テープ",
                colors: ["#FF69B4", "#DC143C", "#FF8C00", "#FFD700", "#228B22", "#1E90FF", "#FFFFFF"],
              },
              {
                title: "15mm 識別テープ",
                desc: "目印専用の細幅タイプ。枝への結束やルートマーキングに最適。コンパクトで携帯しやすく、登山やトレッキングにも人気。",
                spec: "0.08mm × 15mm × 50m",
                href: "/products?category=15mm+識別テープ",
                colors: ["#FF69B4", "#DC143C", "#FF8C00", "#FFD700", "#228B22", "#1E90FF", "#FFFFFF"],
              },
              {
                title: "厚手・特殊テープ",
                desc: "寒冷地向け厚手テープ（0.10mm）と環境配慮型バイオ分解テープ。特殊な環境・用途に対応した高機能ラインナップ。",
                spec: "30mm × 100m",
                href: "/products?category=厚手・特殊テープ",
                colors: ["#FF69B4", "#1E90FF", "#DC143C"],
              },
            ].map((item) => (
              <div key={item.title} className="bg-white p-6 shadow-sm">
                <div className="flex gap-1.5 mb-4">
                  {item.colors.map((c, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-sm border border-gray-200"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <h3 className="text-lg font-medium text-[#1C3557] mb-2">{item.title}</h3>
                <p className="text-xs text-[#E07B2A] tracking-wider mb-3">{item.spec}</p>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{item.desc}</p>
                <Link
                  href={item.href}
                  className="text-xs tracking-widest uppercase text-[#E07B2A] hover:text-[#1C3557] transition-colors"
                >
                  商品を見る →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* お問い合わせCTA */}
      <section className="bg-[#1C3557] text-white py-24">
        <div className="max-w-2xl mx-auto text-center px-6">
          <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-6">Contact Us</p>
          <h2 className="text-4xl font-light tracking-wide mb-4">
            お見積もり・<br />
            <span className="text-[#E07B2A]">お問い合わせ</span>
          </h2>
          <p className="text-gray-300 text-sm mb-2">ケース単位のまとめ買い割引対応</p>
          <p className="text-gray-400 text-xs mb-10">お見積もりは無料です。お気軽にお問い合わせください。</p>
          <Link
            href="/contact"
            className="inline-block px-12 py-4 bg-[#E07B2A] text-white text-xs tracking-widest uppercase hover:bg-[#c96e22] transition-colors"
          >
            お問い合わせフォームへ
          </Link>
        </div>
      </section>
    </div>
  );
}
