// PDF 生成ローカルテスト
// 実行: npx tsx scripts/test-pdf.tsx
import { writeFileSync } from "node:fs";
import { generateEstimatePdf, generatePdfFilename } from "../lib/pdf";
import {
  buildQuote,
  generateOrderId,
  type OrderRequest,
} from "../lib/order";

const sample: OrderRequest = {
  id: generateOrderId(new Date("2026-04-11T22:00:00+09:00")),
  receivedAt: "2026-04-11T22:00:00+09:00",
  companyName: "山形県森林組合連合会",
  contactName: "山田太郎",
  email: "yamada@example.com",
  phone: "023-123-4567",
  zipCode: "990-0000",
  shippingAddress: "山形県山形市旅篭町1-2-3",
  desiredDelivery: "2週間以内",
  lines: [
    { specId: "std-008-30-50", colorId: "pink", quantity: 60 },
    { specId: "std-008-30-50", colorId: "blue", quantity: 40 },
    { specId: "std-008-30-50", colorId: "red", quantity: 30 },
    { specId: "std-01-15-50", colorId: "yellow", quantity: 20 },
    { specId: "std-01-30-50", colorId: "orange", quantity: 15 },
    { specId: "num-015-20-50", colorId: "white", quantity: 10 },
  ],
  notes:
    "令和8年度 森林整備事業用。納品時には調査対象林班情報をまとめた納品書を同封してください。",
};

async function main() {
  console.log("Building quote...");
  const quote = buildQuote(sample);
  console.log(
    `  顧客: ${sample.companyName}（${quote.priceTier}）`
  );
  console.log(`  明細数: ${quote.lines.length}`);
  console.log(`  税込合計: ¥${quote.total.toLocaleString()}`);
  console.log();
  console.log("Generating PDF...");
  const buffer = await generateEstimatePdf(sample, quote);
  const filename = generatePdfFilename(quote.id);
  const outPath = `./scripts/${filename}`;
  writeFileSync(outPath, buffer);
  console.log(`  ✅ ${outPath} (${buffer.length.toLocaleString()} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
