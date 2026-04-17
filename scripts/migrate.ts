/**
 * migrate.ts — DB スキーマ作成
 *
 * Usage: npx tsx --env-file=.env.local scripts/migrate.ts
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("🔧 Creating tables...");

  // ── customers ──
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      contact_name  TEXT,
      email         TEXT,
      phone         TEXT,
      location      TEXT,
      notes         TEXT,
      status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','inactive')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      invited_at    TIMESTAMPTZ,
      activated_at  TIMESTAMPTZ
    )
  `;
  console.log("  ✅ customers");
  // SMILE 得意先コードを後付けで追加（既存テーブルにも適用）
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS smile_code TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS customers_smile_code_key ON customers(smile_code) WHERE smile_code IS NOT NULL`;
  console.log("  ✅ customers.smile_code (SMILE得意先コード)");

  // ── customer_prices ──
  await sql`
    CREATE TABLE IF NOT EXISTS customer_prices (
      id          SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      spec_id     TEXT NOT NULL,
      price       INTEGER NOT NULL,
      UNIQUE (customer_id, spec_id)
    )
  `;
  console.log("  ✅ customer_prices");

  // ── users ──
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('admin','customer')),
      customer_id   INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  ✅ users");

  // ── invitations ──
  await sql`
    CREATE TABLE IF NOT EXISTS invitations (
      id          SERIAL PRIMARY KEY,
      token       TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      email       TEXT NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      used_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  ✅ invitations");

  // ── sessions (Auth.js 用) ──
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token TEXT NOT NULL UNIQUE,
      expires_at    TIMESTAMPTZ NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  ✅ sessions");

  // ── orders ──
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id                TEXT PRIMARY KEY,
      quote_number      INTEGER,
      received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      company_name      TEXT NOT NULL,
      contact_name      TEXT NOT NULL,
      email             TEXT NOT NULL,
      phone             TEXT,
      zip_code          TEXT,
      shipping_address  TEXT,
      desired_delivery  TEXT,
      notes             TEXT,
      customer_id       INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      price_tier        TEXT NOT NULL DEFAULT 'standard',
      subtotal          INTEGER NOT NULL,
      tax               INTEGER NOT NULL,
      total             INTEGER NOT NULL,
      status            TEXT NOT NULL DEFAULT 'issued'
                        CHECK (status IN ('draft','issued','approved','shipping','shipped','invoiced','paid','cancelled')),
      status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  ✅ orders");
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_received_at ON orders(received_at DESC)`;

  // ── order_lines ──
  await sql`
    CREATE TABLE IF NOT EXISTS order_lines (
      id           SERIAL PRIMARY KEY,
      order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      spec_id      TEXT NOT NULL,
      color_id     TEXT NOT NULL,
      product_name TEXT NOT NULL,
      color_name   TEXT NOT NULL,
      unit_price   INTEGER NOT NULL,
      quantity     INTEGER NOT NULL,
      subtotal     INTEGER NOT NULL
    )
  `;
  console.log("  ✅ order_lines");
  await sql`CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines(order_id)`;

  console.log("\n🎉 Migration complete!");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
