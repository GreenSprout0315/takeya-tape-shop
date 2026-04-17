/**
 * seed-customer-prices.ts
 *
 * SMILE売上実績から「通常販売価格（wholesalePrice = Excel実績あり）より
 * 低い購入実績がある取引先」を抽出し、その実績単価を customer_prices に
 * 特別価格として登録する。
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-customer-prices.ts
 *
 * 方針:
 *   - 対象期間: 2025-01-01 以降の識別テープ取引
 *   - 取引先 x 商品spec ごとに、実績単価の「最頻値（モード）」を代表値に採用
 *   - 代表値が通常販売価格より低い場合のみ customer_prices に登録（= 特別価格）
 *   - 斜線入りテープは Excel 未記載のため対象外
 *   - 既存の customer_prices は UPSERT で上書き
 */

import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const SRC = "G:\\マイドライブ\\売上実績マスター.csv";
const CUTOFF = "20250101"; // 2025-01-01 以降

// Excel「実績あり」(= 通常販売価格 wholesalePrice)
const STANDARD_PRICES: Record<string, number> = {
  "std-008-15-50": 135,
  "std-008-20-50": 180,
  "std-008-30-50": 270,
  "std-008-50-50": 450,
  "std-008-15-100": 270,
  "std-008-20-100": 360,
  "std-008-30-100": 540,
  "std-008-50-100": 900,
  "std-01-15-50": 170,
  "std-01-20-50": 230,
  "std-01-30-50": 340,
  "std-01-50-50": 570,
  "std-01-15-100": 340,
  "std-01-20-100": 460,
  "std-01-30-100": 680,
  "std-01-50-100": 1140,
  "std-015-15-50": 260,
  "std-015-20-50": 350,
  "std-015-30-50": 520,
  "std-02-15-50": 335,
  "std-02-20-50": 450,
  "std-02-30-50": 670,
  "num-015-20-50": 1250,
};

// SMILE商品コード接頭辞 → (厚み, 長さ) マッピング
const PREFIX_MAP: Record<string, { thickness: string; length: number }> = {
  "TN-AA": { thickness: "008", length: 50 }, // 0.08mm x 50m
  "TN-AB": { thickness: "008", length: 100 },
  "TN-BA": { thickness: "01", length: 50 },  // 0.1mm x 50m
  "TN-BB": { thickness: "01", length: 100 },
  "TN-CA": { thickness: "015", length: 50 }, // 0.15mm x 50m
  "TN-DA": { thickness: "02", length: 50 },  // 0.2mm x 50m
};

/** SMILE商品コード → EC spec_id。マップできないものは null */
function mapSmileToSpec(smileCode: string): string | null {
  if (smileCode.startsWith("NN-")) return "num-015-20-50"; // ナンバーテープは全て同じ spec
  const m = /^(TN-[A-Z]{2})(\d{2})/.exec(smileCode);
  if (!m) return null;
  const prefix = m[1];
  const width = Number(m[2]);
  const info = PREFIX_MAP[prefix];
  if (!info) return null;
  const specId = `std-${info.thickness}-${width}-${info.length}`;
  // STANDARD_PRICES に無い spec は対象外（存在しない組み合わせ）
  if (!(specId in STANDARD_PRICES)) return null;
  return specId;
}

function decodeUtf16Le(buf: Buffer): string {
  let offset = 0;
  if (buf[0] === 0xff && buf[1] === 0xfe) offset = 2;
  return buf.slice(offset).toString("utf16le");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      cells.push(cur);
      cur = "";
    } else cur += c;
  }
  cells.push(cur);
  return cells;
}

async function main() {
  console.log("📖 SMILE売上実績を読込中...");
  const raw = fs.readFileSync(SRC);
  const text = decodeUtf16Le(raw);
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const rows = lines.slice(1).map(parseCsvLine);

  // 2025-01-01 以降のテープ取引、単価 > 0
  const tapeRows = rows.filter((r) => {
    const date = r[0] || "";
    if (date < CUTOFF) return false;
    const name = r[9] || "";
    if (!/ﾃｰﾌﾟ|テープ/.test(name)) return false;
    const up = Number(r[14]) || 0;
    return up > 0;
  });
  console.log(`  対象取引: ${tapeRows.length}件\n`);

  // 取引先×spec ごとの単価履歴を集計（数量加重）
  type Key = string; // `${smileCode}__${specId}`
  const priceHist = new Map<Key, number[]>();

  for (const r of tapeRows) {
    const custCode = r[4];
    const smileCode = r[8];
    const qty = Number(r[10]) || 0;
    const up = Number(r[14]) || 0;
    if (!custCode || !smileCode || qty <= 0 || up <= 0) continue;
    const specId = mapSmileToSpec(smileCode);
    if (!specId) continue;
    const key = `${custCode}__${specId}`;
    if (!priceHist.has(key)) priceHist.set(key, []);
    const arr = priceHist.get(key)!;
    for (let i = 0; i < qty; i++) arr.push(up); // 数量加重
  }

  // 各キーで最頻値を取る
  function mode(arr: number[]): number {
    const cnt = new Map<number, number>();
    for (const v of arr) cnt.set(v, (cnt.get(v) || 0) + 1);
    let best = arr[0];
    let bestCnt = 0;
    for (const [v, c] of cnt) {
      if (c > bestCnt) {
        best = v;
        bestCnt = c;
      }
    }
    return best;
  }

  // 特別価格（通常価格より低い）を抽出
  type SpecialPrice = {
    smileCode: string;
    specId: string;
    price: number;
    standard: number;
    discount: number;
    qtyTotal: number;
  };
  const specials: SpecialPrice[] = [];
  for (const [key, arr] of priceHist) {
    const [smileCode, specId] = key.split("__");
    const standard = STANDARD_PRICES[specId];
    const m = mode(arr);
    if (m < standard) {
      specials.push({
        smileCode,
        specId,
        price: m,
        standard,
        discount: standard - m,
        qtyTotal: arr.length,
      });
    }
  }
  console.log(`📊 特別価格ペア: ${specials.length}件`);
  const uniqCustomers = new Set(specials.map((s) => s.smileCode));
  console.log(`   対象取引先: ${uniqCustomers.size}社\n`);

  // customers テーブルから smile_code → id の辞書を作成
  const customers = await sql`SELECT id, smile_code, name FROM customers WHERE smile_code IS NOT NULL`;
  const codeToId = new Map<string, number>();
  const codeToName = new Map<string, string>();
  for (const c of customers) {
    codeToId.set(c.smile_code, c.id);
    codeToName.set(c.smile_code, c.name);
  }

  // DBに UPSERT
  let upserted = 0;
  let skippedNoCustomer = 0;
  const perCustomer = new Map<string, number>();

  for (const s of specials) {
    const customerId = codeToId.get(s.smileCode);
    if (!customerId) {
      skippedNoCustomer++;
      continue;
    }
    await sql`
      INSERT INTO customer_prices (customer_id, spec_id, price)
      VALUES (${customerId}, ${s.specId}, ${s.price})
      ON CONFLICT (customer_id, spec_id) DO UPDATE SET price = EXCLUDED.price
    `;
    upserted++;
    perCustomer.set(s.smileCode, (perCustomer.get(s.smileCode) || 0) + 1);
  }

  console.log(`✅ 特別価格 upsert: ${upserted}件`);
  if (skippedNoCustomer > 0) {
    console.log(`⚠️  customers未登録のためスキップ: ${skippedNoCustomer}件`);
  }

  // 顧客別サマリ（特価件数の多い順 TOP 10）
  const topCust = [...perCustomer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log("\n=== 特別価格が多い顧客 TOP 10 ===");
  for (const [code, cnt] of topCust) {
    console.log(`  ${code} | ${(codeToName.get(code) || "").padEnd(40)} | 特価spec ${cnt}件`);
  }

  // DB 最終状態
  const [{ cnt }] = await sql`SELECT COUNT(*)::int as cnt FROM customer_prices`;
  const [{ uniq }] = await sql`SELECT COUNT(DISTINCT customer_id)::int as uniq FROM customer_prices`;
  console.log(`\n📊 customer_prices 現在:`);
  console.log(`   総レコード: ${cnt}件`);
  console.log(`   特価設定済み顧客: ${uniq}社`);

  // レポートJSON出力
  const out = "C:\\greensprout\\.company\\sales\\clients\\takeya-shoji\\customer-special-prices-2025.json";
  fs.writeFileSync(out, JSON.stringify(specials, null, 2), "utf8");
  console.log(`\n📁 詳細: ${out}`);
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
