import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { buildSmileCsv } from "@/lib/smile-csv";

/**
 * GET /api/cron/smile-export
 *
 * Vercel Cron から毎日 14:00 JST (05:00 UTC) に呼ばれる。
 * 過去24時間分の approved〜paid な受注を SMILE 取込CSVに変換し、
 * 宮本さん & 熊部さんにメール送信する。
 * Vercel Hobby プランの制約で 1日1回に設定。
 *
 * Vercel Cron 認証: header "authorization: Bearer CRON_SECRET"
 * （vercel.json で crons 設定、CRON_SECRET は Vercel の環境変数）
 */
export async function GET(req: NextRequest) {
  // Vercel Cron は authorization header を自動付与するのでそれで認証
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.CRON_SECRET && authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 過去24時間分を対象（4h毎/12h毎等でオーバーラップしても冪等）
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { buffer, orderCount, lineCount, missingProductCodes } = await buildSmileCsv(since);

  if (orderCount === 0) {
    console.log("[CRON] SMILE export: 対象発注なし、メール送信をスキップ");
    return NextResponse.json({ ok: true, orderCount, lineCount });
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn("[CRON] Gmail 認証情報なし、メール送信スキップ");
    return NextResponse.json({ ok: false, error: "no gmail credentials" }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  const subject = `【竹谷商事 EC】SMILE 受注取込CSV (${orderCount}件 / ${lineCount}明細)`;
  const body = [
    "竹谷商事EC発注ポータルから出力された SMILE 受注取込CSV をお送りします。",
    "",
    `対象期間: ${since.toISOString()} 以降`,
    `発注件数: ${orderCount}件`,
    `明細行数: ${lineCount}行`,
    missingProductCodes.length > 0
      ? `⚠️ SMILE商品コード未マッピング: ${missingProductCodes.join(", ")}`
      : "",
    "",
    "添付ファイル: " + `smile-orders-${stamp}.csv`,
    "",
    "フォーマット: UTF-16LE (BOM付き) / タブ区切り",
  ].filter(Boolean).join("\n");

  await transporter.sendMail({
    from: `竹谷商事 EC システム <${user}>`,
    to: ["s_miyamoto@greensprout0315.com", "maki_kumabe@taketani.co.jp"],
    subject,
    text: body,
    attachments: [
      {
        filename: `smile-orders-${stamp}.csv`,
        content: buffer,
        contentType: "text/csv; charset=utf-16le",
      },
    ],
  });

  console.log("[CRON] SMILE export 送信成功", { orderCount, lineCount });
  return NextResponse.json({ ok: true, orderCount, lineCount, missingProductCodes });
}
