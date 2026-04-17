import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/admin/customers/lookup?q=xxx
 *
 * 新規顧客追加時に、会社名を部分一致検索してSMILE実績のある既存取引先を候補として返す。
 * 重複登録を防ぐ & smile_code を自動引き当てるための UI 支援。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ matches: [] });
  }

  // 法人格を取り除いた正規化キーも検索対象に含める
  const normalized = q.replace(/株式会社|有限会社|合同会社|一般社団法人|\(株\)|㈱|\s/g, "");

  const sql = getDb();
  const rows = await sql`
    SELECT id, name, smile_code, notes, status
    FROM customers
    WHERE name ILIKE ${"%" + q + "%"}
       OR name ILIKE ${"%" + normalized + "%"}
    ORDER BY
      CASE WHEN name = ${q} THEN 0 ELSE 1 END,
      LENGTH(name)
    LIMIT 10
  `;

  return NextResponse.json({ matches: rows });
}
