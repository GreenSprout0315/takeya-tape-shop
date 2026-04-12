import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group flex flex-col">
      {/* 商品画像 */}
      <Link href={`/products/${product.id}`} className="block relative">
        <div className="relative overflow-hidden aspect-square mb-4 bg-gray-50 border border-gray-200">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 25vw"
          />

          {/* 人気バッジ */}
          {product.featured && (
            <div className="absolute top-2 left-2 bg-[#E07B2A] text-white text-[10px] tracking-widest px-2 py-1 uppercase">
              人気
            </div>
          )}

          {/* ホバー時 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
            <span className="text-white text-xs tracking-widest uppercase bg-black/60 px-4 py-2">
              詳細を見る →
            </span>
          </div>
        </div>
      </Link>

      {/* 情報 */}
      <div className="flex-1 flex flex-col">
        <p className="text-[10px] text-[#E07B2A] tracking-widest uppercase mb-1">
          {product.category}
        </p>
        <Link href={`/products/${product.id}`}>
          <h3 className="font-light text-base tracking-wide hover:text-[#E07B2A] transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-gray-400 mb-2">{product.thickness} × {product.width} × {product.length}</p>

        {/* 特徴タグ */}
        <div className="flex flex-wrap gap-1 mb-3">
          {product.features.slice(0, 2).map((f) => (
            <span
              key={f}
              className="text-[10px] px-2 py-0.5 bg-[#F5F6F8] text-gray-500 border border-gray-200"
            >
              {f}
            </span>
          ))}
        </div>

        <div className="mt-auto">
          <p className="text-lg font-light text-[#1C3557]">
            ¥{product.price.toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">/ 1本（税抜）</span>
          </p>

          <Link
            href="/order"
            className="block w-full mt-3 py-3 text-center text-xs tracking-widest uppercase bg-[#E07B2A] text-white hover:bg-[#c96e22] transition-colors"
          >
            発注する
          </Link>
        </div>
      </div>
    </div>
  );
}
