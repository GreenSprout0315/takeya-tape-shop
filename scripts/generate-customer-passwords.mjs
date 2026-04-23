/**
 * generate-customer-passwords.mjs
 *
 * 既存の customers 全件にログイン用パスワードを生成し、
 * bcrypt ハッシュを customers.pending_password_hash に保存。
 * 平文パスワードを Excel に出力（配布用・1回限り）。
 *
 * 運用フロー:
 *   1. このスクリプトでパスワード準備 + Excel 出力
 *   2. オーナーが取引先からメアドを聞き Excel に記入
 *   3. apply-customer-emails.mjs で Excel を読み込み、users テーブルに
 *      email + pending_password_hash から user レコードを作成
 *   4. customer.pending_password_hash はクリア
 *
 * 冪等性:
 *   - users テーブルに既に email 登録済みの customer はスキップ
 *   - pending_password_hash が既に存在する customer もスキップ（再実行安全）
 *   - --force で既存 pending_password_hash も上書き（全再発行時のみ）
 *
 * Usage:
 *   node scripts/generate-customer-passwords.mjs
 *   node scripts/generate-customer-passwords.mjs --force
 */

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { readFileSync } from "fs";
import { randomInt } from "crypto";
import path from "path";
import os from "os";

// .env.local 読み込み
const env = readFileSync(".env.local", "utf-8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const sql = neon(process.env.DATABASE_URL);

const FORCE = process.argv.includes("--force");

// 読みやすさ優先のパスワードアルファベット（0/O/1/l/I/i を除外）
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSWORD_LENGTH = 10;

function generatePassword() {
  let out = "";
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

async function ensureColumn() {
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS pending_password_hash TEXT`;
  console.log("✅ customers.pending_password_hash カラム準備完了");
}

async function fetchTargets() {
  // users テーブルに既に email 登録済みの customer_id を取得
  const existingUsers = await sql`
    SELECT customer_id FROM users WHERE customer_id IS NOT NULL
  `;
  const userCustomerIds = new Set(existingUsers.map((r) => r.customer_id));

  const allCustomers = await sql`
    SELECT id, name, smile_code, email, pending_password_hash
    FROM customers
    ORDER BY id
  `;

  const targets = [];
  const skippedHasUser = [];
  const skippedHasHash = [];

  for (const c of allCustomers) {
    if (userCustomerIds.has(c.id)) {
      skippedHasUser.push(c);
      continue;
    }
    if (!FORCE && c.pending_password_hash) {
      skippedHasHash.push(c);
      continue;
    }
    targets.push(c);
  }

  return { targets, skippedHasUser, skippedHasHash, total: allCustomers.length };
}

async function main() {
  console.log(`🔐 顧客パスワード一括生成 (${FORCE ? "FORCE mode" : "idempotent mode"})`);

  await ensureColumn();

  const { targets, skippedHasUser, skippedHasHash, total } = await fetchTargets();

  console.log(`\n📊 対象: ${targets.length} / 全 ${total} 件`);
  console.log(`   スキップ (既にuser存在): ${skippedHasUser.length}`);
  console.log(`   スキップ (hash既存、--force で上書き可): ${skippedHasHash.length}`);

  if (targets.length === 0) {
    console.log("\n✨ 対象ゼロ。すべて既に処理済み。");
    return;
  }

  // パスワード生成 + ハッシュ化 + DB更新
  const rows = []; // Excel 出力用
  let done = 0;
  for (const c of targets) {
    const plain = generatePassword();
    const hash = await bcrypt.hash(plain, 10);
    await sql`
      UPDATE customers
      SET pending_password_hash = ${hash}
      WHERE id = ${c.id}
    `;
    rows.push({
      id: c.id,
      name: c.name,
      smile_code: c.smile_code || "",
      email_existing: c.email || "",
      password: plain,
    });
    done++;
    if (done % 50 === 0) console.log(`  ... ${done} / ${targets.length} 処理済`);
  }

  console.log(`\n✅ パスワード生成完了: ${done} 件`);

  // Excel 出力
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("顧客ログイン情報");

  ws.columns = [
    { header: "customer_id", key: "id", width: 10 },
    { header: "会社名", key: "name", width: 45 },
    { header: "SMILEコード", key: "smile_code", width: 14 },
    { header: "既存メアド", key: "email_existing", width: 28 },
    { header: "登録メアド（ここに記入）", key: "email_new", width: 32 },
    { header: "パスワード（配布用）", key: "password", width: 18 },
    { header: "ログインURL", key: "url", width: 48 },
    { header: "連絡状況メモ", key: "note", width: 24 },
  ];

  for (const r of rows) {
    ws.addRow({
      ...r,
      url: "https://takeya-tape-shop.vercel.app/login",
    });
  }

  // ヘッダ装飾
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0E6D2" },
  };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // 登録メアド欄を黄色でハイライト（記入欄と分かるように）
  for (let i = 2; i <= rows.length + 1; i++) {
    ws.getCell(`E${i}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF2CC" },
    };
    ws.getCell(`F${i}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFE1E1" },
    };
    ws.getCell(`F${i}`).font = { name: "Consolas" };
  }

  // 注意書きシート
  const notes = wb.addWorksheet("READ_ME");
  notes.columns = [{ header: "項目", width: 24 }, { header: "内容", width: 80 }];
  notes.getRow(1).font = { bold: true };
  notes.addRow({ header: "", ...{} });
  [
    ["生成日時", new Date().toLocaleString("ja-JP")],
    ["対象件数", String(rows.length)],
    ["ログインURL", "https://takeya-tape-shop.vercel.app/login"],
    ["フロー", "① 顧客からメアドを聞く → E列に記入 → 保存"],
    ["", "② apply-customer-emails.mjs で一括登録"],
    ["", "③ 顧客にメアド + パスワードを伝える"],
    ["セキュリティ", "パスワード平文を含むためメール添付・共有リンク配布は禁止"],
    ["", "オーナーPC保管、配布時は1件ずつ電話・SMS・Signal 等で伝達推奨"],
    ["再発行", "パスワードを紛失した顧客は /login の「パスワード再発行」か管理画面で対応"],
  ].forEach((r) => notes.addRow({ 項目: r[0], 内容: r[1] }));

  // 出力先
  const dateStr = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const deliveryDir = path.join(os.homedir(), "Desktop", "納品・確認");
  const outPath = path.join(
    deliveryDir,
    `${dateStr}_竹谷EC_顧客ログイン情報_${rows.length}件.xlsx`
  );
  await wb.xlsx.writeFile(outPath);

  console.log(`\n📄 Excel 出力: ${outPath}`);
  console.log("\n🎯 次ステップ:");
  console.log("   1. オーナーが顧客からメアド聞き取り → Excel の E列 に記入");
  console.log("   2. node scripts/apply-customer-emails.mjs <filled.xlsx> でDB一括登録");
}

main().catch((e) => {
  console.error("❌ エラー:", e);
  process.exit(1);
});
