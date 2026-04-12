/**
 * Database — Neon Postgres 接続ユーティリティ
 *
 * @neondatabase/serverless を使い、Vercel Functions 上でもプール経由で
 * 低レイテンシ接続する。
 */

import { neon } from "@neondatabase/serverless";

/**
 * SQL タグ関数を返す。
 * 呼び出しごとに DATABASE_URL を参照するため、テスト時のモック差し替えも可能。
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}
