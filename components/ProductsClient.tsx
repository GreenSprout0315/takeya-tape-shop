"use client";
import { useState, useEffect, Suspense } from "react";
import { products, categories } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { useSearchParams } from "next/navigation";

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "すべて";
  const [selected, setSelected] = useState(initialCategory);
  const [loggedIn, setLoggedIn] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setLoggedIn(!!data.user))
      .finally(() => setSessionLoaded(true));
  }, []);

  const filtered = selected === "すべて"
    ? products
    : products.filter((p) => p.category === selected);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-3">All Products</p>
        <h1 className="text-4xl font-light tracking-wide text-[#1C3557]">識別テープ 一覧</h1>
        <p className="text-gray-400 text-sm mt-3">識別テープ・斜線テープ・ナンバーテープを取り揃えております</p>
      </div>

      {/* カテゴリフィルター */}
      <div className="flex flex-wrap justify-center gap-6 mb-16">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelected(cat)}
            className={`text-xs tracking-widest uppercase pb-2 transition-all ${
              selected === cat
                ? "text-[#1C3557] border-b border-[#E07B2A]"
                : "text-gray-400 hover:text-[#1C3557]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} showPrice={sessionLoaded && loggedIn} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-24">該当する商品がありません</p>
      )}
    </div>
  );
}

export default function ProductsClient() {
  return (
    <Suspense fallback={<div className="text-center py-24 text-gray-400">Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
