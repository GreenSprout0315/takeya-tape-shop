import { Product } from "@/lib/products";
import Image from "next/image";
import Link from "next/link";

export default function ProductDetailClient({ product }: { product: Product }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <Link
        href="/products"
        className="text-xs tracking-widest uppercase text-gray-400 hover:text-[#1C3557] transition-colors mb-12 inline-flex items-center gap-2"
      >
        ← 一覧に戻る
      </Link>

      <div className="grid md:grid-cols-2 gap-16 mt-8">
        {/* 商品画像 */}
        <div className="relative aspect-square overflow-hidden border border-gray-200 bg-gray-50">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>

        {/* 商品情報 */}
        <div className="flex flex-col justify-center">
          <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-4">{product.category}</p>
          <h1 className="text-4xl font-light tracking-wide text-[#1C3557] mb-2">{product.name}</h1>

          <p className="text-gray-600 leading-relaxed mb-8 mt-4">{product.description}</p>

          {/* 仕様 */}
          <div className="mb-8">
            <p className="text-xs tracking-widest uppercase text-gray-400 mb-3">仕様</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#F5F6F8] px-4 py-3">
                <p className="text-[10px] text-gray-400 mb-1">厚み</p>
                <p className="text-sm font-medium text-[#1C3557]">{product.thickness}</p>
              </div>
              <div className="bg-[#F5F6F8] px-4 py-3">
                <p className="text-[10px] text-gray-400 mb-1">テープ幅</p>
                <p className="text-sm font-medium text-[#1C3557]">{product.width}</p>
              </div>
              <div className="bg-[#F5F6F8] px-4 py-3">
                <p className="text-[10px] text-gray-400 mb-1">テープ長さ</p>
                <p className="text-sm font-medium text-[#1C3557]">{product.length}</p>
              </div>
            </div>
          </div>

          {/* 特長タグ */}
          <div className="mb-8">
            <p className="text-xs tracking-widest uppercase text-gray-400 mb-3">特長</p>
            <div className="flex flex-wrap gap-2">
              {product.features.map((f) => (
                <span key={f} className="px-3 py-1 text-xs border border-[#E07B2A] text-[#E07B2A] tracking-wider">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8">
            {/* 単価 */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 tracking-wider">単価（税抜）</span>
                <span className="text-3xl font-light text-[#1C3557]">¥{product.price.toLocaleString()}</span>
              </div>
            </div>

            <Link
              href="/order"
              className="block w-full py-4 bg-[#E07B2A] text-white text-center text-xs tracking-widest uppercase hover:bg-[#c96e22] transition-colors"
            >
              発注する
            </Link>
            <Link
              href="/products"
              className="block w-full mt-3 py-4 border border-[#1C3557] text-center text-xs tracking-widest uppercase hover:bg-[#1C3557] hover:text-white transition-all"
            >
              商品一覧に戻る
            </Link>
          </div>

          <div className="mt-8 p-4 bg-[#F5F6F8] text-xs text-gray-500 leading-relaxed">
            <p className="font-medium text-[#1C3557] mb-1">ご注意</p>
            本製品は非粘着タイプのビニールテープです（接着・粘着性はありません）。
            絶縁ビニールテープとは異なりますのでご注意ください。
          </div>
        </div>
      </div>
    </div>
  );
}
