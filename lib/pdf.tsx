/**
 * PDF — 見積書 PDF 自動生成
 *
 * @react-pdf/renderer を使い、Vercel Serverless Function 内で
 * 純 JavaScript のみで見積書 PDF を生成する。
 *
 * 既存の estimate-template.xlsx + LibreOffice 変換フローは Vercel では動かないため、
 * こちらで同等の見積書を直接 React コンポーネントとして組む。
 *
 * 日本語フォント: lib/fonts/NotoSansJP.ttf を Font.register で登録
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
import React from "react";
import { COLORS, formatJpy } from "./product-master";
import type { Quote, OrderRequest } from "./order";

// ──────────────────────────────────────────────────────────────
//  フォント登録（Noto Sans JP）
// ──────────────────────────────────────────────────────────────

let fontRegistered = false;
function ensureFontRegistered() {
  if (fontRegistered) return;
  const fontPath = path.join(process.cwd(), "lib", "fonts", "NotoSansJP.ttf");
  Font.register({
    family: "NotoSansJP",
    src: fontPath,
  });
  // 改行可能な文字クラスを広めに設定（日本語対応）
  Font.registerHyphenationCallback((word) => {
    if (word.length <= 1) return [word];
    return Array.from(word).flatMap((c, i) => (i === 0 ? [c] : ["", c]));
  });
  fontRegistered = true;
}

// ──────────────────────────────────────────────────────────────
//  スタイル
// ──────────────────────────────────────────────────────────────

const COLOR = {
  navy: "#1C3557",
  navyDark: "#122340",
  orange: "#E07B2A",
  gray50: "#F9FAFB",
  gray100: "#F5F6F8",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray700: "#4B5563",
  text: "#1A1F2B",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 10,
    color: COLOR.text,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    lineHeight: 1.5,
  },
  // ヘッダー
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: COLOR.navy,
    paddingBottom: 16,
  },
  titleBlock: {
    flexDirection: "column",
  },
  titleBadge: {
    fontSize: 9,
    color: COLOR.orange,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    color: COLOR.navy,
    fontWeight: 700,
    letterSpacing: 4,
  },
  metaBlock: {
    alignItems: "flex-end",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 9,
    color: COLOR.gray500,
    width: 64,
    textAlign: "right",
    marginRight: 8,
  },
  metaValue: {
    fontSize: 10,
    color: COLOR.navy,
    fontWeight: 700,
  },
  // 宛先・自社
  addressSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  clientBlock: {
    flex: 1,
  },
  clientCompany: {
    fontSize: 16,
    color: COLOR.navy,
    fontWeight: 700,
    marginBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.gray400,
    paddingBottom: 4,
    marginRight: 40,
  },
  clientContact: {
    fontSize: 10,
    color: COLOR.gray700,
    marginTop: 6,
  },
  vendorBlock: {
    width: 220,
  },
  vendorName: {
    fontSize: 11,
    color: COLOR.navy,
    fontWeight: 700,
    marginBottom: 4,
  },
  vendorDetail: {
    fontSize: 9,
    color: COLOR.gray700,
    marginBottom: 1,
  },
  // 合計額セクション
  totalSection: {
    backgroundColor: COLOR.gray100,
    borderWidth: 1,
    borderColor: COLOR.gray200,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 11,
    color: COLOR.gray500,
    marginRight: 16,
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 22,
    color: COLOR.orange,
    fontWeight: 700,
  },
  totalSuffix: {
    fontSize: 10,
    color: COLOR.gray500,
    marginLeft: 8,
  },
  // 明細表
  table: {
    borderTopWidth: 2,
    borderTopColor: COLOR.navy,
    marginBottom: 14,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: COLOR.gray50,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.gray200,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableHeadText: {
    fontSize: 9,
    color: COLOR.gray500,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.gray200,
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 24,
  },
  colProduct: { width: "44%", paddingRight: 6 },
  colColor: { width: "14%", paddingRight: 6 },
  colUnit: { width: "16%", paddingRight: 6, textAlign: "right" },
  colQty: { width: "10%", paddingRight: 6, textAlign: "right" },
  colSubtotal: { width: "16%", textAlign: "right" },
  cellText: {
    fontSize: 10,
    color: COLOR.text,
  },
  cellSmall: {
    fontSize: 8,
    color: COLOR.gray500,
    marginTop: 2,
  },
  // 合計内訳
  summaryBlock: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
    marginBottom: 18,
  },
  summaryTable: {
    width: 220,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLOR.gray500,
  },
  summaryValue: {
    fontSize: 11,
    color: COLOR.navy,
    fontWeight: 700,
  },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: COLOR.navy,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 11,
    color: COLOR.orange,
    fontWeight: 700,
  },
  summaryTotalValue: {
    fontSize: 14,
    color: COLOR.orange,
    fontWeight: 700,
  },
  // 備考
  notesBlock: {
    marginTop: 10,
    marginBottom: 14,
    padding: 12,
    backgroundColor: COLOR.gray50,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.orange,
  },
  notesLabel: {
    fontSize: 9,
    color: COLOR.gray500,
    marginBottom: 4,
    letterSpacing: 1,
  },
  notesText: {
    fontSize: 10,
    color: COLOR.text,
    lineHeight: 1.6,
  },
  // 有効期限・バッジ
  validUntilRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  validUntilLabel: {
    fontSize: 9,
    color: COLOR.gray500,
    marginRight: 8,
  },
  validUntilValue: {
    fontSize: 10,
    color: COLOR.navy,
    fontWeight: 700,
  },
  specialBadge: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#FEF3E9",
    borderLeftWidth: 3,
    borderLeftColor: COLOR.orange,
  },
  specialBadgeText: {
    fontSize: 10,
    color: "#9A4F10",
  },
  // フッター
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: COLOR.gray400,
    borderTopWidth: 0.5,
    borderTopColor: COLOR.gray200,
    paddingTop: 8,
  },
});

// ──────────────────────────────────────────────────────────────
//  日付フォーマット
// ──────────────────────────────────────────────────────────────

function formatDateJP(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}年${m}月${day}日`;
}

// ──────────────────────────────────────────────────────────────
//  Document コンポーネント
// ──────────────────────────────────────────────────────────────

type Props = {
  order: OrderRequest;
  quote: Quote;
};

function EstimateDocument({ order, quote }: Props) {
  const isSpecial = quote.priceTier === "special";

  return (
    <Document
      title={`見積書 ${quote.id}`}
      author="株式会社竹谷商事"
      subject={`${order.companyName} 様 見積書`}
    >
      <Page size="A4" style={styles.page}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.titleBadge}>ESTIMATE</Text>
            <Text style={styles.title}>御 見 積 書</Text>
          </View>
          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>発行日</Text>
              <Text style={styles.metaValue}>{formatDateJP(quote.issuedAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>見積番号</Text>
              <Text style={styles.metaValue}>{quote.id}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>有効期限</Text>
              <Text style={styles.metaValue}>
                {formatDateJP(quote.validUntil)}
              </Text>
            </View>
          </View>
        </View>

        {/* 宛先・自社 */}
        <View style={styles.addressSection}>
          <View style={styles.clientBlock}>
            <Text style={styles.clientCompany}>
              {order.companyName} 御中
            </Text>
            <Text style={styles.clientContact}>ご担当: {order.contactName} 様</Text>
            <Text style={{ ...styles.clientContact, marginTop: 2 }}>
              下記の通りお見積もり申し上げます。
            </Text>
          </View>
          <View style={styles.vendorBlock}>
            <Text style={styles.vendorName}>株式会社 竹谷商事</Text>
            <Text style={styles.vendorDetail}>
              森林・測量用 識別テープ専門
            </Text>
            <Text style={styles.vendorDetail}>
              担当: 宮本 俊輔
            </Text>
            <Text style={styles.vendorDetail}>
              Email: s_miyamoto@greensprout0315.com
            </Text>
            <Text style={styles.vendorDetail}>
              takeya-tape-shop.vercel.app
            </Text>
          </View>
        </View>

        {/* 合計額ハイライト */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>御見積金額</Text>
          <Text style={styles.totalValue}>{formatJpy(quote.total)}</Text>
          <Text style={styles.totalSuffix}>（税込）</Text>
        </View>

        {/* 明細表 */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={{ ...styles.tableHeadText, ...styles.colProduct }}>
              商 品
            </Text>
            <Text style={{ ...styles.tableHeadText, ...styles.colColor }}>
              色
            </Text>
            <Text style={{ ...styles.tableHeadText, ...styles.colUnit }}>
              単価
            </Text>
            <Text style={{ ...styles.tableHeadText, ...styles.colQty }}>
              数量
            </Text>
            <Text style={{ ...styles.tableHeadText, ...styles.colSubtotal }}>
              小計
            </Text>
          </View>
          {quote.lines.map((line, i) => {
            const color = COLORS[line.colorId];
            return (
              <View key={i} style={styles.tableRow}>
                <View style={styles.colProduct}>
                  <Text style={styles.cellText}>{line.productName}</Text>
                </View>
                <View style={styles.colColor}>
                  <Text style={styles.cellText}>
                    {color?.name ?? line.colorName}
                  </Text>
                </View>
                <Text style={{ ...styles.cellText, ...styles.colUnit }}>
                  {formatJpy(line.unitPrice)}
                </Text>
                <Text style={{ ...styles.cellText, ...styles.colQty }}>
                  {line.quantity}本
                </Text>
                <Text
                  style={{
                    ...styles.cellText,
                    ...styles.colSubtotal,
                    fontWeight: 700,
                  }}
                >
                  {formatJpy(line.subtotal)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 合計内訳 */}
        <View style={styles.summaryBlock}>
          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>小計（税抜）</Text>
              <Text style={styles.summaryValue}>
                {formatJpy(quote.subtotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                消費税（{Math.round(quote.taxRate * 100)}%）
              </Text>
              <Text style={styles.summaryValue}>{formatJpy(quote.tax)}</Text>
            </View>
            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>合計金額（税込）</Text>
              <Text style={styles.summaryTotalValue}>
                {formatJpy(quote.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* 特別価格バッジ */}
        {isSpecial && (
          <View style={styles.specialBadge}>
            <Text style={styles.specialBadgeText}>
              ✓ 特別価格を適用させていただきました（ID: {quote.customerId}）
            </Text>
          </View>
        )}

        {/* 備考 */}
        {order.notes && (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>備 考</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* 納品先情報（ある場合） */}
        {(order.shippingAddress || order.desiredDelivery) && (
          <View style={{ marginTop: 8 }}>
            {order.desiredDelivery && (
              <Text style={{ fontSize: 10, color: COLOR.gray700, marginBottom: 2 }}>
                希望納期: {order.desiredDelivery}
              </Text>
            )}
            {order.shippingAddress && (
              <Text style={{ fontSize: 10, color: COLOR.gray700 }}>
                納品先: {order.zipCode ?? ""} {order.shippingAddress}
              </Text>
            )}
          </View>
        )}

        {/* フッター */}
        <Text style={styles.footer} fixed>
          本見積書は takeya-tape-shop.vercel.app の発注フォームから自動生成されています。
          ご不明な点は s_miyamoto@greensprout0315.com までお問い合わせください。
        </Text>
      </Page>
    </Document>
  );
}

// ──────────────────────────────────────────────────────────────
//  公開 API
// ──────────────────────────────────────────────────────────────

/**
 * 見積書 PDF をバッファで生成
 *
 * Vercel Serverless Function 内で純 JavaScript のみで実行される。
 * 生成失敗時は例外を投げる。
 */
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

/** PDF ファイル名（UIと統一） */
export function generatePdfFilename(quoteId: string): string {
  return `見積書_${quoteId}.pdf`;
}
