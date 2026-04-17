// 連番生成の動作確認
// 実行: npx tsx scripts/test-quote-numbers.ts
import {
  buildQuote,
  generateOrderId,
  type OrderRequest,
} from "../lib/order";

// 複数の時刻で連番を生成して表示
const testTimes = [
  "2026-04-11T00:00:00+09:00", // 基準時刻
  "2026-04-11T00:01:00+09:00", // +1分
  "2026-04-11T00:05:00+09:00", // +5分
  "2026-04-11T14:24:00+09:00", // 同日14:24
  "2026-04-11T23:59:00+09:00", // 同日23:59
  "2026-04-12T00:00:00+09:00", // 翌日00:00
  "2026-04-12T12:00:00+09:00", // 翌日12:00
  "2026-05-01T00:00:00+09:00", // 3週間後
  "2026-07-01T00:00:00+09:00", // 約3ヶ月後
  "2027-04-11T00:00:00+09:00", // 1年後
];

// lib/pdf.tsx と同じロジック（連番計算）
const QUOTE_NUMBER_BASE_TIME = Date.UTC(2026, 3, 10, 15, 0, 0);
const QUOTE_NUMBER_BASE = 24200;

function toQuoteNumber(issuedAt: string): string {
  const t = new Date(issuedAt).getTime();
  const elapsed = Math.max(0, t - QUOTE_NUMBER_BASE_TIME);
  const minutes = Math.floor(elapsed / 60000);
  return String(QUOTE_NUMBER_BASE + minutes);
}

console.log("=== 見積№ 連番生成テスト ===");
console.log(
  `基準: 2026-04-11 00:00 JST = 見積№ ${QUOTE_NUMBER_BASE} から開始`
);
console.log();
console.log("発行日時                  見積№");
console.log("───────────────────────  ──────");
for (const t of testTimes) {
  const no = toQuoteNumber(t);
  console.log(`${new Date(t).toLocaleString("ja-JP").padEnd(24)}  ${no}`);
}
