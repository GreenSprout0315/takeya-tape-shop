/**
 * migrate-free-shipping.ts — 初回送料無料機能のDBカラム追加
 *
 * Usage: npx tsx --env-file=.env.local scripts/migrate-free-shipping.ts
 *
 * 追加:
 *  - customers.first_order_free_shipping_eligible (boolean, default true)
 *  - customers.first_ec_order_at (timestamptz, nullable)
 *  - orders.shipping_fee_waived (boolean, default false)
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("🔧 Adding first-order shipping columns...");

  await sql`
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS first_order_free_shipping_eligible BOOLEAN NOT NULL DEFAULT TRUE
  `;
  console.log("  ✅ customers.first_order_free_shipping_eligible");

  await sql`
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS first_ec_order_at TIMESTAMPTZ
  `;
  console.log("  ✅ customers.first_ec_order_at");

  await sql`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS shipping_fee_waived BOOLEAN NOT NULL DEFAULT FALSE
  `;
  console.log("  ✅ orders.shipping_fee_waived");

  console.log("\n🎉 Migration complete!");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
