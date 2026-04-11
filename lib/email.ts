/**
 * Email — 発注通知メール送信
 *
 * Gmail SMTP (アプリパスワード経由) で、発注受信時にオーナー＆竹谷商事担当者へ
 * 通知メールを送信する。既存の greensprout-company/invoice.js と同じ
 * 認証スキームを流用している。
 *
 * 必要な環境変数:
 * - GMAIL_USER: 送信元 Gmail アドレス (例: s_miyamoto@greensprout0315.com)
 * - GMAIL_APP_PASSWORD: Gmail アプリパスワード (2FA 必須、16文字)
 * - ORDER_NOTIFY_FROM_NAME (optional): 送信者表示名 (デフォルト "竹谷商事 発注フォーム")
 *
 * グレースフル・デグラデーション:
 * - 必要な環境変数が未設定の場合はメール送信をスキップして warning ログを出す
 * - これにより ローカル開発でも本番でも動作が壊れない
 */

import nodemailer, { type Transporter } from "nodemailer";
import { COLORS, formatJpy } from "./product-master";
import type { OrderRequest, Quote } from "./order";

// ──────────────────────────────────────────────────────────────
//  送信先設定
// ──────────────────────────────────────────────────────────────

/** 発注通知メールの受信者（両方へ同送） */
export const ORDER_NOTIFY_RECIPIENTS = [
  "s_miyamoto@greensprout0315.com",
  "maki_kumabe@taketani.co.jp",
];

/** 送信者表示名 */
function getFromName(): string {
  return process.env.ORDER_NOTIFY_FROM_NAME || "竹谷商事 発注フォーム";
}

/** 送信元メールアドレス（環境変数 GMAIL_USER を使用） */
function getFromAddress(): string | null {
  const user = process.env.GMAIL_USER;
  if (!user) return null;
  return `${getFromName()} <${user}>`;
}

// ──────────────────────────────────────────────────────────────
//  型
// ──────────────────────────────────────────────────────────────

export type EmailSendResult =
  | { ok: true; id: string }
  | { ok: false; reason: "disabled" | "error"; error?: string };

// ──────────────────────────────────────────────────────────────
//  日時フォーマット
// ──────────────────────────────────────────────────────────────

function formatJpDateTime(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}年${m}月${day}日 ${hh}:${mm}`;
}

function formatJpDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月${String(d.getDate()).padStart(2, "0")}日`;
}

// ──────────────────────────────────────────────────────────────
//  HTML 本文生成
// ──────────────────────────────────────────────────────────────

function renderColorBadge(colorId: string): string {
  const color = COLORS[colorId as keyof typeof COLORS];
  if (!color) return colorId;
  const hex = color.hex;
  const bg = Array.isArray(hex)
    ? `linear-gradient(45deg, ${hex[0]} 50%, ${hex[1]} 50%)`
    : hex;
  return `
    <span style="display:inline-block;width:12px;height:12px;border:1px solid #d1d5db;background:${bg};vertical-align:middle;margin-right:6px;"></span>
    ${color.name}
  `;
}

function renderOrderEmailHtml(
  order: OrderRequest,
  quote: Quote
): string {
  const isSpecial = quote.priceTier === "special";

  const linesHtml = quote.lines
    .map(
      (line) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1C3557;">
        ${line.productName}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1C3557;">
        ${renderColorBadge(line.colorId)}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1C3557;text-align:right;">
        ${formatJpy(line.unitPrice)}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1C3557;text-align:right;">
        ${line.quantity}本
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1C3557;text-align:right;font-weight:bold;">
        ${formatJpy(line.subtotal)}
      </td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>発注通知 ${order.id}</title>
</head>
<body style="margin:0;padding:0;font-family:'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,Arial,sans-serif;background:#F5F6F8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6F8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;">

        <!-- ヘッダー -->
        <tr><td style="background:#1C3557;padding:28px 32px;">
          <div style="color:#E07B2A;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;margin-bottom:6px;">New Order</div>
          <div style="color:#ffffff;font-size:22px;font-weight:bold;">竹谷商事 発注通知</div>
          <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:4px;">${formatJpDateTime(order.receivedAt)} 受信</div>
        </td></tr>

        <!-- 発注番号 -->
        <tr><td style="padding:24px 32px 16px;">
          <div style="font-size:11px;color:#6B7280;letter-spacing:0.1em;">発注番号</div>
          <div style="font-family:ui-monospace,'SFMono-Regular',monospace;font-size:18px;color:#1C3557;font-weight:bold;">${order.id}</div>
        </td></tr>

        ${
          isSpecial
            ? `
        <tr><td style="padding:0 32px 16px;">
          <div style="background:#FEF3E9;border-left:4px solid #E07B2A;padding:12px 16px;">
            <div style="font-size:12px;color:#9A4F10;font-weight:bold;">✓ 特別価格顧客として処理されています</div>
            <div style="font-size:11px;color:#9A4F10;margin-top:2px;">顧客ID: ${quote.customerId ?? ""}</div>
          </div>
        </td></tr>
        `
            : ""
        }

        <!-- お客様情報 -->
        <tr><td style="padding:8px 32px 8px;">
          <div style="border-left:4px solid #E07B2A;padding-left:10px;margin-bottom:12px;">
            <div style="font-size:11px;letter-spacing:0.15em;color:#6B7280;text-transform:uppercase;">Customer Info</div>
            <div style="font-size:14px;color:#1C3557;font-weight:bold;">お客様情報</div>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#1C3557;">
            <tr>
              <td style="padding:6px 0;color:#6B7280;width:120px;">会社名</td>
              <td style="padding:6px 0;font-weight:bold;">${escapeHtml(order.companyName)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6B7280;">ご担当者</td>
              <td style="padding:6px 0;">${escapeHtml(order.contactName)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6B7280;">メール</td>
              <td style="padding:6px 0;"><a href="mailto:${escapeHtml(order.email)}" style="color:#E07B2A;text-decoration:none;">${escapeHtml(order.email)}</a></td>
            </tr>
            ${
              order.phone
                ? `<tr><td style="padding:6px 0;color:#6B7280;">電話番号</td><td style="padding:6px 0;">${escapeHtml(order.phone)}</td></tr>`
                : ""
            }
            ${
              order.zipCode || order.shippingAddress
                ? `<tr><td style="padding:6px 0;color:#6B7280;">納品先</td><td style="padding:6px 0;">${escapeHtml(order.zipCode ?? "")} ${escapeHtml(order.shippingAddress ?? "")}</td></tr>`
                : ""
            }
            ${
              order.desiredDelivery
                ? `<tr><td style="padding:6px 0;color:#6B7280;">希望納期</td><td style="padding:6px 0;">${escapeHtml(order.desiredDelivery)}</td></tr>`
                : ""
            }
          </table>
        </td></tr>

        <!-- 明細 -->
        <tr><td style="padding:16px 32px 8px;">
          <div style="border-left:4px solid #E07B2A;padding-left:10px;margin-bottom:12px;">
            <div style="font-size:11px;letter-spacing:0.15em;color:#6B7280;text-transform:uppercase;">Order Lines</div>
            <div style="font-size:14px;color:#1C3557;font-weight:bold;">明細</div>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #1C3557;">
            <thead>
              <tr>
                <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6B7280;background:#F9FAFB;">商品</th>
                <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6B7280;background:#F9FAFB;">色</th>
                <th style="padding:10px 8px;text-align:right;font-size:11px;color:#6B7280;background:#F9FAFB;">単価</th>
                <th style="padding:10px 8px;text-align:right;font-size:11px;color:#6B7280;background:#F9FAFB;">数量</th>
                <th style="padding:10px 8px;text-align:right;font-size:11px;color:#6B7280;background:#F9FAFB;">小計</th>
              </tr>
            </thead>
            <tbody>
              ${linesHtml}
            </tbody>
          </table>
        </td></tr>

        <!-- 合計 -->
        <tr><td style="padding:8px 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;text-align:right;font-size:12px;color:#6B7280;width:80%;">小計（税抜）</td>
              <td style="padding:6px 0;text-align:right;font-size:13px;color:#1C3557;font-weight:bold;">${formatJpy(quote.subtotal)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;text-align:right;font-size:12px;color:#6B7280;">消費税（${Math.round(quote.taxRate * 100)}%）</td>
              <td style="padding:6px 0;text-align:right;font-size:13px;color:#1C3557;font-weight:bold;">${formatJpy(quote.tax)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;text-align:right;font-size:14px;color:#E07B2A;font-weight:bold;border-top:2px solid #1C3557;">合計金額（税込）</td>
              <td style="padding:10px 0;text-align:right;font-size:20px;color:#E07B2A;font-weight:bold;border-top:2px solid #1C3557;">${formatJpy(quote.total)}</td>
            </tr>
          </table>
        </td></tr>

        ${
          order.notes
            ? `
        <tr><td style="padding:0 32px 24px;">
          <div style="border-left:4px solid #E07B2A;padding-left:10px;margin-bottom:8px;">
            <div style="font-size:11px;letter-spacing:0.15em;color:#6B7280;text-transform:uppercase;">Notes</div>
            <div style="font-size:14px;color:#1C3557;font-weight:bold;">備考</div>
          </div>
          <div style="background:#F9FAFB;padding:12px 16px;font-size:13px;color:#1C3557;white-space:pre-wrap;">${escapeHtml(order.notes)}</div>
        </td></tr>
        `
            : ""
        }

        <!-- 有効期限 -->
        <tr><td style="padding:16px 32px 24px;background:#F9FAFB;border-top:1px solid #e5e7eb;">
          <div style="font-size:11px;color:#6B7280;">見積有効期限: ${formatJpDate(quote.validUntil)}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:4px;">このメールは takeya-tape-shop.vercel.app の発注フォームから自動送信されています。</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// HTMLエスケープ
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ──────────────────────────────────────────────────────────────
//  テキスト本文（HTMLが表示できないメーラー向けフォールバック）
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────
//  お客様向け 受付確認メール（HTML）
// ──────────────────────────────────────────────────────────────

function renderCustomerConfirmHtml(
  order: OrderRequest,
  quote: Quote
): string {
  const isSpecial = quote.priceTier === "special";

  const linesHtml = quote.lines
    .map(
      (line) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1C3557;">
        ${line.productName}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1C3557;">
        ${renderColorBadge(line.colorId)}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1C3557;text-align:right;">
        ${formatJpy(line.unitPrice)}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1C3557;text-align:right;">
        ${line.quantity}本
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1C3557;text-align:right;font-weight:bold;">
        ${formatJpy(line.subtotal)}
      </td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>ご発注を承りました ${order.id}</title>
</head>
<body style="margin:0;padding:0;font-family:'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,Arial,sans-serif;background:#F5F6F8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6F8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;">

        <!-- ヘッダー -->
        <tr><td style="background:#1C3557;padding:28px 32px;">
          <div style="color:#E07B2A;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;margin-bottom:6px;">Order Received</div>
          <div style="color:#ffffff;font-size:22px;font-weight:bold;">ご発注を承りました</div>
          <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:4px;">竹谷商事 識別テープ 発注フォーム</div>
        </td></tr>

        <!-- 挨拶 -->
        <tr><td style="padding:28px 32px 8px;">
          <div style="font-size:14px;color:#1C3557;font-weight:bold;margin-bottom:4px;">${escapeHtml(order.companyName)} 御中</div>
          <div style="font-size:14px;color:#1C3557;margin-bottom:16px;">${escapeHtml(order.contactName)} 様</div>
          <p style="font-size:13px;color:#4B5563;line-height:1.8;margin:0;">
            このたびは竹谷商事の識別テープをご用命いただき、誠にありがとうございます。<br>
            下記の内容で発注を承りました。担当より別途、正式なお見積書をメールにてお送りいたしますので、<br>
            内容をご確認のうえ、ご返信にてご承認くださいますようお願い申し上げます。
          </p>
        </td></tr>

        <!-- 発注番号 -->
        <tr><td style="padding:16px 32px;">
          <div style="background:#F9FAFB;border:1px solid #e5e7eb;padding:14px 18px;text-align:center;">
            <div style="font-size:10px;color:#6B7280;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:2px;">発注番号</div>
            <div style="font-family:ui-monospace,'SFMono-Regular',monospace;font-size:16px;color:#1C3557;font-weight:bold;">${order.id}</div>
          </div>
        </td></tr>

        ${
          isSpecial
            ? `
        <tr><td style="padding:0 32px 8px;">
          <div style="background:#FEF3E9;border-left:4px solid #E07B2A;padding:10px 16px;">
            <div style="font-size:12px;color:#9A4F10;">
              ✓ 特別価格を適用させていただきました
            </div>
          </div>
        </td></tr>
        `
            : ""
        }

        <!-- 明細 -->
        <tr><td style="padding:16px 32px 8px;">
          <div style="border-left:4px solid #E07B2A;padding-left:10px;margin-bottom:12px;">
            <div style="font-size:11px;letter-spacing:0.15em;color:#6B7280;text-transform:uppercase;">Order Details</div>
            <div style="font-size:14px;color:#1C3557;font-weight:bold;">ご発注内容</div>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #1C3557;">
            <thead>
              <tr>
                <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6B7280;background:#F9FAFB;">商品</th>
                <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6B7280;background:#F9FAFB;">色</th>
                <th style="padding:10px 8px;text-align:right;font-size:11px;color:#6B7280;background:#F9FAFB;">単価</th>
                <th style="padding:10px 8px;text-align:right;font-size:11px;color:#6B7280;background:#F9FAFB;">数量</th>
                <th style="padding:10px 8px;text-align:right;font-size:11px;color:#6B7280;background:#F9FAFB;">小計</th>
              </tr>
            </thead>
            <tbody>
              ${linesHtml}
            </tbody>
          </table>
        </td></tr>

        <!-- 合計 -->
        <tr><td style="padding:8px 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;text-align:right;font-size:12px;color:#6B7280;width:80%;">小計（税抜）</td>
              <td style="padding:6px 0;text-align:right;font-size:13px;color:#1C3557;font-weight:bold;">${formatJpy(quote.subtotal)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;text-align:right;font-size:12px;color:#6B7280;">消費税（${Math.round(quote.taxRate * 100)}%）</td>
              <td style="padding:6px 0;text-align:right;font-size:13px;color:#1C3557;font-weight:bold;">${formatJpy(quote.tax)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;text-align:right;font-size:14px;color:#E07B2A;font-weight:bold;border-top:2px solid #1C3557;">合計金額（税込）</td>
              <td style="padding:10px 0;text-align:right;font-size:20px;color:#E07B2A;font-weight:bold;border-top:2px solid #1C3557;">${formatJpy(quote.total)}</td>
            </tr>
          </table>
          <div style="font-size:10px;color:#9CA3AF;text-align:right;margin-top:4px;">※正式金額は後日お送りする見積書にてご確認ください</div>
        </td></tr>

        <!-- 今後の流れ -->
        <tr><td style="padding:0 32px 24px;">
          <div style="border-left:4px solid #E07B2A;padding-left:10px;margin-bottom:12px;">
            <div style="font-size:11px;letter-spacing:0.15em;color:#6B7280;text-transform:uppercase;">Next Steps</div>
            <div style="font-size:14px;color:#1C3557;font-weight:bold;">今後の流れ</div>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:0;">
            <tr>
              <td style="padding:16px;font-size:13px;color:#4B5563;line-height:1.9;">
                <div><span style="color:#E07B2A;font-weight:bold;">1.</span> 担当者が内容を確認し、正式な見積書（PDF）を作成します</div>
                <div><span style="color:#E07B2A;font-weight:bold;">2.</span> このメールアドレス宛に見積書をお送りします（1〜2営業日以内）</div>
                <div><span style="color:#E07B2A;font-weight:bold;">3.</span> 見積書の内容をご確認のうえ、ご返信にてご承認ください</div>
                <div><span style="color:#E07B2A;font-weight:bold;">4.</span> 承認後、出荷準備に入り、発送完了のご連絡をいたします</div>
                <div><span style="color:#E07B2A;font-weight:bold;">5.</span> 発送後、ご請求書を別途お送りいたします</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- お問い合わせ -->
        <tr><td style="padding:16px 32px 28px;background:#F9FAFB;border-top:1px solid #e5e7eb;">
          <div style="font-size:12px;color:#6B7280;line-height:1.7;">
            本メールに心当たりがない場合、お手数ですがこのメールにそのままご返信ください。<br>
            ご不明な点は <a href="mailto:s_miyamoto@greensprout0315.com" style="color:#E07B2A;text-decoration:none;">s_miyamoto@greensprout0315.com</a> までお問い合わせください。
          </div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:12px;">
            株式会社竹谷商事<br>
            https://takeya-tape-shop.vercel.app
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// お客様向け テキスト版
function renderCustomerConfirmText(
  order: OrderRequest,
  quote: Quote
): string {
  const lines = [
    `${order.companyName} 御中`,
    `${order.contactName} 様`,
    "",
    "このたびは竹谷商事の識別テープをご用命いただき、誠にありがとうございます。",
    "下記の内容で発注を承りました。担当より別途、正式なお見積書をメールにてお送り",
    "いたしますので、内容をご確認のうえ、ご返信にてご承認くださいますようお願い",
    "申し上げます。",
    "",
    "====================================",
    `  発注番号: ${order.id}`,
    "====================================",
  ];

  if (quote.priceTier === "special") {
    lines.push("", "✓ 特別価格を適用させていただきました");
  }

  lines.push("", "── ご発注内容 ──");
  for (const line of quote.lines) {
    lines.push(
      `${line.productName} ${line.colorName}`,
      `  ${formatJpy(line.unitPrice)} × ${line.quantity}本 = ${formatJpy(line.subtotal)}`
    );
  }

  lines.push(
    "",
    `小計（税抜）    : ${formatJpy(quote.subtotal)}`,
    `消費税(${Math.round(quote.taxRate * 100)}%)       : ${formatJpy(quote.tax)}`,
    `合計金額（税込）: ${formatJpy(quote.total)}`,
    "※正式金額は後日お送りする見積書にてご確認ください",
    "",
    "── 今後の流れ ──",
    "1. 担当者が内容を確認し、正式な見積書（PDF）を作成します",
    "2. このメールアドレス宛に見積書をお送りします（1〜2営業日以内）",
    "3. 見積書の内容をご確認のうえ、ご返信にてご承認ください",
    "4. 承認後、出荷準備に入り、発送完了のご連絡をいたします",
    "5. 発送後、ご請求書を別途お送りいたします",
    "",
    "── お問い合わせ ──",
    "本メールに心当たりがない場合、お手数ですがこのメールにそのままご返信ください。",
    "ご不明な点は s_miyamoto@greensprout0315.com までお問い合わせください。",
    "",
    "---",
    "株式会社竹谷商事",
    "https://takeya-tape-shop.vercel.app"
  );

  return lines.join("\n");
}

function renderOrderEmailText(order: OrderRequest, quote: Quote): string {
  const isSpecial = quote.priceTier === "special";
  const lines = [
    "====================================",
    "  竹谷商事 発注通知",
    "====================================",
    "",
    `発注番号 : ${order.id}`,
    `受信日時 : ${formatJpDateTime(order.receivedAt)}`,
  ];
  if (isSpecial) {
    lines.push(`顧客区分 : 特別価格顧客 (${quote.customerId ?? ""})`);
  }
  lines.push(
    "",
    "── お客様情報 ──",
    `会社名     : ${order.companyName}`,
    `担当者     : ${order.contactName}`,
    `メール     : ${order.email}`
  );
  if (order.phone) lines.push(`電話番号   : ${order.phone}`);
  if (order.zipCode || order.shippingAddress) {
    lines.push(
      `納品先     : ${order.zipCode ?? ""} ${order.shippingAddress ?? ""}`.trim()
    );
  }
  if (order.desiredDelivery) lines.push(`希望納期   : ${order.desiredDelivery}`);

  lines.push("", "── 明細 ──");
  for (const line of quote.lines) {
    lines.push(
      `${line.productName} ${line.colorName}`,
      `  ${formatJpy(line.unitPrice)} × ${line.quantity}本 = ${formatJpy(line.subtotal)}`
    );
  }

  lines.push(
    "",
    `小計（税抜）    : ${formatJpy(quote.subtotal)}`,
    `消費税(${Math.round(quote.taxRate * 100)}%)       : ${formatJpy(quote.tax)}`,
    `合計金額（税込）: ${formatJpy(quote.total)}`
  );

  if (order.notes) {
    lines.push("", "── 備考 ──", order.notes);
  }

  lines.push(
    "",
    `見積有効期限: ${formatJpDate(quote.validUntil)}`,
    "",
    "---",
    "このメールは takeya-tape-shop.vercel.app の発注フォームから自動送信されています。"
  );

  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────
//  送信ロジック
// ──────────────────────────────────────────────────────────────

let cachedTransporter: Transporter | null = null;
function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransporter;
}

/**
 * 社内向け 発注通知メールを送信
 */
async function sendInternalNotification(
  order: OrderRequest,
  quote: Quote,
  transporter: Transporter,
  from: string
): Promise<EmailSendResult> {
  const isSpecial = quote.priceTier === "special";
  const subject = `【竹谷商事 発注通知】${order.companyName} 様 / ${formatJpy(quote.total)}（税込）${isSpecial ? " [特価]" : ""} / ${order.id}`;

  try {
    const info = await transporter.sendMail({
      from,
      to: ORDER_NOTIFY_RECIPIENTS,
      replyTo: order.email,
      subject,
      html: renderOrderEmailHtml(order, quote),
      text: renderOrderEmailText(order, quote),
    });
    console.log("[EMAIL] 社内通知メール送信成功", {
      orderId: order.id,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
    return { ok: true, id: info.messageId || "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[EMAIL] 社内通知メール送信失敗", {
      orderId: order.id,
      error: message,
    });
    return { ok: false, reason: "error", error: message };
  }
}

/**
 * お客様向け 受付確認メールを送信
 */
async function sendCustomerConfirmation(
  order: OrderRequest,
  quote: Quote,
  transporter: Transporter,
  from: string
): Promise<EmailSendResult> {
  const subject = `【竹谷商事】ご発注を承りました / ${order.id}`;

  try {
    const info = await transporter.sendMail({
      from,
      to: order.email,
      replyTo: "s_miyamoto@greensprout0315.com",
      subject,
      html: renderCustomerConfirmHtml(order, quote),
      text: renderCustomerConfirmText(order, quote),
    });
    console.log("[EMAIL] 顧客受付確認メール送信成功", {
      orderId: order.id,
      messageId: info.messageId,
      recipient: order.email,
    });
    return { ok: true, id: info.messageId || "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[EMAIL] 顧客受付確認メール送信失敗", {
      orderId: order.id,
      recipient: order.email,
      error: message,
    });
    return { ok: false, reason: "error", error: message };
  }
}

/**
 * 発注通知メールを社内2名＋お客様の3宛先に並列送信
 *
 * 環境変数 GMAIL_USER / GMAIL_APP_PASSWORD が未設定の場合はスキップして警告ログのみ。
 * どちらかが失敗しても片方は届くよう、Promise.allSettled で並列送信。
 */
export type OrderNotificationResult =
  | { ok: true; internal: EmailSendResult; customer: EmailSendResult }
  | { ok: false; reason: "disabled" };

export async function sendOrderNotification(
  order: OrderRequest,
  quote: Quote
): Promise<OrderNotificationResult> {
  const transporter = getTransporter();
  const from = getFromAddress();
  if (!transporter || !from) {
    console.warn(
      "[EMAIL] GMAIL_USER / GMAIL_APP_PASSWORD が未設定のためメール送信をスキップしました。",
      { orderId: order.id }
    );
    return { ok: false, reason: "disabled" };
  }

  // 社内通知とお客様受付確認を並列送信
  //  どちらかが失敗しても、もう片方は正常に送られる
  const [internalSettled, customerSettled] = await Promise.allSettled([
    sendInternalNotification(order, quote, transporter, from),
    sendCustomerConfirmation(order, quote, transporter, from),
  ]);

  const internal: EmailSendResult =
    internalSettled.status === "fulfilled"
      ? internalSettled.value
      : {
          ok: false,
          reason: "error",
          error:
            internalSettled.reason instanceof Error
              ? internalSettled.reason.message
              : String(internalSettled.reason),
        };

  const customer: EmailSendResult =
    customerSettled.status === "fulfilled"
      ? customerSettled.value
      : {
          ok: false,
          reason: "error",
          error:
            customerSettled.reason instanceof Error
              ? customerSettled.reason.message
              : String(customerSettled.reason),
        };

  return { ok: true, internal, customer };
}
