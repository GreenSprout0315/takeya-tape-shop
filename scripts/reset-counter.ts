// カウンター値をリセットする
// 実行: npx tsx --env-file=.env.local scripts/reset-counter.ts [value]
import { resetCounter, peekCounter } from "../lib/counter";

async function main() {
  const arg = process.argv[2];
  const value = arg ? parseInt(arg, 10) : 24199;
  if (!Number.isFinite(value)) {
    console.error("Invalid value:", arg);
    process.exit(1);
  }
  console.log(`Resetting counter to ${value}...`);
  await resetCounter(value);
  const confirmed = await peekCounter();
  console.log(`Counter is now: ${confirmed}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
