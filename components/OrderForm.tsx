"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ALL_SPECS,
  CATEGORY_META,
  COLORS,
  formatJpy,
  type ColorId,
  type ProductCategory,
  type ProductSpec,
} from "@/lib/product-master";
import {
  TAX_RATE,
  validateOrderRequest,
  type OrderLine,
  type OrderRequest,
} from "@/lib/order";

// ───────────────────────────────────────────────
// 型
// ───────────────────────────────────────────────

type CustomerFormData = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  zipCode: string;
  shippingAddress: string;
  desiredDelivery: string;
  notes: string;
};

/** DB から取得した特別価格マップ (specId → price) */
type PriceMap = Record<string, number>;

type LoggedInCustomer = {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
};

type QuantityMap = Record<string, number>; // "specId__colorId" → qty

const CATEGORIES_ALL: ProductCategory[] = ["standard", "number", "diagonal"];
const CATEGORIES_GUEST: ProductCategory[] = ["standard", "number"];

// ───────────────────────────────────────────────
// ヘルパー
// ───────────────────────────────────────────────

function key(specId: string, colorId: ColorId): string {
  return `${specId}__${colorId}`;
}

function renderSwatch(colorId: ColorId) {
  const color = COLORS[colorId];
  if (Array.isArray(color.hex)) {
    return (
      <div
        className="w-4 h-4 rounded-sm border border-gray-200 flex-shrink-0"
        style={{
          background: `linear-gradient(45deg, ${color.hex[0]} 50%, ${color.hex[1]} 50%)`,
        }}
        aria-label={color.name}
      />
    );
  }
  return (
    <div
      className="w-4 h-4 rounded-sm border border-gray-200 flex-shrink-0"
      style={{ backgroundColor: color.hex }}
      aria-label={color.name}
    />
  );
}

// ───────────────────────────────────────────────
// メインコンポーネント
// ───────────────────────────────────────────────

/**
 * specId と priceMap から適用単価を返す（クライアント側）
 *
 * - priceMap === null: 未ログイン → listPrice（定価）
 * - priceMap に登録あり: その特別価格
 * - priceMap に登録なし: wholesalePrice（実績あり = 常連客価格）
 */
function resolvePrice(spec: ProductSpec, priceMap: PriceMap | null): number {
  if (priceMap === null) return spec.listPrice;
  if (priceMap[spec.id] !== undefined) return priceMap[spec.id];
  return spec.wholesalePrice;
}

export default function OrderForm() {
  const router = useRouter();

  const [customerForm, setCustomerForm] = useState<CustomerFormData>({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    zipCode: "",
    shippingAddress: "",
    desiredDelivery: "",
    notes: "",
  });

  // ログイン状態 & DB 特別価格
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggedInCustomer, setLoggedInCustomer] = useState<LoggedInCustomer | null>(null);
  const [priceMap, setPriceMap] = useState<PriceMap | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [freeShipEligible, setFreeShipEligible] = useState(false);

  // セッション読み込み
  useEffect(() => {
    fetch("/api/order/my-prices")
      .then((r) => r.json())
      .then((data) => {
        if (data.loggedIn && data.customer) {
          setLoggedIn(true);
          setLoggedInCustomer(data.customer);
          setPriceMap(data.prices);
          setFreeShipEligible(data.firstOrderFreeShippingEligible === true);
          // 顧客情報を自動入力
          setCustomerForm((prev) => ({
            ...prev,
            companyName: data.customer.name || prev.companyName,
            contactName: data.customer.contactName || prev.contactName,
            email: data.customer.email || prev.email,
          }));
        }
      })
      .finally(() => setSessionLoaded(true));
  }, []);

  // 未ログイン訪問者の会社名 → 特別価格 ルックアップ（SMILE 実績と名寄せ）
  // ログイン中は session の priceMap が優先なので実行不要
  const [guestMatchedName, setGuestMatchedName] = useState<string | null>(null);
  useEffect(() => {
    if (loggedIn) return;
    const name = customerForm.companyName.trim();
    if (!name) {
      setPriceMap(null);
      setGuestMatchedName(null);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/order/lookup-prices?name=${encodeURIComponent(name)}`)
        .then((r) => r.json())
        .then((data: { matched: boolean; customerName?: string; prices: PriceMap }) => {
          if (data.matched) {
            setPriceMap(data.prices);
            setGuestMatchedName(data.customerName || name);
          } else {
            setPriceMap(null);
            setGuestMatchedName(null);
          }
        })
        .catch(() => {});
    }, 400); // デバウンス
    return () => clearTimeout(timer);
  }, [customerForm.companyName, loggedIn]);

  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [activeCategory, setActiveCategory] =
    useState<ProductCategory>("standard");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const hasSpecialPrices = priceMap !== null && Object.keys(priceMap).length > 0;

  // 斜線入りテープはログイン確定済みの時だけ表示（BtoB特別ライン）
  // 未ログインまたは読込中はゲスト扱いで隠す → SSR初期レンダでも漏れない
  const visibleCategories = useMemo<ProductCategory[]>(
    () => (sessionLoaded && loggedIn ? CATEGORIES_ALL : CATEGORIES_GUEST),
    [sessionLoaded, loggedIn]
  );

  // 選択中カテゴリが非表示になったら standard へ戻す
  useEffect(() => {
    if (!visibleCategories.includes(activeCategory)) {
      setActiveCategory("standard");
    }
  }, [visibleCategories, activeCategory]);

  // 見積計算（クライアント側でライブ表示、サーバーでも再計算）
  const lines: OrderLine[] = useMemo(() => {
    const result: OrderLine[] = [];
    for (const [k, qty] of Object.entries(quantities)) {
      if (!qty || qty <= 0) continue;
      const [specId, colorId] = k.split("__") as [string, ColorId];
      result.push({ specId, colorId, quantity: qty });
    }
    return result;
  }, [quantities]);

  const quoteDraft = useMemo(() => {
    let subtotal = 0;
    const detail = lines.map((line) => {
      const spec = ALL_SPECS.find((s) => s.id === line.specId);
      if (!spec) return null;
      const unit = resolvePrice(spec, priceMap);
      const sub = unit * line.quantity;
      subtotal += sub;
      return {
        spec,
        colorId: line.colorId,
        quantity: line.quantity,
        unit,
        subtotal: sub,
      };
    });
    const tax = Math.floor(subtotal * TAX_RATE);
    return {
      lines: detail.filter((d): d is NonNullable<typeof d> => d !== null),
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [lines, priceMap]);

  // 数量更新
  const updateQty = (specId: string, colorId: ColorId, value: string) => {
    const qty = parseInt(value, 10);
    setQuantities((prev) => {
      const next = { ...prev };
      if (!qty || qty <= 0) {
        delete next[key(specId, colorId)];
      } else {
        next[key(specId, colorId)] = qty;
      }
      return next;
    });
  };

  const clearAll = () => {
    if (confirm("入力した数量をすべてクリアしますか？")) {
      setQuantities({});
    }
  };

  // 送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const req: Partial<OrderRequest> = {
      companyName: customerForm.companyName.trim(),
      contactName: customerForm.contactName.trim(),
      email: customerForm.email.trim(),
      phone: customerForm.phone.trim() || undefined,
      zipCode: customerForm.zipCode.trim() || undefined,
      shippingAddress: customerForm.shippingAddress.trim() || undefined,
      desiredDelivery: customerForm.desiredDelivery.trim() || undefined,
      notes: customerForm.notes.trim() || undefined,
      lines,
    };

    const validation = validateOrderRequest(req);
    if (!validation.ok) {
      setErrors(validation.errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrors(
          data.errors || [
            data.error || "送信に失敗しました。時間をおいて再度お試しください。",
          ]
        );
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(`/order/success?id=${encodeURIComponent(data.id)}`);
    } catch (err) {
      console.error(err);
      setErrors(["通信エラーが発生しました。時間をおいて再度お試しください。"]);
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const lineCount = lines.length;
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-6 py-10">
      {/* ヘッダー */}
      <div className="mb-10 text-center">
        <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-3">
          Order Form
        </p>
        <h1 className="text-3xl font-light tracking-wide text-[#1C3557] mb-3">
          発注フォーム
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          識別テープのご注文はこちらから。ご入力後、自動で見積金額を算出し、
          <br />
          担当よりご連絡いたします（決済はございません）。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 border border-red-300 bg-red-50 px-5 py-4 rounded-sm">
          <p className="text-sm font-semibold text-red-700 mb-2">
            入力に問題があります
          </p>
          <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ログイン状態バナー */}
      {sessionLoaded && !loggedIn && (
        <div className="mb-6 border border-blue-200 bg-blue-50 px-5 py-3 rounded-sm flex items-center justify-between">
          <p className="text-sm text-blue-700">
            取引先アカウントをお持ちの方はログインすると特別価格が適用されます
          </p>
          <a
            href="/login"
            className="px-4 py-1.5 bg-[#1C3557] text-white text-xs rounded hover:bg-[#152a45] transition-colors"
          >
            ログイン
          </a>
        </div>
      )}

      {loggedIn && loggedInCustomer && (
        <div className="mb-6 border border-green-200 bg-green-50 px-5 py-3 rounded-sm flex items-center justify-between">
          <p className="text-sm text-green-700">
            <span className="font-bold">{loggedInCustomer.name}</span>{" "}
            としてログイン中
            {hasSpecialPrices && " — 特別価格が適用されています"}
          </p>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.reload();
            }}
            className="text-xs text-green-600 hover:underline"
          >
            ログアウト
          </button>
        </div>
      )}

      {/* お客様情報 */}
      <section className="mb-10 border border-gray-200 bg-white p-6">
        <h2 className="text-sm tracking-widest uppercase text-gray-500 mb-5 border-l-4 border-[#E07B2A] pl-3">
          お客様情報
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#1C3557] mb-1">
              会社名・団体名 <span className="text-[#E07B2A]">*</span>
            </label>
            <input
              type="text"
              required
              value={customerForm.companyName}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, companyName: e.target.value })
              }
              readOnly={loggedIn && !!loggedInCustomer}
              placeholder="例: ○○県森林組合連合会"
              className={`w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#1C3557] ${loggedIn && loggedInCustomer ? "bg-gray-50 text-gray-600" : ""}`}
            />
            {hasSpecialPrices && (
              <p className="mt-2 text-xs text-[#E07B2A] font-semibold">
                ✓ 特別価格が自動適用されています
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C3557] mb-1">
              ご担当者名 <span className="text-[#E07B2A]">*</span>
            </label>
            <input
              type="text"
              required
              value={customerForm.contactName}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, contactName: e.target.value })
              }
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#1C3557]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C3557] mb-1">
              電話番号
            </label>
            <input
              type="tel"
              value={customerForm.phone}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, phone: e.target.value })
              }
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#1C3557]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#1C3557] mb-1">
              メールアドレス <span className="text-[#E07B2A]">*</span>
            </label>
            <input
              type="email"
              required
              value={customerForm.email}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, email: e.target.value })
              }
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#1C3557]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C3557] mb-1">
              郵便番号
            </label>
            <input
              type="text"
              value={customerForm.zipCode}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, zipCode: e.target.value })
              }
              placeholder="例: 000-0000"
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#1C3557]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C3557] mb-1">
              希望納期
            </label>
            <input
              type="text"
              value={customerForm.desiredDelivery}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, desiredDelivery: e.target.value })
              }
              placeholder="例: 2週間以内 / 4月末まで"
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#1C3557]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#1C3557] mb-1">
              納品先住所
            </label>
            <input
              type="text"
              value={customerForm.shippingAddress}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, shippingAddress: e.target.value })
              }
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#1C3557]"
            />
          </div>
        </div>
      </section>

      {/* 商品グリッド */}
      <section className="mb-10 border border-gray-200 bg-white p-6">
        <h2 className="text-sm tracking-widest uppercase text-gray-500 mb-5 border-l-4 border-[#E07B2A] pl-3">
          商品選択・数量入力
        </h2>

        {/* カテゴリータブ */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
          {visibleCategories.map((cat) => {
            const count = ALL_SPECS.filter((s) => s.category === cat).length;
            const active = activeCategory === cat;
            return (
              <button
                type="button"
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-[#E07B2A] text-[#1C3557]"
                    : "border-transparent text-gray-400 hover:text-[#1C3557]"
                }`}
              >
                {CATEGORY_META[cat].label}
                <span className="ml-2 text-xs text-gray-400">({count})</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          {CATEGORY_META[activeCategory].description}
        </p>

        {/* スペック × 色 グリッド */}
        <div className="overflow-x-auto">
          <SpecGrid
            specs={ALL_SPECS.filter((s) => s.category === activeCategory)}
            quantities={quantities}
            priceMap={priceMap}
            onChange={updateQty}
          />
        </div>

        <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
          <div>
            入力済: <span className="font-bold text-[#1C3557]">{lineCount}</span>{" "}
            品目 / 合計{" "}
            <span className="font-bold text-[#1C3557]">{totalQty}</span> 本
          </div>
          {lineCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-gray-400 hover:text-[#E07B2A] underline"
            >
              すべてクリア
            </button>
          )}
        </div>
      </section>

      {/* 備考 */}
      <section className="mb-10 border border-gray-200 bg-white p-6">
        <h2 className="text-sm tracking-widest uppercase text-gray-500 mb-5 border-l-4 border-[#E07B2A] pl-3">
          備考・ご要望
        </h2>
        <textarea
          rows={4}
          value={customerForm.notes}
          onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
          placeholder="ご注文に関するご要望・ご質問をお書きください"
          className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#1C3557] resize-none"
        />
      </section>

      {/* 見積サマリー + 送信ボタン */}
      <section className="sticky bottom-0 z-30 border border-gray-200 bg-white shadow-lg">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="text-xs tracking-widest uppercase text-gray-500 mb-1">
                見積金額（概算）
                {hasSpecialPrices && (
                  <span className="ml-2 text-[#E07B2A]">
                    ✓ 特別価格適用
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-4">
                <div>
                  <div className="text-xs text-gray-400">小計（税抜）</div>
                  <div className="text-lg font-bold text-[#1C3557]">
                    {formatJpy(quoteDraft.subtotal)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">消費税</div>
                  <div className="text-lg font-bold text-[#1C3557]">
                    {formatJpy(quoteDraft.tax)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#E07B2A]">合計（税込）</div>
                  <div className="text-2xl font-bold text-[#E07B2A]">
                    {formatJpy(quoteDraft.total)}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || lineCount === 0}
              className="px-10 py-4 bg-[#E07B2A] text-white text-sm tracking-widest uppercase hover:bg-[#c96e22] transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "送信中..." : "発注を送信する →"}
            </button>
          </div>
          {lineCount === 0 && (
            <p className="mt-3 text-xs text-gray-400">
              ※ 商品を1点以上選択してください
            </p>
          )}
          {(() => {
            const FREE_SHIP = 30000;
            if (quoteDraft.subtotal === 0) {
              return (
                <p className="mt-3 text-xs text-gray-400">
                  ※ 税抜 30,000円以上のご注文で送料無料
                  {freeShipEligible && "（初回ご登録のお客様は金額に関わらず送料無料）"}
                </p>
              );
            }
            if (quoteDraft.subtotal >= FREE_SHIP) {
              return (
                <p className="mt-3 text-xs font-medium text-[#2A7D4F]">
                  ✓ 送料無料（税抜 30,000円以上）
                </p>
              );
            }
            if (freeShipEligible) {
              return (
                <p className="mt-3 text-xs font-medium text-[#2A7D4F]">
                  ✓ 初回限定 送料無料（金額に関わらず適用）
                </p>
              );
            }
            return (
              <p className="mt-3 text-xs text-[#E07B2A]">
                あと <strong>{formatJpy(FREE_SHIP - quoteDraft.subtotal)}</strong>（税抜）で送料無料になります
              </p>
            );
          })()}
        </div>
      </section>

      {/* 注意書き */}
      <p className="mt-8 text-xs text-gray-400 text-center leading-relaxed">
        ご注文送信後、担当より見積書（PDF）をメールでお送りいたします。
        <br />
        内容ご確認のうえ、返信にてご承認ください。
      </p>
    </form>
  );
}

// ───────────────────────────────────────────────
// SpecGrid — 1カテゴリ分のspec × color グリッド
// ───────────────────────────────────────────────

type SpecGridProps = {
  specs: ProductSpec[];
  quantities: QuantityMap;
  priceMap: PriceMap | null;
  onChange: (specId: string, colorId: ColorId, value: string) => void;
};

function SpecGrid({
  specs,
  quantities,
  priceMap,
  onChange,
}: SpecGridProps) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-200 text-xs text-gray-500">
          <th className="text-left py-3 pr-4 font-medium min-w-[200px]">
            商品
          </th>
          <th className="text-right py-3 px-3 font-medium whitespace-nowrap">
            単価
          </th>
          <th className="text-left py-3 pl-4 font-medium">色 × 数量</th>
        </tr>
      </thead>
      <tbody>
        {specs.map((spec) => {
          const unitPrice = resolvePrice(spec, priceMap);
          const isSpecial =
            priceMap !== null && priceMap[spec.id] !== undefined && unitPrice !== spec.wholesalePrice;
          return (
            <tr
              key={spec.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-4 pr-4 align-top">
                <div className="font-medium text-[#1C3557] text-sm">
                  {spec.name}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  厚 {spec.thickness}mm / 幅 {spec.width}mm / 長 {spec.length}m
                </div>
              </td>
              <td className="py-4 px-3 align-top text-right whitespace-nowrap">
                {isSpecial && (
                  <div className="text-[10px] text-gray-400 line-through">
                    {formatJpy(spec.wholesalePrice)}
                  </div>
                )}
                <div
                  className={`text-sm font-bold ${
                    isSpecial ? "text-[#E07B2A]" : "text-[#1C3557]"
                  }`}
                >
                  {formatJpy(unitPrice)}
                </div>
                <div className="text-[10px] text-gray-400">/本</div>
              </td>
              <td className="py-4 pl-4 align-top">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {spec.availableColors.map((colorId) => {
                    const v = quantities[key(spec.id, colorId)] || "";
                    const color = COLORS[colorId];
                    return (
                      <label
                        key={colorId}
                        className="flex items-center gap-2 text-xs"
                      >
                        {renderSwatch(colorId)}
                        <span className="text-gray-500 w-12 flex-shrink-0">
                          {color.name}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={v}
                          placeholder="0"
                          onChange={(e) =>
                            onChange(spec.id, colorId, e.target.value)
                          }
                          className="w-16 border border-gray-200 px-2 py-1 text-right text-sm focus:outline-none focus:border-[#E07B2A]"
                        />
                      </label>
                    );
                  })}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
