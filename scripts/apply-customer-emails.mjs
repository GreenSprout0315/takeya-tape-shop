/**
 * apply-customer-emails.mjs
 *
 * generate-customer-passwords.mjs で出力した Excel に E列（登録メアド）を
 * 記入してもらった後、このスクリプトで一括で:
 *   1. customers.email を更新
 *   2. customers.pending_password_hash から users レコードを作成（INSERT）
 *   3. customers.status を 'active' に、activated_at に NOW() を記録
 *   4. customers.pending_password_hash をクリア
 *
 * 冪等: 既に user が存在する customer はスキップ（email の再更新のみ実施）
 *
 * Usage:
 *   node scripts/apply-customer-emails.mjs <path-to-filled-xlsx>
 */

import { neon } from "@neondatabase/serverless";
import ExcelJS from "exceljs";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const sql = neon(process.env.DATABASE_URL);

const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error("Usage: node scripts/apply-customer-emails.mjs <filled.xlsx>");
  process.exit(1);
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.getWorksheet("顧客ログイン情報");
  if (!ws) throw new Error("シート '顧客ログイン情報' が見つかりません");

  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return; // ヘッダ
    const id = row.getCell(1).value;
    const name = row.getCell(2).value;
    const emailNew = row.getCell(5).value;
    if (id && emailNew && String(emailNew).trim()) {
      rows.push({
        id: Number(id),
        name: String(name),
        email: String(emailNew).trim(),
      });
    }
  });

  console.log(`📊 メアド記入済み: ${rows.length} 件`);

  let created = 0;
  let skipped = 0;
  let errors = [];

  for (const r of rows) {
    try {
      const customers = await sql`
        SELECT id, email, pending_password_hash FROM customers WHERE id = ${r.id}
      `;
      if (customers.length === 0) {
        errors.push(`id=${r.id}: customer not found`);
        continue;
      }
      const c = customers[0];

      // 既に user が存在する場合はスキップ
      const existingUsers = await sql`
        SELECT id FROM users WHERE customer_id = ${r.id}
      `;
      if (existingUsers.length > 0) {
        // email だけ更新
        await sql`UPDATE customers SET email = ${r.email} WHERE id = ${r.id}`;
        await sql`UPDATE users SET email = ${r.email} WHERE customer_id = ${r.id}`;
        skipped++;
        continue;
      }

      if (!c.pending_password_hash) {
        errors.push(`id=${r.id} (${r.name}): pending_password_hash なし → generate先行で実行`);
        continue;
      }

      // email 重複チェック（他 user と衝突しないように）
      const dup = await sql`SELECT id FROM users WHERE email = ${r.email}`;
      if (dup.length > 0) {
        errors.push(`id=${r.id} (${r.name}): email=${r.email} は既に他ユーザーが使用中`);
        continue;
      }

      await sql`
        INSERT INTO users (email, password_hash, role, customer_id)
        VALUES (${r.email}, ${c.pending_password_hash}, 'customer', ${r.id})
      `;
      await sql`
        UPDATE customers
        SET email = ${r.email},
            status = 'active',
            activated_at = NOW(),
            pending_password_hash = NULL
        WHERE id = ${r.id}
      `;
      created++;
    } catch (e) {
      errors.push(`id=${r.id} (${r.name}): ${e.message}`);
    }
  }

  console.log(`\n✅ user 新規作成: ${created}`);
  console.log(`   既存user更新: ${skipped}`);
  if (errors.length > 0) {
    console.log(`\n⚠️ エラー ${errors.length} 件:`);
    errors.forEach((e) => console.log("   - " + e));
  }
}

main().catch((e) => {
  console.error("❌ エラー:", e);
  process.exit(1);
});
