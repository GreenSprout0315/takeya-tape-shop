// カウンター動作確認
// 実行: npx tsx --env-file=.env.local scripts/test-counter.ts
import { getNextQuoteNumber, peekCounter } from "../lib/counter";

async function main() {
  console.log("=== Vercel Blob 連番カウンター テスト ===");
  console.log();
  console.log("現在値を peek...");
  const before = await peekCounter();
  console.log(`  peek: ${before ?? "(未初期化)"}`);
  console.log();

  console.log("次の番号を 3回連続で採番...");
  for (let i = 0; i < 3; i++) {
    const next = await getNextQuoteNumber();
    console.log(`  [${i + 1}] → 見積№ ${next}`);
  }
  console.log();

  console.log("最終値を peek...");
  const after = await peekCounter();
  console.log(`  peek: ${after}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
