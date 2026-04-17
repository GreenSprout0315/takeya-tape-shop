import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

(async () => {
  const users = await sql`SELECT id, email, role, customer_id, created_at FROM users ORDER BY id`;
  console.log("=== users テーブル ===");
  console.table(users);

  const totalCust = await sql`SELECT COUNT(*)::int as cnt FROM customers`;
  const withUser = await sql`
    SELECT COUNT(DISTINCT c.id)::int as cnt
    FROM customers c
    JOIN users u ON u.customer_id = c.id
  `;
  const invitations = await sql`SELECT COUNT(*)::int as cnt, COUNT(used_at)::int as used FROM invitations`;

  console.log("\n=== サマリ ===");
  console.log(`customers 総数:       ${totalCust[0].cnt}社`);
  console.log(`users 紐付きあり:     ${withUser[0].cnt}社`);
  console.log(`invitations 全体:    ${invitations[0].cnt}件 (使用済 ${invitations[0].used}件)`);
  console.log(`パスワード未発行:    ${totalCust[0].cnt - withUser[0].cnt}社`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
