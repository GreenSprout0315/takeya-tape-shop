import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** GET /api/admin/customers/:id — 顧客詳細 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getDb();
  const rows = await sql`SELECT * FROM customers WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

/** PUT /api/admin/customers/:id — 顧客更新 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { name, contact_name, email, phone, location, notes, status } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "会社名は必須です" }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    UPDATE customers
    SET name = ${name},
        contact_name = ${contact_name || null},
        email = ${email || null},
        phone = ${phone || null},
        location = ${location || null},
        notes = ${notes || null},
        status = ${status || 'active'}
    WHERE id = ${id}
    RETURNING *
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

/** DELETE /api/admin/customers/:id — 顧客削除 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getDb();
  const rows = await sql`DELETE FROM customers WHERE id = ${id} RETURNING id`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
