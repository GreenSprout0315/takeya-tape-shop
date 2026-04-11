/**
 * Email — 発注通知メール送信
 *
 * Resend API 経由で、発注受信時にオーナー＆竹谷商事担当者へ通知メールを送信する。
 *
 * 必要な環境変数:
 * - RESEND_API_KEY: Resend の API キー
 * - ORDER_NOTIFY_FROM (optional): 送信元メールアドレス
 *     デフォルトは "onboarding@resend.dev"（Resend の検証不要アドレス）
 *     独自ドメインを使う場合は Resend ダッシュボードでドメイン検証が必要
 *
 * グレースフル・デグラデーション:
 * - RESEND_API_KEY が未設定の場合はメール送信をスキップして warning ログを出す
 * - これにより ローカル開発でも本番でも動作が壊れない
 */

import { Resend } from "resend";
import { COLORS, formatJpy } from "./product-master";
import type { OrderRequest, Quote } from "./order";

// ──────────────────────────────────────────────────────────────
//  送信先設定
// ──────────────────────────────────────────────────────────────

/** 発注通知メールの受信者（必ず CC するアドレス） */
export const ORDER_NOTIFY_RECIPIENTS = [
  "s_miyamoto@greensprout0315.com",
  "maki_kumabe@taketani.co.jp",
];

/** 送信元メールアドレス（環境変数で上書き可能） */
function getFromAddress(): string {
  return (
    process.env.ORDER_NOTIFY_FROM ||
    "竹谷商事 発注フォーム <onboarding@resend.dev>"
  );
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

let cachedClient: Resend | null = null;
function getClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

/**
 * 発注通知メールを両方の担当者アドレスに送信
 *
 * 環境変数 RESEND_API_KEY が未設定の場合はスキップして警告ログのみ。
 * 送信失敗時もエラー内容を返すだけで、呼び出し元の処理は続行される想定
 * （顧客の発注体験を失敗させないため）。
 */
export async function sendOrderNotification(
  order: OrderRequest,
  quote: Quote
): Promise<EmailSendResult> {
  const client = getClient();
  if (!client) {
    console.warn(
      "[EMAIL] RESEND_API_KEY が未設定のためメール送信をスキップしました。",
      { orderId: order.id }
    );
    return { ok: false, reason: "disabled" };
  }

  const isSpecial = quote.priceTier === "special";
  const subject = `【竹谷商事 発注通知】${order.companyName} 様 / ${formatJpy(quote.total)}（税込）${isSpecial ? " [特価]" : ""} / ${order.id}`;

  const html = renderOrderEmailHtml(order, quote);
  const text = renderOrderEmailText(order, quote);

  try {
    const result = await client.emails.send({
      from: getFromAddress(),
      to: ORDER_NOTIFY_RECIPIENTS,
      replyTo: order.email,
      subject,
      html,
      text,
    });

    // Resend v6 は { data, error } の discriminated union を返す
    const resultError = (result as { error?: unknown }).error;
    if (resultError) {
      const errMsg =
        typeof resultError === "string"
          ? resultError
          : JSON.stringify(resultError);
      console.error("[EMAIL] Resend returned error", {
        orderId: order.id,
        error: errMsg,
      });
      return { ok: false, reason: "error", error: errMsg };
    }

    const resendId =
      (result as { data?: { id?: string } }).data?.id ?? "";

    console.log("[EMAIL] 発注通知メール送信成功", {
      orderId: order.id,
      resendId,
      recipients: ORDER_NOTIFY_RECIPIENTS,
    });

    return { ok: true, id: resendId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[EMAIL] Resend API 呼び出し失敗", {
      orderId: order.id,
      error: message,
    });
    return { ok: false, reason: "error", error: message };
  }
}
