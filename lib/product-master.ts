/**
 * Product Master — 竹谷商事 識別テープ全商品マスター
 *
 * 出典: `R8識別テープ注文書【中越よつば森林組合】.xlsx` の「標準価格」「標準売価」
 *       （2026-04-11 オーナー発注書より転記）
 *
 * この master は将来の発注フォーム `/order` と見積書生成ロジックが参照する正本。
 * 既存の `lib/products.ts` は旧仕様を維持しており、Phase B 以降で順次こちらへ移行する。
 */

// ──────────────────────────────────────────────────────────────
//  色定義
// ──────────────────────────────────────────────────────────────

export type ColorId =
  // 単色 7色
  | "pink"
  | "white"
  | "blue"
  | "red"
  | "yellow"
  | "orange"
  | "green"
  // 斜線入り 3種
  | "pink-blue"
  | "yellow-black"
  | "pink-white";

export type ColorInfo = {
  id: ColorId;
  name: string;
  /** 単色なら単一 hex、2色組み合わせなら [主, 副] */
  hex: string | [string, string];
  /** 色分類: solid=単色、stripe=斜線柄 */
  kind: "solid" | "stripe";
};

export const COLORS: Record<ColorId, ColorInfo> = {
  pink: { id: "pink", name: "ピンク", hex: "#FF69B4", kind: "solid" },
  white: { id: "white", name: "白", hex: "#FFFFFF", kind: "solid" },
  blue: { id: "blue", name: "青", hex: "#1E90FF", kind: "solid" },
  red: { id: "red", name: "赤", hex: "#DC143C", kind: "solid" },
  yellow: { id: "yellow", name: "黄", hex: "#FFD700", kind: "solid" },
  orange: { id: "orange", name: "オレンジ", hex: "#FF8C00", kind: "solid" },
  green: { id: "green", name: "緑", hex: "#228B22", kind: "solid" },
  "pink-blue": {
    id: "pink-blue",
    name: "ピンク×青",
    hex: ["#FF69B4", "#1E90FF"],
    kind: "stripe",
  },
  "yellow-black": {
    id: "yellow-black",
    name: "黄×黒",
    hex: ["#FFD700", "#000000"],
    kind: "stripe",
  },
  "pink-white": {
    id: "pink-white",
    name: "ピンク×白",
    hex: ["#FF69B4", "#FFFFFF"],
    kind: "stripe",
  },
};

/** 単色 7色（標準ラインナップ） */
export const SOLID_COLORS_7: ColorId[] = [
  "pink",
  "white",
  "blue",
  "red",
  "yellow",
  "orange",
  "green",
];

/** 厚手（0.15mm / 0.2mm）の限定 4色 */
export const SOLID_COLORS_4: ColorId[] = ["pink", "white", "red", "yellow"];

// ──────────────────────────────────────────────────────────────
//  商品カテゴリー・スペック
// ──────────────────────────────────────────────────────────────

export type ProductCategory = "standard" | "number" | "diagonal";

export const CATEGORY_META: Record<
  ProductCategory,
  { label: string; short: string; description: string }
> = {
  standard: {
    label: "識別テープ",
    short: "識別",
    description:
      "森林調査・測量・境界マーキングに使われる定番の識別テープ。4種類の厚み・4種類の幅・2種類の長さから選択できます。",
  },
  number: {
    label: "ナンバーテープ",
    short: "番号",
    description:
      "ミシン目入りの番号付き識別テープ。伐採木・調査木のナンバリング管理に最適。1〜1000 の番号と A〜J のアルファベット展開。",
  },
  diagonal: {
    label: "斜線入り識別テープ",
    short: "斜線",
    description:
      "2色の斜線柄で識別性を更に高めたプレミアムライン。複数業者が同一現場で作業する際の色分けに重宝されます。",
  },
};

/**
 * 商品スペック（SKUバリアントの集合の元）
 *
 * 1 row = (category, thickness, width, length) の 1 組
 * colors で展開して複数の実SKUを生む
 */
export type ProductSpec = {
  /** 安定ID（例: "std-008-30-50"） */
  id: string;
  category: ProductCategory;
  /** 商品名 */
  name: string;
  /** 厚み (mm) */
  thickness: number;
  /** 幅 (mm) */
  width: number;
  /** 長さ (m) */
  length: number;
  /** 標準価格（定価） */
  listPrice: number;
  /** 標準売価（一般卸価） */
  wholesalePrice: number;
  /** 購入可能色 */
  availableColors: ColorId[];
  /** 商品説明 */
  description: string;
  /** 目玉商品フラグ */
  featured?: boolean;
};

// ──────────────────────────────────────────────────────────────
//  商品データ — 識別テープ（標準）
//  出典: R8.2.18 発注書
// ──────────────────────────────────────────────────────────────

const DESC_STANDARD_008_50 =
  "軽量で取り回しやすい 0.08mm 厚の基本ラインナップ。森林調査・測量の日常使用に最適で、単価も抑えられています。";
const DESC_STANDARD_01_50 =
  "0.1mm 厚の耐久性を強化した標準タイプ。長期マーキングや強風環境でも破れにくく、調査から施業まで幅広く使えます。";
const DESC_STANDARD_015_50 =
  "0.15mm 厚の高耐久タイプ。寒冷地・積雪地での長期使用に適した厚手仕様で、色は4色展開です。";
const DESC_STANDARD_02_50 =
  "最厚の 0.2mm 仕様。極限環境での長期マーキングや、視認性を何よりも重視する現場に。";

const DESC_STANDARD_008_100 =
  "0.08mm × 100m 長尺タイプ。大規模現場や継続消費する業者様向けに、巻き替え頻度を抑えるロングサイズ。";
const DESC_STANDARD_01_100 =
  "0.1mm × 100m 長尺タイプ。耐久性と供給効率の両立を求める現場に最適です。";

export const STANDARD_TAPES: ProductSpec[] = [
  // 0.08mm × 50m
  {
    id: "std-008-15-50",
    category: "standard",
    name: "識別テープ 0.08×15mm×50m",
    thickness: 0.08,
    width: 15,
    length: 50,
    listPrice: 250,
    wholesalePrice: 135,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_008_50,
    featured: true,
  },
  {
    id: "std-008-20-50",
    category: "standard",
    name: "識別テープ 0.08×20mm×50m",
    thickness: 0.08,
    width: 20,
    length: 50,
    listPrice: 335,
    wholesalePrice: 180,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_008_50,
  },
  {
    id: "std-008-30-50",
    category: "standard",
    name: "識別テープ 0.08×30mm×50m",
    thickness: 0.08,
    width: 30,
    length: 50,
    listPrice: 500,
    wholesalePrice: 270,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_008_50,
    featured: true,
  },
  {
    id: "std-008-50-50",
    category: "standard",
    name: "識別テープ 0.08×50mm×50m",
    thickness: 0.08,
    width: 50,
    length: 50,
    listPrice: 835,
    wholesalePrice: 450,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_008_50,
  },
  // 0.1mm × 50m
  {
    id: "std-01-15-50",
    category: "standard",
    name: "識別テープ 0.1×15mm×50m",
    thickness: 0.1,
    width: 15,
    length: 50,
    listPrice: 315,
    wholesalePrice: 170,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_01_50,
  },
  {
    id: "std-01-20-50",
    category: "standard",
    name: "識別テープ 0.1×20mm×50m",
    thickness: 0.1,
    width: 20,
    length: 50,
    listPrice: 420,
    wholesalePrice: 230,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_01_50,
  },
  {
    id: "std-01-30-50",
    category: "standard",
    name: "識別テープ 0.1×30mm×50m",
    thickness: 0.1,
    width: 30,
    length: 50,
    listPrice: 625,
    wholesalePrice: 340,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_01_50,
    featured: true,
  },
  {
    id: "std-01-50-50",
    category: "standard",
    name: "識別テープ 0.1×50mm×50m",
    thickness: 0.1,
    width: 50,
    length: 50,
    listPrice: 1050,
    wholesalePrice: 570,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_01_50,
  },
  // 0.15mm × 50m (4色のみ)
  {
    id: "std-015-15-50",
    category: "standard",
    name: "識別テープ 0.15×15mm×50m",
    thickness: 0.15,
    width: 15,
    length: 50,
    listPrice: 480,
    wholesalePrice: 260,
    availableColors: SOLID_COLORS_4,
    description: DESC_STANDARD_015_50,
  },
  {
    id: "std-015-20-50",
    category: "standard",
    name: "識別テープ 0.15×20mm×50m",
    thickness: 0.15,
    width: 20,
    length: 50,
    listPrice: 635,
    wholesalePrice: 350,
    availableColors: SOLID_COLORS_4,
    description: DESC_STANDARD_015_50,
  },
  {
    id: "std-015-30-50",
    category: "standard",
    name: "識別テープ 0.15×30mm×50m",
    thickness: 0.15,
    width: 30,
    length: 50,
    listPrice: 955,
    wholesalePrice: 520,
    availableColors: SOLID_COLORS_4,
    description: DESC_STANDARD_015_50,
  },
  // 0.2mm × 50m (4色のみ)
  {
    id: "std-02-15-50",
    category: "standard",
    name: "識別テープ 0.2×15mm×50m",
    thickness: 0.2,
    width: 15,
    length: 50,
    listPrice: 625,
    wholesalePrice: 335,
    availableColors: SOLID_COLORS_4,
    description: DESC_STANDARD_02_50,
  },
  {
    id: "std-02-20-50",
    category: "standard",
    name: "識別テープ 0.2×20mm×50m",
    thickness: 0.2,
    width: 20,
    length: 50,
    listPrice: 835,
    wholesalePrice: 450,
    availableColors: SOLID_COLORS_4,
    description: DESC_STANDARD_02_50,
  },
  {
    id: "std-02-30-50",
    category: "standard",
    name: "識別テープ 0.2×30mm×50m",
    thickness: 0.2,
    width: 30,
    length: 50,
    listPrice: 1250,
    wholesalePrice: 670,
    availableColors: SOLID_COLORS_4,
    description: DESC_STANDARD_02_50,
  },
  // 0.08mm × 100m
  {
    id: "std-008-15-100",
    category: "standard",
    name: "識別テープ 0.08×15mm×100m",
    thickness: 0.08,
    width: 15,
    length: 100,
    listPrice: 500,
    wholesalePrice: 270,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_008_100,
  },
  {
    id: "std-008-20-100",
    category: "standard",
    name: "識別テープ 0.08×20mm×100m",
    thickness: 0.08,
    width: 20,
    length: 100,
    listPrice: 675,
    wholesalePrice: 360,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_008_100,
  },
  {
    id: "std-008-30-100",
    category: "standard",
    name: "識別テープ 0.08×30mm×100m",
    thickness: 0.08,
    width: 30,
    length: 100,
    listPrice: 1000,
    wholesalePrice: 540,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_008_100,
  },
  {
    id: "std-008-50-100",
    category: "standard",
    name: "識別テープ 0.08×50mm×100m",
    thickness: 0.08,
    width: 50,
    length: 100,
    listPrice: 1675,
    wholesalePrice: 900,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_008_100,
  },
  // 0.1mm × 100m
  {
    id: "std-01-15-100",
    category: "standard",
    name: "識別テープ 0.1×15mm×100m",
    thickness: 0.1,
    width: 15,
    length: 100,
    listPrice: 625,
    wholesalePrice: 340,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_01_100,
  },
  {
    id: "std-01-20-100",
    category: "standard",
    name: "識別テープ 0.1×20mm×100m",
    thickness: 0.1,
    width: 20,
    length: 100,
    listPrice: 845,
    wholesalePrice: 460,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_01_100,
  },
  {
    id: "std-01-30-100",
    category: "standard",
    name: "識別テープ 0.1×30mm×100m",
    thickness: 0.1,
    width: 30,
    length: 100,
    listPrice: 1250,
    wholesalePrice: 680,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_01_100,
  },
  {
    id: "std-01-50-100",
    category: "standard",
    name: "識別テープ 0.1×50mm×100m",
    thickness: 0.1,
    width: 50,
    length: 100,
    listPrice: 2095,
    wholesalePrice: 1140,
    availableColors: SOLID_COLORS_7,
    description: DESC_STANDARD_01_100,
  },
];

// ──────────────────────────────────────────────────────────────
//  商品データ — ナンバーテープ
// ──────────────────────────────────────────────────────────────

/**
 * ナンバーテープ特有の追加プロパティ
 */
export type NumberTapeDetail = {
  /** 番号範囲 */
  numberRange: string;
  /** アルファベット範囲 */
  alphabetRange: string;
  /** ミシン目入り */
  perforated: boolean;
};

export type NumberTapeSpec = ProductSpec & {
  category: "number";
  detail: NumberTapeDetail;
};

export const NUMBER_TAPES: NumberTapeSpec[] = [
  {
    id: "num-015-20-50",
    category: "number",
    name: "ナンバーテープ 0.15×20mm×50m",
    thickness: 0.15,
    width: 20,
    length: 50,
    listPrice: 2200,
    wholesalePrice: 1250,
    availableColors: SOLID_COLORS_7,
    description:
      "ミシン目入りで 1〜1000 の番号展開、A〜J のアルファベット対応。伐採木・調査木のナンバリング管理に。",
    featured: true,
    detail: {
      numberRange: "1〜1000",
      alphabetRange: "A〜J",
      perforated: true,
    },
  },
];

// ──────────────────────────────────────────────────────────────
//  商品データ — 斜線入り識別テープ
// ──────────────────────────────────────────────────────────────

const DESC_DIAGONAL =
  "2色の斜線柄で高い識別性を実現したプレミアムラインです。複数業者が同一現場で作業する際の色分けや、特別な識別ルール運用に選ばれています。";

export const DIAGONAL_TAPES: ProductSpec[] = [
  // 50m
  {
    id: "dia-01-15-50",
    category: "diagonal",
    name: "斜線入り識別テープ 0.1×15mm×50m",
    thickness: 0.1,
    width: 15,
    length: 50,
    listPrice: 500,
    wholesalePrice: 340,
    availableColors: ["pink-blue", "yellow-black", "pink-white"],
    description: DESC_DIAGONAL,
  },
  {
    id: "dia-01-20-50",
    category: "diagonal",
    name: "斜線入り識別テープ 0.1×20mm×50m",
    thickness: 0.1,
    width: 20,
    length: 50,
    listPrice: 680,
    wholesalePrice: 460,
    availableColors: ["pink-blue", "yellow-black"],
    description: DESC_DIAGONAL,
  },
  {
    id: "dia-01-30-50",
    category: "diagonal",
    name: "斜線入り識別テープ 0.1×30mm×50m",
    thickness: 0.1,
    width: 30,
    length: 50,
    listPrice: 1000,
    wholesalePrice: 680,
    availableColors: ["pink-blue", "yellow-black", "pink-white"],
    description: DESC_DIAGONAL,
    featured: true,
  },
  {
    id: "dia-01-50-50",
    category: "diagonal",
    name: "斜線入り識別テープ 0.1×50mm×50m",
    thickness: 0.1,
    width: 50,
    length: 50,
    listPrice: 1680,
    wholesalePrice: 1140,
    availableColors: ["pink-blue"],
    description: DESC_DIAGONAL,
  },
  // 100m
  {
    id: "dia-01-15-100",
    category: "diagonal",
    name: "斜線入り識別テープ 0.1×15mm×100m",
    thickness: 0.1,
    width: 15,
    length: 100,
    listPrice: 1000,
    wholesalePrice: 680,
    availableColors: ["pink-blue"],
    description: DESC_DIAGONAL,
  },
  {
    id: "dia-01-20-100",
    category: "diagonal",
    name: "斜線入り識別テープ 0.1×20mm×100m",
    thickness: 0.1,
    width: 20,
    length: 100,
    listPrice: 1360,
    wholesalePrice: 920,
    availableColors: ["pink-blue", "yellow-black"],
    description: DESC_DIAGONAL,
  },
  {
    id: "dia-01-30-100",
    category: "diagonal",
    name: "斜線入り識別テープ 0.1×30mm×100m",
    thickness: 0.1,
    width: 30,
    length: 100,
    listPrice: 2000,
    wholesalePrice: 1360,
    availableColors: ["pink-blue", "yellow-black", "pink-white"],
    description: DESC_DIAGONAL,
  },
  {
    id: "dia-01-50-100",
    category: "diagonal",
    name: "斜線入り識別テープ 0.1×50mm×100m",
    thickness: 0.1,
    width: 50,
    length: 100,
    listPrice: 3360,
    wholesalePrice: 2280,
    availableColors: ["pink-blue", "yellow-black", "pink-white"],
    description: DESC_DIAGONAL,
  },
];

// ──────────────────────────────────────────────────────────────
//  統合エクスポート
// ──────────────────────────────────────────────────────────────

/**
 * 全商品スペック（識別テープ標準 + ナンバーテープ + 斜線入り）
 */
export const ALL_SPECS: ProductSpec[] = [
  ...STANDARD_TAPES,
  ...NUMBER_TAPES,
  ...DIAGONAL_TAPES,
];

// ──────────────────────────────────────────────────────────────
//  ヘルパー関数
// ──────────────────────────────────────────────────────────────

export function getSpecById(id: string): ProductSpec | undefined {
  return ALL_SPECS.find((s) => s.id === id);
}

export function getSpecsByCategory(category: ProductCategory): ProductSpec[] {
  return ALL_SPECS.filter((s) => s.category === category);
}

export function getFeaturedSpecs(): ProductSpec[] {
  return ALL_SPECS.filter((s) => s.featured);
}

/** SKU単位で展開（spec × color = 1 SKU） */
export type SKU = {
  sku: string;
  specId: string;
  colorId: ColorId;
  name: string;
  categoryLabel: string;
  thickness: number;
  width: number;
  length: number;
  listPrice: number;
  wholesalePrice: number;
  colorName: string;
  colorHex: string | [string, string];
};

export function enumerateAllSKUs(): SKU[] {
  const skus: SKU[] = [];
  for (const spec of ALL_SPECS) {
    for (const colorId of spec.availableColors) {
      const color = COLORS[colorId];
      skus.push({
        sku: `${spec.id}__${colorId}`,
        specId: spec.id,
        colorId,
        name: `${spec.name} ${color.name}`,
        categoryLabel: CATEGORY_META[spec.category].label,
        thickness: spec.thickness,
        width: spec.width,
        length: spec.length,
        listPrice: spec.listPrice,
        wholesalePrice: spec.wholesalePrice,
        colorName: color.name,
        colorHex: color.hex,
      });
    }
  }
  return skus;
}

export function formatJpy(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

/** 単価（顧客区分で標準売価 or 特価） */
export function resolveUnitPrice(
  spec: ProductSpec,
  priceTier: "standard" | "special",
  specialPriceMap?: Record<string, number>
): number {
  if (priceTier === "special" && specialPriceMap && specialPriceMap[spec.id]) {
    return specialPriceMap[spec.id];
  }
  return spec.wholesalePrice;
}

// ──────────────────────────────────────────────────────────────
//  集計値（開発・管理画面表示用）
// ──────────────────────────────────────────────────────────────

export const MASTER_STATS = {
  specCount: ALL_SPECS.length,
  standardCount: STANDARD_TAPES.length,
  numberCount: NUMBER_TAPES.length,
  diagonalCount: DIAGONAL_TAPES.length,
  totalSkuCount: enumerateAllSKUs().length,
};
