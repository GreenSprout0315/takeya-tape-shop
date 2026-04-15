/**
 * Order DB — 受注の永続化
 *
 * /api/order で発注受信時に orders / order_lines に insert し、
 * /admin/orders で一覧・詳細・ステータス更新する。
 */

import { getDb } from "./db";
import type { OrderRequest, Quote, QuoteStatus } from "./order";

export type OrderRow = {
  id: string;
  quote_number: number | null;
  received_at: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  zip_code: string | null;
  shipping_address: string | null;
  desired_delivery: string | null;
  notes: string | null;
  customer_id: number | null;
  price_tier: "standard" | "special";
  subtotal: number;
  tax: number;
  total: number;
  status: QuoteStatus;
  status_updated_at: string;
  created_at: string;
};

export type OrderLineRow = {
  id: number;
  order_id: string;
  spec_id: string;
  color_id: string;
  product_name: string;
  color_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
};

export type OrderWithLines = OrderRow & { lines: OrderLineRow[] };

/** 新規受注を永続化（orders + order_lines を同一トランザクションで挿入） */
export async function persistOrder(
  req: OrderRequest,
  quote: Quote,
  customerId: number | null
): Promise<void> {
  const sql = getDb();

  await sql`
    INSERT INTO orders (
      id, quote_number, received_at, company_name, contact_name, email,
      phone, zip_code, shipping_address, desired_delivery, notes,
      customer_id, price_tier, subtotal, tax, total, status
    ) VALUES (
      ${req.id}, ${quote.quoteNumber ?? null}, ${req.receivedAt},
      ${req.companyName}, ${req.contactName}, ${req.email},
      ${req.phone ?? null}, ${req.zipCode ?? null},
      ${req.shippingAddress ?? null}, ${req.desiredDelivery ?? null},
      ${req.notes ?? null}, ${customerId},
      ${quote.priceTier}, ${quote.subtotal}, ${quote.tax}, ${quote.total},
      'issued'
    )
  `;

  for (const line of quote.lines) {
    await sql`
      INSERT INTO order_lines (
        order_id, spec_id, color_id, product_name, color_name,
        unit_price, quantity, subtotal
      ) VALUES (
        ${req.id}, ${line.specId}, ${line.colorId},
        ${line.productName}, ${line.colorName},
        ${line.unitPrice}, ${line.quantity}, ${line.subtotal}
      )
    `;
  }
}

/** 受注一覧（新着順、最大 limit 件） */
export async function listOrders(opts?: {
  status?: QuoteStatus;
  limit?: number;
}): Promise<OrderRow[]> {
  const sql = getDb();
  const limit = opts?.limit ?? 100;
  if (opts?.status) {
    const rows = await sql`
      SELECT * FROM orders
      WHERE status = ${opts.status}
      ORDER BY received_at DESC
      LIMIT ${limit}
    `;
    return rows as OrderRow[];
  }
  const rows = await sql`
    SELECT * FROM orders
    ORDER BY received_at DESC
    LIMIT ${limit}
  `;
  return rows as OrderRow[];
}

/** ステータス別の件数集計（ダッシュボード用） */
export async function getOrderStatusCounts(): Promise<Record<string, number>> {
  const sql = getDb();
  const rows = await sql`
    SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status
  `;
  const map: Record<string, number> = {};
  for (const row of rows as Array<{ status: string; count: number }>) {
    map[row.status] = row.count;
  }
  return map;
}

/** ID で受注を1件取得（明細込み） */
export async function getOrderById(id: string): Promise<OrderWithLines | null> {
  const sql = getDb();
  const [order] = await sql`SELECT * FROM orders WHERE id = ${id}`;
  if (!order) return null;
  const lines = await sql`
    SELECT * FROM order_lines WHERE order_id = ${id} ORDER BY id
  `;
  return { ...(order as OrderRow), lines: lines as OrderLineRow[] };
}

/** ステータスを更新 */
export async function updateOrderStatus(
  id: string,
  status: QuoteStatus
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE orders
    SET status = ${status}, status_updated_at = NOW()
    WHERE id = ${id}
  `;
}
