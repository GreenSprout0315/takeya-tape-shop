import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** GET /api/admin/customers/:id/pricing — 顧客の特別価格一覧 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getDb();
  const rows = await sql`
    SELECT spec_id, price FROM customer_prices
    WHERE customer_id = ${id}
    ORDER BY spec_id
  `;
  return NextResponse.json(rows);
}

/**
 * PUT /api/admin/customers/:id/pricing — 特別価格を一括更新
 *
 * Body: { prices: { [specId: string]: number | null } }
 * - number → upsert（その単価で登録/更新）
 * - null   → 削除（定価に戻す）
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const prices: Record<string, number | null> = body.prices;

  if (!prices || typeof prices !== "object") {
    return NextResponse.json({ error: "prices が必要です" }, { status: 400 });
  }

  const sql = getDb();

  // 顧客存在チェック
  const customer = await sql`SELECT id FROM customers WHERE id = ${id}`;
  if (customer.length === 0) {
    return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
  }

  let upserted = 0;
  let deleted = 0;

  for (const [specId, price] of Object.entries(prices)) {
    if (price === null) {
      // 削除
      const res = await sql`
        DELETE FROM customer_prices
        WHERE customer_id = ${id} AND spec_id = ${specId}
      `;
      if (res.length !== undefined) deleted++;
    } else {
      // upsert
      await sql`
        INSERT INTO customer_prices (customer_id, spec_id, price)
        VALUES (${id}, ${specId}, ${price})
        ON CONFLICT (customer_id, spec_id)
        DO UPDATE SET price = ${price}
      `;
      upserted++;
    }
  }

  return NextResponse.json({ ok: true, upserted, deleted });
}
