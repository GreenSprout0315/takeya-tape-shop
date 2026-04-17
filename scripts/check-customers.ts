import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

(async () => {
  const totals = await sql`SELECT status, COUNT(*)::int as cnt FROM customers GROUP BY status ORDER BY status`;
  console.log("=== ステータス別 ===");
  console.table(totals);

  const withoutSmile = await sql`SELECT id, name, status FROM customers WHERE smile_code IS NULL ORDER BY id`;
  console.log("\n=== smile_code なし ===");
  console.table(withoutSmile);

  const activeList = await sql`SELECT id, smile_code, name, status, (SELECT COUNT(*) FROM customer_prices WHERE customer_id = customers.id)::int as prices FROM customers WHERE status = 'active' OR smile_code IN ('030204', '030021', '030388') ORDER BY id`;
  console.log("\n=== 特価3社 & active ===");
  console.table(activeList);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
