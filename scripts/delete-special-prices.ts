/**
 * delete-special-prices.ts
 *
 * 特価3社（山形県森組連・福島県森組連・壱岐産業）の
 * customer_prices エントリを削除する。
 * customers 自体は残すので、取引先として一覧に残る。
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/delete-special-prices.ts
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const TARGET_SMILE_CODES = ["030204", "030021", "030388"];

async function main() {
  console.log("=== 削除前 ===");
  const before = await sql`
    SELECT c.id, c.smile_code, c.name, c.status,
           (SELECT COUNT(*)::int FROM customer_prices WHERE customer_id = c.id) AS prices
    FROM customers c
    WHERE c.smile_code = ANY(${TARGET_SMILE_CODES})
    ORDER BY c.id
  `;
  console.table(before);

  // 削除対象の特価行
  const rowsToDelete = await sql`
    SELECT cp.customer_id, cp.spec_id, cp.price
    FROM customer_prices cp
    JOIN customers c ON c.id = cp.customer_id
    WHERE c.smile_code = ANY(${TARGET_SMILE_CODES})
  `;
  console.log(`\n削除対象の customer_prices: ${rowsToDelete.length}件`);

  if (rowsToDelete.length === 0) {
    console.log("削除対象なし。終了します。");
    return;
  }

  // 実行
  const result = await sql`
    DELETE FROM customer_prices
    WHERE customer_id IN (
      SELECT id FROM customers WHERE smile_code = ANY(${TARGET_SMILE_CODES})
    )
  `;
  console.log(`✅ 削除完了`);

  console.log("\n=== 削除後 ===");
  const after = await sql`
    SELECT c.id, c.smile_code, c.name, c.status,
           (SELECT COUNT(*)::int FROM customer_prices WHERE customer_id = c.id) AS prices
    FROM customers c
    WHERE c.smile_code = ANY(${TARGET_SMILE_CODES})
    ORDER BY c.id
  `;
  console.table(after);

  console.log("\n📌 customers は残っています（他の取引先と同様 pending）。");
  console.log("   再度特価を設定する場合は /admin/customers/[id]/pricing から可能。");
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
