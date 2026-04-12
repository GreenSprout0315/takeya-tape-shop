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

  console.log("\n🎉 Migration complete!");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
