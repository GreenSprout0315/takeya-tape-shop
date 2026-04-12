/**
 * seed-admin.ts — 管理者アカウント + 既存3社の初期データ投入
 *
 * Usage: npx tsx --env-file=.env.local scripts/seed-admin.ts
 */

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const sql = neon(process.env.DATABASE_URL!);

const ADMIN_EMAIL = "s_miyamoto@greensprout0315.com";
const ADMIN_PASSWORD = "KtTAmO6mjpb5hcrc";

/** 既存 customer-master.ts からの移行データ */
const EXISTING_CUSTOMERS = [
  {
    name: "山形県森林組合連合会",
    location: "山形県",
    notes: "年間155件 / 累計¥2.77Mの最大取引先。CSV実測で約15%引き確認。",
  },
  {
    name: "福島県森林組合連合会",
    location: "福島県",
    notes: "年間61件 / 累計¥1.07Mの大口取引先。CSV実測で約15%引き確認。",
  },
  {
    name: "株式会社壱岐産業",
    location: "",
    notes: "30mm×50m ¥230をCSV実測確認。2つの森連と同率。",
  },
];

/** 15%引きの特価テーブル（customer-master.ts から転記） */
const SPECIAL_OVERRIDES_15PCT: Record<string, number> = {
  "std-008-15-50": 115,
  "std-008-20-50": 153,
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

async function seed() {
  // ── 管理者アカウント ──
  const existing = await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL}`;
  if (existing.length > 0) {
    console.log(`⏭️  Admin user already exists (id=${existing[0].id})`);
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const [admin] = await sql`
      INSERT INTO users (email, password_hash, role)
      VALUES (${ADMIN_EMAIL}, ${hash}, 'admin')
      RETURNING id
    `;
    console.log(`✅ Admin user created (id=${admin.id})`);
  }

  // ── 既存3社の顧客データ ──
  for (const c of EXISTING_CUSTOMERS) {
    const rows = await sql`SELECT id FROM customers WHERE name = ${c.name}`;
    let customerId: number;

    if (rows.length > 0) {
      customerId = rows[0].id;
      console.log(`⏭️  Customer "${c.name}" already exists (id=${customerId})`);
    } else {
      const [row] = await sql`
        INSERT INTO customers (name, location, notes, status)
        VALUES (${c.name}, ${c.location}, ${c.notes}, 'active')
        RETURNING id
      `;
      customerId = row.id;
      console.log(`✅ Customer "${c.name}" created (id=${customerId})`);
    }

    // 特別価格の登録
    let inserted = 0;
    for (const [specId, price] of Object.entries(SPECIAL_OVERRIDES_15PCT)) {
      const exists = await sql`
        SELECT id FROM customer_prices
        WHERE customer_id = ${customerId} AND spec_id = ${specId}
      `;
      if (exists.length === 0) {
        await sql`
          INSERT INTO customer_prices (customer_id, spec_id, price)
          VALUES (${customerId}, ${specId}, ${price})
        `;
        inserted++;
      }
    }
    console.log(`   → ${inserted} price overrides inserted`);
  }

  console.log("\n🎉 Seed complete!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
