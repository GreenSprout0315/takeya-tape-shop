/**
 * Customer Master — 顧客マスター（レガシー / アーカイブ）
 *
 * ⚠️ 2026-04-12 以降、アプリ本体はこのファイルを参照しない。
 * 顧客データと特別価格は Neon Postgres に移行済み。
 * → DB操作は lib/customer-db.ts を使用すること。
 *
 * このファイルは以下の用途で残している:
 * - scripts/verify-master.ts（開発用検証スクリプト）
 * - 初期データの参照元（seed-admin.ts のソース）
 *
 * 出典: 宮本さん担当分売上実績CSV（2022/06〜2026/04）を分析した結果
 *       `sales/clients/takeya-shoji/miyamoto-tape-sales.csv`
 */

import type { ProductSpec } from "./product-master";

// ──────────────────────────────────────────────────────────────
//  型定義
// ──────────────────────────────────────────────────────────────

export type PriceTier = "standard" | "special";

export type CustomerPricingRule = {
  /** 特別価格（spec.id → 単価）。登録されていない商品は標準売価を適用 */
  overrides: Record<string, number>;
  /** 備考（なぜ特別価格なのか） */
  note?: string;
};

export type Customer = {
  /** 顧客ID（URL/管理用） */
  id: string;
  /** 会社名 */
  name: string;
  /** 顧客種別 */
  tier: PriceTier;
  /** 特別価格ルール（tier === "special" のときのみ） */
  pricing?: CustomerPricingRule;
  /** 担当営業 */
  salesRep?: string;
  /** 所在地（自由記述） */
  location?: string;
};

// ──────────────────────────────────────────────────────────────
//  特別価格業者（3社）
//
//  売上実績CSV分析で確認された特価率（約15%引き）を反映。
//  ¥270 → ¥230、¥135 → ¥115 がベース。
//  他の商品は公式注文書の「標準売価」から同率（約14.8%）で試算した推定値。
//  正確な特価が判明次第、この override を更新する。
// ──────────────────────────────────────────────────────────────

/** 15%引きの特価テーブル（CSV実測 + 同率推定） */
const SPECIAL_OVERRIDES_15PCT: Record<string, number> = {
  // 0.08mm × 50m（実測で ¥270 → ¥230 確認）
  "std-008-15-50": 115,
  "std-008-20-50": 153,
  "std-008-30-50": 230,
  "std-008-50-50": 383,
  // 0.1mm × 50m
  "std-01-15-50": 145,
  "std-01-20-50": 196,
  "std-01-30-50": 289,
  "std-01-50-50": 485,
  // 0.15mm × 50m
  "std-015-15-50": 217,
  "std-015-20-50": 289,
  "std-015-30-50": 434,
  // 0.2mm × 50m
  "std-02-15-50": 289,
  "std-02-20-50": 391,
  "std-02-30-50": 578,
  // 0.08mm × 100m
  "std-008-15-100": 230,
  "std-008-20-100": 306,
  "std-008-30-100": 459,
  "std-008-50-100": 765,
  // 0.1mm × 100m
  "std-01-15-100": 289,
  "std-01-20-100": 391,
  "std-01-30-100": 578,
  "std-01-50-100": 969,
};

export const CUSTOMERS: Customer[] = [
  // ── 特別価格業者 ──
  {
    id: "yamagata-forest-coop",
    name: "山形県森林組合連合会",
    tier: "special",
    location: "山形県",
    salesRep: "宮本俊輔",
    pricing: {
      overrides: SPECIAL_OVERRIDES_15PCT,
      note:
        "年間 155件 / 累計 ¥2.77M の最大取引先。30mm×50m ¥230、15mm×50m ¥115 を CSV で実測確認（約15%引き）。",
    },
  },
  {
    id: "fukushima-forest-coop",
    name: "福島県森林組合連合会",
    tier: "special",
    location: "福島県",
    salesRep: "宮本俊輔",
    pricing: {
      overrides: SPECIAL_OVERRIDES_15PCT,
      note:
        "年間 61件 / 累計 ¥1.07M の大口取引先。30mm×50m ¥230、15mm×50m ¥115 を CSV で実測確認。",
    },
  },
  {
    id: "iki-sangyo",
    name: "株式会社壱岐産業",
    tier: "special",
    location: "不明（要確認）",
    salesRep: "宮本俊輔",
    pricing: {
      overrides: SPECIAL_OVERRIDES_15PCT,
      note: "30mm×50m ¥230 を CSV で実測確認。2つの森林組合連合会と同率。",
    },
  },
];

// ──────────────────────────────────────────────────────────────
//  ヘルパー関数
// ──────────────────────────────────────────────────────────────

export function getCustomerById(id: string): Customer | undefined {
  return CUSTOMERS.find((c) => c.id === id);
}

export function getSpecialCustomers(): Customer[] {
  return CUSTOMERS.filter((c) => c.tier === "special");
}

/**
 * 会社名（大文字小文字・法人格を緩くマッチング）から顧客レコードを検索
 * 発注フォームで入力された会社名から自動判定するために使う
 */
export function findCustomerByName(name: string): Customer | undefined {
  const normalized = name
    .replace(/\s/g, "")
    .replace(/株式会社|有限会社|一般社団法人|連合会|組合|㈱|㈲/g, "")
    .toLowerCase();
  for (const c of CUSTOMERS) {
    const cname = c.name
      .replace(/\s/g, "")
      .replace(/株式会社|有限会社|一般社団法人|連合会|組合|㈱|㈲/g, "")
      .toLowerCase();
    if (
      normalized.includes(cname) ||
      cname.includes(normalized)
    ) {
      return c;
    }
  }
  return undefined;
}

/**
 * 商品スペックと顧客から適用単価を取得
 */
export function getCustomerPrice(
  spec: ProductSpec,
  customer: Customer | null | undefined
): number {
  if (customer?.tier === "special" && customer.pricing?.overrides[spec.id]) {
    return customer.pricing.overrides[spec.id];
  }
  return spec.wholesalePrice;
}
