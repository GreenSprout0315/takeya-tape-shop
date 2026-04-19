/**
 * E2E動作確認（DB統合・Dev環境のみ）
 *
 * Usage: npx tsx --env-file=.env.local scripts/e2e-first-order-shipping.ts
 *
 * テスト顧客を作成 → 小口発注シミュレーション → 権利消費確認 → クリーンアップ
 * 実ブラウザを立てなくても、ロジック層 + DB層の動作を検証する。
 */

import { neon } from "@neondatabase/serverless";
import { applyFirstOrderShipping } from "../lib/first-order-shipping";

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  const email = `test-ec-mig-${Date.now()}@example.com`;
  const [created] = await sql`
    INSERT INTO customers (name, contact_name, email, status, first_order_free_shipping_eligible)
    VALUES ('E2Eテスト新規EC会員', 'テスト太郎', ${email}, 'active', TRUE)
    RETURNING id, name, first_order_free_shipping_eligible, first_ec_order_at
  `;
  const cid = Number(created.id);
  console.log("CREATED:", created);

  try {
    // 1st small order
    const d1 = applyFirstOrderShipping({
      customerId: cid,
      firstOrderFreeShippingEligible: created.first_order_free_shipping_eligible,
      subtotal: 15000,
    });
    console.log("DECISION #1 (subtotal=15000):", d1);
    if (!d1.shippingFeeWaived || !d1.consumesEligibility) {
      throw new Error("Expected waived=true, consume=true for first small order");
    }
    await sql`
      UPDATE customers
      SET first_order_free_shipping_eligible = FALSE,
          first_ec_order_at = COALESCE(first_ec_order_at, NOW())
      WHERE id = ${cid}
    `;
    const [after1] = await sql`SELECT first_order_free_shipping_eligible AS eligible, first_ec_order_at FROM customers WHERE id=${cid}`;
    console.log("AFTER #1:", after1);
    if (after1.eligible !== false || !after1.first_ec_order_at) {
      throw new Error("Expected eligible=false and first_ec_order_at set");
    }

    // 2nd small order (eligible=false now)
    const d2 = applyFirstOrderShipping({
      customerId: cid,
      firstOrderFreeShippingEligible: after1.eligible,
      subtotal: 12000,
    });
    console.log("DECISION #2 (subtotal=12000, post-consume):", d2);
    if (d2.shippingFeeWaived || d2.consumesEligibility) {
      throw new Error("Expected waived=false, consume=false after consumption");
    }

    // 3rd check: what if a large order comes first?
    const d3 = applyFirstOrderShipping({
      customerId: 999,
      firstOrderFreeShippingEligible: true,
      subtotal: 35000,
    });
    console.log("DECISION #3 (subtotal=35000, still eligible):", d3);
    if (d3.shippingFeeWaived || d3.consumesEligibility) {
      throw new Error("Expected waived=false, consume=false for large order even if eligible");
    }

    console.log("\n✅ ALL E2E assertions passed");
  } finally {
    await sql`DELETE FROM customers WHERE id = ${cid}`;
    console.log("🧹 cleanup done");
  }
}

run().catch((err) => {
  console.error("❌ E2E failed:", err);
  process.exit(1);
});
