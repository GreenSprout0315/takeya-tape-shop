/**
 * Order / Quote — 発注・見積データ型
 *
 * Phase B の発注フォーム `/order` と見積書自動生成ロジックが参照する中核型。
 * データベース導入前の段階では JSON で保存・送信することを想定している。
 */

import {
  ALL_SPECS,
  CATEGORY_META,
  COLORS,
  formatJpy,
  getSpecById,
  type ColorId,
  type ProductSpec,
} from "./product-master";
import type { CustomerPriceMap } from "./customer-db";

// ──────────────────────────────────────────────────────────────
//  型定義
// ──────────────────────────────────────────────────────────────

/** 発注明細行（1 spec + 1 color = 1行） */
export type OrderLine = {
  /** 商品スペック ID */
  specId: string;
  /** 色 ID */
  colorId: ColorId;
  /** 数量（本） */
  quantity: number;
};

/** 発注リクエスト（お客様がフォームから送信するデータ） */
export type OrderRequest = {
  /** 発注ID（サーバー側で採番） */
  id: string;
  /** 受信タイムスタンプ (ISO8601) */
  receivedAt: string;
  /** 会社名 */
  companyName: string;
  /** 担当者名 */
  contactName: string;
  /** メールアドレス */
  email: string;
  /** 電話番号（任意） */
  phone?: string;
  /** 郵便番号（任意） */
  zipCode?: string;
  /** 納品先住所（任意） */
  shippingAddress?: string;
  /** 希望納期（任意、自由記述） */
  desiredDelivery?: string;
  /** 発注明細 */
  lines: OrderLine[];
  /** 備考・メッセージ（任意） */
  notes?: string;
};

/** 見積明細行（金額計算済み） */
export type QuoteLine = {
  specId: string;
  colorId: ColorId;
  productName: string;
  colorName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

/** 見積書（サーバー側で OrderRequest から生成） */
export type Quote = {
  /** 見積ID（通常は OrderRequest.id と同じ） */
  id: string;
  /** 連番の見積番号 (例: 24200) — サーバで採番 */
  quoteNumber?: number;
  /** 生成日時 (ISO8601) */
  issuedAt: string;
  /** 有効期限 (ISO8601) */
  validUntil: string;
  /** 会社名 */
  companyName: string;
  /** 担当者名 */
  contactName: string;
  /** 顧客が特価顧客の場合に設定 */
  customerId?: string;
  /** 顧客区分 */
  priceTier: "standard" | "special";
  /** 見積明細 */
  lines: QuoteLine[];
  /** 小計（税抜） */
  subtotal: number;
  /** 消費税率 */
  taxRate: number;
  /** 消費税額 */
  tax: number;
  /** 合計金額（税込） */
  total: number;
  /** ステータス */
  status: QuoteStatus;
  /** 備考 */
  notes?: string;
};

export type QuoteStatus =
  | "draft" // 下書き（ユーザー送信前）
  | "issued" // 発行済み・送付済み
  | "approved" // 顧客承認済み
  | "shipping" // 出荷準備中
  | "shipped" // 発送済み
  | "invoiced" // 請求済み
  | "paid" // 入金済み
  | "cancelled"; // 取消

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "下書き",
  issued: "見積送付済み",
  approved: "承認済み",
  shipping: "出荷準備中",
  shipped: "発送済み",
  invoiced: "請求済み",
  paid: "入金済み",
  cancelled: "取消",
};

/** 通常の発注ライフサイクル（draft/cancelled は含まない） */
export const STATUS_FLOW: QuoteStatus[] = [
  "issued",
  "approved",
  "shipping",
  "shipped",
  "invoiced",
  "paid",
];

/** 現在ステータスから次に進めるステータスを返す。終端なら null */
export function getNextStatus(current: QuoteStatus): QuoteStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

/** 「次へ進める」ボタンに表示するアクション文言 */
export const STATUS_ACTION_LABELS: Partial<Record<QuoteStatus, string>> = {
  issued: "承認する",
  approved: "出荷準備へ",
  shipping: "発送済みにする",
  shipped: "請求済みにする",
  invoiced: "入金済みにする",
};

// ──────────────────────────────────────────────────────────────
//  税率・有効期限などの定数
// ──────────────────────────────────────────────────────────────

export const TAX_RATE = 0.1;

/** 見積もり有効期限: 発行から 30 日 */
export const QUOTE_VALID_DAYS = 30;

// ──────────────────────────────────────────────────────────────
//  バリデーション
// ──────────────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validateOrderRequest(
  req: Partial<OrderRequest>
): ValidationResult {
  const errors: string[] = [];
  if (!req.companyName?.trim()) errors.push("会社名は必須です");
  if (!req.contactName?.trim()) errors.push("担当者名は必須です");
  if (!req.email?.trim()) {
    errors.push("メールアドレスは必須です");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) {
    errors.push("メールアドレスの形式が正しくありません");
  }
  if (!req.lines || req.lines.length === 0) {
    errors.push("発注明細を 1 件以上入力してください");
  } else {
    for (const [i, line] of req.lines.entries()) {
      const spec = getSpecById(line.specId);
      if (!spec) {
        errors.push(`行 ${i + 1}: 商品が見つかりません (${line.specId})`);
        continue;
      }
      if (!spec.availableColors.includes(line.colorId)) {
        errors.push(
          `行 ${i + 1}: ${spec.name} に「${COLORS[line.colorId]?.name ?? line.colorId}」色は存在しません`
        );
      }
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        errors.push(`行 ${i + 1}: 数量は 1 以上の数値を入力してください`);
      }
    }
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

// ──────────────────────────────────────────────────────────────
//  見積書生成（見積金額計算）
// ──────────────────────────────────────────────────────────────

/**
 * OrderRequest から Quote を生成
 * - 顧客マスター照合で特別価格を自動適用
 * - 明細ごとに金額計算 → 合計 → 消費税 → 税込合計
 */
export function buildQuote(
  req: OrderRequest,
  opts?: { dbPriceMap?: CustomerPriceMap | null }
): Quote {
  const priceMap = opts?.dbPriceMap ?? null;
  const hasSpecialPrices = priceMap !== null && Object.keys(priceMap).length > 0;

  const lines: QuoteLine[] = req.lines.map((line) => {
    const spec = getSpecById(line.specId);
    if (!spec) {
      throw new Error(`spec not found: ${line.specId}`);
    }
    const unitPrice =
      priceMap && priceMap[spec.id] !== undefined
        ? priceMap[spec.id]
        : spec.wholesalePrice;
    const color = COLORS[line.colorId];
    return {
      specId: spec.id,
      colorId: line.colorId,
      productName: spec.name,
      colorName: color?.name ?? line.colorId,
      unitPrice,
      quantity: line.quantity,
      subtotal: unitPrice * line.quantity,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0);
  const tax = Math.floor(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const issuedAt = new Date();
  const validUntil = new Date(issuedAt);
  validUntil.setDate(validUntil.getDate() + QUOTE_VALID_DAYS);

  return {
    id: req.id,
    issuedAt: issuedAt.toISOString(),
    validUntil: validUntil.toISOString(),
    companyName: req.companyName,
    contactName: req.contactName,
    priceTier: hasSpecialPrices ? "special" : "standard",
    lines,
    subtotal,
    taxRate: TAX_RATE,
    tax,
    total,
    status: "draft",
    notes: req.notes,
  };
}

// ──────────────────────────────────────────────────────────────
//  表示ヘルパー
// ──────────────────────────────────────────────────────────────

export function formatQuoteTotal(q: Quote): string {
  return `${formatJpy(q.total)}（税込）`;
}

export function quoteLineDisplayName(line: QuoteLine): string {
  return `${line.productName} ${line.colorName}`;
}

/**
 * 発注 ID 採番（簡易版）: ORD-YYYYMMDD-HHMMSS-RND
 * Phase C で DB 導入後に置き換え予定
 */
export function generateOrderId(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `ORD-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rnd}`;
}

// ──────────────────────────────────────────────────────────────
//  統計（開発用）
// ──────────────────────────────────────────────────────────────

/** マスター内の全 SKU 数（spec × color 合計） */
export function getTotalSkuCount(): number {
  return ALL_SPECS.reduce((acc, s) => acc + s.availableColors.length, 0);
}

/** カテゴリー別 SKU 集計 */
export function getCategorySkuCounts(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const s of ALL_SPECS) {
    const label = CATEGORY_META[s.category].label;
    result[label] = (result[label] || 0) + s.availableColors.length;
  }
  return result;
}
