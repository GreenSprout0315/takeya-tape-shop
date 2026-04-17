/**
 * /products 表示用の Product 一覧。
 * マスターは `lib/product-master.ts`（ALL_SPECS = 31 スペック）。
 * 1 Product = 1 スペック。色展開は `colors` に集約してカード/詳細で表示する。
 */

import {
  ALL_SPECS,
  COLORS,
  type ColorInfo,
  type ProductCategory,
  type ProductSpec,
} from "./product-master";

const IMG_15MM =
  "https://makeshop-multi-images.akamaized.net/taketani/shopimages/1_000000000001.jpg";
const IMG_30MM =
  "https://makeshop-multi-images.akamaized.net/taketani/shopimages/1_000000000002.jpg";
const IMG_NUMBER =
  "https://makeshop-multi-images.akamaized.net/taketani/shopimages/1_000000000005.jpg";
const IMG_DIAGONAL = "/images/products/diagonal-tape.png";

function pickImage(spec: ProductSpec): string {
  if (spec.category === "number") return IMG_NUMBER;
  if (spec.category === "diagonal") return IMG_DIAGONAL;
  return spec.width <= 15 ? IMG_15MM : IMG_30MM;
}

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  standard: "識別テープ",
  number: "ナンバーテープ",
  diagonal: "斜線テープ",
};

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  thickness: string;
  width: string;
  length: string;
  price: number;
  listPrice: number;
  colors: ColorInfo[];
  featured: boolean;
  image: string;
};

export const products: Product[] = ALL_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  category: CATEGORY_LABEL[spec.category],
  description: spec.description,
  thickness: `${spec.thickness}mm`,
  width: `${spec.width}mm`,
  length: `${spec.length}m`,
  price: spec.listPrice,
  listPrice: spec.listPrice,
  colors: spec.availableColors.map((c) => COLORS[c]),
  featured: !!spec.featured,
  image: pickImage(spec),
}));

export const categories = ["すべて", "識別テープ", "斜線テープ", "ナンバーテープ"];

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}
