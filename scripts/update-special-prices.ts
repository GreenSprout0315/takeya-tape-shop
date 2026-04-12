/**
 * update-special-prices.ts — 売上実績に基づいて特価顧客の価格をDB更新
 *
 * Usage: npx tsx --env-file=.env.local scripts/update-special-prices.ts
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// 売上実績CSVから確認した実際の取引価格（税抜）
// ※ 複数価格がある場合は最頻値（特価適用後の価格）を採用

const YAMAGATA_PRICES: Record<string, number> = {
  "std-008-15-50": 115,
  "std-008-20-50": 155,
  "std-008-30-50": 230,
  "std-008-50-50": 383,
  "std-01-15-50": 145,
  "std-01-20-50": 196,
  "std-01-30-50": 289,
  "std-01-50-50": 485,
  "std-015-15-50": 217,
  "std-015-20-50": 289,
  "std-015-30-50": 434,
  "std-02-15-50": 289,
  "std-02-20-50": 391,
  "std-02-30-50": 578,
  "std-008-15-100": 230,
  "std-008-20-100": 306,
  "std-008-30-100": 459,
  "std-008-50-100": 765,
  "std-01-15-100": 289,
  "std-01-20-100": 391,
  "std-01-30-100": 578,
  "std-01-50-100": 969,
};

const FUKUSHIMA_PRICES: Record<string, number> = {
  ...YAMAGATA_PRICES,
  // 福島は斜線テープも取引実績あり
  "diag-01-30-50-pink-blue": 580,
  "diag-01-30-50-yellow-black": 580,
};

const IKI_PRICES: Record<string, number> = {
  "std-008-30-50": 230,
};

async function update() {
  const customers = [
    { name: "山形県森林組合連合会", prices: YAMAGATA_PRICES },
    { name: "福島県森林組合連合会", prices: FUKUSHIMA_PRICES },
    { name: "株式会社壱岐産業", prices: IKI_PRICES },
  ];

  for (const { name, prices } of customers) {
    const rows = await sql`SELECT id FROM customers WHERE name = ${name}`;
    if (rows.length === 0) {
      console.log(`⚠️  ${name} が見つかりません`);
      continue;
    }
    const customerId = rows[0].id;

    // 既存の特別価格を全削除してから再投入
    await sql`DELETE FROM customer_prices WHERE customer_id = ${customerId}`;

    let count = 0;
    for (const [specId, price] of Object.entries(prices)) {
      await sql`
        INSERT INTO customer_prices (customer_id, spec_id, price)
        VALUES (${customerId}, ${specId}, ${price})
      `;
      count++;
    }
    console.log(`✅ ${name} (id=${customerId}): ${count}件の特別価格を設定`);
  }

  console.log("\n🎉 Update complete!");
}

update().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
