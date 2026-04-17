import { NextRequest, NextResponse } from "next/server";
import { getCustomerPriceMap } from "@/lib/customer-db";
import { getDb } from "@/lib/db";

/**
 * GET /api/order/lookup-prices?name={companyName}
 *
 * 未ログイン訪問者が発注フォームで会社名を入力した時に呼ぶ。
 * customers.name 完全一致で一致する取引先があれば、特別価格マップを返す。
 *
 * セキュリティ: 返すのは価格情報のみ。顧客の個人情報(email,phone等)は含めない。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("name") || "").trim();
  if (!name) {
    return NextResponse.json({ matched: false, prices: {} });
  }

  const sql = getDb();
  const rows = await sql`
    SELECT id, name FROM customers WHERE name = ${name} LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ matched: false, prices: {} });
  }

  const customerId = rows[0].id as number;
  const prices = await getCustomerPriceMap(customerId);
  return NextResponse.json({
    matched: true,
    customerName: rows[0].name,
    prices,
  });
}
