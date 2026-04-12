/**
 * Auth — JWT セッション管理
 *
 * jose で署名付き JWT を発行し、HTTP-only cookie に格納する。
 * /admin は Middleware で BASIC 認証を二重にかける。
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "./db";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "takeya-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: number;
  email: string;
  role: "admin" | "customer";
  customerId: number | null;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/** JWT トークンを生成 */
export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

/** JWT トークンを検証してペイロードを返す */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** cookie からセッションを取得 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** ログイン: email + password を検証し、セッション cookie をセット */
export async function login(
  email: string,
  password: string
): Promise<{ ok: true; session: SessionPayload } | { ok: false; error: string }> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, email, password_hash, role, customer_id
    FROM users WHERE email = ${email}
  `;
  if (rows.length === 0) {
    return { ok: false, error: "メールアドレスまたはパスワードが正しくありません" };
  }
  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return { ok: false, error: "メールアドレスまたはパスワードが正しくありません" };
  }

  const session: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    customerId: user.customer_id,
  };

  const token = await createSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return { ok: true, session };
}

/** ログアウト: セッション cookie を削除 */
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
