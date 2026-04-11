/**
 * PDF — 見積書 PDF 自動生成（竹谷商事 正式フォーマット）
 *
 * 竹谷商事の既存見積書（g:\マイドライブ\見積書発行.PDF）と同じ体裁で生成する。
 *
 * 特徴:
 * - 発行元: 株式会社 竹谷商事（大阪市阿倍野区）
 * - タイトル: 「御 見 積 書」罫線付き
 * - 右上: 1ページ / 見積№ / 見積日付（令和年号）
 * - 左: {会社名} 御中（下線付き）
 * - 右: 竹谷商事住所＋TEL/FAX
 * - 納期 / 納入場所 / 支払方法 / 有効期限 の4ラベル
 * - 担当者: 宮本俊輔 + 印枠
 * - 要件行
 * - 合計金額 ￥XX,XXX-
 * - 明細表: No./商品名/入数/個数/数量/単位/単価/金額/摘要（フル罫線、多数の空行）
 * - 品番は商品名の上に括弧付き
 * - 下部: 税率対象額 / 内消費税等 / (小計) の注記行
 * - 末尾: 消費税・金額合計の大文字行
 * - 右下: (見積№)
 *
 * 日本語フォント: lib/fonts/NotoSansJP.ttf
 */

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import path from "node:path";
import type { Quote, OrderRequest } from "./order";

// ──────────────────────────────────────────────────────────────
//  フォント登録
// ──────────────────────────────────────────────────────────────

let fontRegistered = false;
function ensureFontRegistered() {
  if (fontRegistered) return;
  const fontPath = path.join(process.cwd(), "lib", "fonts", "NotoSansJP.ttf");
  Font.register({
    family: "NotoSansJP",
    src: fontPath,
  });
  Font.registerHyphenationCallback((word) => {
    if (word.length <= 1) return [word];
    return Array.from(word).flatMap((c, i) => (i === 0 ? [c] : ["", c]));
  });
  fontRegistered = true;
}

// ──────────────────────────────────────────────────────────────
//  竹谷商事 会社情報
// ──────────────────────────────────────────────────────────────

const VENDOR = {
  name: "株式会社 竹谷商事",
  zip: "〒545-0032",
  address: "大阪市阿倍野区晴明通2-20",
  tel: "TEL:06-6661-6946",
  fax: "FAX:06-6661-7416",
  salesRep: "宮本俊輔",
};

// ──────────────────────────────────────────────────────────────
//  カラー（黒基調、モノクロ寄り）
// ──────────────────────────────────────────────────────────────

const COLOR = {
  text: "#000000",
  border: "#333333",
  borderLight: "#555555",
  muted: "#555555",
};

// ──────────────────────────────────────────────────────────────
//  スタイル
// ──────────────────────────────────────────────────────────────

const BORDER = 0.7;
const BORDER_LIGHT = 0.4;

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 9,
    color: COLOR.text,
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 36,
    lineHeight: 1.4,
  },

  // ── 上部メタ ──
  topMeta: {
    position: "absolute",
    top: 32,
    right: 36,
    alignItems: "flex-end",
  },
  topMetaPage: {
    fontSize: 9,
    marginBottom: 2,
  },
  topMetaRow: {
    flexDirection: "row",
    marginBottom: 1,
  },
  topMetaLabel: {
    fontSize: 9,
    width: 56,
    textAlign: "right",
    marginRight: 4,
  },
  topMetaValue: {
    fontSize: 9,
    minWidth: 120,
    textAlign: "right",
  },

  // ── タイトル ──
  titleWrap: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 10,
    textAlign: "center",
  },

  // ── 宛先 / 自社 ──
  topBlock: {
    flexDirection: "row",
    marginBottom: 10,
  },
  clientCol: {
    width: "56%",
    paddingRight: 10,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: BORDER,
    borderBottomColor: COLOR.border,
    paddingBottom: 4,
    marginBottom: 10,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 700,
    flex: 1,
  },
  clientSuffix: {
    fontSize: 12,
    fontWeight: 700,
  },
  vendorCol: {
    width: "44%",
    paddingLeft: 6,
  },
  vendorLine: {
    fontSize: 9,
    marginBottom: 1,
  },
  vendorName: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 1,
    marginBottom: 1,
  },

  // ── 導入文 ──
  leadText: {
    fontSize: 9,
    marginBottom: 1,
  },

  // ── 納期・納入場所などのラベル行 ──
  labelBlock: {
    flexDirection: "row",
    marginTop: 10,
    marginBottom: 6,
  },
  labelLeftCol: {
    width: "56%",
    paddingRight: 10,
  },
  labelRow: {
    flexDirection: "row",
    borderBottomWidth: BORDER_LIGHT,
    borderBottomColor: COLOR.border,
    paddingVertical: 3,
  },
  labelName: {
    fontSize: 9,
    fontWeight: 700,
    width: 64,
  },
  labelValue: {
    fontSize: 9,
    flex: 1,
  },
  labelRightCol: {
    width: "44%",
    paddingLeft: 6,
  },
  sealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  sealPersonWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: BORDER_LIGHT,
    borderBottomColor: COLOR.border,
    paddingBottom: 2,
    marginRight: 6,
  },
  sealLabel: {
    fontSize: 9,
    fontWeight: 700,
    marginRight: 8,
  },
  sealName: {
    fontSize: 11,
    fontWeight: 700,
  },
  sealBox: {
    width: 24,
    height: 24,
    borderWidth: BORDER_LIGHT,
    borderColor: COLOR.border,
    marginLeft: 3,
  },

  // ── 合計金額行 + 要件行 ──
  totalAndRequirementBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  totalCol: {
    width: "50%",
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "baseline",
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 700,
    marginRight: 8,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 700,
  },
  requirementCol: {
    width: "50%",
    flexDirection: "row",
    paddingLeft: 6,
  },
  requirementLabel: {
    fontSize: 9,
    fontWeight: 700,
    marginRight: 6,
  },
  requirementValue: {
    fontSize: 9,
    flex: 1,
  },

  // ── 明細表 ──
  table: {
    marginTop: 8,
    borderTopWidth: BORDER,
    borderLeftWidth: BORDER,
    borderRightWidth: BORDER,
    borderColor: COLOR.border,
  },
  tableHead1: {
    flexDirection: "row",
    borderBottomWidth: BORDER_LIGHT,
    borderBottomColor: COLOR.border,
    paddingVertical: 1,
    minHeight: 12,
  },
  tableHead2: {
    flexDirection: "row",
    borderBottomWidth: BORDER,
    borderBottomColor: COLOR.border,
    paddingVertical: 2,
    minHeight: 14,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: BORDER_LIGHT,
    borderBottomColor: COLOR.border,
    minHeight: 20,
  },
  tableEmptyRow: {
    flexDirection: "row",
    borderBottomWidth: BORDER_LIGHT,
    borderBottomColor: COLOR.border,
    minHeight: 15,
  },
  // 列定義（幅％）: No. 5 / 商品名 34 / 入数 8 / 個数 8 / 数量 8 / 単位 6 / 単価 12 / 金額 12 / 摘要 7
  colNo: {
    width: "5%",
    borderRightWidth: BORDER_LIGHT,
    borderRightColor: COLOR.border,
    paddingHorizontal: 2,
    textAlign: "right",
  },
  colName: {
    width: "34%",
    borderRightWidth: BORDER_LIGHT,
    borderRightColor: COLOR.border,
    paddingHorizontal: 4,
  },
  colIrisuu: {
    width: "8%",
    borderRightWidth: BORDER_LIGHT,
    borderRightColor: COLOR.border,
    paddingHorizontal: 2,
    textAlign: "right",
  },
  colKosuu: {
    width: "8%",
    borderRightWidth: BORDER_LIGHT,
    borderRightColor: COLOR.border,
    paddingHorizontal: 2,
    textAlign: "right",
  },
  colQty: {
    width: "8%",
    borderRightWidth: BORDER_LIGHT,
    borderRightColor: COLOR.border,
    paddingHorizontal: 2,
    textAlign: "right",
  },
  colUnit: {
    width: "6%",
    borderRightWidth: BORDER_LIGHT,
    borderRightColor: COLOR.border,
    paddingHorizontal: 2,
    textAlign: "center",
  },
  colUnitPrice: {
    width: "12%",
    borderRightWidth: BORDER_LIGHT,
    borderRightColor: COLOR.border,
    paddingHorizontal: 3,
    textAlign: "right",
  },
  colAmount: {
    width: "12%",
    borderRightWidth: BORDER_LIGHT,
    borderRightColor: COLOR.border,
    paddingHorizontal: 3,
    textAlign: "right",
  },
  colNote: {
    width: "7%",
    paddingHorizontal: 2,
  },
  headCell: {
    fontSize: 8,
    paddingVertical: 2,
    textAlign: "center",
  },
  headCellSmall: {
    fontSize: 7.5,
    paddingVertical: 0,
    textAlign: "center",
  },
  cellText: {
    fontSize: 9,
    paddingTop: 9,
  },
  cellProductCode: {
    fontSize: 7.5,
    color: COLOR.muted,
    paddingTop: 2,
    marginBottom: -1,
  },
  cellProductName: {
    fontSize: 9,
  },

  // ── 合計内訳（明細表内の右下） ──
  cellNoteText: {
    fontSize: 8,
    color: COLOR.muted,
    paddingTop: 3,
    paddingLeft: 2,
  },
  cellSummaryLabel: {
    fontSize: 8,
    color: COLOR.muted,
    paddingTop: 3,
    textAlign: "right",
    paddingRight: 3,
  },
  cellSummaryValue: {
    fontSize: 9,
    fontWeight: 700,
    paddingTop: 3,
    textAlign: "right",
    paddingRight: 3,
  },

  // ── 下部: 消費税・金額合計 ──
  bottomSummary: {
    borderLeftWidth: BORDER,
    borderRightWidth: BORDER,
    borderBottomWidth: BORDER,
    borderColor: COLOR.border,
  },
  bottomSummaryRow: {
    flexDirection: "row",
  },
  bottomSummaryRowDivider: {
    flexDirection: "row",
    borderTopWidth: BORDER_LIGHT,
    borderTopColor: COLOR.border,
  },
  bottomSummaryLabelCol: {
    width: "45%",
    borderRightWidth: BORDER_LIGHT,
    borderRightColor: COLOR.border,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  bottomSummaryLabelText: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 4,
    textAlign: "center",
  },
  bottomSummaryEmptyCols: {
    width: "32%",
    borderRightWidth: BORDER_LIGHT,
    borderRightColor: COLOR.border,
  },
  bottomSummaryAmountCol: {
    width: "16%",
    borderRightWidth: BORDER_LIGHT,
    borderRightColor: COLOR.border,
    paddingVertical: 3,
    paddingHorizontal: 3,
    textAlign: "right",
  },
  bottomSummaryAmountText: {
    fontSize: 10,
    fontWeight: 700,
  },
  bottomSummaryNoteCol: {
    width: "7%",
  },

  // ── フッター（右下、見積№再掲） ──
  footerRef: {
    position: "absolute",
    bottom: 18,
    right: 36,
    fontSize: 9,
    color: COLOR.muted,
  },
});

// ──────────────────────────────────────────────────────────────
//  日付フォーマット（令和年号）
// ──────────────────────────────────────────────────────────────

function formatReiwa(iso: string): string {
  const d = new Date(iso);
  const reiwaYear = d.getFullYear() - 2018;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const yearStr = reiwaYear === 1 ? "元" : String(reiwaYear);
  return `令和 ${yearStr}年 ${month}月${day}日`;
}

/** 半角数字を全角へ */
function toFullWidth(s: string): string {
  return s
    .replace(/[0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0))
    .replace(/,/g, "，")
    .replace(/\./g, "．")
    .replace(/-/g, "－");
}

/** 合計金額の表示形式: ￥５４，５９８－ (全角) */
function formatAmountDash(value: number): string {
  return `￥${toFullWidth(value.toLocaleString("ja-JP"))}－`;
}

/** 数値を右寄せ 3桁区切り */
function fmt(value: number): string {
  return value.toLocaleString("ja-JP");
}

// ──────────────────────────────────────────────────────────────
//  見積№ 生成（最大5文字の短縮形）
// ──────────────────────────────────────────────────────────────

function toQuoteNumber(orderId: string): string {
  // ORD-20260411-220000-9891 → 末尾の乱数部分を使う
  const parts = orderId.split("-");
  const last = parts[parts.length - 1] || orderId;
  return last.slice(-5);
}

// ──────────────────────────────────────────────────────────────
//  Document コンポーネント
// ──────────────────────────────────────────────────────────────

type Props = {
  order: OrderRequest;
  quote: Quote;
};

const MAX_ROWS = 16; // 明細の最大行数（空行含む）

function EstimateDocument({ order, quote }: Props) {
  const lines = quote.lines;
  const displayLines = lines.slice(0, MAX_ROWS - 2); // 「送料」行と税計行の余裕
  const emptyRows = Math.max(0, MAX_ROWS - displayLines.length);

  const quoteNo = toQuoteNumber(quote.id);
  const issueDate = formatReiwa(quote.issuedAt);

  // 要件
  const requirement = `識別テープ発注 ${order.contactName}様`;

  return (
    <Document
      title={`御見積書 ${quote.id}`}
      author={VENDOR.name}
      subject={`${order.companyName} 様 御見積書`}
    >
      <Page size="A4" style={styles.page}>
        {/* 右上: 1ページ / 見積№ / 見積日付 */}
        <View style={styles.topMeta}>
          <Text style={styles.topMetaPage}>1ページ</Text>
          <View style={styles.topMetaRow}>
            <Text style={styles.topMetaLabel}>見積№</Text>
            <Text style={styles.topMetaValue}>{quoteNo}</Text>
          </View>
          <View style={styles.topMetaRow}>
            <Text style={styles.topMetaLabel}>見積日付</Text>
            <Text style={styles.topMetaValue}>{issueDate}</Text>
          </View>
        </View>

        {/* タイトル */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>御 見 積 書</Text>
        </View>

        {/* 宛先 / 自社ブロック */}
        <View style={styles.topBlock}>
          <View style={styles.clientCol}>
            <View style={styles.clientRow}>
              <Text style={styles.clientName}>{order.companyName}</Text>
              <Text style={styles.clientSuffix}>御中</Text>
            </View>
            <Text style={styles.leadText}>下記の通りお見積致します</Text>
            <Text style={styles.leadText}>ご検討の程よろしくお願い致します</Text>
          </View>
          <View style={styles.vendorCol}>
            <Text style={styles.vendorLine}>{VENDOR.zip}</Text>
            <Text style={styles.vendorLine}>{VENDOR.address}</Text>
            <Text style={styles.vendorName}>{VENDOR.name}</Text>
            <Text style={styles.vendorLine}>{VENDOR.tel}</Text>
            <Text style={styles.vendorLine}>{VENDOR.fax}</Text>
          </View>
        </View>

        {/* 納期 / 納入場所 / 支払方法 / 有効期限 + 担当者 */}
        <View style={styles.labelBlock}>
          <View style={styles.labelLeftCol}>
            <View style={styles.labelRow}>
              <Text style={styles.labelName}>納期：</Text>
              <Text style={styles.labelValue}>
                {order.desiredDelivery || "受注後10日程度"}
              </Text>
            </View>
            <View style={styles.labelRow}>
              <Text style={styles.labelName}>納入場所：</Text>
              <Text style={styles.labelValue}>
                {order.shippingAddress
                  ? `${order.zipCode ? `〒${order.zipCode} ` : ""}${order.shippingAddress}`
                  : ""}
              </Text>
            </View>
            <View style={styles.labelRow}>
              <Text style={styles.labelName}>支払方法：</Text>
              <Text style={styles.labelValue}>通常通り</Text>
            </View>
            <View style={styles.labelRow}>
              <Text style={styles.labelName}>有効期限：</Text>
              <Text style={styles.labelValue}>見積日より1ヶ月</Text>
            </View>
          </View>
          <View style={styles.labelRightCol}>
            <View style={styles.sealRow}>
              <View style={styles.sealPersonWrap}>
                <Text style={styles.sealLabel}>担当者：</Text>
                <Text style={styles.sealName}>{VENDOR.salesRep}</Text>
              </View>
              <View style={styles.sealBox} />
              <View style={styles.sealBox} />
            </View>
          </View>
        </View>

        {/* 合計金額 + 要件 */}
        <View style={styles.totalAndRequirementBlock}>
          <View style={styles.totalCol}>
            <Text style={styles.totalLabel}>合計金額</Text>
            <Text style={styles.totalValue}>{formatAmountDash(quote.total)}</Text>
          </View>
          <View style={styles.requirementCol}>
            <Text style={styles.requirementLabel}>要 件：</Text>
            <Text style={styles.requirementValue}>{requirement}</Text>
          </View>
        </View>

        {/* 明細表 */}
        <View style={styles.table}>
          {/* ヘッダー1: 入数/個数 ラベル（該当列の上に配置） */}
          <View style={styles.tableHead1}>
            <View style={styles.colNo} />
            <View style={styles.colName} />
            <View style={styles.colIrisuu}>
              <Text style={styles.headCellSmall}>入 数</Text>
            </View>
            <View style={styles.colKosuu}>
              <Text style={styles.headCellSmall}>個 数</Text>
            </View>
            <View style={styles.colQty} />
            <View style={styles.colUnit} />
            <View style={styles.colUnitPrice} />
            <View style={styles.colAmount} />
            <View style={styles.colNote} />
          </View>
          {/* ヘッダー2: No./商品名/数量/単位/単価/金額/摘要 */}
          <View style={styles.tableHead2}>
            <View style={styles.colNo}>
              <Text style={styles.headCell}>№</Text>
            </View>
            <View style={styles.colName}>
              <Text style={styles.headCell}>商  品  名</Text>
            </View>
            <View style={styles.colIrisuu}>
              <Text style={styles.headCellSmall}> </Text>
            </View>
            <View style={styles.colKosuu}>
              <Text style={styles.headCellSmall}> </Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.headCell}>数 量</Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={styles.headCell}>単位</Text>
            </View>
            <View style={styles.colUnitPrice}>
              <Text style={styles.headCell}>単   価</Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.headCell}>金   額</Text>
            </View>
            <View style={styles.colNote}>
              <Text style={styles.headCell}>摘要</Text>
            </View>
          </View>

          {/* 冒頭: 見積№再掲 */}
          <View style={styles.tableRow}>
            <View style={styles.colNo} />
            <View style={styles.colName}>
              <Text style={styles.cellProductCode}>( {quoteNo})</Text>
            </View>
            <View style={styles.colIrisuu} />
            <View style={styles.colKosuu} />
            <View style={styles.colQty} />
            <View style={styles.colUnit} />
            <View style={styles.colUnitPrice} />
            <View style={styles.colAmount} />
            <View style={styles.colNote} />
          </View>

          {/* 明細行 */}
          {displayLines.map((line, i) => {
            // 品番（specId を略号化）: std-008-30-50__pink → STP008-30-50-P
            const code = makeProductCode(line.specId, line.colorId);
            return (
              <View key={i} style={styles.tableRow}>
                <View style={styles.colNo}>
                  <Text style={styles.cellText}>{i + 1}</Text>
                </View>
                <View style={styles.colName}>
                  <Text style={styles.cellProductCode}>({code})</Text>
                  <Text style={styles.cellProductName}>
                    {line.productName} {line.colorName}
                  </Text>
                </View>
                <View style={styles.colIrisuu} />
                <View style={styles.colKosuu} />
                <View style={styles.colQty}>
                  <Text style={styles.cellText}>{fmt(line.quantity)}</Text>
                </View>
                <View style={styles.colUnit}>
                  <Text style={styles.cellText}>巻</Text>
                </View>
                <View style={styles.colUnitPrice}>
                  <Text style={styles.cellText}>
                    {line.unitPrice.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={styles.cellText}>{fmt(line.subtotal)}</Text>
                </View>
                <View style={styles.colNote} />
              </View>
            );
          })}

          {/* 税注記行 + (内消費税等) */}
          <View style={styles.tableEmptyRow}>
            <View style={styles.colNo} />
            <View style={styles.colName}>
              <Text style={styles.cellNoteText}>
                (税率10.00%計 対象額 {fmt(quote.subtotal)})
              </Text>
            </View>
            <View style={styles.colIrisuu} />
            <View style={styles.colKosuu} />
            <View style={styles.colQty} />
            <View style={styles.colUnit} />
            <View style={styles.colUnitPrice}>
              <Text style={styles.cellSummaryLabel}>(内消費税等)</Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.cellSummaryValue}>{fmt(quote.tax)}</Text>
            </View>
            <View style={styles.colNote} />
          </View>
          {/* 小計行 */}
          <View style={styles.tableEmptyRow}>
            <View style={styles.colNo} />
            <View style={styles.colName} />
            <View style={styles.colIrisuu} />
            <View style={styles.colKosuu} />
            <View style={styles.colQty} />
            <View style={styles.colUnit} />
            <View style={styles.colUnitPrice}>
              <Text style={styles.cellSummaryLabel}>(小  計)</Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.cellSummaryValue}>{fmt(quote.total)}</Text>
            </View>
            <View style={styles.colNote} />
          </View>

          {/* 空行でページを埋める（税注記2行分を差し引く） */}
          {Array.from({
            length: Math.max(0, MAX_ROWS - displayLines.length - 3),
          }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.tableEmptyRow}>
              <View style={styles.colNo} />
              <View style={styles.colName} />
              <View style={styles.colIrisuu} />
              <View style={styles.colKosuu} />
              <View style={styles.colQty} />
              <View style={styles.colUnit} />
              <View style={styles.colUnitPrice} />
              <View style={styles.colAmount} />
              <View style={styles.colNote} />
            </View>
          ))}
        </View>

        {/* 下部: 消費税・金額合計 */}
        <View style={styles.bottomSummary}>
          <View style={styles.bottomSummaryRow}>
            <View style={styles.bottomSummaryLabelCol}>
              <Text style={styles.bottomSummaryLabelText}>消 費 税</Text>
            </View>
            <View style={styles.bottomSummaryEmptyCols} />
            <View style={styles.bottomSummaryAmountCol}>
              <Text style={styles.bottomSummaryAmountText}>
                {fmt(quote.tax)}
              </Text>
            </View>
            <View style={styles.bottomSummaryNoteCol} />
          </View>
          <View style={styles.bottomSummaryRowDivider}>
            <View style={styles.bottomSummaryLabelCol}>
              <Text style={styles.bottomSummaryLabelText}>金 額 合 計</Text>
            </View>
            <View style={styles.bottomSummaryEmptyCols} />
            <View style={styles.bottomSummaryAmountCol}>
              <Text style={styles.bottomSummaryAmountText}>
                {fmt(quote.total)}
              </Text>
            </View>
            <View style={styles.bottomSummaryNoteCol} />
          </View>
        </View>

        {/* 右下に見積№再掲 */}
        <Text style={styles.footerRef} fixed>
          ( {quoteNo})
        </Text>
      </Page>
    </Document>
  );
}

// ──────────────────────────────────────────────────────────────
//  品番生成: spec ID + color ID から短縮コード
// ──────────────────────────────────────────────────────────────

function makeProductCode(specId: string, colorId: string): string {
  // std-008-30-50 → STP008-30-50
  // num-015-20-50 → NUM015-20-50
  // dia-01-30-50 → DIA01-30-50
  let prefix = "TAP";
  let rest = specId;
  if (specId.startsWith("std-")) {
    prefix = "STP";
    rest = specId.slice(4);
  } else if (specId.startsWith("num-")) {
    prefix = "NUM";
    rest = specId.slice(4);
  } else if (specId.startsWith("dia-")) {
    prefix = "DIA";
    rest = specId.slice(4);
  }
  // 色コード（頭文字大文字）
  const colorChar: Record<string, string> = {
    pink: "P",
    white: "W",
    blue: "B",
    red: "R",
    yellow: "Y",
    orange: "O",
    green: "G",
    "pink-blue": "PB",
    "yellow-black": "YK",
    "pink-white": "PW",
  };
  const cc = colorChar[colorId] || "X";
  return `${prefix}${rest}-${cc}`;
}

// ──────────────────────────────────────────────────────────────
//  公開 API
// ──────────────────────────────────────────────────────────────

export async function generateEstimatePdf(
  order: OrderRequest,
  quote: Quote
): Promise<Buffer> {
  ensureFontRegistered();
  const buffer = await renderToBuffer(
    <EstimateDocument order={order} quote={quote} />
  );
  return buffer as Buffer;
}

export function generatePdfFilename(quoteId: string): string {
  return `見積書_${quoteId}.pdf`;
}
