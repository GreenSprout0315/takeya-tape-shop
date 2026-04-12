import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/customers/:id/invite — 招待メール送信 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getDb();

  // 顧客取得
  const rows = await sql`SELECT * FROM customers WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
  }
  const customer = rows[0];

  if (!customer.email) {
    return NextResponse.json(
      { error: "メールアドレスが未登録です。先に顧客情報を編集してください" },
      { status: 400 }
    );
  }

  // 既にユーザーが存在するか確認
  const existingUser = await sql`
    SELECT id FROM users WHERE customer_id = ${id}
  `;
  if (existingUser.length > 0) {
    return NextResponse.json(
      { error: "この顧客は既にアカウントが発行済みです" },
      { status: 400 }
    );
  }

  // トークン生成（48時間有効）
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await sql`
    INSERT INTO invitations (token, customer_id, email, expires_at)
    VALUES (${token}, ${id}, ${customer.email}, ${expiresAt.toISOString()})
  `;

  // 招待メール送信
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://takeya-tape-shop.vercel.app";
  const inviteUrl = `${baseUrl}/invite/${token}`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"竹谷商事 発注ポータル" <${process.env.GMAIL_USER}>`,
    to: customer.email,
    subject: "【竹谷商事】発注ポータル アカウント発行のお知らせ",
    text: `${customer.contact_name || customer.name} 様

いつもお世話になっております。
竹谷商事の発注ポータルのアカウントが発行されました。

以下のURLからパスワードを設定してログインしてください。
（このリンクは48時間有効です）

${inviteUrl}

ご不明な点がございましたら、担当の宮本までお問い合わせください。

────────────────────
株式会社 竹谷商事
宮本 俊輔
TEL: 06-6661-6946
Email: s_miyamoto@greensprout0315.com
────────────────────`,
  });

  // 顧客の invited_at を更新
  await sql`UPDATE customers SET invited_at = NOW() WHERE id = ${id}`;

  return NextResponse.json({ ok: true, email: customer.email });
}
