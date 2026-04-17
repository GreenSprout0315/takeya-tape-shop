import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ALL_SPECS } from "@/lib/product-master";

/**
 * POST /api/admin/customers/:id/pricing/upload
 *
 * CSV テキストを受け取って、指定顧客の customer_prices を一括 upsert する。
 * フォーマット:
 *   spec_id,price
 *   std-008-15-50,115
 *   std-008-30-50,230
 *   ...
 *
 * - spec_id が ALL_SPECS にないものは無視
 * - price <= 0 や NaN は無視
 * - 空行・コメント行(#) は無視
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await context.params;
  const id = Number(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: "invalid customer id" }, { status: 400 });
  }

  const body = await req.json();
  const csv = String(body?.csv ?? "");
  if (!csv.trim()) {
    return NextResponse.json({ error: "CSV テキストが空です" }, { status: 400 });
  }

  const sql = getDb();
  const cust = await sql`SELECT id FROM customers WHERE id = ${id}`;
  if (cust.length === 0) {
    return NextResponse.json({ error: "customer not found" }, { status: 404 });
  }

  const validSpecIds = new Set(ALL_SPECS.map((s) => s.id));
  const lines = csv.split(/\r?\n/);
  let upserted = 0;
  const errors: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    // ヘッダ行のスキップ
    if (/^spec[_ ]?id/i.test(line)) continue;

    const parts = line.split(",").map((s) => s.trim());
    if (parts.length < 2) {
      errors.push(`フォーマット不正: ${line}`);
      continue;
    }
    const [specId, priceStr] = parts;
    if (!validSpecIds.has(specId)) {
      errors.push(`未知の spec_id: ${specId}`);
      continue;
    }
    const price = Number(priceStr);
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`不正な価格: ${specId} ${priceStr}`);
      continue;
    }

    await sql`
      INSERT INTO customer_prices (customer_id, spec_id, price)
      VALUES (${id}, ${specId}, ${Math.round(price)})
      ON CONFLICT (customer_id, spec_id) DO UPDATE SET price = EXCLUDED.price
    `;
    upserted++;
  }

  return NextResponse.json({
    ok: true,
    upserted,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
  });
}
