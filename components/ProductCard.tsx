import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import type { ColorInfo } from "@/lib/product-master";

function Swatch({ color }: { color: ColorInfo }) {
  if (Array.isArray(color.hex)) {
    const [a, b] = color.hex;
    return (
      <span
        title={color.name}
        className="inline-block w-3 h-3 rounded-full border border-gray-300"
        style={{
          background: `repeating-linear-gradient(45deg, ${a} 0 3px, ${b} 3px 6px)`,
        }}
      />
    );
  }
  return (
    <span
      title={color.name}
      className="inline-block w-3 h-3 rounded-full border border-gray-300"
      style={{ backgroundColor: color.hex }}
    />
  );
}

export default function ProductCard({
  product,
  showPrice = true,
}: {
  product: Product;
  showPrice?: boolean;
}) {
  return (
    <div className="group flex flex-col">
      <Link href={`/products/${product.id}`} className="block relative">
        <div className="relative overflow-hidden aspect-square mb-4 bg-gray-50 border border-gray-200">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 25vw"
          />

          {product.featured && (
            <div className="absolute top-2 left-2 bg-[#E07B2A] text-white text-[10px] tracking-widest px-2 py-1 uppercase">
              人気
            </div>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
            <span className="text-white text-xs tracking-widest uppercase bg-black/60 px-4 py-2">
              詳細を見る →
            </span>
          </div>
        </div>
      </Link>

      <div className="flex-1 flex flex-col">
        <p className="text-[10px] text-[#E07B2A] tracking-widest uppercase mb-1">
          {product.category}
        </p>
        <Link href={`/products/${product.id}`}>
          <h3 className="font-light text-base tracking-wide hover:text-[#E07B2A] transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-gray-400 mb-2">
          {product.thickness} × {product.width} × {product.length}
        </p>

        {/* カラー展開 */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {product.colors.map((c) => (
            <Swatch key={c.id} color={c} />
          ))}
          <span className="text-[10px] text-gray-400 ml-1">
            {product.colors.length}色
          </span>
        </div>

        <div className="mt-auto">
          {showPrice ? (
            <>
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
            </>
          ) : (
            <Link
              href="/login"
              className="block w-full mt-3 py-3 text-center text-xs tracking-widest uppercase border border-[#1C3557] text-[#1C3557] hover:bg-[#1C3557] hover:text-white transition-all"
            >
              ログインして価格を見る
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
