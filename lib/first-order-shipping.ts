/**
 * 初回EC発注送料無料の権利判定・適用ロジック
 *
 * 仕様:
 *  - 会社ポリシーで 30,000円（税抜）以上は常に送料無料
 *  - 小口（30,000円未満）でも新規EC会員の初回発注時は送料無料
 *  - 既存顧客（baseline バッチで eligible=false）は対象外
 *  - 権利消費は subtotal<30000 の時のみ（既に無料の発注で権利を使わない）
 */

export const FREE_SHIPPING_THRESHOLD = 30000;

export type ApplyFirstOrderShippingInput = {
  /** ログイン顧客ID。未ログイン時は null */
  customerId: number | null;
  /** customers.first_order_free_shipping_eligible の値 */
  firstOrderFreeShippingEligible: boolean;
  /** 税抜小計 */
  subtotal: number;
};

export type ApplyFirstOrderShippingResult = {
  /** orders.shipping_fee_waived に書き込む値 */
  shippingFeeWaived: boolean;
  /** true なら customers.first_order_free_shipping_eligible を false に更新する */
  consumesEligibility: boolean;
};

export function applyFirstOrderShipping(
  input: ApplyFirstOrderShippingInput
): ApplyFirstOrderShippingResult {
  if (input.customerId === null) {
    return { shippingFeeWaived: false, consumesEligibility: false };
  }
  if (!input.firstOrderFreeShippingEligible) {
    return { shippingFeeWaived: false, consumesEligibility: false };
  }
  if (input.subtotal >= FREE_SHIPPING_THRESHOLD) {
    return { shippingFeeWaived: false, consumesEligibility: false };
  }
  return { shippingFeeWaived: true, consumesEligibility: true };
}
