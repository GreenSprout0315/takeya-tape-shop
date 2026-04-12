import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCustomerPriceMap } from "@/lib/customer-db";
import { getDb } from "@/lib/db";

/**
 * GET /api/order/my-prices
 * ログイン中の顧客の特別価格マップを返す。
 * 未ログイン or admin → 空（定価適用）
 */
export async function GET() {
  const session = await getSession();

  if (!session || !session.customerId) {
    return NextResponse.json({ loggedIn: false, prices: {}, customer: null });
  }

  const sql = getDb();
  const rows = await sql`
    SELECT id, name, contact_name, email FROM customers
    WHERE id = ${session.customerId}
  `;
  if (rows.length === 0) {
    return NextResponse.json({ loggedIn: true, prices: {}, customer: null });
  }

  const customer = rows[0];
  const prices = await getCustomerPriceMap(session.customerId);

  return NextResponse.json({
    loggedIn: true,
    prices,
    customer: {
      id: customer.id,
      name: customer.name,
      contactName: customer.contact_name,
      email: customer.email,
    },
  });
}
