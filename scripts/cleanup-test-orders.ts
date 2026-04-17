/**
 * cleanup-test-orders.ts
 *
 * 本番運用前にテスト発注のレコードを全削除する。
 * 併せて Vercel Blob カウンターを指定値にリセット。
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/cleanup-test-orders.ts [--counter=N]
 *     デフォルト --counter=0 （次回採番は1）
 */

import { neon } from "@neondatabase/serverless";
import { resetCounter } from "../lib/counter";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const counterArg = process.argv.find((a) => a.startsWith("--counter="));
  const newCounterValue = counterArg ? Number(counterArg.split("=")[1]) : 0;

  // 削除前の件数
  const [{ cnt: beforeOrders }] = await sql`SELECT COUNT(*)::int as cnt FROM orders`;
  const [{ cnt: beforeLines }] = await sql`SELECT COUNT(*)::int as cnt FROM order_lines`;
  console.log(`削除前: orders ${beforeOrders}件 / order_lines ${beforeLines}件\n`);

  // orders を削除（CASCADE で order_lines も削除される）
  await sql`DELETE FROM orders`;

  const [{ cnt: afterOrders }] = await sql`SELECT COUNT(*)::int as cnt FROM orders`;
  const [{ cnt: afterLines }] = await sql`SELECT COUNT(*)::int as cnt FROM order_lines`;
  console.log(`✅ orders 削除: ${afterOrders}件残存`);
  console.log(`✅ order_lines 削除: ${afterLines}件残存`);

  // Vercel Blob カウンターをリセット
  try {
    await resetCounter(newCounterValue);
    console.log(`✅ Blob カウンターをリセット: 次回採番は ${newCounterValue + 1}`);
  } catch (err) {
    console.error("⚠️ カウンターリセット失敗:", err);
  }

  console.log("\n✨ クリーンアップ完了。本番運用を開始できます。");
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
