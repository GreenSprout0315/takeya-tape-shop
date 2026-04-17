/**
 * import-customers-from-smile.ts
 *
 * SMILE売上実績から抽出した取引先リストを customers テーブルに取り込む。
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/import-customers-from-smile.ts
 *
 * 入力: C:\greensprout\.company\sales\clients\takeya-shoji\customer-candidates-B_2025.json
 *       （2025-01-01以降に識別テープ取引のある411社）
 *
 * ロジック:
 *   1. 既存の name 一致の customer があれば smile_code だけ更新
 *   2. smile_code 一致の customer があれば何もしない（再実行時のidempotency）
 *   3. 新規 → status='pending' で INSERT。email/phone は空
 *
 * 注意: email 未登録のため、招待メールは手動で順次送る運用
 */

import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

type Candidate = {
  smileCode: string;
  name: string;
  count: number;
  totalAmt: number;
  firstDate: string;
  lastDate: string;
  miyamotoCount: number;
};

// 全期間取引実績のある 894社を対象に一括登録
const SRC = "C:\\greensprout\\.company\\sales\\clients\\takeya-shoji\\customer-candidates-E_all.json";

function formatDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

async function main() {
  const candidates: Candidate[] = JSON.parse(fs.readFileSync(SRC, "utf8"));
  console.log(`📋 候補: ${candidates.length}社\n`);

  let inserted = 0;
  let updatedSmileCode = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const c of candidates) {
    try {
      // 1) smile_code で既存チェック
      const bySmile = await sql`SELECT id, name FROM customers WHERE smile_code = ${c.smileCode}`;
      if (bySmile.length > 0) {
        skipped++;
        continue;
      }

      // 2) 同名 customer があれば smile_code を付与
      const byName = await sql`SELECT id FROM customers WHERE name = ${c.name}`;
      if (byName.length > 0) {
        await sql`UPDATE customers SET smile_code = ${c.smileCode} WHERE id = ${byName[0].id}`;
        updatedSmileCode++;
        console.log(`  🔄 smile_code 付与: [${c.smileCode}] ${c.name}`);
        continue;
      }

      // 3) 新規挿入
      const notes =
        `SMILE実績: ${c.count}件 / 累計 ¥${c.totalAmt.toLocaleString()} / ` +
        `初回 ${formatDate(c.firstDate)} / 最終 ${formatDate(c.lastDate)}` +
        (c.miyamotoCount > 0 ? ` / 宮本担当 ${c.miyamotoCount}件` : "");

      await sql`
        INSERT INTO customers (name, smile_code, status, notes)
        VALUES (${c.name}, ${c.smileCode}, 'pending', ${notes})
      `;
      inserted++;
    } catch (e) {
      errors.push(`${c.smileCode} | ${c.name}: ${(e as Error).message}`);
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`新規登録:           ${inserted}社`);
  console.log(`smile_code 付与済み: ${updatedSmileCode}社`);
  console.log(`スキップ（既存）:    ${skipped}社`);
  if (errors.length) {
    console.log(`\n⚠️  エラー ${errors.length}件:`);
    errors.slice(0, 10).forEach((e) => console.log(`  ${e}`));
  }

  // 統計
  const [{ total }] = await sql`SELECT COUNT(*)::int as total FROM customers`;
  const [{ withSmile }] = await sql`SELECT COUNT(*)::int as "withSmile" FROM customers WHERE smile_code IS NOT NULL`;
  const [{ active }] = await sql`SELECT COUNT(*)::int as active FROM customers WHERE status='active'`;
  const [{ pending }] = await sql`SELECT COUNT(*)::int as pending FROM customers WHERE status='pending'`;
  console.log(`\n📊 customers テーブル現在値:`);
  console.log(`   全顧客:              ${total}社`);
  console.log(`   smile_code 付き:     ${withSmile}社`);
  console.log(`   active（ログイン可）: ${active}社`);
  console.log(`   pending（未招待）:   ${pending}社`);
}

main().catch((err) => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});
