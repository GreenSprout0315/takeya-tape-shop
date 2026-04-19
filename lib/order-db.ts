/**
 * Order DB — 受注の永続化
 *
 * /api/order で発注受信時に orders / order_lines に insert し、
 * /admin/orders で一覧・詳細・ステータス更新する。
 */

import { getDb } from "./db";
import {
  QUOTE_VALID_DAYS,
  TAX_RATE,
  type OrderRequest,
  type Quote,
  type QuoteStatus,
} from "./order";
import type { ColorId } from "./product-master";

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
  shipping_fee_waived: boolean;
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
  customerId: number | null,
  opts: { shippingFeeWaived: boolean } = { shippingFeeWaived: false }
): Promise<void> {
  const sql = getDb();

  await sql`
    INSERT INTO orders (
      id, quote_number, received_at, company_name, contact_name, email,
      phone, zip_code, shipping_address, desired_delivery, notes,
      customer_id, price_tier, subtotal, tax, total, status, shipping_fee_waived
    ) VALUES (
      ${req.id}, ${quote.quoteNumber ?? null}, ${req.receivedAt},
      ${req.companyName}, ${req.contactName}, ${req.email},
      ${req.phone ?? null}, ${req.zipCode ?? null},
      ${req.shippingAddress ?? null}, ${req.desiredDelivery ?? null},
      ${req.notes ?? null}, ${customerId},
      ${quote.priceTier}, ${quote.subtotal}, ${quote.tax}, ${quote.total},
      'issued', ${opts.shippingFeeWaived}
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

/** DB の受注レコードを OrderRequest 形式へ復元（PDF再生成などに使用） */
export function toOrderRequest(row: OrderWithLines): OrderRequest {
  return {
    id: row.id,
    receivedAt: row.received_at,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone ?? undefined,
    zipCode: row.zip_code ?? undefined,
    shippingAddress: row.shipping_address ?? undefined,
    desiredDelivery: row.desired_delivery ?? undefined,
    notes: row.notes ?? undefined,
    lines: row.lines.map((l) => ({
      specId: l.spec_id,
      colorId: l.color_id as ColorId,
      quantity: l.quantity,
    })),
  };
}

/** DB の受注レコードを Quote 形式へ復元（PDF再生成などに使用） */
export function toQuote(row: OrderWithLines): Quote {
  const issuedAt = row.received_at;
  const validUntilDate = new Date(issuedAt);
  validUntilDate.setDate(validUntilDate.getDate() + QUOTE_VALID_DAYS);
  return {
    id: row.id,
    quoteNumber: row.quote_number ?? undefined,
    issuedAt,
    validUntil: validUntilDate.toISOString(),
    companyName: row.company_name,
    contactName: row.contact_name,
    priceTier: row.price_tier,
    lines: row.lines.map((l) => ({
      specId: l.spec_id,
      colorId: l.color_id as ColorId,
      productName: l.product_name,
      colorName: l.color_name,
      unitPrice: l.unit_price,
      quantity: l.quantity,
      subtotal: l.subtotal,
    })),
    subtotal: row.subtotal,
    taxRate: TAX_RATE,
    tax: row.tax,
    total: row.total,
    status: row.status,
    shippingFeeWaived: row.shipping_fee_waived,
    notes: row.notes ?? undefined,
  };
}
