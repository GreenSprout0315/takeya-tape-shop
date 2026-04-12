import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/** GET /api/admin/customers — 顧客一覧 */
export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT c.*,
      (SELECT COUNT(*)::int FROM customer_prices WHERE customer_id = c.id) AS price_count,
      (SELECT email FROM users WHERE customer_id = c.id LIMIT 1) AS user_email
    FROM customers c
    ORDER BY c.id
  `;
  return NextResponse.json(rows);
}

/** POST /api/admin/customers — 顧客追加 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, contact_name, email, phone, location, notes } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "会社名は必須です" }, { status: 400 });
  }

  const sql = getDb();
  const [row] = await sql`
    INSERT INTO customers (name, contact_name, email, phone, location, notes, status)
    VALUES (${name}, ${contact_name || null}, ${email || null}, ${phone || null}, ${location || null}, ${notes || null}, 'active')
    RETURNING *
  `;

  return NextResponse.json(row, { status: 201 });
}
