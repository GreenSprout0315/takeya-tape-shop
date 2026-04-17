"use client";

import { useEffect, useState } from "react";
import { Product } from "@/lib/products";
import type { ColorInfo } from "@/lib/product-master";
import Image from "next/image";
import Link from "next/link";

function Swatch({ color, size = "md" }: { color: ColorInfo; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "w-8 h-8" : "w-5 h-5";
  if (Array.isArray(color.hex)) {
    const [a, b] = color.hex;
    return (
      <span
        title={color.name}
        className={`inline-block ${dim} rounded-full border border-gray-300`}
        style={{
          background: `repeating-linear-gradient(45deg, ${a} 0 4px, ${b} 4px 8px)`,
        }}
      />
    );
  }
  return (
    <span
      title={color.name}
      className={`inline-block ${dim} rounded-full border border-gray-300`}
      style={{ backgroundColor: color.hex }}
    />
  );
}

export default function ProductDetailClient({ product }: { product: Product }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setLoggedIn(!!data.user))
      .finally(() => setLoaded(true));
  }, []);

  // 斜線入りテープは未ログイン時にログインゲートで隠す（BtoB特別ライン）
  const isRestricted = product.category === "斜線テープ";
  if (loaded && !loggedIn && isRestricted) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-3">
          Members Only
        </p>
        <h1 className="text-2xl font-light tracking-wide text-[#1C3557] mb-6">
          この商品はログイン後にご確認いただけます
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          斜線入り識別テープは既存お取引先様向けの特別ラインです。
          <br />
          ログインしてご覧ください。
        </p>
        <Link
          href="/login"
          className="inline-block px-8 py-3 text-xs tracking-widest uppercase bg-[#E07B2A] text-white hover:bg-[#c96e22] transition-colors"
        >
          ログイン
        </Link>
        <div className="mt-6">
          <Link
            href="/products"
            className="text-xs text-gray-500 hover:text-[#1C3557]"
          >
            ← 商品一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const hasDiscount = product.listPrice > product.price;

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <Link
        href="/products"
        className="text-xs tracking-widest uppercase text-gray-400 hover:text-[#1C3557] transition-colors mb-12 inline-flex items-center gap-2"
      >
        ← 一覧に戻る
      </Link>

      <div className="grid md:grid-cols-2 gap-16 mt-8">
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

        <div className="flex flex-col justify-center">
          <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-4">
            {product.category}
          </p>
          <h1 className="text-3xl font-light tracking-wide text-[#1C3557] mb-2">
            {product.name}
          </h1>

          <p className="text-gray-600 leading-relaxed mb-8 mt-4">
            {product.description}
          </p>

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

          <div className="mb-8">
            <p className="text-xs tracking-widest uppercase text-gray-400 mb-3">
              対応色（{product.colors.length}色）
            </p>
            <div className="flex flex-wrap gap-3">
              {product.colors.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Swatch color={c} size="lg" />
                  <span className="text-xs text-gray-600">{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8">
            {loaded && loggedIn ? (
              <>
                <div className="mb-6">
                  {hasDiscount && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400 tracking-wider">定価</span>
                      <span className="text-sm text-gray-400 line-through">
                        ¥{product.listPrice.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 tracking-wider">単価（税抜）</span>
                    <span className="text-3xl font-light text-[#1C3557]">
                      ¥{product.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Link
                  href="/order"
                  className="block w-full py-4 bg-[#E07B2A] text-white text-center text-xs tracking-widest uppercase hover:bg-[#c96e22] transition-colors"
                >
                  発注する
                </Link>
              </>
            ) : loaded ? (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  価格の確認・ご注文にはログインが必要です
                </p>
                <Link
                  href="/login"
                  className="block w-full py-4 bg-[#1C3557] text-white text-center text-xs tracking-widest uppercase hover:bg-[#152a45] transition-colors"
                >
                  ログインして価格を見る
                </Link>
              </>
            ) : null}

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
