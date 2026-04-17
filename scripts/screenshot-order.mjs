// 発注ページのスクリーンショットを撮る
// 実行: node scripts/screenshot-order.mjs
import { chromium } from "playwright";
import path from "node:path";

const URL = "https://takeya-tape-shop.vercel.app/order";
const OUT_DIR = "C:\\Users\\green\\Desktop\\納品・確認";

async function main() {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  const page = await context.newPage();

  console.log(`Navigating to ${URL}...`);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. 初期状態のフルページスクショ
  const initialPath = path.join(OUT_DIR, "takeya-order-page-full.png");
  console.log(`Capturing initial state → ${initialPath}`);
  await page.screenshot({ path: initialPath, fullPage: true });
  console.log("  ✓ saved");

  // 2. 会社名入力 → 特別価格バッジ確認
  console.log("Filling 会社名 …");
  await page.fill(
    'input[placeholder="例: ○○県森林組合連合会"]',
    "山形県森林組合連合会"
  );
  await page.waitForTimeout(500);

  // 3. 数量入力 - ピンクと青
  console.log("Entering quantities …");
  // 行1 (0.08×15) は無視、行3 (0.08×30) のピンクと青を入力したい
  // label 内の input を見つけて数値を入れる
  // ピンクを持つ最初の行（0.08×15）の前に「0.08×30」の行にピンクを入力
  // セレクタ: row text contains "0.08×30mm×50m" の後の ピンク input

  // 各 label をループして探す
  const labels = await page.locator("label").all();
  let pinkFilledCount = 0;
  let blueFilledCount = 0;

  for (const label of labels) {
    const text = (await label.textContent()) || "";
    if (text.includes("ピンク")) {
      const input = label.locator("input[type='number']");
      if (pinkFilledCount === 2) {
        // 3番目のピンク行 = 0.08×30
        await input.fill("60");
        console.log("  ✓ ピンク 60 本 (0.08×30×50)");
        break;
      }
      pinkFilledCount++;
    }
  }

  // 次は青、同様に3番目（0.08×30）
  for (const label of labels) {
    const text = (await label.textContent()) || "";
    if (text.includes("青")) {
      const input = label.locator("input[type='number']");
      if (blueFilledCount === 2) {
        await input.fill("40");
        console.log("  ✓ 青 40 本 (0.08×30×50)");
        break;
      }
      blueFilledCount++;
    }
  }

  // 見積金額が更新されるのを待つ
  await page.waitForTimeout(800);

  // 4. 記入後のスクショ
  const filledPath = path.join(OUT_DIR, "takeya-order-page-filled.png");
  console.log(`Capturing filled state → ${filledPath}`);
  await page.screenshot({ path: filledPath, fullPage: true });
  console.log("  ✓ saved");

  await browser.close();
  console.log();
  console.log("Done!");
  console.log(`  ${initialPath}`);
  console.log(`  ${filledPath}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
