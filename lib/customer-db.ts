/**
 * Customer DB — DB ベースの顧客価格取得
 *
 * customer-master.ts のハードコード版に代わり、Neon Postgres から
 * 顧客データと特別価格を取得する。
 */

import { getDb } from "./db";
import type { ProductSpec } from "./product-master";

export type CustomerPriceMap = Record<string, number>; // specId → price

/**
 * 顧客IDから特別価格マップを取得
 * 登録されていない商品は含まれない（呼び出し側で定価を適用する想定）
 */
export async function getCustomerPriceMap(
  customerId: number
): Promise<CustomerPriceMap> {
  const sql = getDb();
  const rows = await sql`
    SELECT spec_id, price FROM customer_prices
    WHERE customer_id = ${customerId}
  `;
  const map: CustomerPriceMap = {};
  for (const row of rows) {
    map[row.spec_id] = row.price;
  }
  return map;
}

/**
 * 商品スペックと価格マップから適用単価を取得
 *
 * - priceMap === null: 未ログイン → listPrice（定価）
 * - priceMap に登録あり: その特別価格
 * - priceMap に登録なし: wholesalePrice（実績あり金額 = 常連客価格）
 */
export function getResolvedPrice(
  spec: ProductSpec,
  priceMap: CustomerPriceMap | null
): number {
  if (priceMap === null) return spec.listPrice;
  if (priceMap[spec.id] !== undefined) return priceMap[spec.id];
  return spec.wholesalePrice;
}
