import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ token: string }> };

/** GET /api/invite/:token — トークン検証 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const sql = getDb();

  const rows = await sql`
    SELECT i.*, c.name AS customer_name
    FROM invitations i
    JOIN customers c ON c.id = i.customer_id
    WHERE i.token = ${token}
      AND i.used_at IS NULL
      AND i.expires_at > NOW()
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "このリンクは無効または期限切れです" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    email: rows[0].email,
    customerName: rows[0].customer_name,
  });
}

/** POST /api/invite/:token — パスワード設定してアカウント作成 */
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const { password } = await req.json();

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "パスワードは8文字以上で入力してください" },
      { status: 400 }
    );
  }

  const sql = getDb();

  const rows = await sql`
    SELECT * FROM invitations
    WHERE token = ${token}
      AND used_at IS NULL
      AND expires_at > NOW()
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "このリンクは無効または期限切れです" },
      { status: 400 }
    );
  }

  const invitation = rows[0];

  // ユーザー作成
  const hash = await bcrypt.hash(password, 12);
  await sql`
    INSERT INTO users (email, password_hash, role, customer_id)
    VALUES (${invitation.email}, ${hash}, 'customer', ${invitation.customer_id})
  `;

  // 招待トークンを使用済みに
  await sql`UPDATE invitations SET used_at = NOW() WHERE id = ${invitation.id}`;

  // 顧客ステータスを active に + activated_at
  await sql`
    UPDATE customers SET status = 'active', activated_at = NOW()
    WHERE id = ${invitation.customer_id}
  `;

  return NextResponse.json({ ok: true });
}
