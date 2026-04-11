// 商品マスターと顧客マスターの整合性検証
// 実行: node --experimental-strip-types scripts/verify-master.ts

import {
  ALL_SPECS,
  STANDARD_TAPES,
  NUMBER_TAPES,
  DIAGONAL_TAPES,
  MASTER_STATS,
  enumerateAllSKUs,
  CATEGORY_META,
  getFeaturedSpecs,
  formatJpy,
} from "../lib/product-master.ts";
import {
  CUSTOMERS,
  getSpecialCustomers,
  findCustomerByName,
  getCustomerPrice,
} from "../lib/customer-master.ts";
import {
  buildQuote,
  generateOrderId,
  validateOrderRequest,
  TAX_RATE,
  formatQuoteTotal,
  type OrderRequest,
} from "../lib/order.ts";

console.log("=== 商品マスター統計 ===");
console.log(`  識別テープ(標準)    : ${STANDARD_TAPES.length} spec`);
console.log(`  ナンバーテープ      : ${NUMBER_TAPES.length} spec`);
console.log(`  斜線入り識別テープ  : ${DIAGONAL_TAPES.length} spec`);
console.log(`  ───────────────────`);
console.log(`  合計 spec           : ${ALL_SPECS.length}`);
console.log(`  合計 SKU            : ${MASTER_STATS.totalSkuCount}`);
console.log();

// カテゴリー別 SKU
const skus = enumerateAllSKUs();
const byCat = new Map<string, number>();
for (const sku of skus) {
  byCat.set(sku.categoryLabel, (byCat.get(sku.categoryLabel) || 0) + 1);
}
console.log("=== カテゴリー別 SKU 内訳 ===");
for (const [cat, count] of byCat) {
  console.log(`  ${cat}: ${count} SKU`);
}
console.log();

// 目玉商品
console.log("=== 目玉商品（featured） ===");
for (const s of getFeaturedSpecs()) {
  console.log(`  ${s.name}  ${formatJpy(s.wholesalePrice)}/本`);
}
console.log();

// 価格レンジ
const prices = ALL_SPECS.map((s) => s.wholesalePrice);
console.log("=== 標準売価レンジ ===");
console.log(`  最小: ${formatJpy(Math.min(...prices))}`);
console.log(`  最大: ${formatJpy(Math.max(...prices))}`);
console.log();

// 顧客マスター
console.log("=== 顧客マスター ===");
console.log(`  全顧客: ${CUSTOMERS.length} 社`);
console.log(`  特価業者: ${getSpecialCustomers().length} 社`);
for (const c of CUSTOMERS) {
  const overrideCount = c.pricing
    ? Object.keys(c.pricing.overrides).length
    : 0;
  console.log(`  - ${c.name} [${c.tier}] (特価 ${overrideCount} 品)`);
}
console.log();

// 名前マッチング検証
console.log("=== 顧客名マッチング検証 ===");
const testNames = [
  "山形県森林組合連合会",
  "山形県森組連",
  "株式会社壱岐産業",
  "㈱壱岐産業",
  "福島県森林組合連合会",
  "津山町森林組合", // 特価対象外
];
for (const n of testNames) {
  const c = findCustomerByName(n);
  console.log(
    `  "${n}" → ${c ? `${c.name} [${c.tier}]` : "（標準顧客）"}`
  );
}
console.log();

// 価格計算ロジック検証
console.log("=== 価格計算 E2E テスト ===");
const testSpec = ALL_SPECS.find((s) => s.id === "std-008-30-50")!;
console.log(`  商品: ${testSpec.name}`);
console.log(`  標準売価: ${formatJpy(testSpec.wholesalePrice)}`);

const standardCustomer = null;
const specialCustomer = CUSTOMERS.find((c) => c.id === "yamagata-forest-coop")!;
console.log(
  `  一般顧客価格: ${formatJpy(getCustomerPrice(testSpec, standardCustomer))}`
);
console.log(
  `  山形県森組連価格: ${formatJpy(getCustomerPrice(testSpec, specialCustomer))}`
);
console.log();

// 発注 → 見積書生成の E2E
console.log("=== 発注 → 見積書 E2E テスト ===");
const sampleOrder: OrderRequest = {
  id: generateOrderId(new Date("2026-04-11T12:00:00+09:00")),
  receivedAt: "2026-04-11T12:00:00+09:00",
  companyName: "山形県森林組合連合会",
  contactName: "山田太郎",
  email: "yamada@example.com",
  lines: [
    { specId: "std-008-30-50", colorId: "pink", quantity: 60 },
    { specId: "std-008-30-50", colorId: "blue", quantity: 40 },
    { specId: "std-01-15-50", colorId: "yellow", quantity: 20 },
  ],
  notes: "令和8年度森林調査用",
};

const validation = validateOrderRequest(sampleOrder);
console.log(`  バリデーション: ${validation.ok ? "OK" : "NG"}`);
if (!validation.ok) console.log(`    errors: ${validation.errors.join(" / ")}`);

const quote = buildQuote(sampleOrder);
console.log(`  発注ID: ${sampleOrder.id}`);
console.log(`  顧客種別: ${quote.priceTier}`);
console.log(`  顧客ID: ${quote.customerId ?? "(なし)"}`);
console.log(`  明細:`);
for (const line of quote.lines) {
  console.log(
    `    ${line.productName} ${line.colorName}: ${line.quantity}本 × ${formatJpy(line.unitPrice)} = ${formatJpy(line.subtotal)}`
  );
}
console.log(`  小計: ${formatJpy(quote.subtotal)}`);
console.log(
  `  消費税(${Math.round(TAX_RATE * 100)}%): ${formatJpy(quote.tax)}`
);
console.log(`  合計: ${formatQuoteTotal(quote)}`);
console.log();

// 参考: 同じ発注で一般顧客の場合
const standardOrder: OrderRequest = {
  ...sampleOrder,
  id: generateOrderId(new Date("2026-04-11T12:00:00+09:00")),
  companyName: "株式会社テスト林業",
};
const standardQuote = buildQuote(standardOrder);
console.log("=== 参考: 同じ発注を一般顧客で試算 ===");
console.log(
  `  顧客種別: ${standardQuote.priceTier} / 合計: ${formatQuoteTotal(standardQuote)}`
);
console.log(
  `  差額（特価との差）: ${formatJpy(standardQuote.total - quote.total)}`
);

console.log();
console.log("✅ 全ての検証が完了しました");
