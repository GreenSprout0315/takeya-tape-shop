import { test } from "node:test";
import { strict as assert } from "node:assert";
import { applyFirstOrderShipping } from "../lib/first-order-shipping";

test("対象顧客で初回発注・小口: 送料無料を適用する", () => {
  const result = applyFirstOrderShipping({
    customerId: 10,
    firstOrderFreeShippingEligible: true,
    subtotal: 15000,
  });
  assert.equal(result.shippingFeeWaived, true);
  assert.equal(result.consumesEligibility, true);
});

test("対象顧客で初回発注・30k以上: 既に送料無料のため権利消費しない", () => {
  const result = applyFirstOrderShipping({
    customerId: 10,
    firstOrderFreeShippingEligible: true,
    subtotal: 35000,
  });
  assert.equal(result.shippingFeeWaived, false);
  assert.equal(result.consumesEligibility, false);
});

test("非対象顧客（権利なし）: 送料無料ラベルを付けない", () => {
  const result = applyFirstOrderShipping({
    customerId: 10,
    firstOrderFreeShippingEligible: false,
    subtotal: 10000,
  });
  assert.equal(result.shippingFeeWaived, false);
  assert.equal(result.consumesEligibility, false);
});

test("未ログイン（customerId なし）: 送料無料ラベルを付けない", () => {
  const result = applyFirstOrderShipping({
    customerId: null,
    firstOrderFreeShippingEligible: false,
    subtotal: 10000,
  });
  assert.equal(result.shippingFeeWaived, false);
  assert.equal(result.consumesEligibility, false);
});

test("境界値: subtotal=29999 は小口扱い", () => {
  const result = applyFirstOrderShipping({
    customerId: 10,
    firstOrderFreeShippingEligible: true,
    subtotal: 29999,
  });
  assert.equal(result.shippingFeeWaived, true);
  assert.equal(result.consumesEligibility, true);
});

test("境界値: subtotal=30000 は既に無料扱い", () => {
  const result = applyFirstOrderShipping({
    customerId: 10,
    firstOrderFreeShippingEligible: true,
    subtotal: 30000,
  });
  assert.equal(result.shippingFeeWaived, false);
  assert.equal(result.consumesEligibility, false);
});
