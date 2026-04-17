/**
 * SMILE & eValue V 受注取込CSV生成ユーティリティ
 *
 * フォーマット: UTF-16 LE BOM + タブ区切り
 * 参考: C:\Users\green\Desktop\受注処理取り込みフォーマット.csv
 *
 * 注意: 以下3コードは SMILE 側で確認が必要（暫定空文字で出力）:
 *   - 倉庫コード
 *   - 新規（非ログイン）顧客用汎用得意先コード
 *   - 取引先マスターにない会社の扱い
 */

import { getDb } from "./db";
import { toSmileProductCode, SMILE_DEFAULTS } from "./smile-mapping";

export type SmileCsvLine = {
  orderId: string;
  orderDate: string; // YYYYMMDD
  customerCode: string; // 得意先コード (smile_code)
  customerName: string;
  productCode: string; // SMILE商品コード
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  note: string;
};

/** CSV 1行を SMILE取込フォーマットに整形 */
function formatLine(l: SmileCsvLine): string {
  // タブ区切り / ダブルクォート不要（SMILE側の仕様に合わせる）
  return [
    l.orderDate, // 伝票日付
    "", // 伝票№（SMILE側採番想定）
    SMILE_DEFAULTS.departmentCode,
    "", // 部門名
    l.customerCode,
    l.customerName,
    SMILE_DEFAULTS.salesRepCode,
    "宮本俊輔",
    l.productCode,
    l.productName,
    String(l.quantity),
    String(l.amount),
    "", // 粗利（SMILE側計算）
    "", // 上代単価
    String(l.unitPrice),
    "", // 原単価
    "", // 原価金額
    l.note,
    SMILE_DEFAULTS.areaCode,
    "", // 地域名
  ].join("\t");
}

const CSV_HEADER = [
  "伝票日付",
  "伝票№",
  "部門ｺｰﾄﾞ",
  "部門名",
  "得意先ｺｰﾄﾞ",
  "得意先名１",
  "担当者ｺｰﾄﾞ",
  "担当者名",
  "商品ｺｰﾄﾞ",
  "商品名",
  "数量",
  "金額",
  "粗利",
  "上代単価",
  "単価",
  "原単価",
  "原価金額",
  "備考",
  "地域ｺｰﾄﾞ",
  "地域名",
].join("\t");

/**
 * 指定期間の orders を SMILE 取込CSV文字列に変換する。
 * UTF-16LE BOM 付きの Buffer を返す（メール添付用）。
 */
export async function buildSmileCsv(since: Date): Promise<{
  buffer: Buffer;
  orderCount: number;
  lineCount: number;
  missingProductCodes: string[];
}> {
  const sql = getDb();

  // since 以降 & status が shipping/shipped/invoiced/paid の発注のみ
  // （まだ出荷フェーズに進んでいないものは取込対象外）
  const orders = await sql`
    SELECT o.*, c.smile_code
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.received_at >= ${since.toISOString()}
      AND o.status IN ('approved', 'shipping', 'shipped', 'invoiced', 'paid')
    ORDER BY o.received_at
  `;

  const lines: string[] = [CSV_HEADER];
  const missingProductCodes: string[] = [];
  let lineCount = 0;

  for (const o of orders) {
    const orderLines = await sql`
      SELECT * FROM order_lines WHERE order_id = ${o.id} ORDER BY id
    `;
    const d = new Date(o.received_at);
    const orderDate = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const customerCode = o.smile_code || SMILE_DEFAULTS.guestCustomerCode || "";

    for (const l of orderLines) {
      const productCode = toSmileProductCode(l.spec_id, l.color_id);
      if (!productCode) {
        missingProductCodes.push(`${l.spec_id}/${l.color_id}`);
        continue;
      }
      lines.push(
        formatLine({
          orderId: o.id,
          orderDate,
          customerCode,
          customerName: o.company_name,
          productCode,
          productName: `${l.product_name} ${l.color_name}`,
          quantity: l.quantity,
          unitPrice: l.unit_price,
          amount: l.subtotal,
          note: o.id, // 発注番号を備考に残す
        })
      );
      lineCount++;
    }
  }

  const text = lines.join("\r\n") + "\r\n";
  // UTF-16LE + BOM
  const bom = Buffer.from([0xff, 0xfe]);
  const body = Buffer.from(text, "utf16le");
  const buffer = Buffer.concat([bom, body]);

  return {
    buffer,
    orderCount: orders.length,
    lineCount,
    missingProductCodes: [...new Set(missingProductCodes)],
  };
}
