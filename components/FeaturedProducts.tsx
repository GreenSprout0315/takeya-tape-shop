"use client";

import { useEffect, useState } from "react";
import { getFeaturedProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export default function FeaturedProducts() {
  const featured = getFeaturedProducts();
  const [loggedIn, setLoggedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setLoggedIn(!!data.user))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {featured.map((p) => (
        <ProductCard key={p.id} product={p} showPrice={loaded && loggedIn} />
      ))}
    </div>
  );
}
