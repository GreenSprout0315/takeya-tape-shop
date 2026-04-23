/**
 * match-emails-from-contacts.mjs
 *
 * generate-customer-passwords.mjs で出力したExcelの E列（登録メアド） を、
 * 名刺管理ツール `.company/contacts/index.json` から会社名マッチで自動補完する。
 *
 * マッチング:
 *   1. 会社名を正規化（株式会社/㈱/(株)/有限会社/㈲/(有)除去、全半角統一、スペース除去、小文字化）
 *   2. 完全一致 → 候補
 *   3. 一方が他方を包含 → 候補（例: 「○○組合」と「○○森林組合」）
 *   4. 最終 first_contact/last_contact が新しいカードを優先
 *
 * 出力:
 *   - <元ファイル名>_名刺紐付け済_{date}.xlsx を同じフォルダに出力
 *   - E列: マッチしたメアド（一意な1件のみ自動入力、複数候補はH列にリスト）
 *   - H列: 担当者名＋補足（候補が複数の場合は全件列挙）
 *
 * Usage:
 *   node scripts/match-emails-from-contacts.mjs "<path-to-excel>"
 */

import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const CONTACTS_JSON = String.raw`C:\greensprout\.company\contacts\index.json`;

const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error("Usage: node scripts/match-emails-from-contacts.mjs <path-to-excel>");
  process.exit(1);
}

// ── 会社名 正規化 ─────────────────────────────
function normalize(s) {
  if (!s) return "";
  return s
    // 全角→半角 英数字
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    // 全角スペース→半角
    .replace(/\u3000/g, " ")
    // 法人格の括弧付き記号 → 除去
    .replace(/[㈱㈲㈳㈵]/g, "")
    .replace(/[(（]株[)）]/g, "")
    .replace(/[(（]有[)）]/g, "")
    .replace(/[(（]社[)）]/g, "")
    // 法人格テキスト → 除去
    .replace(/株式会社/g, "")
    .replace(/有限会社/g, "")
    .replace(/合同会社/g, "")
    .replace(/一般社団法人/g, "")
    .replace(/一般財団法人/g, "")
    .replace(/公益社団法人/g, "")
    .replace(/公益財団法人/g, "")
    .replace(/独立行政法人/g, "")
    // 空白・区切り記号 除去
    .replace(/[\s・、，,.\-ー―‐‑\u2010-\u2015()（）【】［\[\]]/g, "")
    .toLowerCase()
    .trim();
}

function latestContact(card) {
  return card.last_contact || card.first_contact || "1970-01-01";
}

async function main() {
  // 名刺データ読み込み
  const contacts = JSON.parse(fs.readFileSync(CONTACTS_JSON, "utf-8"));
  const cards = contacts.cards.filter((c) => c.email && c.company);
  console.log(`📇 名刺DB: 全${contacts.count}件中 メアド有 ${cards.length}件`);

  // 会社名正規化 → カード配列 インデックス
  const byCompany = new Map();
  for (const c of cards) {
    const key = normalize(c.company);
    if (!key) continue;
    if (!byCompany.has(key)) byCompany.set(key, []);
    byCompany.get(key).push(c);
  }
  const companyKeys = [...byCompany.keys()];

  // Excel 読み込み
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.getWorksheet("顧客ログイン情報");
  if (!ws) throw new Error("シート '顧客ログイン情報' が見つかりません");

  let filled = 0;
  let multi = 0;
  let miss = 0;

  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return;
    const customerName = String(row.getCell(2).value || "").trim();
    const emailNew = String(row.getCell(5).value || "").trim();
    if (!customerName) return;
    if (emailNew) return; // 既に入力済みはスキップ

    const key = normalize(customerName);
    if (!key) return;

    // 完全一致 → 包含一致
    let candidates = byCompany.get(key) || [];
    if (candidates.length === 0) {
      for (const ck of companyKeys) {
        if (ck.includes(key) || key.includes(ck)) {
          candidates = candidates.concat(byCompany.get(ck));
        }
      }
    }
    if (candidates.length === 0) {
      miss++;
      return;
    }

    // 最新コンタクト順に
    candidates.sort((a, b) => latestContact(b).localeCompare(latestContact(a)));

    if (candidates.length === 1) {
      const c = candidates[0];
      row.getCell(5).value = c.email;
      row.getCell(8).value = `名刺DB: ${c.name}${c.position ? ` (${c.position})` : ""}`;
      // 自動補完セルをハイライト（緑系）
      row.getCell(5).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDFF5E1" },
      };
      filled++;
    } else {
      // 複数候補 → 代表のみ入力し、H列に全候補を列挙
      const primary = candidates[0];
      row.getCell(5).value = primary.email;
      row.getCell(5).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF9B1" },
      };
      const list = candidates
        .map(
          (c) => `${c.email} (${c.name}${c.position ? ` / ${c.position}` : ""})`
        )
        .join(" / ");
      row.getCell(8).value = `【要確認: 複数候補】${list}`;
      multi++;
    }
  });

  const dir = path.dirname(xlsxPath);
  const base = path.basename(xlsxPath, ".xlsx");
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outPath = path.join(dir, `${base}_名刺紐付け済_${dateStr}.xlsx`);
  await wb.xlsx.writeFile(outPath);

  console.log(`\n📊 マッチング結果:`);
  console.log(`   ✅ 一意に確定: ${filled}件（緑ハイライト）`);
  console.log(`   ⚠️ 複数候補 (要確認): ${multi}件（黄色ハイライト）`);
  console.log(`   ❌ マッチなし: ${miss}件`);
  console.log(`\n📄 出力: ${outPath}`);
}

main().catch((e) => {
  console.error("❌ エラー:", e);
  process.exit(1);
});
