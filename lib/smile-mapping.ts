/**
 * SMILE 商品コードと EC SKU のマッピング。
 *
 * SMILE の商品コード体系:
 *   TN-AA{幅}{色}  = 識別テープ 0.08mm × 幅 × 50m
 *   TN-AB{幅}{色}  = 識別テープ 0.08mm × 幅 × 100m
 *   TN-BA{幅}{色}  = 識別テープ 0.1mm  × 幅 × 50m
 *   TN-BB{幅}{色}  = 識別テープ 0.1mm  × 幅 × 100m
 *   TN-CA{幅}{色}  = 識別テープ 0.15mm × 幅 × 50m
 *   TN-DA{幅}{色}  = 識別テープ 0.2mm  × 幅 × 50m
 *   NN-T{N/A-J}{色} = ナンバーテープ（数字のみ / A-J 各文字）
 *   NN-SAJ{色}     = ナンバーテープ A-J セット
 *
 * 色コード: P=ピンク / B=青 / W=白 / R=赤 / Y=黄 / O=オレンジ / G=緑
 *
 * EC 側は色を別フィールドで持っているため、SMILE コードとの変換には
 * spec + color の組み合わせが必要。
 */

import type { ColorId } from "./product-master";

// EC ColorId → SMILE 1文字コード
const COLOR_TO_SMILE: Partial<Record<ColorId, string>> = {
  pink: "P",
  blue: "B",
  white: "W",
  red: "R",
  yellow: "Y",
  orange: "O",
  green: "G",
  // 斜線入りは SMILE コード未マッピング（斜線用の別コード体系）
};

// EC spec_id → SMILE prefix (TN-AA 等)
// ナンバーテープは色により NN-TN{色} / NN-SAJ{色} 等、別ロジック
const SPEC_TO_SMILE_PREFIX: Record<string, string> = {
  // 0.08mm x 50m
  "std-008-15-50": "TN-AA15",
  "std-008-20-50": "TN-AA20",
  "std-008-30-50": "TN-AA30",
  "std-008-50-50": "TN-AA50",
  // 0.08mm x 100m
  "std-008-15-100": "TN-AB15",
  "std-008-20-100": "TN-AB20",
  "std-008-30-100": "TN-AB30",
  "std-008-50-100": "TN-AB50",
  // 0.1mm x 50m
  "std-01-15-50": "TN-BA15",
  "std-01-20-50": "TN-BA20",
  "std-01-30-50": "TN-BA30",
  "std-01-50-50": "TN-BA50",
  // 0.1mm x 100m
  "std-01-15-100": "TN-BB15",
  "std-01-20-100": "TN-BB20",
  "std-01-30-100": "TN-BB30",
  "std-01-50-100": "TN-BB50",
  // 0.15mm x 50m
  "std-015-15-50": "TN-CA15",
  "std-015-20-50": "TN-CA20",
  "std-015-30-50": "TN-CA30",
  // 0.2mm x 50m
  "std-02-15-50": "TN-DA15",
  "std-02-20-50": "TN-DA20",
  "std-02-30-50": "TN-DA30",
  // ナンバーテープ（spec 単位では一つだが色で異なる）
  "num-015-20-50": "NN-TN", // 数字のみ版
};

/**
 * EC (specId, colorId) から SMILE 商品コードを解決する
 * 斜線入りは SMILE コード未マッピングのため null
 */
export function toSmileProductCode(
  specId: string,
  colorId: ColorId
): string | null {
  const prefix = SPEC_TO_SMILE_PREFIX[specId];
  if (!prefix) return null;
  const colorCode = COLOR_TO_SMILE[colorId];
  if (!colorCode) return null;
  return `${prefix}${colorCode}`;
}

// SMILE 部門・担当者・地域コード（識別テープ EC 発注のデフォルト）
export const SMILE_DEFAULTS = {
  /** 大阪本社 */
  departmentCode: "000001",
  /** 宮本俊輔 */
  salesRepCode: "000021",
  /** 空欄 */
  areaCode: "000000",
  /** TODO: 倉庫コードは SMILE 側の取込フォーマット確認後に設定 */
  warehouseCode: "",
  /**
   * TODO: 新規（非ログイン）顧客用汎用得意先コード
   * SMILE 側で一見客/その他コードを特定したら設定
   */
  guestCustomerCode: "",
};
