export default function Footer() {
  return (
    <footer className="bg-[#1C3557] text-white mt-24">
      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-1">
          <h3 className="text-lg font-light tracking-[0.2em] mb-4">株式会社竹谷商事</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            森林・測量の分野で40年以上の実績。<br />
            樹木用識別テープの専門メーカーとして<br />
            現場の安全と効率を支えます。
          </p>
        </div>

        <div>
          <h4 className="text-sm tracking-widest uppercase text-gray-400 mb-4">Products</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="/products" className="hover:text-white transition-colors">すべての商品</a></li>
            <li><a href="/products?category=識別テープ" className="hover:text-white transition-colors">識別テープ</a></li>
            <li><a href="/products?category=斜線テープ" className="hover:text-white transition-colors">斜線テープ</a></li>
            <li><a href="/products?category=ナンバーテープ" className="hover:text-white transition-colors">ナンバーテープ</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm tracking-widest uppercase text-gray-400 mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="/contact" className="hover:text-white transition-colors">お問い合わせ</a></li>
            <li><a href="/contact" className="hover:text-white transition-colors">見積もり依頼</a></li>
            <li><a href="/company-info" className="hover:text-white transition-colors">事業者情報</a></li>
            <li><a href="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm tracking-widest uppercase text-gray-400 mb-4">Info</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li>
              <span className="text-gray-500 block text-xs mb-0.5">会社名</span>
              株式会社竹谷商事
            </li>
            <li>
              <span className="text-gray-500 block text-xs mb-0.5">営業時間</span>
              平日 9:00–17:00
            </li>
            <li>
              <span className="text-gray-500 block text-xs mb-0.5">対応エリア</span>
              全国発送対応
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#2A4A72] py-6 text-center text-gray-500 text-xs tracking-wider">
        © {new Date().getFullYear()} 株式会社竹谷商事. All rights reserved.
      </div>
    </footer>
  );
}
